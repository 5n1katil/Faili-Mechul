#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { read, write, loadSnapshot, assertNoRegression, scan } from './core.mjs';
import { certificateValid } from './review.mjs';
import { openStore } from './state.mjs';
import { api } from './github.mjs';
import { playPreviewBody } from './play-preview.mjs';

export function assertDraftPolicy(policy) {
  if (policy.publication?.draft_only !== true || policy.publication?.auto_merge !== false)
    throw new Error('DRAFT_ONLY_REQUIRED');
}
export async function publishDraft() {
  const root = process.cwd(), policy = read('.case-qa/pipeline/policy.json');
  assertDraftPolicy(policy);
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('PUBLICATION_REQUIRES_ACTIONS');
  const output = '.case-qa-output/pipeline', report = read(output + '/result.json');
  if (report.status !== 'ready_for_gates') throw new Error('CANDIDATE_NOT_READY');
  const repo = policy.source.repository;
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const base = report.main_sha;
  if (api('repos/' + repo + '/git/ref/heads/main').object.sha !== base) throw new Error('MAIN_CHANGED');
  const ids = report.selected_ids || [report.selected_id];
  if (!ids.length || ids.length > 5 || new Set(ids).size !== ids.length) throw new Error('PUBLICATION_SELECTION_INVALID');
  const snapshot = loadSnapshot(root, policy);
  const entries = ids.map(id => snapshot.entries.find(e => e.id === id));
  for (const entry of entries) {
    if (!entry || !certificateValid(snapshot, entry, entry.candidate, snapshot.sidecar.cases[entry.id]?.pipeline_review))
      throw new Error('REVIEW_CERTIFICATE_INVALID');
  }
  assertNoRegression(read(output + '/baseline.json'), scan(snapshot), ids);
  const changed = git('diff', '--name-only').split('\n').filter(Boolean);
  const allowed = [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path];
  if (changed.some(p => !allowed.includes(p))) throw new Error('UNEXPECTED_CHANGED_PATH');
  if (!changed.length) throw new Error('NO_CANDIDATE_DIFF');
  const branch = 'qa/case-' + crypto.createHash('sha256').update([...ids].sort().join(',') + base).digest('hex').slice(0, 20);
  const existing = api('repos/' + repo + '/pulls?state=all&head=5n1katil:' + branch + '&base=main&per_page=100');
  let pr = existing.find(p => p.state === 'open'), head;
  if (pr) {
    if (pr.draft !== true) throw new Error('PR_ALREADY_RELEASED_FOR_REVIEW');
    git('fetch', 'origin', 'refs/heads/' + branch); head = git('rev-parse', 'FETCH_HEAD');
    for (const file of allowed) if (!execFileSync('git', ['show', head + ':' + file], { cwd: root }).equals(fs.readFileSync(file)))
      throw new Error('EXISTING_PR_DIFFERS');
  } else {
    if (existing.length) throw new Error('PREVIOUS_PR_CLOSED');
    git('switch', '-c', branch);
    git('config', 'user.name', 'faili-mechul-qa-bot'); git('config', 'user.email', 'qa-bot@users.noreply.github.com');
    git('add', ...allowed); git('diff', '--cached', '--check');
    git('commit', '-m', 'qa: stage independently reviewed cases ' + ids.join(', ')); head = git('rev-parse', 'HEAD');
    const remote = git('ls-remote', '--heads', 'origin', 'refs/heads/' + branch);
    if (remote) {
      git('fetch', 'origin', 'refs/heads/' + branch);
      const remoteHead = git('rev-parse', 'FETCH_HEAD');
      if (git('rev-parse', head + '^{tree}') !== git('rev-parse', remoteHead + '^{tree}')) throw new Error('ORPHAN_BRANCH_DIFFERS');
      head = remoteHead;
    } else git('push', 'origin', 'HEAD:refs/heads/' + branch);
    if (api('repos/' + repo + '/git/ref/heads/main').object.sha !== base) throw new Error('MAIN_CHANGED_BEFORE_PR');
    pr = api('repos/' + repo + '/pulls', 'POST', { base: 'main', head: branch, draft: true,
      title: 'Case QA: ' + ids.join(', ') + ' — reviewed 100/100',
      body: ids.length + ' case(s); exact QA, blind player and independent editorial review passed.\n\nAPI calls: ' + report.api_calls +
        '; estimated USD at configured rates: ' + report.execute_cost_usd + '.\n\nDraft only. No automatic merge; no avatar generation. Candidate CI must pass and a person must review the game diff before merging.\n\n' +
        playPreviewBody(ids) });
  }
  Object.assign(report, { status: 'awaiting_review', pr_url: pr.html_url, pr_number: pr.number, candidate_sha: head,
    main_synchronized: false });
  write(output + '/result.json', report);
  const store = openStore(root, policy);
  for (const id of ids) {
    if (!store.state.cases[id]) throw new Error('PUBLICATION_LEDGER_MISSING');
    Object.assign(store.state.cases[id], { status: 'awaiting_review', pr_url: pr.html_url });
  }
  store.save();
  // PRs created by GITHUB_TOKEN do not start ordinary pull_request workflows.
  // Explicit dispatch has no AI key, write privilege or merge capability.
  api('repos/' + repo + '/actions/workflows/fm-case-pipeline.yml/dispatches', 'POST', {
    ref: branch, inputs: { mode: 'certify', case_id: ids.join(','), base_sha: base, head_sha: head }
  });
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  publishDraft().catch(error => { console.error(error.message); process.exitCode = 1; });
