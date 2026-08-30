#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkpointPath, saveCheckpoint, readCheckpoint, replayCachedRepairs, normalizeRuleLabels } from './fm_case_qa_repair_state.mjs';
import { protectedIdentity, stripAuthoring } from './fm_case_qa_runner.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value)); };

if (process.env.FM_QA_TEST_MOCK === 'true') {
  let call = 0;
  const plans = JSON.parse(fs.readFileSync(process.env.FM_QA_TEST_PLANS, 'utf8'));
  // Hard network isolation: no request is sent, including when plans run out.
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const request = JSON.parse(options.body);
    fs.appendFileSync(process.env.FM_QA_TEST_PROMPTS, JSON.stringify(request) + '\n');
    const plan = plans[call++];
    if (!plan) throw new Error('TEST: unexpected extra model call; network blocked');
    return { ok: true, status: 200, json: async () => ({ output_text: JSON.stringify(plan), usage: { input_tokens: 10, output_tokens: 10 } }) };
  };
} else {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-repair-regression-'));
  let checks = 0;
  try {
    const identity = { case_id: 'fixture', source_case_hash: 'source-a', simulator_hash: 'engine-a' };
    const candidate = { score: 97, id: 'fixture' };
    saveCheckpoint(temp, identity, candidate);
    assert.deepEqual(readCheckpoint(temp, identity), candidate); checks++;
    assert.equal(readCheckpoint(temp, { ...identity, source_case_hash: 'changed' }), null); checks++;
    assert.equal(readCheckpoint(temp, { ...identity, simulator_hash: 'changed' }), null); checks++;
    const saved = JSON.parse(fs.readFileSync(checkpointPath(temp, identity), 'utf8'));
    saved.candidate.score = 100;
    write(checkpointPath(temp, identity), saved);
    assert.equal(readCheckpoint(temp, identity), null); checks++;

    const keyFor = (version, attempt, input) => `${version}-${attempt.phase}-${input.score}`;
    for (const [key, score] of [['old-a-0', 50], ['old-b-50', 97], ['new-a-0', -1], ['new-b-0', -2]]) {
      write(path.join(temp, `${key}.json`), { key, plan: { score } });
    }
    const replayed = replayCachedRepairs({ directory: temp, initial: { score: 0 }, versions: ['old', 'new'],
      attempts: [{ phase: 'a' }, { phase: 'b' }], keyFor,
      apply: (_, plan) => clone(plan), assess: (item) => item.score,
      better: (_, score, __, previous) => score > previous });
    assert.equal(replayed.candidate.score, 97); assert.equal(replayed.recovered, 4); checks++;

    const fixture = { puzzleId: 'fixture', title: 'Keep', solution: { suspectId: 's1' },
      suspects: [{ id: 's1', name: 'Tanık', icon: 'locked' }], weapons: [{ id: 'w1', name: 'Bıçak' }], locations: [],
      clues: [{ id: 'c1', logicRules: [{ action: 'eliminate', pair: ['s1', 'w1'] }],
        qaRationale: { matrixEffect: 's1 != w1', evidenceLink: 'Metindeki mevcut kanıt aynen kalır.', evidenceKind: 'witness' } }] };
    const normalized = normalizeRuleLabels(fixture);
    assert.equal(normalized.clues[0].qaRationale.matrixEffect, 'Tanık ≠ Bıçak elenir');
    assert.equal(normalized.clues[0].qaRationale.evidenceLink, fixture.clues[0].qaRationale.evidenceLink);
    assert.deepEqual(normalized.clues[0].logicRules, fixture.clues[0].logicRules);
    assert.equal(fixture.clues[0].qaRationale.matrixEffect, 's1 != w1'); checks++;
    for (const mutate of [x => { x.solution.suspectId = 's2'; }, x => { x.clues[0].id = 'c2'; },
      x => { x.suspects[0].icon = 'changed'; }, x => { x.title = 'changed'; }]) {
      const changed = clone(fixture); mutate(changed);
      assert.notEqual(protectedIdentity(changed), protectedIdentity(fixture)); checks++;
    }

    // Integration: use the real, certified rc_001 case, corrupt only its story,
    // and make the model first propose an equally invalid story then restore it.
    // pp_001 remains the independent gold gate. No paid API or writes to the repo.
    const root = process.cwd();
    const db = JSON.parse(fs.readFileSync('artifacts/dedektif/data/puzzles_database.json', 'utf8'));
    const selected = db.packs.flatMap(pack => pack.puzzles).find(item => item.puzzleId === 'rc_001');
    assert.ok(selected);
    const originalStory = selected.story;
    assert.ok(originalStory);
    selected.story = 'Kısa öykü.';
    const sidecars = JSON.parse(fs.readFileSync('artifacts/dedektif/qa/case_qa_sidecars_v29_5.json', 'utf8'));
    sidecars.cases.rc_001.source_content_hash = hash(stripAuthoring(selected));
    const policy = JSON.parse(fs.readFileSync('.case-qa/fm_case_qa_policy_v3_1.json', 'utf8'));
    policy.authoring.calibration_case_ids = ['pp_001'];
    write(path.join(temp, 'database.json'), db);
    write(path.join(temp, 'sidecars.json'), sidecars);
    write(path.join(temp, 'policy.json'), policy);
    const plan = (story) => ({ case_id: 'rc_001', assessment: 'offline test', operations: [
      { op: 'replace', path: '/story', value_json: JSON.stringify(story), reason: 'offline regression fixture' }
    ] });
    write(path.join(temp, 'plans.json'), [plan('Kısa öykü.'), plan(originalStory)]);
    const run = (name, cacheGroup = 'integration-cache') => {
      const result = spawnSync(process.execPath, ['--import', fileURLToPath(import.meta.url), '.case-qa/fm_case_qa_runner.mjs'], {
        cwd: root, encoding: 'utf8', timeout: 120000,
        env: { ...process.env, OPENAI_API_KEY: 'offline-mock-only', FM_QA_TEST_MOCK: 'true',
          FM_QA_TEST_PLANS: path.join(temp, 'plans.json'), FM_QA_TEST_PROMPTS: path.join(temp, `${name}-prompts.jsonl`),
          FM_QA_ROOT: root, FM_QA_MODE: 'pilot', FM_QA_ALLOW_AI: 'true', FM_QA_CASE_IDS: 'rc_001', FM_QA_CASE_LIMIT: '1',
          FM_QA_APPLY_TO_WORKTREE: 'false', FM_QA_PREMIUM_PATH: path.join(temp, 'database.json'),
          FM_QA_SIDECAR_PATH: path.join(temp, 'sidecars.json'), FM_QA_POLICY_PATH: path.join(temp, 'policy.json'),
          FM_QA_CACHE_DIR: path.join(temp, cacheGroup), FM_QA_OUTPUT_DIR: path.join(temp, name) }
      });
      assert.equal(result.status, 0, result.stdout + '\n' + result.stderr);
      return JSON.parse(fs.readFileSync(path.join(temp, name, 'fm_case_qa_run_report.json'), 'utf8'));
    };
    const first = run('first');
    assert.equal(first.summary.final_campaign_passed, 1, JSON.stringify(first.cases[0]));
    assert.equal(first.cases[0].attempts[0].retained_as_best, false);
    assert.equal(first.summary.api_calls, 2);
    const prompts = fs.readFileSync(path.join(temp, 'first-prompts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.match(prompts[1].input[1].content[0].text, /PREVIOUS CANDIDATES REJECTED BY THE EXACT SIMULATOR/); checks++;
    const resumed = run('resumed');
    assert.equal(resumed.summary.final_campaign_passed, 1);
    assert.equal(resumed.summary.api_calls, 0);
    assert.equal(resumed.cases[0].recovery.checkpoint_found, true);
    assert.equal(resumed.cases[0].recovery.resumed_score, 100);
    assert.equal(fs.existsSync(path.join(temp, 'resumed-prompts.jsonl')), false); checks++;

    // Repeating an exhausted strategy must not buy another set of attempts.
    write(path.join(temp, 'plans.json'), Array.from({ length: 5 }, () => plan('Kısa öykü.')));
    const exhausted = run('exhausted', 'exhausted-cache');
    assert.equal(exhausted.summary.final_campaign_passed, 0);
    assert.equal(exhausted.summary.api_calls, 5);
    assert.equal(exhausted.summary.quarantined, 1);
    write(path.join(temp, 'plans.json'), []);
    const exhaustedAgain = run('exhausted-again', 'exhausted-cache');
    assert.equal(exhaustedAgain.summary.api_calls, 0);
    assert.equal(exhaustedAgain.summary.final_campaign_passed, 0);
    assert.equal(fs.existsSync(path.join(temp, 'exhausted-again-prompts.jsonl')), false); checks++;

    // Rebuild an older-version paid patch using the exact original cache key,
    // and prove recovery runs the real simulator without any model request.
    const digestText = (value) => crypto.createHash('sha256').update(value).digest('hex');
    const evidenceFile = path.join(temp, 'exhausted', 'repair-checkpoints', `${digestText('rc_001')}.json`);
    const initial = JSON.parse(fs.readFileSync(evidenceFile, 'utf8')).candidate;
    const oldKey = digestText(`fm-case-qa-patch-v4.6.0|${exhausted.source.sha256.combined}|rc_001|bulk|luna_first_pass|${policy.models.first_pass}|${hash(initial)}`);
    write(path.join(temp, 'legacy-cache', `${oldKey}.json`), { key: oldKey, plan: plan(originalStory), usage: {} });
    const legacy = run('legacy', 'legacy-cache');
    assert.equal(legacy.summary.final_campaign_passed, 1, JSON.stringify(legacy.cases[0]));
    assert.equal(legacy.summary.api_calls, 0);
    assert.equal(legacy.cases[0].recovery.legacy_patches_replayed, 1);
    assert.equal(fs.existsSync(path.join(temp, 'legacy-prompts.jsonl')), false); checks++;
    console.log(`Repair recovery regression: ${checks} checks PASS; real HTML rejected-candidate feedback and zero-call checkpoint resume PASS.`);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
