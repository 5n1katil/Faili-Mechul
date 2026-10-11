#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { read, loadSnapshot, assertScope, assertNoRegression, scan, assess } from './core.mjs';
import { certificateValid } from './review.mjs';

const root = process.cwd(), policy = read('.case-qa/pipeline/policy.json');
const base = process.env.FM_PIPELINE_BASE_SHA, head = process.env.FM_PIPELINE_HEAD_SHA;
const selected = process.env.FM_PIPELINE_CASE_ID;
if (![base, head].every(s => /^[a-f0-9]{40}$/.test(s || '')) || !/^[a-zA-Z0-9_-]+$/.test(selected || ''))
  throw new Error('CERTIFICATION_INPUT_INVALID');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', 'HEAD') !== head) throw new Error('CERTIFICATION_HEAD_MISMATCH');
git('merge-base', '--is-ancestor', base, head);
const allowed = [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path];
if (git('diff', '--name-only', base, head).split('\n').filter(Boolean).some(p => !allowed.includes(p)))
  throw new Error('CERTIFICATION_SCOPE');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-cert-base-'));
try {
  for (const file of [...allowed, policy.simulator.path, policy.source.inventory_path, policy.review.media_evidence_path]) {
    fs.mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
    fs.writeFileSync(path.join(temp, file), execFileSync('git', ['show', base + ':' + file], { cwd: root }));
  }
  const before = loadSnapshot(temp, policy), after = loadSnapshot(root, policy);
  assertScope(before, after, selected); assertNoRegression(scan(before), scan(after), selected);
  const entry = after.entries.find(e => e.id === selected);
  if (!entry || !assess(after, entry, entry.candidate).passed ||
      !certificateValid(after, entry, entry.candidate, after.sidecar.cases[selected]?.pipeline_review))
    throw new Error('CERTIFICATION_REVIEW_OR_QA');
  console.log('PASS: selected case, independent review certificate, source scope and portfolio regression');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
