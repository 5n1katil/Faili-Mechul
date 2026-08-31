#!/usr/bin/env node
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { read, write, loadSnapshot, scan, assertScope, assertNoRegression } from './core.mjs';

const root = process.cwd(), base = process.env.FM_QA_V5_BASE_SHA, head = process.env.FM_QA_V5_HEAD_SHA;
const selected = process.env.FM_QA_V5_SELECTED_ID;
if (!/^[a-f0-9]{40}$/.test(base || '') || !/^[a-f0-9]{40}$/.test(head || '') || !selected) throw new Error('MISSING_CERTIFIED_REVISIONS');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('rev-parse', 'HEAD') !== head) throw new Error('WRONG_HEAD_CHECKOUT');
const policy = read('.case-qa/v5/policy.json');
const changed = git('diff', '--name-only', base, head).split('\n').filter(Boolean);
const allowed = [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path];
if (!changed.length || changed.some(p => !allowed.includes(p))) throw new Error('DIFF_PATH_SCOPE');
git('diff', '--check', base, head);
const beforeDir = path.join(root, '.case-qa-v5-base');
git('worktree', 'add', '--detach', beforeDir, base);
const before = loadSnapshot(beforeDir, policy), after = loadSnapshot(root, policy);
assertScope(before, after, selected);
const beforeRows = scan(before), afterRows = scan(after);
assertNoRegression(beforeRows, afterRows, selected);
write('.case-qa-output/v5/certified-diff.json', { base, head, selected, passed: true, before: beforeRows, after: afterRows });
console.log(`Certified selected case ${selected}, unrelated cases and completed-case portfolio preserved.`);
