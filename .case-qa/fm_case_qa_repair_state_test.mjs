#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkpointPath, saveCheckpoint, readCheckpoint, replayCachedRepairs, normalizeRuleLabels } from './fm_case_qa_repair_state.mjs';
import { protectedIdentity } from './fm_case_qa_runner.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value)); };

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

    // Legacy mutation is rejected before any provider; modern integration is offline.
    const retired = spawnSync(process.execPath, ['.case-qa/fm_case_qa_runner.mjs'], {
      encoding: 'utf8', timeout: 10000,
      env: { ...process.env, OPENAI_API_KEY: '', GEMINI_API_KEY: '', FM_QA_ALLOW_AI: 'true' }
    });
    assert.notEqual(retired.status, 0);
    assert.match(retired.stderr, /LEGACY_MUTATION_RETIRED/); checks++;
    console.log(`Repair state: ${checks} checkpoint, cache, identity and legacy-retirement checks PASS; no provider calls.`);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
