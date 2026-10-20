#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { read } from './core.mjs';
import { assertDraftPolicy } from './publish-draft.mjs';
import { buildPlaySite, playPreviewBody, repoRoot } from './play-preview.mjs';

const repo = repoRoot(path.dirname(new URL(import.meta.url).pathname));
const policy = read(path.join(repo, '.case-qa/pipeline/policy.json'));
const simulatorPath = path.join(repo, policy.simulator.path);
const CONTENT = '3bb803f1eedead9bc7e1af497b94a8d141cb1c73';
const FINGERPRINT = 'detaylı swap testleri';
const OLD_C4 = 'ahşap kompartımanından adımını bile atmadığı';
const NEW_C4 = 'mühürlü teslim defteri';
const guarded = [
  policy.simulator.path,
  '.case-qa/pipeline/policy.json',
  'artifacts/dedektif/data/puzzles.ts',
  'artifacts/dedektif/qa/case_qa_sidecars_v29_5.json',
  '.case-qa/pipeline/review-revision-grants.json',
  '.case-qa/pipeline/prepayment-continuations.json'
];

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex');
}
function hashes() {
  return Object.fromEntries(guarded.map(file => [file, sha256(file)]));
}
function trenClue(site, id) {
  const tren = site.manifest.cases.find(item => item.id === 'tren-yolculugunda-cinayet');
  assert.equal(tren.playable, true);
  return tren.payload.clues.find(clue => clue.id === id).text;
}

test('play preview keeps the simulator pin and hides QA from the player payload', () => {
  const before = hashes();
  const source = fs.readFileSync(new URL('./play-preview.mjs', import.meta.url), 'utf8');
  assert.equal(source.includes('generativelanguage'), false);
  assert.equal(source.includes('callPaid'), false);
  assert.equal(source.includes('modelPreflight'), false);
  const site = buildPlaySite({ repo });
  const after = hashes();
  assert.deepEqual(after, before);
  assert.equal(site.simulatorBlob, policy.simulator.git_blob_sha);
  assert.equal(site.manifest.simulator.git_blob_sha, policy.simulator.git_blob_sha);
  assert.equal(site.manifest.approval, 'playtest_only');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  assert.equal(site.manifest.build_commit, head);
  assert.equal(site.manifest.content_commit, CONTENT);
  assert.equal(site.manifest.commit, CONTENT);
  assert.equal(site.manifest.content_source, 'pinned');
  const pin = JSON.parse(fs.readFileSync(path.join(repo, '.case-qa/pipeline/play-content-source.json'), 'utf8'));
  for (const [rel, expected] of Object.entries(pin.files)) {
    const blob = execFileSync('git', ['show', `${CONTENT}:${rel}`], { cwd: repo, maxBuffer: 32 * 1024 * 1024 });
    assert.equal(crypto.createHash('sha256').update(blob).digest('hex'), expected);
    assert.equal(sha256(rel), expected);
  }
  assert.match(trenClue(site, 'c4'), new RegExp(NEW_C4));
  assert.equal(trenClue(site, 'c4').includes(OLD_C4), false);
  assert.equal(fs.readFileSync(new URL('./play-client.js', import.meta.url), 'utf8').includes('Altyapı build'), true);
  assert.equal(JSON.stringify(site.manifest).includes(FINGERPRINT), false);
  const tren = site.manifest.cases.find(item => item.id === 'tren-yolculugunda-cinayet');
  assert.equal(tren.content_hash, '41215658d17efe3c91f2405287a32908560e67cbbce137fb62139395f6b2a468');
  assert.equal(Object.hasOwn(tren.payload, 'logicRules'), false);
  assert.equal(JSON.stringify(tren.payload).includes('logicRules'), false);
  assert.equal(JSON.stringify(tren.payload).includes('qaRationale'), false);
  assert.match(site.manifest.matching_rules.statements[0], /tek bir mekana tek bir silah/);
  assert.equal(site.html.includes('.sol{display:none'), true);
  assert.equal(site.html.includes('id="fm-play-manifest"'), true);
  assert.equal(site.html.includes('</html>\n<script'), false);
  const premium = site.manifest.cases.find(item => item.tier === 'premium');
  assert.equal(premium.playable, false);
  assert.equal(premium.payload, undefined);
  assert.match(premium.gaps.join(' '), /Premium/);
  const body = playPreviewBody(['tren-yolculugunda-cinayet']);
  assert.match(body, /\/oyna\/\?case=tren-yolculugunda-cinayet/);
  assert.match(body, /Otomatik birleştirme yoktur/);
  assertDraftPolicy(policy);
  assert.throws(() => assertDraftPolicy({ publication: { draft_only: true, auto_merge: true } }), /DRAFT_ONLY_REQUIRED/);
  assert.equal(sha256(policy.simulator.path), before[policy.simulator.path]);
});

test('PR 112 Tren preview uses that commit, not main', { skip: !hasCommit(CONTENT) }, () => {
  const before = hashes();
  const site = buildPlaySite({ repo, contentSha: CONTENT });
  assert.deepEqual(hashes(), before);
  assert.equal(site.manifest.build_commit, execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim());
  assert.equal(site.manifest.content_commit, CONTENT);
  assert.equal(site.manifest.commit, CONTENT);
  const tren = site.manifest.cases.find(item => item.id === 'tren-yolculugunda-cinayet');
  assert.equal(tren.playable, true);
  assert.match(trenClue(site, 'c4'), new RegExp(NEW_C4));
  assert.equal(JSON.stringify(tren.payload).includes(FINGERPRINT), false);
  assert.equal(JSON.stringify(tren.payload).includes(OLD_C4), false);
  assert.equal(site.manifest.assets['pa:tren_s1']?.startsWith('assets/'), true);
  assert.match(site.html, new RegExp(CONTENT));
  assert.equal(fs.readFileSync(simulatorPath).equals(fs.readFileSync(path.join(repo, policy.simulator.path))), true);
});

function hasCommit(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: repo, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
