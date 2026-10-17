import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { read, write } from './core.mjs';

export const emptyState = () => ({ schema: 'fm_case_pipeline_state_v1', active_id: null, cases: {}, requests: {}, campaign_spent: 0 });
export function pushCheckpoint(git, branch, expected, proposed) {
  const ref = `refs/heads/${branch}`;
  const head = () => {
    const value = git('ls-remote', '--heads', 'origin', ref);
    if (!value) return '';
    const [sha, returnedRef] = value.split(/\s+/);
    if (!/^[a-f0-9]{40}$/.test(sha) || returnedRef !== ref) throw new Error('STATE_REMOTE_INVALID');
    return sha;
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const remoteHead = head();
    if (remoteHead === proposed) return;
    if (remoteHead !== expected) throw new Error('STATE_STALE_WRITER');
    try { git('push', 'origin', `${proposed}:${ref}`); return; }
    catch (error) {
      const observed = head();
      if (observed === proposed) return;
      if (observed !== expected) throw new Error('STATE_STALE_WRITER');
      if (attempt === 1) throw error;
    }
  }
}
export function validateState(state) {
  if (state?.schema !== 'fm_case_pipeline_state_v1' || !state.cases || !state.requests ||
      !Number.isFinite(state.campaign_spent) || state.campaign_spent < 0) throw new Error('STATE_INVALID');
  for (const record of Object.values(state.cases))
    if (!Number.isFinite(record.spent) || record.spent < 0) throw new Error('STATE_INVALID_CASE_BUDGET');
  for (const record of Object.values(state.requests))
    if (!Number.isFinite(record.charged) || record.charged < 0 || !state.cases[record.case_id] ||
        !/^\d{4}-\d{2}-\d{2}$/.test(record.day || '') ||         !['repair', 'player', 'judge', 'editorial'].includes(record.purpose) ||
        !['reserved', 'completed', 'failed', 'invalid_response'].includes(record.status) ||
        (record.revision_grant_id !== undefined && !/^[a-z0-9-]{8,80}$/.test(record.revision_grant_id))) throw new Error('STATE_INVALID_LEDGER');
  const total = Object.values(state.requests).reduce((sum, r) => sum + r.charged, 0);
  if (Math.abs(total - state.campaign_spent) > 0.000001) throw new Error('STATE_LEDGER_MISMATCH');
  for (const [id, record] of Object.entries(state.cases)) {
    const subtotal = Object.values(state.requests).filter(r => r.case_id === id).reduce((sum, r) => sum + r.charged, 0);
    if (Math.abs(subtotal - record.spent) > 0.000001) throw new Error('STATE_CASE_LEDGER_MISMATCH');
  }
  return state;
}

// A dedicated Git branch is the durable journal. No force pushes and no cache
// restore fallback: missing/corrupt existing state is an error, not free budget.
export function openStore(root, policy, { localFile } = {}) {
  if (localFile) {
    const state = fs.existsSync(localFile) ? validateState(read(localFile)) : emptyState();
    return { state, save() { validateState(state); write(localFile, state); } };
  }
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const branch = policy.sequential.state_branch;
  if (!/^automation\/[a-z0-9-]+$/.test(branch)) throw new Error('INVALID_STATE_BRANCH');
  // ls-remote exit code is checked: a network failure never means no state.
  const remote = git('ls-remote', '--heads', 'origin', `refs/heads/${branch}`);
  const directory = path.join(root, '.case-pipeline-journal-' + process.pid);
  let oldHead = '';
  if (remote) {
    git('fetch', 'origin', `refs/heads/${branch}`);
    oldHead = git('rev-parse', 'FETCH_HEAD');
    git('worktree', 'add', '--detach', directory, oldHead);
  } else {
    fs.mkdirSync(directory, { recursive: true });
    execFileSync('git', ['init', '-b', branch, directory], { stdio: 'pipe' });
  }
  const file = path.join(directory, 'state.json');
  const state = remote ? validateState(read(file)) : emptyState();
  const journalGit = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  journalGit('config', 'user.name', 'faili-mechul-qa-bot');
  journalGit('config', 'user.email', 'qa-bot@users.noreply.github.com');
  return { state, save() {
    validateState(state);
    write(file, state);
    journalGit('add', 'state.json');
    const changed = journalGit('diff', '--cached', '--name-only');
    if (changed) journalGit('commit', '-m', 'qa: persist bounded sequential checkpoint');
    const newHead = journalGit('rev-parse', 'HEAD');
    if (!changed && newHead === oldHead) return;
    if (!remote) {
      // Import the new orphan commit into the credential-bearing repository.
      git('fetch', directory, branch);
    }
    pushCheckpoint(git, branch, oldHead, newHead);
    oldHead = newHead;
  } };
}
export function readRemoteState(root, policy) {
  const branch = policy.sequential.state_branch;
  if (!/^automation\/[a-z0-9-]+$/.test(branch)) throw new Error('INVALID_STATE_BRANCH');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const remote = git('ls-remote', '--heads', 'origin', `refs/heads/${branch}`);
  if (!remote) throw new Error('STATE_BRANCH_MISSING');
  git('fetch', 'origin', `refs/heads/${branch}`);
  const sha = git('rev-parse', 'FETCH_HEAD');
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('STATE_REMOTE_INVALID');
  const text = execFileSync('git', ['show', `${sha}:state.json`], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return { sha, state: validateState(JSON.parse(text)) };
}
