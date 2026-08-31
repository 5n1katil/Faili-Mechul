#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { read, write, loadSnapshot, scan, counts, assertNoRegression } from './core.mjs';
import { api, preflight, assertPr, certifiedRun } from './github.mjs';

const root = process.cwd(), policy = read('.case-qa/v5/policy.json');
const repo = policy.source.repository, output = '.case-qa-output/v5';
const report = read(`${output}/result.json`);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const wait = () => new Promise(resolve => setTimeout(resolve, 15000));
async function publish() {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('PUBLICATION_REQUIRES_EPHEMERAL_ACTIONS_CHECKOUT');
  if (!['ready_for_gates', 'all_cases_qa_ready'].includes(report.status)) return;
  preflight(policy);
  const base = report.main_sha;
  if (api(`repos/${repo}/git/ref/heads/main`).object.sha !== base) throw new Error('MAIN_CHANGED: next Execute revalidates checkpoint');
  if (report.status === 'all_cases_qa_ready') {
    const rows = scan(loadSnapshot(root, policy));
    if (!counts(rows).complete) throw new Error('CAMPAIGN_NOT_COMPLETE');
    Object.assign(report, { status: 'COMPLETE', main_synchronized: true, campaign: counts(rows) });
    return;
  }
  const branch = `qa/v5-${crypto.createHash('sha256').update(report.selected_id + base).digest('hex').slice(0, 20)}`;
  // Reuse an already-published identical PR after CI timeout/crash; no duplicate.
  const existing = api(`repos/${repo}/pulls?state=all&head=5n1katil:${branch}&base=main&per_page=100`);
  let pr = existing.find(p => p.state === 'open');
  let head;
  if (pr) {
    git('fetch', 'origin', `refs/heads/${branch}`);
    head = git('rev-parse', 'FETCH_HEAD');
    const paths = [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path];
    for (const file of paths) {
      const remoteText = execFileSync('git', ['show', `${head}:${file}`]);
      if (!remoteText.equals(fs.readFileSync(file))) throw new Error('EXISTING_PR_DIFFERS: retained safely for review');
    }
  } else {
    if (existing.length) throw new Error('CLOSED_PREVIOUS_PR: do not silently reopen rejected or merged work');
    git('switch', '-c', branch);
    git('config', 'user.name', 'faili-mechul-qa-bot');
    git('config', 'user.email', 'qa-bot@users.noreply.github.com');
    git('add', policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path);
    git('diff', '--cached', '--check');
    git('commit', '-m', `qa: certify sequential case ${report.selected_id}`);
    head = git('rev-parse', 'HEAD');
    // A branch created before a crash is reused only if its contents match.
    const remote = git('ls-remote', '--heads', 'origin', `refs/heads/${branch}`);
    if (remote) {
      git('fetch', 'origin', `refs/heads/${branch}`);
      const existingHead = git('rev-parse', 'FETCH_HEAD');
      if (git('rev-parse', `${head}^{tree}`) !== git('rev-parse', `${existingHead}^{tree}`)) throw new Error('ORPHAN_BRANCH_DIFFERS');
      head = existingHead;
    } else git('push', 'origin', `HEAD:refs/heads/${branch}`);
    pr = api(`repos/${repo}/pulls`, 'POST', { base: 'main', head: branch,
      title: `QA v5: ${report.selected_id} — exact 100/100`,
      body: `One sequential case. Exact v29.4 and all publication gates must pass at head ${head} against base ${base}.\n\nExecute API calls: ${report.api_calls}; configured-rate cost: $${report.execute_cost_usd}.\nNo avatar generation. Merge is blocked until independent CI succeeds.` });
  }
  Object.assign(report, { pr_url: pr.html_url, pr_number: pr.number, candidate_sha: head, status: 'waiting_ci' });
  write(`${output}/result.json`, report);
  const workflow = api(`repos/${repo}/actions/workflows/fm-case-qa-v5-candidate.yml`);
  const nonce = `${process.env.GITHUB_RUN_ID || 'local'}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`;
  // workflow_dispatch is explicit because PRs created with GITHUB_TOKEN do not
  // trigger ordinary pull_request workflows. No extra PAT is needed for CI.
  api(`repos/${repo}/actions/workflows/${workflow.id}/dispatches`, 'POST', { ref: branch,
    inputs: { base_sha: base, head_sha: head, case_id: report.selected_id, nonce } });
  let run;
  const deadline = Date.now() + 35 * 60 * 1000;
  while (Date.now() < deadline) {
    const runs = api(`repos/${repo}/actions/workflows/${workflow.id}/runs?event=workflow_dispatch&branch=${encodeURIComponent(branch)}&per_page=100`).workflow_runs;
    run = certifiedRun(runs, { head, nonce, workflowId: workflow.id });
    if (run?.status === 'completed') break;
    if (api(`repos/${repo}/git/ref/heads/main`).object.sha !== base) throw new Error('MAIN_CHANGED_DURING_CI');
    await wait();
  }
  if (run?.status !== 'completed' || run.conclusion !== 'success') throw new Error('CI_FAILED_OR_TIMED_OUT: same case retained');
  report.certification_run = run.id;
  preflight(policy);
  assertPr(api(`repos/${repo}/pulls/${pr.number}`), head, base);
  if (api(`repos/${repo}/git/ref/heads/main`).object.sha !== base) throw new Error('MAIN_CHANGED_BEFORE_MERGE');
  const merged = api(`repos/${repo}/pulls/${pr.number}/merge`, 'PUT', { merge_method: 'squash', sha: head });
  if (merged.merged !== true || !merged.sha) throw new Error('MERGE_NOT_CONFIRMED');
  report.merge_sha = merged.sha;
  report.status = 'merged_pending_main_verification';
  write(`${output}/result.json`, report);
  git('fetch', 'origin', 'main');
  git('merge-base', '--is-ancestor', merged.sha, 'origin/main');
  git('reset', '--hard', 'origin/main'); // Ephemeral Actions checkout only.
  const rows = scan(loadSnapshot(root, policy));
  assertNoRegression(read(`${output}/baseline.json`), rows, report.selected_id);
  Object.assign(report, { status: counts(rows).complete ? 'COMPLETE' : 'CASE_COMPLETED',
    main_synchronized: true, main_sha: git('rev-parse', 'HEAD'), campaign: counts(rows) });
}
try { await publish(); } catch (error) {
  report.error = error.message;
  if (!report.merge_sha) report.status = 'blocked_before_merge';
  process.exitCode = 1;
} finally {
  write(`${output}/result.json`, report);
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## Case QA v5\n\nStatus: **${report.status}**\n\n${JSON.stringify(report.campaign)}\n\nMain synchronized: ${report.main_synchronized}\n\n${report.error || ''}\n`);
}
