#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { stableHash, compactReport } from '../fm_case_qa_runner.mjs';
import { read, write, clone, loadSnapshot, scan, selectNext, counts, assess, restoreBest,
  guardedPatch, better, repairPrompt, stageCandidate, nearReady, logicalFailure } from './core.mjs';
import { openStore } from './state.mjs';
import { callPaid, Stop, modelPreflight, countsAsRepair } from './provider.mjs';
import { mediaPreflight, reviewCandidate, certificateValid } from './review.mjs';
import { EDITORIAL_VERSION, EDITORIAL_SYSTEM, editorialSchema, validEditorial, editorialPrompt, editorialFailure, compileEditorial, recoverEditorial } from './editorial.mjs';
import { EDITORIAL_REVISION_VERSION, EDITORIAL_REVISION_SYSTEM, editorialRevisionSchema, validEditorialRevision,
  editorialRevisionPrompt, compileEditorialRevision } from './editorial.mjs';
import { REVIEW_VERSION } from './quality-contract.mjs';
import { HINT_SYSTEM, hintOnly, hintSchema, hintPrompt, validHints, compileHints, recoverHintCleanup } from './hint-cleanup.mjs';
import { reconcileKnownUnsent } from './reservation-recovery.mjs';
import { TEXT_METHOD, TEXT_SYSTEM, textRepairPlan, textResponseSchema, textRepairPrompt,
  validTextResponse, explainTextResponse, compileTextPatch, supportsTextRepair } from './text-repair.mjs';

export function reopenTextQuarantine(snapshot, store) {
  if (snapshot.policy.sequential.verified_text_repair_limit !== 2) return [];
  const reopened = [];
  for (const entry of snapshot.entries) {
    const record = store.state.cases[entry.id];
    if (record?.status !== 'quarantined' || record.source_hash !== entry.sourceHash ||
        !supportsTextRepair(entry, entry.candidate) || !logicalFailure(assess(snapshot, entry, entry.candidate))) continue;
    const requests = Object.values(store.state.requests).filter(r => r.case_id === entry.id);
    // Preserve the entire history. No uncertain transport, review failure,
    // request-cap exhaustion or previously attempted method is reopened.
    if (!requests.length || requests.length > snapshot.policy.sequential.max_requests_per_case - 4 ||
        requests.some(r => r.purpose !== 'repair' || r.repair_method === TEXT_METHOD ||
          !['completed','failed'].includes(r.status) || (r.status === 'failed' && ![400,402,404].includes(r.http_status)))) continue;
    record.status = 'method_upgrade_pending'; reopened.push(entry.id);
  }
  if (reopened.length) store.save();
  return reopened;
}

