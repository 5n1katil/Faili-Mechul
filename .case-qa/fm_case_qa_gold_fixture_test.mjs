#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-case-qa-gold-'));

try {
  const run = spawnSync(process.execPath, ['.case-qa/fm_case_qa_runner.mjs'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      OPENAI_API_KEY: '',
      FM_QA_ROOT: root,
      FM_QA_MODE: 'audit',
      FM_QA_ALLOW_AI: 'false',
      FM_QA_CASE_IDS: 'rc_001,pp_001',
      FM_QA_CASE_LIMIT: '0',
      FM_QA_APPLY_TO_WORKTREE: 'false',
      FM_QA_OUTPUT_DIR: outputDir
    }
  });

  assert.equal(run.status, 0, `Gold fixture audit failed:\n${run.stdout}\n${run.stderr}`);
  const report = JSON.parse(fs.readFileSync(path.join(outputDir, 'fm_case_qa_run_report.json'), 'utf8'));
  assert.equal(report.summary.selected_cases, 2);
  assert.equal(report.summary.final_campaign_passed, 2);
  assert.deepEqual(report.cases.map((item) => item.case_id).sort(), ['pp_001', 'rc_001']);

  for (const item of report.cases) {
    assert.equal(item.status, 'preserved_100', `${item.case_id}: ${item.status}`);
    assert.equal(item.baseline.score, 100, `${item.case_id}: score`);
    assert.equal(item.baseline.simulator_production_ready, true, `${item.case_id}: simulator productionReady`);
    assert.equal(item.baseline.leakage.status, 'passed', `${item.case_id}: pre-clue leakage`);
    assert.equal(item.baseline.leakage.avatar_prompt_risk, false, `${item.case_id}: avatar prompt risk`);
  }

  process.stdout.write('Gold fixtures: rc_001 and pp_001 are deterministic 100/100 production-ready cases.\n');
} finally {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
