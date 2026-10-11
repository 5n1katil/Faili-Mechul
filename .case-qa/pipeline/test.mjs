#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { read, write, clone, loadSnapshot, scan, selectNext, assess, guardedPatch, better,
  restoreBest, stageCandidate, repairPrompt, assertNoRegression, assertScope } from './core.mjs';
import { emptyState, validateState, openStore } from './state.mjs';
import { reserveRequest, requestBody, callPaid, Stop, modelPreflight, providerErrorDetails } from './provider.mjs';
import { assertDraftPolicy } from './publish-draft.mjs';
import { playerView, playerPass, judgePass, reviewCandidate, mediaPreflight, certificateValid } from './review.mjs';
import { repairOne, campaignRows, reopenTextQuarantine } from './run.mjs';
import { validateNewCase, previewNewCase } from './intake.mjs';
import { repairTermal } from '../fixtures/termal_reviewed_repair.mjs';
import { repairKonak } from '../fixtures/konak_reviewed_repair.mjs';
import { stableHash, parseStandard, PATCH_SCHEMA } from '../fm_case_qa_runner.mjs';
import { api } from './github.mjs';
import { diagnose, diagnosticStages } from './diagnose.mjs';
import { campaign } from './campaign.mjs';
import { TEXT_METHOD, TEXT_SYSTEM, supportsTextRepair, textRepairPlan, verifyTextPlan, enumerateTextGrid,
  compileTextPatch, textResponseSchema, validTextResponse, explainTextResponse, textRepairPrompt } from './text-repair.mjs';
import { verifiedTextResponses } from '../fixtures/verified-text-responses.mjs';
import { evaluatePreclueLeakage, n8nGuardSource } from '../case_qa_preclue_guard.mjs';

globalThis.fetch = async () => { throw new Error('TEST_NETWORK_FORBIDDEN'); };
const policy = read('.case-qa/pipeline/policy.json'), root = process.cwd();
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-pipeline-'));
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok ' + passed + ' - ' + name); };
const storeFor = (id = 'test') => ({ state: { ...emptyState(), cases: { [id]: { spent: 0 } } },
  save() { validateState(this.state); } });
const runFor = () => ({ calls: 0, spent: 0 });
const validJudge = () => ({ scores: { fairness: 4, clarity: 4, consistency: 4, originality: 4, engagement: 4 }, issues: [], summary: 'Clear evidence' });
const playerFor = c => ({ unique_solution: true, solution: c.solution, confidence: 90, issues: [],
  evidence: playerView(c).clues.slice(0, 2).map(e => ({ clue_id: e.id, quote: e.text.slice(0, 30) })) });
