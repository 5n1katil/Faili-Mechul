#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, '.case-qa/fm_case_qa_production_gate.mjs');
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-production-gate-'));
const cases = Array.from({ length: 105 }, (_, index) => ({
  case_id: `case_${String(index + 1).padStart(3, '0')}`,
  final_campaign: { passed: true }
}));
const report = {
  mode: 'full',
  ai_enabled: true,
  campaign_calibrated: true,
  run_id: 'fixture',
  source: { sha256: { combined: 'source-sha' } },
  summary: {
    total_repository_cases: 105,
    selected_cases: 105,
    final_campaign_passed: 105,
    campaign_complete_105: true,
    quarantined: 0,
    budget_stopped: 0,
    authoring_contract_rejected: 0,
    publishable_authoring_case_ids: ['case_001'],
    publishable_case_ids: ['case_002']
  },
  cases
};
const cert = {
  certified: true,
  simulator: { version: '29.4' },
  sources: { total_cases: 105 },
  evaluation: { direct_html_wrapper_parity_failures: 0 },
  identity_manifest_sha256: 'identity-sha'
};
const appGate = {
  schema_version: 'fm_case_qa_app_gate_v1',
  certified: true,
  checks: {
    icons: 'pass',
    fingerprints: 'pass',
    solvability: 'pass',
    typecheck: 'pass',
    web_build: 'pass'
  }
};

function write(name, value) {
  fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function run() {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, FM_QA_ROOT: root, FM_QA_OUTPUT_DIR: outputDir },
    encoding: 'utf8'
  });
}

write('fm_case_qa_run_report.json', report);
write('fm_case_qa_certification_pre.json', { ...cert, phase: 'pre' });
write('fm_case_qa_certification_post.json', { ...cert, phase: 'post' });
write('fm_case_qa_app_gate.json', appGate);
const green = run();
assert.equal(green.status, 0, green.stderr);
const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'fm_case_qa_release_manifest.json'), 'utf8'));
assert.equal(manifest.production_ready, true);
assert.deepEqual(manifest.changed_case_ids, ['case_001', 'case_002']);
assert.equal(manifest.gate.application_certified, true);

report.summary.final_campaign_passed = 104;
report.summary.campaign_complete_105 = false;
report.cases[104].final_campaign.passed = false;
write('fm_case_qa_run_report.json', report);
const red = run();
assert.notEqual(red.status, 0);
const rejected = JSON.parse(fs.readFileSync(path.join(outputDir, 'fm_case_qa_release_manifest.json'), 'utf8'));
assert.equal(rejected.production_ready, false);
assert(rejected.failures.some((message) => message.includes('104/105')));

console.log('production gate: green 105/105 accepted; incomplete campaign rejected');
