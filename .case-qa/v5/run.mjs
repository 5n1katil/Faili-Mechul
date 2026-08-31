#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { stableHash, compactReport } from '../fm_case_qa_runner.mjs';
import { read, write, clone, loadSnapshot, scan, selectNext, counts, assess, restoreBest,
  logicalFailure, guardedPatch, better, repairPrompt, stageCandidate } from './core.mjs';
import { openStore } from './state.mjs';
import { callPaid, Stop } from './provider.mjs';

export async function repairOne(snapshot, entry, store, { allowAI = false, caller = callPaid } = {}) {
  const state = store.state;
  const existing = state.cases[entry.id];
  const changed = existing?.source_hash !== entry.sourceHash || existing?.simulator_hash !== snapshot.simulatorHash;
  const record = state.cases[entry.id] ||= { spent: 0 };
  const resumed = restoreBest(snapshot, entry, record);
  let current = resumed.candidate, assessment = resumed.assessment;
  if (changed) record.feedback = [];
  record.feedback ||= [];
  state.active_id = entry.id;
  const persist = () => {
    Object.assign(record, { source_hash: entry.sourceHash, simulator_hash: snapshot.simulatorHash,
      candidate: clone(current), candidate_hash: stableHash(current), best_score: assessment.result.score });
    store.save();
  };
  persist();
  const run = { calls: 0, spent: 0, attempts: [], resumed_score: assessment.result.score };
  let status = assessment.passed ? 'ready_for_gates' : allowAI ? 'attempt_limit' : 'audit_only';
  if (allowAI && !assessment.passed) {
    // Gold fixtures are checked without repairs or API calls, before any spend.
    for (const id of snapshot.policy.authoring.calibration_case_ids) {
      const gold = snapshot.entries.find(e => e.id === id);
      if (!gold || !assess(snapshot, gold, gold.candidate).passed) throw new Error(`GOLD_CALIBRATION_FAILED:${id}`);
    }
    for (let index = 0; index < snapshot.policy.sequential.max_calls_per_execute; index++) {
      if (assessment.passed) break;
      if (index >= 2 && !logicalFailure(assessment)) { status = 'needs_targeted_repair'; break; }
      const model = index < 2 ? snapshot.policy.models.first_pass : snapshot.policy.models.escalation;
      const prompt = repairPrompt(entry, current, assessment, record.feedback);
      try {
        const response = await caller({ store, policy: snapshot.policy, run, caseId: entry.id, model, prompt });
        const next = guardedPatch(snapshot, entry, current, response.plan, assessment);
        const retained = better(next.assessment, assessment);
        run.attempts.push({ model, cached: response.cached, score: next.assessment.result.score, retained });
        if (retained) { current = next.candidate; assessment = next.assessment; }
        else record.feedback.push({ score: next.assessment.result.score, result: compactReport(next.assessment.result, next.assessment.leakage),
          rejected_paths: response.plan.operations.map(op => op.path), reason: 'No strict improvement or a passed gate regressed' });
        record.feedback = record.feedback.slice(-2);
        persist();
      } catch (error) {
        run.attempts.push({ model, error: error.message });
        if (error instanceof Stop) { status = error.message; break; }
        // Persistence failures must stop, not masquerade as model feedback.
        if (!/PATCH|LOCKED_FIELD|IMMUTABLE|NEAR_READY|CONTRACT/.test(error.message)) throw error;
        record.feedback.push({ error: error.message });
        record.feedback = record.feedback.slice(-2);
        persist();
      }
    }
  }
  if (assessment.passed) status = 'ready_for_gates';
  record.status = status;
  persist();
  return { candidate: current, assessment, run, status };
}

export async function main() {
  const root = process.cwd();
  const policy = read(path.join(root, '.case-qa/v5/policy.json'));
  const output = path.join(root, '.case-qa-output/v5');
  const snapshot = loadSnapshot(root, policy);
  const baseline = scan(snapshot);
  write(path.join(output, 'baseline.json'), baseline);
  const allowAI = process.env.FM_QA_V5_ALLOW_AI === 'true';
  const auditOnly = process.env.FM_QA_V5_AUDIT === 'true';
  const store = auditOnly ? { state: { active_id: null } } : openStore(root, policy,
    process.env.FM_QA_V5_LOCAL_STATE ? { localFile: process.env.FM_QA_V5_LOCAL_STATE } : {});
  const selected = selectNext(baseline, store.state.active_id);
  const report = { schema: 'fm_case_qa_v5_result', run_id: process.env.GITHUB_RUN_ID || null, status: selected ? 'audit_only' : 'all_cases_qa_ready',
    main_synchronized: false, campaign: counts(baseline), selected_id: selected?.id || null, api_calls: 0,
    execute_cost_usd: 0, main_sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() };
  if (selected && !auditOnly) {
    const entry = snapshot.entries.find(e => e.id === selected.id);
    const result = await repairOne(snapshot, entry, store, { allowAI });
    Object.assign(report, { status: result.status, best_score: result.assessment.result.score,
      api_calls: result.run.calls, execute_cost_usd: result.run.spent,
      campaign_cost_usd: store.state.campaign_spent, attempts: result.run.attempts,
      resumed_score: result.run.resumed_score });
    if (result.assessment.passed) {
      const staged = stageCandidate(snapshot, entry, result.candidate);
      write(path.join(output, 'staged.json'), scan(staged));
    }
  }
  // This process never claims merge/COMPLETE. The independent publish job owns it.
  write(path.join(output, 'result.json'), report);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
    `status=${report.status}\nselected_id=${report.selected_id || ''}\nmain_sha=${report.main_sha}\n`);
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