const response = (text, extra = {}) => ({ ok: true, status: 200, json: async () => ({
  usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, thoughtsTokenCount: 10 },
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }], ...extra }) });
const responseForFixture = value => response(JSON.stringify(value));
try {
  const snapshot = loadSnapshot(root, policy), rows = scan(snapshot);
  await test('exact engine and inventory cover the current repository without hardcoded total', () => {
    assert.equal(rows.length, snapshot.inventory.cases.length);
    for (const id of ['rc_001', 'pp_001']) assert.equal(rows.find(r => r.id === id).passed, true);
    assert.ok(campaignRows(snapshot).every(r => !r.content_locked || r.passed));
  });
  const original = snapshot.entries.find(e => e.id === 'termal-otelde-supheli-vaka');
  await test('actual Pazar response failed only on an investigator title; corrected exact HTML still blocks true double disclosures', () => {
    const fixture = read('.case-qa/fixtures/pazar-live-candidate-38158353700.json');
    const entry = snapshot.entries.find(e => e.id === fixture.candidate.id), candidate = clone(fixture.candidate);
    candidate.qaPortfolioRegistry = clone(entry.candidate.qaPortfolioRegistry);
    assert.equal(stableHash(candidate), fixture.candidate_hash);
    const oldPath = path.join(temporary, 'original-html.html');
    fs.writeFileSync(oldPath, execFileSync('git', ['show', fixture.simulator_hash]));
    const { loadEngine } = createRequire(import.meta.url)('../fm_case_qa_core.cjs');
    const before = assess({ ...snapshot, engine: loadEngine(oldPath) }, entry, candidate);
    assert.equal(before.result.score, 0); assert.match(before.result.blockers.join('\n'), /Çift Suç Bileşeni/);
    const after = assess(snapshot, entry, candidate);
    assert.equal(after.passed, true); assert.equal(after.result.score, 100);
    for (const text of [
      'Olay yeri inceleme ekipleri cinayet mahallinde kimyasal zehirlenme izlerini tespit etti.',
      'Olay yeri inceleme ekiplerinin raporunda maktulün cesedinde kimyasal zehirlenme bulunmadı.',
      'Maktulün cesedi burada bulundu; kimyasal zehirlenme dışlandı.',
      'Olay yerinde kimyasal zehirlenme tespit edildi.'
    ]) {
      const bad = clone(candidate); bad.clues[0].text = text;
      assert.match(assess(snapshot, entry, bad).result.blockers.join('\n'), /Çift Suç Bileşeni/);
    }
  });
  await test('only fully passing checkpoints survive this exact simulator correction; reviews, spend and repair counts are preserved', async () => {
    const fixture = read('.case-qa/fixtures/pazar-live-candidate-38158353700.json');
    const entry = snapshot.entries.find(e => e.id === fixture.candidate.id), store = storeFor(entry.id);
    const candidate = clone(fixture.candidate); candidate.qaPortfolioRegistry = clone(entry.candidate.qaPortfolioRegistry);
    Object.assign(store.state.cases[entry.id], { ...fixture, candidate, spent: 0.009551, source_hash: entry.sourceHash,
      review: { passed: true, candidate_hash: 'old-certificate' }, status: 'quarantined' });
    store.state.requests = Object.fromEntries([1,2].map(i => ['existing-' + i, {
      case_id: entry.id, charged: 0.009551 / 2, day: '2026-10-11', purpose: 'repair',
      status: 'completed', repair_method: TEXT_METHOD }]));
    store.state.campaign_spent = 0.009551;
    const priorRequests = stableHash(store.state.requests);
    const restored = restoreBest(snapshot, entry, store.state.cases[entry.id]);
    assert.equal(restored.assessment.passed, true);
    assert.equal(certificateValid(snapshot, entry, restored.candidate, store.state.cases[entry.id].review), false);
    let calls = 0;
    const result = await repairOne(snapshot, entry, store, { allowAI: true, caller: async args => {
      assert.notEqual(args.purpose, 'repair'); calls++;
      return { plan: args.purpose === 'player' ? playerFor(candidate) : validJudge() };
    } });
    assert.equal(calls, 2); assert.equal(result.status, 'ready_for_gates');
    assert.equal(store.state.cases[entry.id].spent, 0.009551);
    assert.equal(stableHash(store.state.requests), priorRequests);
    assert.equal(store.state.campaign_spent, 0.009551);
    assert.equal(store.state.cases[entry.id].simulator_hash, snapshot.simulatorHash);
    const corrupt = { ...fixture, candidate, source_hash: entry.sourceHash, candidate_hash: 'tampered' };
    assert.equal(restoreBest(snapshot, entry, corrupt).assessment.passed, false);
    const stale = { ...fixture, candidate, source_hash: entry.sourceHash, simulator_hash: 'unrelated-engine' };
    assert.equal(restoreBest(snapshot, entry, stale).assessment.passed, false);
    const failing = clone(candidate); failing.story = 'Eksik.';
    assert.equal(restoreBest(snapshot, entry, { ...fixture, candidate: failing, source_hash: entry.sourceHash,
      candidate_hash: stableHash(failing) }).assessment.passed, false);
  });
  await test('live verified-text failures expose actual length and every rejected quality/profile finding to the next writer', () => {
    const live = read('.case-qa/fixtures/failed-text-campaign-38156344466.json');
    assert.equal(live.requests.length, 5);
    for (const request of live.requests) {
      const entry = snapshot.entries.find(e => e.id === request.case_id), candidate = entry.candidate;
      const plan = textRepairPlan(snapshot, entry, candidate), baseline = assess(snapshot, entry, candidate);
      if (request.model === policy.models.first_pass || request.case_id === 'universitede-karanlik-sir') {
        assert.throws(() => compileTextPatch(candidate, plan, request.plan), /TEXT_CONTENT:story:MIN_60_WORDS/);
      } else if (request.case_id === 'bogazda-kayip-elmas') {
        assert.throws(() => compileTextPatch(candidate, plan, request.plan), /MIN_12_WORDS:ACTUAL_9/);
      } else {
        const next = guardedPatch(snapshot, entry, candidate, compileTextPatch(candidate, plan, request.plan), baseline);
        assert.equal(next.assessment.result.score, 100);
        assert.equal(next.assessment.passed, false); assert.equal(next.assessment.leakage.passed, true);
        const quality = next.assessment.result.qualityFindings;
        assert.ok(quality.length > 0);
        const feedback = { score: 100, result: { blockers: [], quality_findings: quality,
          leakage: { findings: [{ reasons: ['axis_name_profile_overlap:dukkan'] }], required_actions: ['rewrite_profiles'] }, gates: next.assessment.result.gates } };
        const prompt = textRepairPrompt(entry, candidate, plan, baseline, [feedback]);
        assert.ok(prompt.includes(JSON.stringify(quality[0]).slice(1, -1)));
        assert.match(prompt, /axis_name_profile_overlap:dukkan/);
        assert.match(prompt, /20-30 Turkish words/);
        assert.match(prompt, /not ANY exact listed entity name/);
        assert.equal(certificateValid(snapshot, entry, next.candidate, null), false);
      }
    }
  });
  await test('context overlap is not a unique profile assignment; exact ownership, names and distinctive single-owner cues stay blocked', () => {
    const live = read('.case-qa/fixtures/failed-text-campaign-38156344466.json');
    const response = live.requests.find(r => r.case_id === 'kapalicarsida-gizem' && r.model === policy.models.repair).plan;
    const entry = snapshot.entries.find(e => e.id === response.case_id), candidate = clone(entry.candidate);
    candidate.suspects.forEach(s => s.description = response.suspect_descriptions[s.id]);
    assert.equal(evaluatePreclueLeakage(candidate).passed, true);
    const generated = new Function(n8nGuardSource + '\nreturn fmPreclueLeakage;')();
    assert.deepEqual(generated(candidate), evaluatePreclueLeakage(candidate));
    candidate.suspects[1].description += ' Yalnız Dükkan İçi alanında bulunur.';
    assert.equal(evaluatePreclueLeakage(candidate).passed, false);
    candidate.locations[0].name = 'Selma Teyze Odası';
    assert.ok(evaluatePreclueLeakage(candidate).findings.some(f => f.direct_owner_binding));
    const distinctive = { suspects: [{ id: 's', name: 'Ada', description: 'Özgün burgulu gümüş zemberek ustası.' },
      { id: 't', name: 'Bora', description: 'Kırmızı ceketli sessiz konuk.' }], weapons: [{ id: 'w', name: 'Burgulu Zemberek', description: 'Gümüş zemberek.' }], locations: [] };
    assert.equal(evaluatePreclueLeakage(distinctive).passed, false);
    assert.deepEqual(generated(distinctive), evaluatePreclueLeakage(distinctive));
  });
  const failedCampaign = read('.case-qa/fixtures/failed-text-campaign-38151436437.json');
  await test('actual failed live text plans reproduce rejection offline; no provider content is published', () => {
    for (const id of Object.keys(verifiedTextResponses)) {
      const entry = snapshot.entries.find(e => e.id === id);
      let candidate = clone(entry.candidate), assessment = assess(snapshot, entry, candidate);
      for (const request of failedCampaign.requests.filter(r => r.case_id === id && r.plan)) {
        const next = guardedPatch(snapshot, entry, candidate, request.plan, assessment);
        assert.equal(next.assessment.passed, false);
        if (better(next.assessment, assessment)) { candidate = next.candidate; assessment = next.assessment; }
      }
      assert.equal(assessment.passed, false);
    }
  });
  await test('verified textual compiler reaches exact 100 on all three failed case contracts without changing identity', () => {
    const vectors = [];
    for (const [id, response] of Object.entries(verifiedTextResponses)) {
      const entry = snapshot.entries.find(e => e.id === id), current = entry.candidate;
      const plan = textRepairPlan(snapshot, entry, current), proof = verifyTextPlan(current, plan);
      assert.equal(proof.coreNecessary, true); assert.equal(proof.assignments, 2); assert.equal(proof.finalAssignments, 1);
      const next = guardedPatch(snapshot, entry, current, compileTextPatch(current, plan, response), assess(snapshot, entry, current));
      assert.equal(next.assessment.passed, true, id); assert.equal(next.assessment.result.score, 100);
      assert.deepEqual(next.candidate.solution, current.solution);
      for (const axis of ['suspects','weapons','locations'])
        assert.deepEqual(next.candidate[axis].map(e => [e.id,e.name,e.icon]), current[axis].map(e => [e.id,e.name,e.icon]));
      assert.deepEqual(next.candidate.clues.map(c => [c.id,c.isBonus]), current.clues.map(c => [c.id,c.isBonus]));
      assert.equal(next.assessment.result.qualityFindings.length, 0);
      assert.equal(certificateValid(snapshot, entry, next.candidate, null), false);
      const vector = next.assessment.result.patternSignature;
      for (const previous of vectors) assert.ok(Object.keys(vector).filter(k => vector[k] === previous[k]).length < 4);
      vectors.push(vector);
    }
  });
  await test('text planner is ID-independent; compiler rejects partial/extra outputs and keeps other formats on the existing path', () => {
    const entry = snapshot.entries.find(e => e.id === 'bogazda-kayip-elmas'), candidate = clone(entry.candidate);
    const plan = textRepairPlan(snapshot, entry, candidate), response = clone(verifiedTextResponses[entry.id]);
    const reordered = clone(candidate);
    reordered.solution = { locationId: candidate.solution.locationId, suspectId: candidate.solution.suspectId, weaponId: candidate.solution.weaponId };
    assert.equal(verifyTextPlan(reordered, textRepairPlan(snapshot, entry, reordered)).coreNecessary, true);
    assert.equal(validTextResponse(candidate, plan, response), true);
    assert.equal(validTextResponse(candidate, plan, { ...response, operations: [] }), false);
    delete response.clues.c6; assert.throws(() => compileTextPatch(candidate, plan, response), /TEXT_RESPONSE_INVALID/);
    assert.equal(supportsTextRepair({ ...entry, tier: 'premium' }, candidate), false);
    const media = clone(candidate); media.clues[0].mechanicType = 'audio'; assert.equal(supportsTextRepair(entry, media), false);
    const malformed = clone(candidate); malformed.weapons[0].id = malformed.suspects[0].id;
    assert.equal(supportsTextRepair(entry, malformed), false);
    const rename = Object.fromEntries(['suspects','weapons','locations'].flatMap(a => candidate[a].map(e => [e.id, 'entity_' + a + '_' + e.id])));
    for (const a of ['suspects','weapons','locations']) for (const entity of candidate[a]) entity.id = rename[entity.id];
    for (const f of ['suspectId','weaponId','locationId']) candidate.solution[f] = rename[candidate.solution[f]];
    assert.equal(verifyTextPlan(candidate, textRepairPlan(snapshot, entry, candidate)).coreNecessary, true);
  });
  await test('new-method recovery preserves money/history and gives exactly two versioned repairs within six total requests', async () => {
    const entry = snapshot.entries.find(e => e.id === 'kapalicarsida-gizem'), store = storeFor(entry.id);
    const record = store.state.cases[entry.id];
    Object.assign(record, { status: 'quarantined', source_hash: entry.sourceHash, simulator_hash: snapshot.simulatorHash });
    for (const r of failedCampaign.requests.filter(r => r.case_id === entry.id)) {
      store.state.requests[stableHash(r)] = clone(r); record.spent += r.charged; store.state.campaign_spent += r.charged;
    }
    const spent = store.state.campaign_spent, history = clone(store.state.requests);
    assert.deepEqual(reopenTextQuarantine(snapshot, store), [entry.id]);
    assert.equal(store.state.campaign_spent, spent); assert.deepEqual(store.state.requests, history);
    const plan = textRepairPlan(snapshot, entry, entry.candidate), response = verifiedTextResponses[entry.id];
    const p = textRepairPrompt(entry, entry.candidate, plan, assess(snapshot, entry, entry.candidate), []);
    assert.ok(p.length < 14000); assert.doesNotMatch(p, /qaPortfolioRegistry|Allowed JSON Pointer/);
    const calls = [];
    const oldKey = process.env.GEMINI_API_KEY; process.env.GEMINI_API_KEY = 'offline-test-only';
    const result = await repairOne(snapshot, entry, store, { allowAI: true, caller: async args => {
      calls.push(args);
      const candidate = guardedPatch(snapshot, entry, entry.candidate,
        compileTextPatch(entry.candidate, plan, response), assess(snapshot, entry, entry.candidate)).candidate;
      return callPaid({ ...args, transport: async () => responseForFixture(args.purpose === 'repair' ? response :
        args.purpose === 'player' ? playerFor(candidate) : validJudge()) });
    } });
    assert.equal(result.status, 'ready_for_gates'); assert.equal(result.run.calls, 3);
    assert.deepEqual(calls.map(c => c.purpose), ['repair','player','judge']);
    assert.equal(calls[0].repairMethod, TEXT_METHOD); assert.equal(calls[0].system, TEXT_SYSTEM);
    assert.deepEqual(Object.keys(calls[0].schema.properties).sort(), ['assessment','case_id','clues','story','suspect_descriptions']);
    const run = runFor();
    reserveRequest(store, policy, run, entry.id, policy.models.first_pass,
      requestBody(policy, policy.models.first_pass, 'second verified request'), 'repair', new Date(), TEXT_METHOD);
    assert.throws(() => reserveRequest(store, policy, run, entry.id, policy.models.first_pass,
      requestBody(policy, policy.models.first_pass, 'third verified request'), 'repair', new Date(), TEXT_METHOD), /REPAIR_LIMIT|CASE_REQUEST_LIMIT/);
    assert.throws(() => reserveRequest(store, policy, run, entry.id, policy.models.first_pass,
      requestBody(policy, policy.models.first_pass, 'legacy retry'), 'repair'), /REPAIR_LIMIT|CASE_REQUEST_LIMIT/);
    record.status = 'quarantined'; assert.deepEqual(reopenTextQuarantine(snapshot, store), []);
    assert.equal(Object.keys(store.state.requests).length, 6);
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
  });
  await test('short narrative is content feedback and reaches the stronger repair instead of pausing the campaign', async () => {
    const entry = snapshot.entries.find(e => e.id === 'universitede-karanlik-sir');
    const full = verifiedTextResponses[entry.id], short = clone(full); short.story = 'Kısa hikâye.';
    const plan = textRepairPlan(snapshot, entry, entry.candidate);
    assert.equal(validTextResponse(entry.candidate, plan, short), true);
    assert.deepEqual(explainTextResponse(entry.candidate, plan, short), []);
    assert.throws(() => compileTextPatch(entry.candidate, plan, short), /TEXT_CONTENT:story:MIN_60_WORDS/);
    const store = storeFor(entry.id), calls = [];
    const oldKey = process.env.GEMINI_API_KEY; process.env.GEMINI_API_KEY = 'offline-test-only';
    try {
      const repaired = guardedPatch(snapshot, entry, entry.candidate, compileTextPatch(entry.candidate, plan, full), assess(snapshot, entry, entry.candidate)).candidate;
      const result = await repairOne(snapshot, entry, store, { allowAI: true, caller: async args => {
        calls.push(args); const repairCalls = calls.filter(c => c.purpose === 'repair').length;
        if (args.purpose === 'repair' && repairCalls === 2) assert.match(args.prompt, /TEXT_CONTENT:story:MIN_60_WORDS/);
        return callPaid({ ...args, transport: async () => responseForFixture(args.purpose === 'repair' ?
          (repairCalls === 1 ? short : full) : args.purpose === 'player' ? playerFor(repaired) : validJudge()) });
      } });
      assert.equal(result.status, 'ready_for_gates'); assert.equal(result.run.calls, 4);
      assert.match(result.run.attempts[0].error, /TEXT_CONTENT/);
      assert.deepEqual(calls.slice(0, 2).map(c => c.model), [policy.models.first_pass, policy.models.repair]);
    } finally { if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; }
  });
  await test('invalid provider output records structural reason without retry or exposing narrative/credentials', async () => {
    const entry = snapshot.entries.find(e => e.id === 'universitede-karanlik-sir'), plan = textRepairPlan(snapshot, entry, entry.candidate);
    const invalid = clone(verifiedTextResponses[entry.id]); delete invalid.clues.c6;
    invalid.story = 'A story with a deliberately secret-like value';
    const store = storeFor(entry.id), run = runFor(), oldKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'offline-diagnostic-secret'; let calls = 0;
    try {
      await assert.rejects(callPaid({ store, policy, run, caseId: entry.id, model: policy.models.first_pass,
        prompt: 'invalid output probe', repairMethod: TEXT_METHOD, schema: textResponseSchema(entry.candidate, plan),
        validate: p => validTextResponse(entry.candidate, plan, p), diagnose: p => explainTextResponse(entry.candidate, plan, p),
        transport: async () => { calls++; return responseForFixture(invalid); } }), error => {
          assert.equal(error.message, 'INVALID_MODEL_RESPONSE'); assert.equal(error.provider_error.kind, 'SCHEMA');
          assert.ok(error.provider_error.validation_errors.includes('CLUE_KEYS_MISMATCH')); return true;
        });
      assert.equal(calls, 1); const request = Object.values(store.state.requests)[0];
      assert.equal(request.response_error.finish_reason, 'STOP'); assert.equal(request.status, 'invalid_response');
      assert.equal(request.response_error.story_word_count, 7);
      assert.ok(!JSON.stringify(request.response_error).includes('secret-like'));
      assert.ok(!JSON.stringify(request).includes(process.env.GEMINI_API_KEY));
    } finally { if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; }
  });
  const fixture = read('.case-qa/fixtures/termal-97-run-33305310409.json').candidate;
  fixture.qaPortfolioRegistry = clone(original.candidate.qaPortfolioRegistry);
  const entry = { ...original, candidate: fixture }, a97 = assess(snapshot, entry, fixture);
  const repaired = repairTermal(fixture);
  const plan = { case_id: entry.id, operations: [
    ...fixture.clues.flatMap((c, i) => Object.keys(repaired.clues[i]).filter(k => stableHash(c[k] ?? null) !== stableHash(repaired.clues[i][k])).map(k =>
      ({ op: Object.hasOwn(c, k) ? 'replace' : 'add', path: '/clues/' + i + '/' + k, value_json: JSON.stringify(repaired.clues[i][k]), reason: 'reviewed fixture' }))),
    { op: 'replace', path: '/qaSemanticFacts', value_json: JSON.stringify(repaired.qaSemanticFacts), reason: 'align evidence' },
    { op: 'replace', path: '/qaPattern/designIntent', value_json: JSON.stringify(repaired.qaPattern.designIntent), reason: 'align intent' }
  ] };
  await test('real 97 -> 100 repair preserves strict gates and identity', () => {
    assert.equal(a97.result.score, 97);
    const next = guardedPatch(snapshot, entry, fixture, plan, a97);
    assert.equal(next.assessment.passed, true); assert.equal(better(next.assessment, a97), true);
  });
  await test('offline Konak candidate reaches 100 and its four core clues are independently necessary', () => {
    const original = snapshot.entries.find(e => e.id === 'konakta-gece-yarisi-cinayeti');
    const candidate = repairKonak(original.candidate), before = assess(snapshot, original, original.candidate);
    const operations = ['story', 'qaSemanticFacts', 'qaPattern', 'qaAuthoringVersion'].map(field =>
      ({ op: Object.hasOwn(original.candidate, field) ? 'replace' : 'add', path: '/' + field,
        value_json: JSON.stringify(candidate[field]), reason: 'offline editorial repair' }));
    for (const [i, clue] of candidate.clues.entries()) for (const field of Object.keys(clue))
      if (stableHash(clue[field]) !== stableHash(original.candidate.clues[i][field] ?? null))
        operations.push({ op: Object.hasOwn(original.candidate.clues[i], field) ? 'replace' : 'add',
          path: '/clues/' + i + '/' + field, value_json: JSON.stringify(clue[field]), reason: 'align visible evidence and rule' });
    operations.push({ op: 'replace', path: '/weapons/2/name', value_json: JSON.stringify(candidate.weapons[2].name), reason: 'clarify existing hemp-rope profile' });
    const next = guardedPatch(snapshot, original, original.candidate, { case_id: original.id, operations }, before);
    assert.equal(next.assessment.passed, true);
    assert.equal(next.assessment.result.score, 100);
    assert.equal(next.assessment.result.simulatorProductionReady, true);
    assert.deepEqual(candidate.solution, original.candidate.solution);
    for (const axis of ['suspects', 'weapons', 'locations'])
      assert.deepEqual(candidate[axis].map(e => [e.id, e.icon]), original.candidate[axis].map(e => [e.id, e.icon]));
    // Separate exhaustive enumeration, independent of the HTML solver. The
    // anchor identifies w1; pair rules alone must locate its carrier and place.
    const perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
    const enumerate = clues => {
      const rows = [];
      for (const weapons of perms) for (const locations of perms) {
        const owner = id => id[0] === 's' ? Number(id[1])-1 :
          (id[0] === 'w' ? weapons : locations).indexOf(Number(id[1])-1);
        if (clues.every(c => c.logicRules.every(r =>
          (owner(r.pair[0]) === owner(r.pair[1])) === (r.action === 'confirm')))) {
          const culprit = weapons.indexOf(0);
          rows.push('s'+(culprit+1)+'|w1|l'+(locations[culprit]+1));
        }
      }
      return rows;
    };
    const core = candidate.clues.filter(c => !c.isBonus);
    assert.deepEqual([...new Set(enumerate(core))], ['s3|w1|l3']);
    assert.equal(enumerate(core).length, 2);
    for (const removed of core)
      assert.ok(new Set(enumerate(core.filter(c => c.id !== removed.id))).size > 1, removed.id);
    assert.equal(enumerate(candidate.clues).length, 1);
    assert.equal(certificateValid(snapshot, original, candidate, null), false);
  });
  await test('grading policy and identity cannot be patched', () => {
    assert.throws(() => guardedPatch(snapshot, entry, fixture, { ...plan, operations: [
      { op: 'replace', path: '/qaPolicy', value_json: '{}', reason: 'cheat' }] }, a97), /LOCKED_FIELD/);
    assert.throws(() => guardedPatch(snapshot, entry, fixture, { ...plan, case_id: 'wrong' }, a97), /CASE_ID/);
    const unsafe = clone(policy); unsafe.simulator.minimum_score = 80;
    assert.throws(() => loadSnapshot(root, unsafe), /UNSAFE_PIPELINE_POLICY/);
    assert.throws(() => guardedPatch(snapshot, entry, fixture, { ...plan,
      operations: Array.from({ length: 81 }, () => plan.operations[0]) }, a97), /80/);
    assert.equal(PATCH_SCHEMA.properties.operations.maxItems, 80);
    const wire = requestBody(policy, policy.models.first_pass, 'test').generationConfig.responseFormat.text.schema;
    assert.equal(wire.properties.operations.maxItems, undefined);
    assert.deepEqual(wire.properties.operations.items, PATCH_SCHEMA.properties.operations.items);
  });
  await test('repair transport omission never becomes a missing authoring field or allowed locked path', () => {
    const konak = snapshot.entries.find(e => e.id === 'konakta-gece-yarisi-cinayeti');
    const prompt = repairPrompt(konak, konak.candidate, assess(snapshot, konak, konak.candidate), []);
    const allowed = prompt.split('Allowed JSON Pointer paths:\n')[1].split('\n\nCASE:')[0];
    for (const field of ['qaPolicy', 'qaPortfolioRegistry', 'intentionalMononymIds'])
      assert.ok(!allowed.includes('/' + field));
    const status = JSON.parse(prompt.split('AUTHORING CONTRACT STATUS (must also be complete after repair):\n')[1].split('\n\nCanonical')[0]);
    assert.ok(!status.completeness.missing.includes('/qaPortfolioRegistry/entries'));
    const projected = JSON.parse(prompt.split('\n\nCASE:\n')[1].split('\n\nDETERMINISTIC')[0]);
    assert.equal(projected.qaPortfolioRegistry, undefined);
    assert.ok(prompt.startsWith('PIPELINE CODE LOCK:'));
    assert.ok(prompt.includes('supports confirm, not eliminate'));
  });
  await test('regressed score or safety gate cannot replace the best candidate', () => {
    const bad = clone(a97); bad.result.score = 96; bad.penalty = 0;
    assert.equal(better(bad, a97), false); bad.result.score = 98; bad.result.gates.coreNecessity.passed = false;
    assert.equal(better(bad, a97), false);
  });
  await test('stale or forged checkpoint cannot change the source', () => {
    const record = { source_hash: entry.sourceHash, simulator_hash: snapshot.simulatorHash,
      candidate: repaired, candidate_hash: 'forged' };
    assert.equal(restoreBest(snapshot, entry, record).assessment.result.score, 97);
    record.candidate_hash = stableHash(repaired);
    assert.equal(restoreBest(snapshot, entry, record).assessment.result.score, 100);
    record.source_hash = 'stale'; assert.equal(restoreBest(snapshot, entry, record).assessment.result.score, 97);
  });
  await test('blind player receives no answers, hints, rules, metadata or mechanic solution', () => {
    const c = clone(repaired); c.secret = 'LEAK';
    c.clues[0].mechanicData = { answer: 'LEAK' }; c.clues[0].deductionHint = 'LEAK';
    const v = playerView(c), text = JSON.stringify(v);
    assert.ok(!text.includes('LEAK')); assert.ok(!text.includes('solution'));
    assert.ok(!text.includes('logicRules')); assert.ok(!text.includes('qa'));
    assert.equal(v.clues.length, c.clues.filter(c => !c.isBonus).length);
  });
  await test('wrong, uncertain or fabricated player evidence blocks acceptance', () => {
    const v = playerView(repaired), good = playerFor(repaired);
    assert.equal(playerPass(policy, repaired, v, good), true);
    for (const bad of [{ ...good, unique_solution: false }, { ...good, confidence: 20 },
      { ...good, solution: { ...good.solution, suspectId: 'wrong' } },
      { ...good, evidence: [{ clue_id: 'c1', quote: 'fabricated evidence' }] }])
      assert.equal(playerPass(policy, repaired, v, bad), false);
  });
  await test('editor must pass every dimension and report no unresolved issue', () => {
    const good = validJudge(); assert.equal(judgePass(policy, good), true);
    good.scores.fairness = 3; assert.equal(judgePass(policy, good), false);
    good.scores.fairness = 4; good.issues = ['ambiguous']; assert.equal(judgePass(policy, good), false);
  });
  let certificate;
  await test('player and editor are independent calls with separate schemas', async () => {
    const calls = [];
    const review = await reviewCandidate(snapshot, entry, repaired, storeFor(entry.id), runFor(), async args => {
      calls.push(args); return { plan: args.purpose === 'player' ? playerFor(repaired) : validJudge() };
    });
    assert.equal(review.passed, true); assert.deepEqual(calls.map(c => c.purpose), ['player', 'judge']);
    assert.ok(!calls[0].prompt.includes('expected_solution')); assert.ok(calls[1].prompt.includes('expected_solution'));
    certificate = review.certificate; assert.equal(certificateValid(snapshot, entry, repaired, certificate), true);
    const changed = clone(repaired); changed.story += ' Changed.';
    assert.equal(certificateValid(snapshot, entry, changed, certificate), false);
  });
  await test('100 score alone never skips independent reviews; resumed approved candidate costs zero', async () => {
    const store = storeFor(entry.id); const ready = { ...entry, candidate: repaired };
    let calls = 0;
    const caller = async args => { calls++; return { plan: args.purpose === 'player' ? playerFor(repaired) : validJudge() }; };
    const first = await repairOne(snapshot, ready, store, { allowAI: true, caller });
    assert.equal(first.status, 'ready_for_gates'); assert.equal(calls, 2);
    await repairOne(snapshot, ready, store, { allowAI: true, caller: () => { throw new Error('UNEXPECTED_CALL'); } });
  });
  await test('unverified mechanic stops before any paid call', async () => {
    const c = clone(fixture); c.clues[0].mechanicType = 'ses_kaydi';
    const store = storeFor(entry.id);
    const result = await repairOne(snapshot, { ...entry, candidate: c }, store,
      { allowAI: true, caller: () => { throw new Error('UNEXPECTED_CALL'); } });
    assert.equal(result.status, 'quarantined'); assert.equal(result.run.calls, 0);
    assert.match(result.failures[0], /MEDIA_REVIEW_REQUIRED/);
  });
  await test('failed gold calibration blocks the pilot before any provider call', async () => {
    const bad = { ...snapshot, entries: snapshot.entries.map(e => e.id === 'rc_001'
      ? { ...e, candidate: { ...clone(e.candidate), story: 'Kısa öykü.' } } : e) };
    await assert.rejects(repairOne(bad, entry, storeFor(entry.id), { allowAI: true,
      caller: () => { throw new Error('UNEXPECTED_CALL'); } }), /GOLD_CALIBRATION_FAILED/);
  });
  await test('rejected repair feeds the next attempt and accepted checkpoint resumes offline', async () => {
    const store = storeFor(entry.id), calls = [];
    const result = await repairOne(snapshot, entry, store, { allowAI: true, caller: async args => {
      calls.push(args);
      if (args.purpose === 'repair') {
        if (calls.length === 1) return { plan: { case_id: entry.id, operations: [] } };
        assert.match(args.prompt, /PREVIOUS CANDIDATES REJECTED BY THE EXACT SIMULATOR/);
        return { plan };
      }
      return { plan: args.purpose === 'player' ? playerFor(repaired) : validJudge() };
    } });
    assert.equal(result.status, 'ready_for_gates');
    assert.deepEqual(calls.map(c => c.purpose), ['repair', 'repair', 'player', 'judge']);
    assert.deepEqual(calls.slice(0, 2).map(c => c.model), [policy.models.first_pass, policy.models.repair]);
    assert.equal(result.run.attempts[0].retained, false);
    const resumed = await repairOne(snapshot, entry, store, { allowAI: true,
      caller: () => { throw new Error('UNEXPECTED_CALL'); } });
    assert.equal(resumed.status, 'ready_for_gates'); assert.equal(resumed.run.calls, 0);
  });
  await test('quarantine and pending PR do not stall the queue', () => {
    const rows = [{ id: 'a', passed: false }, { id: 'b', passed: false }, { id: 'c', passed: false }];
    assert.equal(selectNext(rows, 'a', { a: { status: 'quarantined' }, b: { status: 'awaiting_review' } }).id, 'c');
  });
  const batchSnapshot = () => ({ policy: clone(policy), entries: ['a','b','c'].map(id => ({ id, sourceHash: id })) });
  const batchRows = s => s.entries.map(e => ({ id: e.id, passed: false, content_locked: false }));
  const batchResult = status => ({ status, assessment: { result: { score: status === 'ready_for_gates' ? 100 : 0 } },
    run: { calls: 2, spent: 0.02, attempts: [] }, review: { passed: status === 'ready_for_gates', certificate: {} }, failures: [] });
  await test('campaign skips quarantine, stages accepted cases once and blocks an unmerged batch', async () => {
    const s = batchSnapshot(), store = storeFor('a'), seen = [], staged = [];
    store.state.cases.a = { spent: 0, status: 'quarantined' };
    const r = await campaign(s, store, { rows: batchRows, worker: async (bounded, e) => {
      seen.push(e.id); return batchResult('ready_for_gates');
    }, stage: (s, e) => { staged.push(e.id); return s; } });
    assert.deepEqual(seen, ['b','c']); assert.deepEqual(staged, seen);
    assert.deepEqual(r.selected_ids, ['b','c']); assert.equal(r.api_calls, 4);
    store.state.cases.b = { spent: 0, status: 'awaiting_review', source_hash: 'b' };
    const blocked = await campaign(s, store, { rows: batchRows, worker: () => { throw new Error('UNEXPECTED_CALL'); } });
    assert.equal(blocked.status, 'awaiting_existing_review'); assert.equal(blocked.api_calls, 0);
  });
  await test('campaign content failure advances but provider failure stops the remaining cases', async () => {
    const store = storeFor('a'), seen = [];
    const r = await campaign(batchSnapshot(), store, { rows: batchRows, worker: async (s,e) => {
      seen.push(e.id); return batchResult(e.id === 'a' ? 'quarantined' : 'GEMINI_HTTP_429');
    } });
    assert.deepEqual(seen, ['a','b']); assert.equal(r.stop_reason, 'GEMINI_HTTP_429');
    assert.equal(r.selected_ids.length, 0);
  });
  await test('campaign bounds the remaining calls and money before the next worker and rejects bad inputs', async () => {
    const s = batchSnapshot(); s.policy.batch.max_calls = 3; s.policy.batch.budget_usd = 0.03;
    const limits = [];
    const r = await campaign(s, storeFor('a'), { rows: batchRows, worker: async (s,e) => {
      limits.push(clone(s.policy.sequential));
      const result = batchResult('quarantined');
      if (e.id === 'b') { result.run.calls = 1; result.run.spent = 0.01; }
      return result;
    } });
    assert.equal(limits.length, 2); assert.equal(limits[1].max_calls_per_execute, 1);
    assert.ok(limits[1].execute_budget_usd <= 0.010000001);
    assert.equal(r.api_calls, 3); assert.equal(r.stop_reason, 'CAMPAIGN_BUDGET_CHECKPOINT');
    for (const caseLimit of [0,6,1.5,NaN]) await assert.rejects(campaign(s, storeFor(), { caseLimit }), /LIMIT_INVALID/);
  });
  await test('batch publication requires every selected case at 100 and preserves prior passing cases', () => {
    const before = [{id:'a',passed:false},{id:'b',passed:false},{id:'gold',passed:true}];
    const after = before.map(r=>({...r,passed:true}));
    assertNoRegression(before, after, ['a','b']);
    assert.throws(()=>assertNoRegression(before, after.map(r=>r.id==='b'?{...r,passed:false}:r), ['a','b']), /SELECTED_NOT_100/);
    assert.throws(()=>assertNoRegression(before, after.map(r=>r.id==='gold'?{...r,passed:false}:r), ['a','b']), /PORTFOLIO_REGRESSION/);
  });
  process.env.GEMINI_API_KEY = 'offline-test-not-a-secret';
  await test('reservation persists before transport; uncertain call is never repeated', async () => {
    const store = storeFor(), run = runFor(); let calls = 0;
    const args = { store, policy, run, caseId: 'test', model: policy.models.first_pass, prompt: 'uncertain',
      transport: async () => { calls++; validateState(store.state); assert.ok(store.state.campaign_spent > 0); throw new Error('network'); } };
    await assert.rejects(callPaid(args), /TRANSPORT_UNCERTAIN/);
    await assert.rejects(callPaid(args), /REPEATED_OR_UNCERTAIN/); assert.equal(calls, 1);
  });
  await test('durable save failure prevents transport', async () => {
    const store = storeFor(); store.save = () => { throw new Error('disk failed'); };
    await assert.rejects(callPaid({ store, policy, run: runFor(), caseId: 'test', model: policy.models.first_pass,
      prompt: 'disk', transport: () => { throw new Error('UNEXPECTED_CALL'); } }), /disk failed/);
  });
  await test('case, daily, campaign and execute limits block before transport', () => {
    for (const field of ['case_budget_usd', 'daily_budget_usd', 'campaign_budget_usd', 'execute_budget_usd']) {
      const limited = clone(policy); limited.sequential[field] = 0;
      assert.throws(() => reserveRequest(storeFor(), limited, runFor(), 'test', limited.models.first_pass,
        requestBody(limited, limited.models.first_pass, 'bounded')), /BUDGET_STOP/);
    }
  });
  await test('two legacy repair attempts remain a lifetime limit across executions', () => {
    const store = storeFor();
    for (let i = 0; i < 2; i++) reserveRequest(store, policy, runFor(), 'test', policy.models.first_pass,
      requestBody(policy, policy.models.first_pass, 'attempt-' + i));
    assert.throws(() => reserveRequest(store, policy, runFor(), 'test', policy.models.first_pass,
      requestBody(policy, policy.models.first_pass, 'third')), /REPAIR_LIMIT/);
  });
  await test('thinking tokens are charged; cached result is reusable without a key', async () => {
    const store = storeFor(), run = runFor(); let calls = 0;
    const args = { store, policy, run, caseId: 'test', model: policy.models.first_pass, prompt: 'cache',
      validate: p => p.answer === 'ok', transport: async (url, options) => {
        calls++; assert.ok(!url.includes('key=')); assert.equal(options.headers['x-goog-api-key'], process.env.GEMINI_API_KEY);
        return response(JSON.stringify({ answer: 'ok' }));
      } };
    const first = await callPaid(args); assert.equal(first.cached, false);
    const rate = policy.models.pricing_usd_per_million_tokens[policy.models.first_pass];
    assert.ok(Math.abs(store.state.campaign_spent - (100 * rate.input + 60 * rate.output) / 1e6) < 1e-9);
    delete process.env.GEMINI_API_KEY; assert.equal((await callPaid(args)).cached, true); assert.equal(calls, 1);
    process.env.GEMINI_API_KEY = 'offline-test-not-a-secret';
  });
  await test('truncation and invalid schemas retain billed usage and do not retry', async () => {
    for (const extra of [{ candidates: [{ finishReason: 'MAX_TOKENS' }] }, {}]) {
      const store = storeFor();
      await assert.rejects(callPaid({ store, policy, run: runFor(), caseId: 'test', model: policy.models.first_pass,
        prompt: 'invalid', validate: () => false, transport: async () => response('not-json', extra) }), /INVALID_MODEL_RESPONSE/);
      assert.ok(store.state.campaign_spent > 0); validateState(store.state);
    }
  });
  await test('HTTP rejection never switches model or retries', async () => {
    let calls = 0; const store = storeFor();
    await assert.rejects(callPaid({ store, policy, run: runFor(), caseId: 'test', model: policy.models.first_pass,
      prompt: 'reject', transport: async () => { calls++; return { ok: false, status: 404, json: async () => ({}) }; } }), /GEMINI_HTTP_404/);
    assert.equal(calls, 1); assert.equal(store.state.campaign_spent, 0);
  });
  await test('HTTP rejection retains a redacted diagnosis and blocks the identical request', async () => {
    const store = storeFor(); let calls = 0;
    const args = { store, policy, run: runFor(), caseId: 'test', model: policy.models.first_pass,
      prompt: 'diagnosis', transport: async () => {
        calls++; return { ok: false, status: 400, json: async () => ({ error: {
          status: 'INVALID_ARGUMENT', message: 'Unknown field; key=' + process.env.GEMINI_API_KEY
        } }) };
      } };
    await assert.rejects(callPaid(args), error => error.provider_error.status === 'INVALID_ARGUMENT' &&
      !error.provider_error.message.includes(process.env.GEMINI_API_KEY));
    const record = Object.values(store.state.requests)[0];
    assert.equal(record.provider_error.http_status, 400); assert.equal(record.charged, 0);
    await assert.rejects(callPaid(args), /REPEATED_OR_UNCERTAIN_REQUEST/);
    assert.equal(calls, 1);
    const result = await repairOne(snapshot, entry, storeFor(entry.id), { allowAI: true,
      caller: async () => { throw new Stop('GEMINI_HTTP_400', record.provider_error); } });
    assert.deepEqual(result.provider_error, record.provider_error);
    const details = providerErrorDetails({ error: { message: 'Bearer token ?key=other-secret ' + 'x'.repeat(2000) } }, 400);
    assert.ok(!details.message.includes('token')); assert.ok(!details.message.includes('other-secret'));
    assert.ok(details.message.length <= 1000);
  });
  await test('zero-cost 400/404 rejections preserve history while two actual repairs remain bounded', async () => {
    const store = storeFor();
    for (const status of [400, 404]) store.state.requests['historical-' + status] = {
      case_id: 'test', purpose: 'repair', day: '2026-10-11', status: 'failed', charged: 0, http_status: status
    };
    validateState(store.state);
    const call = (prompt, purpose = 'repair') => callPaid({ store, policy, run: runFor(), caseId: 'test',
      model: policy.models.first_pass, prompt, purpose, transport: async () => response('{"answer":"ok"}') });
    await call('first'); await call('second');
    await assert.rejects(call('third'), /REPAIR_LIMIT/);
    await call('blind-player', 'player'); await call('editor', 'judge');
    assert.equal(Object.keys(store.state.requests).length, 6);
    await assert.rejects(call('extra', 'judge'), /CASE_REQUEST_LIMIT/);
    assert.equal(store.state.requests['historical-400'].charged, 0);
    assert.equal(store.state.requests['historical-404'].http_status, 404);
    const blocked = storeFor(entry.id);
    for (let i = 0; i < 6; i++) blocked.state.requests['rejected-' + i] = {
      case_id: entry.id, purpose: 'repair', day: '2026-10-11', status: 'failed', charged: 0, http_status: 400
    };
    const result = await repairOne(snapshot, entry, blocked, { allowAI: true,
      caller: args => callPaid({ ...args, transport: () => { throw new Error('UNEXPECTED_TRANSPORT'); } }) });
    assert.equal(result.status, 'quarantined'); assert.deepEqual(result.failures, ['CASE_REQUEST_LIMIT']);
    assert.equal(result.run.calls, 0);
  });
  await test('uncertain, invalid, auth and quota failures still consume repair allowance', () => {
    for (const failure of [{ status: 'reserved', charged: 0 }, { status: 'invalid_response', charged: 0 },
      ...[401, 403, 429, 500].map(http_status => ({ status: 'failed', charged: 0, http_status }))]) {
      const store = storeFor();
      for (let i = 0; i < 2; i++) store.state.requests['previous-' + i] = {
        case_id: 'test', purpose: 'repair', day: '2026-10-11', ...failure
      };
      assert.throws(() => reserveRequest(store, policy, runFor(), 'test', policy.models.first_pass,
        requestBody(policy, policy.models.first_pass, 'next')), /REPAIR_LIMIT/);
    }
  });
  await test('model preflight checks both exact models using GET without case content', async () => {
    const urls = [];
    const result = await modelPreflight(policy, { transport: async (url, options) => {
      urls.push(url); assert.equal(options.method, 'GET'); assert.equal(options.body, undefined);
      assert.ok(!url.includes('key='));
      const name = 'models/' + url.split('/').at(-1);
      return { ok: true, json: async () => ({ name, supportedGenerationMethods: ['generateContent'], outputTokenLimit: 65536 }) };
    } });
    assert.deepEqual(result.checked, [policy.models.first_pass, policy.models.reviewer]);
    assert.equal(result.generation_calls, 0); assert.equal(urls.length, 2);
  });
  await test('missing or incompatible model stops preflight without retry or fallback', async () => {
    for (const metadata of [null, { name: 'models/' + policy.models.first_pass,
      supportedGenerationMethods: ['embedContent'], outputTokenLimit: 65536 }]) {
      let calls = 0;
      await assert.rejects(modelPreflight(policy, { transport: async () => {
        calls++; return { ok: !!metadata, status: 404, json: async () => metadata };
      } }), /MODEL_PREFLIGHT_(HTTP_404|UNSUPPORTED)/);
      assert.equal(calls, 1);
    }
    let calls = 0;
    await assert.rejects(modelPreflight(policy, { transport: async () => {
      calls++; throw new Error('do not leak raw transport data');
    } }), /MODEL_PREFLIGHT_UNAVAILABLE/);
    assert.equal(calls, 1);
  });
  await test('Gemini 3 uses one thinking setting; expired pricing stops before reservation', () => {
    const body = requestBody(policy, policy.models.first_pass, 'bounded');
    assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingLevel: 'LOW' });
    assert.equal(body.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON');
    assert.equal(body.generationConfig.responseFormat.text.schema.type, 'object');
    assert.equal(body.generationConfig.responseMimeType, undefined);
    assert.equal(body.generationConfig.responseJsonSchema, undefined);
    const store = storeFor(), run = runFor();
    assert.throws(() => reserveRequest(store, policy, run, 'test', policy.models.first_pass,
      body, 'repair', new Date('2027-01-01T00:00:00Z')), /PRICING_REVIEW_REQUIRED/);
    assert.equal(run.calls, 0); assert.equal(store.state.campaign_spent, 0);
    assert.equal(Object.keys(store.state.requests).length, 0);
  });
  await test('corrupt/reset spending ledger is rejected', () => {
    assert.throws(() => validateState({ ...emptyState(), campaign_spent: 1 }), /LEDGER/);
    assert.throws(() => validateState({ ...emptyState(), requests: { bad: { charged: 1, case_id: 'unknown' } } }), /LEDGER/);
  });
  await test('diagnosis isolates four tiny stages and cached success adds no generation cost', async () => {
    const before = [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path]
      .map(p => stableHash(fs.readFileSync(p, 'utf8')));
    const store = { state: emptyState(), save() { validateState(this.state); } }; let calls = 0;
    const stages = diagnosticStages(policy);
    assert.equal(stages[0].body.generationConfig.responseFormat, undefined);
    assert.equal(stages[1].body.generationConfig.thinkingConfig, undefined);
    assert.equal(stages[2].body.generationConfig.thinkingConfig.thinkingLevel, 'LOW');
    assert.ok(stages.slice(0, 4).every(s => s.body.generationConfig.maxOutputTokens === 1024));
    assert.equal(stages[4].name, 'repair_contract');
    assert.equal(stages[4].body.generationConfig.maxOutputTokens, policy.sequential.max_output_tokens);
    const args = { preflight: async () => ({ checked: ['offline'] }), transport: async (url, options) => {
      calls++; assert.ok(!options.body.includes(entry.id));
      return response(calls === 5 ? '{"case_id":"provider-diagnostic-v1","assessment":"test","operations":[]}' : '{"answer":"ok"}');
    } };
    const result = await diagnose(store, policy, args);
    assert.equal(result.status, 'diagnostic_checkpoint'); assert.equal(calls, 4);
    assert.ok(result.execute_cost_usd <= 0.03); assert.equal(result.stages.length, 4);
    const continued = await diagnose(store, policy, args);
    assert.equal(continued.status, 'provider_verified'); assert.equal(continued.api_calls, 1);
    assert.equal(continued.stages.length, 5); assert.equal(calls, 5);
    const cached = await diagnose(store, policy, args);
    assert.equal(cached.api_calls, 0); assert.equal(cached.execute_cost_usd, 0); assert.equal(calls, 5);
    assert.deepEqual(before, [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path]
      .map(p => stableHash(fs.readFileSync(p, 'utf8'))));
  });
  await test('diagnosis stops at the first failing feature, preserving billed work and no automatic retry', async () => {
    const store = { state: emptyState(), save() { validateState(this.state); } }; let calls = 0;
    const options = { preflight: async () => ({}), transport: async () => {
      calls++;
      return calls === 1 ? response('basic answer') : { ok: false, status: 400, json: async () => ({ error: {
        status: 'INVALID_ARGUMENT', message: 'bad schema', details: [{ fieldViolations: [{
          field: 'generationConfig.responseFormat', description: 'Unknown field ' + process.env.GEMINI_API_KEY
        }] }]
      } }) };
    } };
    const result = await diagnose(store, policy, options);
    assert.equal(result.status, 'GEMINI_HTTP_400'); assert.equal(result.active_stage, 'lite_json');
    assert.equal(calls, 2); assert.ok(result.execute_cost_usd > 0);
    assert.equal(result.provider_error.field_violations[0].field, 'generationConfig.responseFormat');
    assert.ok(!JSON.stringify(result).includes(process.env.GEMINI_API_KEY));
    const resumed = await diagnose(store, policy, options);
    assert.equal(resumed.status, 'REPEATED_OR_UNCERTAIN_REQUEST'); assert.equal(calls, 2);
    assert.equal(resumed.api_calls, 0);
  });
  await test('diagnosis respects campaign budget and preserves uncertain reservations', async () => {
    const blocked = clone(policy); blocked.sequential.campaign_budget_usd = 0;
    const makeStore = () => ({ state: emptyState(), save() { validateState(this.state); } });
    const zero = await diagnose(makeStore(), blocked, { preflight: async () => ({}),
      transport: async () => { throw new Error('UNEXPECTED_TRANSPORT'); } });
    assert.equal(zero.status, 'BUDGET_STOP'); assert.equal(zero.api_calls, 0);
    const store = makeStore(); let calls = 0;
    const options = { preflight: async () => ({}), transport: async () => { calls++; throw new Error('timeout'); } };
    const uncertain = await diagnose(store, policy, options);
    assert.equal(uncertain.status, 'TRANSPORT_UNCERTAIN'); assert.ok(uncertain.execute_cost_usd > 0);
    const resumed = await diagnose(store, policy, options);
    assert.equal(resumed.status, 'REPEATED_OR_UNCERTAIN_REQUEST'); assert.equal(calls, 1);
  });
  await test('source projection changes only one reviewed case and survives re-import', () => {
    const dir = path.join(temporary, 'projection');
    for (const file of [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path,
      policy.simulator.path, policy.source.inventory_path, policy.review.media_evidence_path]) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.copyFileSync(path.join(root, file), path.join(dir, file));
    }
    const s = loadSnapshot(dir, policy), e = s.entries.find(e => e.id === entry.id);
    const next = stageCandidate(s, e, repaired, certificate);
    assert.equal(scan(next).find(r => r.id === entry.id).passed, true);
    assert.equal(campaignRows(next).find(r => r.id === entry.id).content_locked, true);
  });
  await test('two accepted cases re-import together and batch scope still rejects any unselected change', async () => {
    const dir = path.join(temporary, 'projection'), before = loadSnapshot(dir, policy);
    const e = before.entries.find(e => e.id === 'konakta-gece-yarisi-cinayeti'), c = repairKonak(e.candidate);
    const reviewed = await reviewCandidate(before, e, c, storeFor(e.id), runFor(), async args =>
      ({ plan: args.purpose === 'player' ? playerFor(c) : validJudge() }));
    assert.equal(reviewed.passed, true);
    const after = stageCandidate(before, e, c, reviewed.certificate);
    assertScope(snapshot, after, [entry.id,e.id]);
    assertNoRegression(scan(snapshot), scan(after), [entry.id,e.id]);
    assert.equal(campaignRows(after).filter(r=>[entry.id,e.id].includes(r.id)&&r.content_locked).length, 2);
    assert.throws(()=>assertScope(snapshot, after, entry.id), /DIFF_UNSELECTED_CASE/);
  });
  await test('new intake rejects duplicate case/entity IDs and invalid solution', () => {
    assert.throws(() => validateNewCase(snapshot, original.raw, 'standard'), /DUPLICATE_CASE/);
    const raw = clone(original.raw); raw.id = 'future_case'; raw.puzzleId = 'future_case';
    raw.solution.suspectId = 'missing'; assert.throws(() => validateNewCase(snapshot, raw, 'standard'), /ENTITY_OR_SOLUTION/);
    raw.solution = original.raw.solution; raw.clues[1].id = raw.clues[0].id;
    assert.throws(() => validateNewCase(snapshot, raw, 'standard'), /CLUES_OR_STORY/);
  });
  await test('registered 106th case is supported; unregistered case fails closed', () => {
    const dir = path.join(temporary, 'projection');
    const raw = clone(original.raw); raw.id = 'future_inventory_case'; raw.puzzleId = 'future_inventory_case';
    const std = path.join(dir, policy.source.standard_path), source = fs.readFileSync(std, 'utf8');
    const range = parseStandard(source).range;
    const prefix = source.slice(0, range.end - 1).trimEnd();
    fs.writeFileSync(std, prefix + (prefix.endsWith(',') ? '' : ',') + '\n' + JSON.stringify(raw) + '\n' + source.slice(range.end - 1));
    assert.throws(() => loadSnapshot(dir, policy), /SOURCE_COUNTS/);
    const manifest = read(path.join(dir, policy.source.inventory_path));
    manifest.cases.splice(manifest.cases.findIndex(c => c.tier === 'premium'), 0, { id: 'future_inventory_case', tier: 'standard' });
    write(path.join(dir, policy.source.inventory_path), manifest);
    assert.equal(loadSnapshot(dir, policy).entries.length, snapshot.entries.length + 1);
  });
  await test('merge API and unsafe publication policy are structurally forbidden', () => {
    assertDraftPolicy(policy);
    const unsafe = clone(policy); unsafe.publication.auto_merge = true;
    assert.throws(() => assertDraftPolicy(unsafe), /DRAFT_ONLY/);
    assert.throws(() => api('repos/5n1katil/Faili-Mechul/pulls/1/merge', 'PUT', {}), /MUTATION_NOT_ALLOWED/);
    const workflow = fs.readFileSync('.github/workflows/fm-case-pipeline.yml', 'utf8');
    assert.ok(!workflow.includes('pr merge')); assert.ok(workflow.includes('default: audit'));
    for (const file of ['fm-qa-autofix.yml', 'fm-case-qa-v3.yml', 'fm-avatar-auto-merge.yml']) {
      const retired = fs.readFileSync('.github/workflows/' + file, 'utf8');
      assert.ok(!retired.includes('secrets.')); assert.ok(!retired.includes('pr merge'));
    }
  });
  await test('durable Git ledger survives a fresh checkout and rejects stale writers', () => {
    const remote = path.join(temporary, 'remote.git'), repo = path.join(temporary, 'journal');
    const cmd = (args, cwd = temporary) => execFileSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' });
    cmd(['init', '--bare', remote]); cmd(['clone', remote, repo]);
    cmd(['config', 'user.name', 'test'], repo); cmd(['config', 'user.email', 'test@example.invalid'], repo);
    fs.writeFileSync(path.join(repo, 'README'), 'test'); cmd(['add', 'README'], repo); cmd(['commit', '-m', 'initial'], repo);
    const store = openStore(repo, policy); store.state.active_id = 'a'; store.save();
    const repo2 = path.join(temporary, 'journal2'); cmd(['clone', remote, repo2]);
    const other = openStore(repo2, policy); assert.equal(other.state.active_id, 'a');
    other.state.active_id = 'b'; other.save(); store.state.active_id = 'stale'; assert.throws(() => store.save());
  });
  console.log('PASS: ' + passed + ' pipeline tests; exact HTML, zero paid calls.');
} finally { delete process.env.GEMINI_API_KEY; fs.rmSync(temporary, { recursive: true, force: true }); }
