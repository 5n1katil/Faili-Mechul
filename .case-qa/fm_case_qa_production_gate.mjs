#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.FM_QA_ROOT || process.cwd());
const outputDir = path.resolve(root, process.env.FM_QA_OUTPUT_DIR || '.case-qa-output');
const reportPath = path.join(outputDir, 'fm_case_qa_run_report.json');
const prePath = path.join(outputDir, 'fm_case_qa_certification_pre.json');
const postPath = path.join(outputDir, 'fm_case_qa_certification_post.json');
const releasePath = path.join(outputDir, 'fm_case_qa_release_manifest.json');

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`PRODUCTION_GATE: required evidence missing: ${path.relative(root, file)}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function requireGate(condition, message, failures) {
  if (!condition) failures.push(message);
}

const report = readJson(reportPath);
const pre = readJson(prePath);
const post = readJson(postPath);
const summary = report.summary || {};
const failures = [];

requireGate(report.mode === 'full', `mode must be full, received ${report.mode}`, failures);
requireGate(report.ai_enabled === true, 'AI repair must be enabled for a production campaign', failures);
requireGate(report.campaign_calibrated === true, 'gold calibration did not complete', failures);
requireGate(Number(summary.total_repository_cases) === 105, `repository case count is ${summary.total_repository_cases}/105`, failures);
requireGate(Number(summary.selected_cases) === 105, `selected case count is ${summary.selected_cases}/105`, failures);
requireGate(Number(summary.final_campaign_passed) === 105, `final simulator pass count is ${summary.final_campaign_passed}/105`, failures);
requireGate(summary.campaign_complete_105 === true, 'campaign_complete_105 is not true', failures);
requireGate(Number(summary.quarantined) === 0, `${summary.quarantined} case(s) are quarantined`, failures);
requireGate(Number(summary.budget_stopped) === 0, `${summary.budget_stopped} case(s) stopped on budget`, failures);
requireGate(Number(summary.authoring_contract_rejected) === 0, `${summary.authoring_contract_rejected} authoring contract(s) were rejected`, failures);
requireGate(Array.isArray(report.cases) && report.cases.length === 105, 'case evidence does not contain exactly 105 rows', failures);
requireGate((report.cases || []).every((item) => item.final_campaign?.passed === true), 'one or more case rows failed the final campaign gate', failures);
requireGate(pre.certified === true && post.certified === true, 'pre/post exact HTML certification is not green', failures);
requireGate(Number(pre.sources?.total_cases) === 105 && Number(post.sources?.total_cases) === 105, 'pre/post certification did not evaluate 105 cases', failures);
requireGate(pre.identity_manifest_sha256 === post.identity_manifest_sha256, 'case/entity/clue/solution/asset identity changed', failures);
requireGate(Number(post.evaluation?.direct_html_wrapper_parity_failures) === 0, 'HTML/wrapper parity failed', failures);

const manifest = {
  schema_version: 'fm_case_qa_release_manifest_v1',
  production_ready: failures.length === 0,
  run_id: report.run_id,
  source_sha256: report.source?.sha256?.combined || null,
  simulator_version: post.simulator?.version || null,
  identity_manifest_sha256: post.identity_manifest_sha256 || null,
  exact_case_count: Number(summary.total_repository_cases || 0),
  exact_pass_count: Number(summary.final_campaign_passed || 0),
  changed_case_ids: [...new Set([
    ...(summary.publishable_authoring_case_ids || []),
    ...(summary.publishable_case_ids || [])
  ])].sort(),
  gate: {
    campaign_calibrated: report.campaign_calibrated === true,
    quarantined: Number(summary.quarantined || 0),
    budget_stopped: Number(summary.budget_stopped || 0),
    pre_certified: pre.certified === true,
    post_certified: post.certified === true,
    html_wrapper_parity_failures: Number(post.evaluation?.direct_html_wrapper_parity_failures || 0)
  },
  failures
};

fs.writeFileSync(releasePath, `${JSON.stringify(manifest, null, 2)}\n`);
if (failures.length) {
  console.error(JSON.stringify(manifest, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(manifest, null, 2));
