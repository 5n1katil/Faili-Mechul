import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { read, write } from './core.mjs';

export const emptyState = () => ({ schema: 'fm_case_qa_state_v5', active_id: null, cases: {}, requests: {}, campaign_spent: 0 });
export function validateState(state) {
  if (state?.schema !== 'fm_case_qa_state_v5' || !state.cases || !state.requests ||
      !Number.isFinite(state.campaign_spent) || state.campaign_spent < 0) throw new Error('STATE_INVALID');
  for (const record of Object.values(state.cases))
    if (!Number.isFinite(record.spent) || record.spent < 0) throw new Error('STATE_INVALID_CASE_BUDGET');
  for (const record of Object.values(state.requests))
    if (!Number.isFinite(record.charged) || record.charged < 0 || !state.cases[record.case_id]) throw new Error('STATE_INVALID_LEDGER');
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
  const directory = path.join(root, '.case-qa-v5-journal');
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
    if (!journalGit('diff', '--cached', '--name-only')) return;
    journalGit('commit', '-m', 'qa: persist bounded sequential checkpoint');
    const newHead = journalGit('rev-parse', 'HEAD');
    if (!remote) {
      // Import the new orphan commit into the credential-bearing repository.
      git('fetch', directory, branch);
    }
    git('push', 'origin', `${newHead}:refs/heads/${branch}`);
    oldHead = newHead;
  } };
}
