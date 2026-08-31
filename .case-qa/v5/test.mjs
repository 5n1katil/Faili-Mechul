#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadSnapshot, scan, counts, selectNext, clone, read, assess, guardedPatch, better,
  restoreBest, repairPrompt, stageCandidate, assertScope, assertNoRegression } from './core.mjs';
import { emptyState, validateState, openStore } from './state.mjs';
import { reserveRequest, requestBody, callPaid, Stop } from './provider.mjs';
import { assertProtection, assertPr, certifiedRun } from './github.mjs';
import { repairOne } from './run.mjs';
import { repairTermal } from '../fixtures/termal_reviewed_repair.mjs';
import { stableHash } from '../fm_case_qa_runner.mjs';

globalThis.fetch = async () => { throw new Error('TEST_NETWORK_FORBIDDEN'); };
const policy = read('.case-qa/v5/policy.json'), root = process.cwd();
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-v5-'));
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`ok ${passed} - ${name}`); };
const storeFor = (id = 'test') => ({ state: { ...emptyState(), cases: { [id]: { spent: 0 } } }, save() { validateState(this.state); } });
try {
  const snapshot = loadSnapshot(root, policy), rows = scan(snapshot);
  await test('real exact HTML snapshot covers 45 standard and 60 premium cases', () => {
    assert.equal(rows.length, 105); assert.equal(rows.filter(r => r.tier === 'standard').length, 45);
    for (const id of ['termal-otelde-supheli-vaka', 'rc_001', 'pp_001']) assert.equal(rows.find(r => r.id === id).passed, true);
  });
  await test('select skips complete and resumes active even when an earlier case regresses', () => {
    const r = [{ id: 'a', passed: true }, { id: 'b', passed: false }, { id: 'c', passed: false }];
    assert.equal(selectNext(r).id, 'b'); assert.equal(selectNext(r, 'c').id, 'c');
    r[2].passed = true; assert.equal(selectNext(r, 'c').id, 'b'); r[1].passed = true;
    assert.equal(selectNext(r), null); assert.equal(counts(r).complete, true);
  });
  const entry = snapshot.entries.find(e => e.id === 'termal-otelde-supheli-vaka');
  await test('100 case makes zero API calls even with AI enabled', async () => {
    const store = storeFor(entry.id);
    const result = await repairOne(snapshot, entry, store, { allowAI: true, caller: () => { throw new Error('NO_CALL_EXPECTED'); } });
    assert.equal(result.status, 'ready_for_gates'); assert.equal(result.run.calls, 0);
  });
  const fixture = read('.case-qa/fixtures/termal-97-run-33305310409.json').candidate;
  fixture.qaPortfolioRegistry = clone(entry.candidate.qaPortfolioRegistry);
  const fixtureEntry = { ...entry, candidate: fixture };
  const a97 = assess(snapshot, fixtureEntry, fixture);
  assert.equal(a97.result.score, 97);
  const repaired = repairTermal(fixture);
  const plan = { case_id: entry.id, assessment: 'captured reviewed patch', operations: [
    ...fixture.clues.flatMap((c, i) => Object.keys(repaired.clues[i]).filter(k => stableHash(c[k] ?? null) !== stableHash(repaired.clues[i][k])).map(k =>
      ({ op: Object.hasOwn(c, k) ? 'replace' : 'add', path: `/clues/${i}/${k}`, value_json: JSON.stringify(repaired.clues[i][k]), reason: 'reviewed regression fixture' }))),
    { op: 'replace', path: '/qaSemanticFacts', value_json: JSON.stringify(repaired.qaSemanticFacts), reason: 'align evidence' },
    { op: 'replace', path: '/qaPattern/designIntent', value_json: JSON.stringify(repaired.qaPattern.designIntent), reason: 'align intent' }
  ] };
  await test('real 97 -> 100 minimal patch clears the exact engine', () => {
    const next = guardedPatch(snapshot, fixtureEntry, fixture, plan, a97);
    assert.equal(next.assessment.passed, true); assert.equal(better(next.assessment, a97), true);
  });
  await test('prompt includes actual K3 deficit and excludes other 104 cases', () => {
    const prompt = repairPrompt(fixtureEntry, fixture, a97, []);
    assert.match(prompt, /Sadece 2 ipucu tipi/); assert.match(prompt, /quality_findings/);
    assert.ok(!prompt.includes('"entries":')); assert.ok(!prompt.includes('"puzzleId":"pp_001"'));
  });
  await test('immutable policy mutation is rejected in code', () => {
    const bad = { ...plan, operations: [{ op: 'replace', path: '/qaPolicy', value_json: '{}', reason: 'cheat' }] };
    assert.throws(() => guardedPatch(snapshot, fixtureEntry, fixture, bad, a97), /LOCKED_FIELD/);
    assert.throws(() => guardedPatch(snapshot, fixtureEntry, fixture, { ...plan, case_id: 'wrong' }, a97), /CASE_ID/);
  });
  await test('checkpoint stale source or forged hash cannot be trusted', () => {
    const record = { source_hash: 'stale', simulator_hash: snapshot.simulatorHash, candidate: repaired, candidate_hash: stableHash(repaired) };
    assert.equal(restoreBest(snapshot, fixtureEntry, record).assessment.result.score, 97);
    record.source_hash = fixtureEntry.sourceHash; record.candidate_hash = 'forged';
    assert.equal(restoreBest(snapshot, fixtureEntry, record).assessment.result.score, 97);
    record.candidate_hash = stableHash(repaired);
    assert.equal(restoreBest(snapshot, fixtureEntry, record).assessment.result.score, 100);
  });
  await test('worse score or newly failed passed gate cannot replace best candidate', () => {
    const worse = clone(a97); worse.result.score = 96; worse.penalty = 0;
    assert.equal(better(worse, a97), false);
    const badGate = clone(a97); badGate.result.score = 98; badGate.penalty = 0; badGate.result.gates.coreNecessity.passed = false;
    assert.equal(better(badGate, a97), false);
  });
  await test('second Execute restores 100 checkpoint with no AI and does not advance active prematurely', async () => {
    const store = storeFor(entry.id);
    const first = await repairOne(snapshot, fixtureEntry, store, { allowAI: true, caller: async () => ({ plan, cached: false }) });
    assert.equal(first.assessment.passed, true);
    const second = await repairOne(snapshot, fixtureEntry, store, { allowAI: true, caller: async () => { throw new Error('NO_CALL_EXPECTED'); } });
    assert.equal(second.run.resumed_score, 100); assert.equal(store.state.active_id, entry.id);
  });
  await test('near-ready failure tries Luna twice and never escalates without logical deficit', async () => {
    const store = storeFor(entry.id), models = [];
    const result = await repairOne(snapshot, fixtureEntry, store, { allowAI: true, caller: async args => {
      models.push(args.model); return { plan: { case_id: entry.id, operations: [] }, cached: false };
    } });
    assert.deepEqual(models, [policy.models.first_pass, policy.models.first_pass]);
    assert.equal(result.assessment.result.score, 97); assert.notEqual(result.status, 'ready_for_gates');
  });
  await test('reservation persists before transport and uncertain request is never reissued', async () => {
    process.env.OPENAI_API_KEY = 'offline-test-not-a-secret';
    const store = storeFor(), run = { calls: 0, spent: 0 }; let calls = 0;
    const args = { store, policy, run, caseId: 'test', model: policy.models.first_pass, prompt: 'test',
      transport: async () => { calls++; assert.ok(store.state.campaign_spent > 0); throw new Error('network'); } };
    await assert.rejects(callPaid(args), /TRANSPORT_UNCERTAIN/);
    const spent = store.state.campaign_spent;
    await assert.rejects(callPaid(args), /REPEATED_OR_UNCERTAIN_REQUEST/);
    assert.equal(calls, 1); assert.equal(store.state.campaign_spent, spent);
  });
  await test('durable save failure prevents any paid transport', async () => {
    const store = storeFor(); store.save = () => { throw new Error('disk failed'); };
    let contacted = false;
    await assert.rejects(callPaid({ store, policy, run: { calls: 0, spent: 0 }, caseId: 'test',
      model: policy.models.first_pass, prompt: 'other', transport: async () => { contacted = true; } }), /disk failed/);
    assert.equal(contacted, false);
  });
  await test('execute cap resets while per-case and campaign ledger remain durable', () => {
    const store = storeFor(), run = { calls: policy.sequential.max_calls_per_execute, spent: 0 };
    const body = requestBody(policy, policy.models.first_pass, 'bounded');
    assert.throws(() => reserveRequest(store, policy, run, 'test', policy.models.first_pass, body), Stop);
    reserveRequest(store, policy, { calls: 0, spent: 0 }, 'test', policy.models.first_pass, body);
    const limited = clone(policy); limited.sequential.case_budget_usd = 0;
    assert.throws(() => reserveRequest(store, limited, { calls: 0, spent: 0 }, 'test', policy.models.first_pass, { ...body, input: [] }), Stop);
    const campaignLimited = clone(policy); campaignLimited.sequential.campaign_budget_usd = 0;
    assert.throws(() => reserveRequest(store, campaignLimited, { calls: 0, spent: 0 }, 'test', policy.models.first_pass, { ...body, input: [] }), Stop);
  });
  await test('quota or model rejection does not silently switch to a costly model', async () => {
    const store = storeFor(); let requests = 0;
    await assert.rejects(callPaid({ store, policy, run: { calls: 0, spent: 0 }, caseId: 'test',
      model: policy.models.first_pass, prompt: 'invalid-model', transport: async () => {
        requests++; return { ok: false, status: 404, json: async () => ({ error: {} }) };
      } }), /OPENAI_HTTP_404/);
    assert.equal(requests, 1); assert.equal(store.state.campaign_spent, 0);
  });
  await test('invalid JSON response still records billed token usage', async () => {
    const store = storeFor();
    await assert.rejects(callPaid({ store, policy, run: { calls: 0, spent: 0 }, caseId: 'test',
      model: policy.models.first_pass, prompt: 'bad-json', transport: async () => ({ ok: true, status: 200,
        json: async () => ({ usage: { input_tokens: 100, output_tokens: 50 }, output_text: 'not-json' }) }) }), /INVALID_PATCH_JSON/);
    assert.ok(store.state.campaign_spent > 0); validateState(store.state);
  });
  await test('corrupted or reset budget ledger fails closed', () => {
    assert.throws(() => validateState({ ...emptyState(), campaign_spent: 1 }), /LEDGER/);
    assert.throws(() => validateState({ ...emptyState(), campaign_spent: NaN }), /STATE_INVALID/);
    const file = path.join(temporary, 'bad.json'); fs.writeFileSync(file, '{}');
    assert.throws(() => openStore(root, policy, { localFile: file }), /STATE_INVALID/);
  });
  await test('absent CI, stale head/base, non-strict protection and fake run all block merge', () => {
    const context = policy.sequential.required_ci_context;
    const protection = { required_status_checks: { strict: true, contexts: [context] }, enforce_admins: { enabled: true } };
    assertProtection(protection, context);
    assert.throws(() => assertProtection({}, context), /SETUP_REQUIRED/);
    assert.throws(() => assertProtection({ ...protection, enforce_admins: { enabled: false } }, context), /SETUP_REQUIRED/);
    const pr = { state: 'open', draft: false, head: { sha: 'h' }, base: { sha: 'b', ref: 'main' }, mergeable: true, mergeable_state: 'clean' };
    assertPr(pr, 'h', 'b');
    for (const bad of [{ ...pr, draft: true }, { ...pr, mergeable: false }, { ...pr, head: { sha: 'x' } }, { ...pr, base: { sha: 'x', ref: 'main' } }])
      assert.throws(() => assertPr(bad, 'h', 'b'));
    assert.equal(certifiedRun([{ head_sha: 'h', display_title: 'wrong', event: 'workflow_dispatch', workflow_id: 1 }], { head: 'h', nonce: 'n', workflowId: 1 }), null);
  });
  await test('portfolio regression and unselected-case diff are rejected', () => {
    assert.throws(() => assertNoRegression([{ id: 'old', passed: true }], [{ id: 'old', passed: false }, { id: 'new', passed: true }], 'new'), /PORTFOLIO_REGRESSION/);
    const changed = { ...snapshot, entries: snapshot.entries.map(e => ({ ...e, raw: clone(e.raw) })) };
    const other = changed.entries.find(e => e.id !== entry.id); other.raw.story += ' changed';
    assert.throws(() => assertScope(snapshot, changed, entry.id), /DIFF_UNSELECTED_CASE/);
  });
  await test('runtime projection writes only one case and survives re-import with exact 100', () => {
    const dir = path.join(temporary, 'projection');
    for (const file of [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path, policy.simulator.path]) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.copyFileSync(path.join(root, file), path.join(dir, file));
    }
    const s = loadSnapshot(dir, policy), target = s.entries.find(e => e.id === entry.id);
    const next = stageCandidate(s, target, target.candidate);
    assertScope(s, next, entry.id); assert.equal(scan(next).find(r => r.id === entry.id).passed, true);
    const mismatched = clone(policy); mismatched.simulator.git_blob_sha = 'wrong';
    assert.throws(() => loadSnapshot(dir, mismatched), /EXACT_HTML_HASH/);
  });
  await test('real durable Git journal survives two saves and a fresh checkout', () => {
    const remote = path.join(temporary, 'remote.git'), repo = path.join(temporary, 'journal-test');
    const cmd = (args, cwd = temporary) => execFileSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' });
    cmd(['init', '--bare', remote]); cmd(['clone', remote, repo]);
    cmd(['config', 'user.name', 'test'], repo); cmd(['config', 'user.email', 'test@example.invalid'], repo);
    fs.writeFileSync(path.join(repo, 'README'), 'test'); cmd(['add', 'README'], repo); cmd(['commit', '-m', 'initial'], repo);
    const store = openStore(repo, policy); store.state.active_id = 'a'; store.save(); store.state.active_id = 'b'; store.save();
    const repo2 = path.join(temporary, 'journal-test-2'); cmd(['clone', remote, repo2]);
    const restored = openStore(repo2, policy); assert.equal(restored.state.active_id, 'b');
    restored.state.active_id = 'c'; restored.save();
    // A stale writer must not overwrite the new durable checkpoint.
    store.state.active_id = 'stale'; assert.throws(() => store.save());
  });
  console.log(`PASS: ${passed} v5 tests; real v29.4, zero paid calls.`);
} finally { delete process.env.OPENAI_API_KEY; fs.rmSync(temporary, { recursive: true, force: true }); }
