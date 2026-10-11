#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { read, write, clone, loadSnapshot, selectNext, stageCandidate, counts } from './core.mjs';
import { campaignRows, repairOne, reopenTextQuarantine } from './run.mjs';
import { openStore } from './state.mjs';
import { modelPreflight } from './provider.mjs';

export async function campaign(snapshot, store, { caseLimit = snapshot.policy.batch.default_case_limit,
  worker = repairOne, stage = stageCandidate, rows = campaignRows, saveResult = () => {} } = {}) {
  const config = snapshot.policy.batch;
  if (!Number.isInteger(caseLimit) || caseLimit < 1 || caseLimit > config.max_case_limit ||
      !Number.isInteger(config.max_calls) || config.max_calls < 1 || !(config.budget_usd > 0))
    throw new Error('CAMPAIGN_LIMIT_INVALID');
  // Unmerged batches stay reviewable; do not produce competing changes on the
  // same production files while an earlier batch waits for its human review.
  if (snapshot.entries.some(e => store.state.cases[e.id]?.status === 'awaiting_review' &&
      store.state.cases[e.id].source_hash === e.sourceHash))
    return { status: 'awaiting_existing_review', selected_ids: [], cases: [], api_calls: 0, execute_cost_usd: 0 };
  const results = [], accepted = [], visited = new Set();
  let calls = 0, spent = 0, stop = null;
  for (let i = 0; i < caseLimit; i++) {
    const remainingCalls = config.max_calls - calls, remainingBudget = config.budget_usd - spent;
    if (remainingCalls < 1 || remainingBudget <= 0) { stop = 'CAMPAIGN_BUDGET_CHECKPOINT'; break; }
    const available = rows(snapshot).map(r => ({ ...r, passed: r.content_locked || visited.has(r.id) }));
    const selected = selectNext(available, store.state.active_id, store.state.cases);
    if (!selected) { stop = 'QUEUE_EXHAUSTED_OR_QUARANTINED'; break; }
    const entry = snapshot.entries.find(e => e.id === selected.id);
    visited.add(entry.id);
    const bounded = { ...snapshot, policy: clone(snapshot.policy) };
    bounded.policy.sequential.max_calls_per_execute = Math.min(snapshot.policy.sequential.max_calls_per_execute, remainingCalls);
    bounded.policy.sequential.execute_budget_usd = Math.min(snapshot.policy.sequential.execute_budget_usd, remainingBudget);
    let result;
    try { result = await worker(bounded, entry, store, { allowAI: true }); }
    catch (error) {
      const run = error.pipeline_run || { calls: 0, spent: 0 };
      calls += run.calls; spent += run.spent;
      results.push({ id: entry.id, status: 'infrastructure_error', error: error.message, api_calls: run.calls, execute_cost_usd: run.spent });
      stop = 'INFRASTRUCTURE_STOP'; break;
    }
    calls += result.run.calls; spent += result.run.spent;
    const row = { id: entry.id, status: result.status, score: result.assessment.result.score,
      api_calls: result.run.calls, execute_cost_usd: result.run.spent, attempts: result.run.attempts,
      failures: result.failures, provider_error: result.provider_error };
    if (result.review) row.review = result.review;
    if (result.status === 'ready_for_gates' && result.review?.passed) {
      try {
        snapshot = stage(snapshot, entry, result.candidate, result.review.certificate);
        accepted.push(entry.id);
      } catch (error) {
        row.status = 'quarantined'; row.failures = ['STAGING_REJECTED:' + error.message];
        Object.assign(store.state.cases[entry.id], { status: 'quarantined', failures: row.failures }); store.save();
        if (!/^(DIFF_|SELECTED_NOT_100|PORTFOLIO_REGRESSION)/.test(error.message)) stop = 'INFRASTRUCTURE_STOP';
      }
    }
    results.push(row); saveResult({ snapshot, results, accepted, calls, spent });
    if (stop === 'INFRASTRUCTURE_STOP') break;
    // Content failures are local; connection/auth/quota/uncertain transport and
    // global budget failures stop the batch without hitting the next case.
    if (!['ready_for_gates', 'quarantined'].includes(result.status)) { stop = result.status; break; }
  }
  const finalRows = rows(snapshot);
  return { status: stop === 'INFRASTRUCTURE_STOP' ? 'infrastructure_error' : accepted.length ? 'ready_for_gates' : stop ? 'campaign_paused' : 'quarantined',
    selected_ids: accepted, selected_id: accepted.length === 1 ? accepted[0] : null,
    cases: results, api_calls: calls, execute_cost_usd: spent, stop_reason: stop,
    processed: results.length, accepted: accepted.length,
    deterministic_qa: counts(finalRows), content_locked: counts(finalRows.map(r => ({ ...r, passed: r.content_locked }))),
    campaign_cost_usd: store.state.campaign_spent, main_synchronized: false };
}

async function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('CAMPAIGN_REQUIRES_ACTIONS');
  const root = process.cwd(), policy = read('.case-qa/pipeline/policy.json');
  const snapshot = loadSnapshot(root, policy), baseline = campaignRows(snapshot);
  const output = path.join(root, '.case-qa-output/pipeline');
  write(path.join(output, 'baseline.json'), baseline);
  const base = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const store = openStore(root, policy);
  for (const entry of snapshot.entries) {
    const record = store.state.cases[entry.id];
    if (record && record.source_hash !== entry.sourceHash) record.status = 'source_changed';
  }
  reopenTextQuarantine(snapshot, store);
  const preflight = await modelPreflight(policy);
  const report = await campaign(snapshot, store, {
    caseLimit: process.env.FM_PIPELINE_CASE_LIMIT ? Number(process.env.FM_PIPELINE_CASE_LIMIT) : policy.batch.default_case_limit,
    saveResult: ({ results, accepted, calls, spent }) => write(path.join(output, 'checkpoint.json'),
      { cases: results, selected_ids: accepted, api_calls: calls, execute_cost_usd: spent })
  });
  Object.assign(report, { schema: 'fm_case_pipeline_result_v1', mode: 'campaign',
    run_id: process.env.GITHUB_RUN_ID, main_sha: base, model_preflight: preflight });
  write(path.join(output, 'result.json'), report);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'status=' + report.status + '\n');
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