export async function repairOne(snapshot, entry, store, { allowAI = false, caller = callPaid } = {}) {
  const recoveredReservation = allowAI && reconcileKnownUnsent(snapshot, entry, store);
  const state = store.state, existing = state.cases[entry.id];
  const changed = existing?.source_hash !== entry.sourceHash || existing?.simulator_hash !== snapshot.simulatorHash;
  const record = state.cases[entry.id] ||= { spent: 0 };
  delete record.provider_error;
  const resumed = restoreBest(snapshot, entry, record);
  let current = resumed.candidate, assessment = resumed.assessment;
  const recoveredHints = recoverHintCleanup(snapshot, entry, current, record, state.requests);
  if (recoveredHints) { current = recoveredHints.candidate; assessment = recoveredHints.assessment; }
  const recoveredEditorial = recoverEditorial(snapshot, entry, current, record, state.requests);
  if (recoveredEditorial) { current = recoveredEditorial.candidate; assessment = recoveredEditorial.assessment; }
  if (changed) { record.feedback = []; delete record.review; delete record.failed_review; }
  record.feedback ||= []; state.active_id = entry.id;
  const persist = () => {
    Object.assign(record, { source_hash: entry.sourceHash, simulator_hash: snapshot.simulatorHash,
      candidate: clone(current), candidate_hash: stableHash(current), best_score: assessment.result.score });
    store.save();
  };
  const run = { calls: 0, spent: 0, attempts: [], resumed_score: assessment.result.score };
  if (recoveredReservation) run.attempts.push({ purpose: 'reservation_recovery', transport_not_started: true,
    source_run: 38168144752 });
  if (recoveredHints) run.attempts.push({ purpose: 'hint_cleanup', cached: true, score: assessment.result.score,
    retained: true, request_key: recoveredHints.request_key });
  if (recoveredEditorial) run.attempts.push({ purpose: 'editorial', cached: true, score: assessment.result.score,
    retained: true, request_key: recoveredEditorial.request_key });
  let status = 'audit_only', review;
  // A verified plan stays stable across attempts even if prose becomes nearly
  // ready. Otherwise a second call would silently return to the old patch path.
  const textPlan = snapshot.policy.sequential.verified_text_repair_limit === 2 &&
    !nearReady(assessment) && logicalFailure(assessment) ? textRepairPlan(snapshot, entry, current) : null;
  try {
    const pre = mediaPreflight(snapshot, entry, current);
    if (!pre.passed) {
      record.failures = pre.failures; status = 'quarantined';
    } else if (allowAI) {
      for (const id of snapshot.policy.authoring.calibration_case_ids) {
        const gold = snapshot.entries.find(e => e.id === id);
        if (!gold || !assess(snapshot, gold, gold.candidate).passed) throw new Error('GOLD_CALIBRATION_FAILED:' + id);
      }
      persist();
      for (let index = 0; index < snapshot.policy.sequential.max_repairs_per_case && !assessment.passed; index++) {
        const method = textPlan ? TEXT_METHOD : 'legacy_patch';
        const used = Object.values(store.state.requests || {}).filter(r => r.case_id === entry.id && countsAsRepair(r) &&
          (r.repair_method || 'legacy_patch') === method).length;
        const model = index > 0 || used > 0 ? (snapshot.policy.models.repair || snapshot.policy.models.first_pass) : snapshot.policy.models.first_pass;
        const cleanup = hintOnly(assessment);
        const response = await caller({ store, policy: snapshot.policy, run, caseId: entry.id, model,
          purpose: 'repair', repairMethod: method,
          ...(cleanup ? { schema: hintSchema(current), system: HINT_SYSTEM, prompt: hintPrompt(current, assessment),
            validate: value => validHints(current, value) } : textPlan ? { schema: textResponseSchema(current, textPlan), system: TEXT_SYSTEM,
            prompt: textRepairPrompt(entry, current, textPlan, assessment, record.feedback),
            validate: p => validTextResponse(current, textPlan, p), diagnose: p => explainTextResponse(current, textPlan, p) } : {
            prompt: repairPrompt(entry, current, assessment, record.feedback),
            validate: p => p?.case_id === entry.id && Array.isArray(p.operations) }) });
        try {
          const patch = !cleanup && textPlan ? compileTextPatch(current, textPlan, response.plan) : response.plan;
          const next = cleanup ? compileHints(snapshot, entry, current, response.plan, assessment) :
            guardedPatch(snapshot, entry, current, patch, assessment);
          const retained = better(next.assessment, assessment);
          run.attempts.push({ model, repair_method: method, cached: response.cached, score: next.assessment.result.score, retained });
          if (retained) { current = next.candidate; assessment = next.assessment; }
          else record.feedback.push({ score: next.assessment.result.score,
            result: compactReport(next.assessment.result, next.assessment.leakage),
            reason: 'No improvement or passed gate regressed' });
        } catch (error) {
          if (!/PATCH|LOCKED_FIELD|IMMUTABLE|NEAR_READY|CONTRACT|TEXT_RESPONSE|TEXT_CONTENT/.test(error.message)) throw error;
          run.attempts.push({ model, error: error.message });
          record.feedback.push({ error: error.message });
        }
        record.feedback = record.feedback.slice(-2); persist();
      }
      if (assessment.passed) {
        const saved = record.review || snapshot.sidecar.cases?.[entry.id]?.pipeline_review;
        if (certificateValid(snapshot, entry, current, saved)) review = { passed: true, certificate: saved, cached: true };
        else if (editorialFailure(snapshot, current, record.failed_review)) review = clone(record.failed_review);
        else review = await reviewCandidate(snapshot, entry, current, store, run, caller);
        if (!review.passed) { record.failed_review = clone(review); persist(); }
        if (editorialFailure(snapshot, current, review) && supportsTextRepair(entry, current) &&
            snapshot.policy.sequential.editorial_revision_limit === 1 &&
            !Object.values(state.requests).some(r => r.case_id === entry.id && r.purpose === 'editorial')) {
          // Reserve capacity for ONE revision and two completely fresh reviews.
          // Never reuse player evidence after changing visible narrative.
          const used = Object.values(state.requests).filter(r => r.case_id === entry.id).length;
          if (used + 3 <= snapshot.policy.sequential.max_requests_per_case &&
              run.calls + 3 <= snapshot.policy.sequential.max_calls_per_execute) {
            const revisedContract = snapshot.policy.review.prompt_version === REVIEW_VERSION;
            const response = await caller({ store, policy: snapshot.policy, run, caseId: entry.id,
              model: snapshot.policy.models.repair, purpose: 'editorial',
              system: revisedContract ? EDITORIAL_REVISION_SYSTEM : EDITORIAL_SYSTEM,
              prompt: revisedContract ? editorialRevisionPrompt(current, review) : editorialPrompt(current, review),
              schema: revisedContract ? editorialRevisionSchema(current) : editorialSchema(current),
              validate: value => revisedContract ? validEditorialRevision(current, value) : validEditorial(current, value) });
            try {
              const next = revisedContract ? compileEditorialRevision(snapshot, entry, current, response.plan) :
                compileEditorial(snapshot, entry, current, response.plan);
              current = next.candidate; assessment = next.assessment;
              delete record.review; delete record.failed_review; persist();
              run.attempts.push({ purpose: 'editorial', version: revisedContract ? EDITORIAL_REVISION_VERSION : EDITORIAL_VERSION,
                score: assessment.result.score, retained: true });
              review = await reviewCandidate(snapshot, entry, current, store, run, caller);
              if (!review.passed) record.failed_review = clone(review);
            } catch (error) {
              if (!error.message.startsWith('EDITORIAL_')) throw error;
              run.attempts.push({ purpose: 'editorial', error: error.message });
              record.feedback.push({ error: error.message });
            }
          } else if (used + 3 <= snapshot.policy.sequential.max_requests_per_case) {
            record.failures = review.failures; status = 'editorial_pending';
            record.status = status; persist();
            return { candidate: current, assessment, run, status, review, failures: record.failures };
          }
        }
        record.failures = review.failures || [];
        if (review.passed) { record.review = review.certificate; delete record.failed_review; status = 'ready_for_gates'; }
        else status = 'quarantined';
      } else { status = 'quarantined'; record.failures = [compactReport(assessment.result, assessment.leakage)]; }
    }
  } catch (error) {
    record.failures = [error.message];
    if (error.provider_error) record.provider_error = error.provider_error;
    if (error instanceof Stop) status = ['REPAIR_LIMIT', 'CASE_REQUEST_LIMIT'].includes(error.message) ? 'quarantined' : error.message;
    else { record.status = 'infrastructure_error'; error.pipeline_run = run; persist(); throw error; }
  }
  record.status = status; persist();
  return { candidate: current, assessment, run, status, review, failures: record.failures || [],
    provider_error: record.provider_error || null };
}
export function campaignRows(snapshot) {
  return scan(snapshot).map(row => {
    const entry = snapshot.entries.find(e => e.id === row.id);
    return { ...row, content_locked: row.passed &&
      certificateValid(snapshot, entry, entry.candidate, snapshot.sidecar.cases?.[row.id]?.pipeline_review) };
  });
}
export async function main() {
  const root = process.cwd(), policy = read(path.join(root, '.case-qa/pipeline/policy.json'));
  const output = path.join(root, '.case-qa-output/pipeline');
  const auditOnly = process.env.FM_PIPELINE_MODE !== 'pilot';
  if (!auditOnly && process.env.GITHUB_ACTIONS !== 'true' && !process.env.FM_PIPELINE_LOCAL_STATE)
    throw new Error('LOCAL_PILOT_REQUIRES_EXPLICIT_LOCAL_STATE');
  const snapshot = loadSnapshot(root, policy), baseline = campaignRows(snapshot);
  write(path.join(output, 'baseline.json'), baseline);
  const store = auditOnly ? { state: { active_id: null, cases: {} } } : openStore(root, policy,
    process.env.FM_PIPELINE_LOCAL_STATE ? { localFile: process.env.FM_PIPELINE_LOCAL_STATE } : {});
  if (!auditOnly) {
    for (const entry of snapshot.entries) {
      const record = store.state.cases[entry.id];
      if (record && record.source_hash !== entry.sourceHash) record.status = 'source_changed';
    }
    reopenTextQuarantine(snapshot, store);
  }
  const rows = baseline.map(r => ({ ...r, passed: r.content_locked }));
  const requested = process.env.FM_PIPELINE_CASE_ID || '';
  if (requested && !snapshot.entries.some(e => e.id === requested)) throw new Error('UNKNOWN_CASE_ID');
  const selected = requested ? rows.find(r => r.id === requested) : selectNext(rows, store.state.active_id, store.state.cases);
  const report = { schema: 'fm_case_pipeline_result_v1', run_id: process.env.GITHUB_RUN_ID || null,
    status: selected ? 'audit_only' : rows.every(r => r.passed) ? 'all_content_locked' : 'queue_blocked',
    main_synchronized: false, deterministic_qa: counts(baseline), content_locked: counts(rows),
    selected_id: selected?.id || null, api_calls: 0, execute_cost_usd: 0,
    main_sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() };
  try {
    if (selected && !auditOnly) {
      report.model_preflight = await modelPreflight(policy);
      const entry = snapshot.entries.find(e => e.id === selected.id);
      const result = await repairOne(snapshot, entry, store, { allowAI: true });
      Object.assign(report, { status: result.status, best_score: result.assessment.result.score,
        api_calls: result.run.calls, execute_cost_usd: result.run.spent,
        campaign_cost_usd: store.state.campaign_spent, attempts: result.run.attempts,
        failures: result.failures, provider_error: result.provider_error, resumed_score: result.run.resumed_score });
      if (result.review) {
        report.review = result.review;
        write(path.join(output, 'review.json'), result.review);
      }
      // Rejected candidates are retained for diagnosis but never staged.
      write(path.join(output, 'candidate.json'), result.candidate);
      if (result.status === 'ready_for_gates' && result.review?.passed) {
        stageCandidate(snapshot, entry, result.candidate, result.review.certificate);
        write(path.join(output, 'review.json'), result.review.certificate);
        write(path.join(output, 'staged.json'), campaignRows(loadSnapshot(root, policy)));
      }
      report.state_branch = policy.sequential.state_branch;
    }
  } catch (error) {
    Object.assign(report, { status: 'infrastructure_error', error: error.message,
      ...(error.pipeline_run ? { api_calls: error.pipeline_run.calls, execute_cost_usd: error.pipeline_run.spent,
        attempts: error.pipeline_run.attempts } : {}) });
    process.exitCode = 1;
  } finally {
    if (!auditOnly) report.campaign_cost_usd = store.state.campaign_spent;
    write(path.join(output, 'result.json'), report);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
      'status=' + report.status + '\nselected_id=' + (report.selected_id || '') + '\nmain_sha=' + report.main_sha + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
