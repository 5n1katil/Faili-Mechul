#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { gunzipSync } from 'node:zlib';
import { read, write, clone, loadSnapshot, scan, selectNext, assess, guardedPatch, better,
  restoreBest, stageCandidate, repairPrompt, assertNoRegression, assertScope } from './core.mjs';
import { emptyState, validateState, openStore, pushCheckpoint } from './state.mjs';
import { reserveRequest, requestBody, requestKey, callPaid, Stop, modelPreflight, providerErrorDetails } from './provider.mjs';
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
import { compileEditorial, editorialPrompt, editorialFailure, validEditorial, recoverEditorial } from './editorial.mjs';
import { reviewHash } from './review.mjs';
import { legacyQualityContract as qualityContract, REVIEW_VERSION } from './quality-contract.mjs';
import { compileEditorialRevision, editorialRevisionPrompt, editorialRevisionSchema, validEditorialRevision } from './editorial.mjs';
import { compileBoundedEditorial, recoverBoundedEditorial, editorialRevisionRequestPrompt } from './editorial.mjs';
import { hintOnly, compileHints, recoverHintCleanup, validHints } from './hint-cleanup.mjs';
import { EXPERIENCE_PROFILES, EXPERIENCE_VERSION, experienceProfile, experienceCheck, difficultyBand } from './experience.mjs';
import { canonicalLogicSignature, logicNoveltyCheck } from './logic-patterns.mjs';
import { qualityContract as experienceContract } from './quality-contract.mjs';
import { editorialExperiencePrompt } from './editorial.mjs';
import { reconcileKnownUnsent } from './reservation-recovery.mjs';
import { loadRevisionGrants, revisionGrantFor, sameReviewTarget, validateGrant } from './review-revision.mjs';
import { applyQueueReconciliation, fetchQueuePulls, normalizePull, queueAuditReport, reconcileQueue } from './reconcile.mjs';

globalThis.fetch = async () => { throw new Error('TEST_NETWORK_FORBIDDEN'); };
const productionPolicy = read('.case-qa/pipeline/policy.json'), currentPolicy = clone(productionPolicy), root = process.cwd();
// Preserve the historical engine and v2 wire for paid-cache regressions.
// The six-category production path has dedicated tests below.
const legacyParent = path.join(root, '.case-qa-output');
fs.mkdirSync(legacyParent, { recursive: true });
const legacyDirectory = fs.mkdtempSync(path.join(legacyParent, 'historical-engine-'));
const legacyEngine = path.join(legacyDirectory, 'simulator.html');
fs.writeFileSync(legacyEngine, gunzipSync(Buffer.from(fs.readFileSync('.case-qa/fixtures/simulator-0e27218c.html.gz.b64', 'utf8').trim(), 'base64')));
currentPolicy.simulator.path = path.relative(root, legacyEngine);
currentPolicy.simulator.git_blob_sha = '0e27218c7817862f371febb6b7bb865821d9e5da';
currentPolicy.review.prompt_version = 'fm-player-review-v2';
delete currentPolicy.authoring.experience_version;
const policy = clone(currentPolicy);
// Historical paid-cache fixtures must replay their original v1 wire contract.
// The v2 production contract and orchestration are exercised explicitly below.
policy.review.prompt_version = 'fm-player-review-v1';
// Replays must use the recorded portfolio, not newly accepted production cases.
const historicalContext = read('.case-qa/fixtures/historical-portfolio-20261011.json');
const historicalRegistry = historicalContext.registry;
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
  const productionSnapshot = loadSnapshot(root, productionPolicy);
  await test('exact engine and inventory cover the current repository without hardcoded total', () => {
    assert.equal(rows.length, snapshot.inventory.cases.length);
    for (const id of ['rc_001', 'pp_001']) assert.equal(rows.find(r => r.id === id).passed, true);
    assert.ok(campaignRows(snapshot).every(r => !r.content_locked || r.passed));
    // Check actual production certificates before freezing historical replays.
    for (const entry of productionSnapshot.entries) {
      const saved = productionSnapshot.sidecar.cases?.[entry.id]?.pipeline_review;
      if (saved) {
        assert.equal(assess(productionSnapshot, entry, entry.candidate).passed, true);
        assert.equal(certificateValid(productionSnapshot, entry, entry.candidate, saved), true);
      }
    }
  });
  // Paid request hashes include the portfolio. Historical scenario tests must
  // use the same inventory context at checkpoint restoration as at transport.
  // The current source/QA/certificates above and projection checks below remain live.
  for (const entry of snapshot.entries) entry.candidate.qaPortfolioRegistry = clone(historicalRegistry);
  const original = snapshot.entries.find(e => e.id === 'termal-otelde-supheli-vaka');
  const currentSnapshot = { ...snapshot, policy: currentPolicy };
  const adadaEntry = productionSnapshot.entries.find(e => e.id === 'adada-buyuk-gizem');
  await test('six experience categories preserve correctness but vary density; all actual stored difficulties map explicitly', () => {
    assert.equal(Object.keys(EXPERIENCE_PROFILES).length, 6);
    assert.equal(productionPolicy.authoring.experience_version, EXPERIENCE_VERSION);
    assert.equal(productionPolicy.review.prompt_version, REVIEW_VERSION);
    const keys = new Set();
    for (const e of productionSnapshot.entries) keys.add(experienceProfile(e.candidate,e.tier).key);
    assert.equal(keys.size, 6);
    assert.ok(EXPERIENCE_PROFILES.standard_caylak.story[1] < EXPERIENCE_PROFILES.premium_caylak.story[1]);
    assert.ok(EXPERIENCE_PROFILES.standard_caylak.core[1] < EXPERIENCE_PROFILES.standard_dedektif.core[1]);
    assert.equal(difficultyBand({ difficulty: 2 }), 'caylak');
    assert.equal(difficultyBand({ difficulty: 3 }), 'dedektif');
    assert.equal(difficultyBand({ difficulty: 5 }), 'baskomiser');
    assert.throws(() => experienceProfile({ difficulty: 'unknown' }), /CATEGORY_UNKNOWN/);
    assert.equal(productionPolicy.simulator.minimum_score,100);
    assert.equal(productionPolicy.review.minimum_dimension_score,4);
  });
  await test('native HTML and authoring contract agree on all six word limits, including named standard difficulty labels', () => {
    for(const [key,profile]of Object.entries(EXPERIENCE_PROFILES)){
      const [tier,band]=key.split('_'),c=clone(adadaEntry.candidate);
      c.qaPolicy.caseTier=tier;c.difficulty=tier==='standard'?band:({caylak:1,dedektif:3,baskomiser:5})[band];
      c.story=Array(profile.story[1]+1).fill('kanıt').join(' ');
      const qa=productionSnapshot.engine.computeQA(productionSnapshot.engine.normalize(c));
      assert.ok(qa.contentQuality.warnings.some(w=>w.startsWith('Hikâye '+(profile.story[1]+1)+' kelime')),key);
      c.story=adadaEntry.candidate.story;c.clues[0].text=Array(profile.core[1]+1).fill('kanıt').join(' ');
      const clueQA=productionSnapshot.engine.computeQA(productionSnapshot.engine.normalize(c));
      assert.ok(clueQA.contentQuality.warnings.some(w=>w.startsWith('İpucu 1: '+(profile.core[1]+1)+' kelime')),key);
    }
  });
  await test('real human Adada feedback rejects the old density and disconnected scene; concise revision passes the exact engine without old approval', () => {
    const f=read('.case-qa/fixtures/adada-human-feedback-20261013.json'), c=adadaEntry.candidate;
    const before=clone(c); before.story=f.previous_story; before.clues[0].text=f.previous_c1;
    const old=experienceCheck(before,'standard');
    assert.ok(old.issues.some(i=>i.startsWith('EXPERIENCE_STORY_TOO_LONG')));
    assert.ok(old.issues.some(i=>i.includes('UNINTRODUCED_SETTING:c1:atölye')));
    assert.ok(old.issues.includes('EXPERIENCE_PREMATURE_METHOD_ASSERTION'));
    const now=assess(productionSnapshot,adadaEntry,c);
    assert.equal(now.result.score,100); assert.equal(now.passed,true);
    assert.ok(now.experience.counts.story >= 25);
    assert.ok(now.experience.counts.story <= now.experience.profile.story[1]);
    assert.ok(now.experience.counts.clues.every(x=>x.words<=x.maximum));
    assert.equal(certificateValid(productionSnapshot,adadaEntry,c,f.previous_pipeline_review),false);
    const saved = productionSnapshot.sidecar.cases[c.id].pipeline_review;
    if (saved) {
      assert.notEqual(saved.review_hash, f.previous_pipeline_review.review_hash);
      assert.equal(certificateValid(productionSnapshot, adadaEntry, c, saved), true);
    }
  });
  await test('cinematic Adada changes only the opening, preserves all evidence, and invalidates the exact previously approved certificate', () => {
    const f = read('.case-qa/fixtures/adada-cinematic-feedback-20261013.json');
    assert.equal(adadaEntry.raw.story, f.updated_story);
    assert.deepEqual({ ...adadaEntry.raw, story: f.previous_raw.story }, f.previous_raw);
    assert.equal(certificateValid(productionSnapshot, adadaEntry, adadaEntry.candidate, f.previous_pipeline_review), false);
    const current = productionSnapshot.sidecar.cases[f.case_id].pipeline_review;
    if (current) assert.equal(certificateValid(productionSnapshot, adadaEntry, adadaEntry.candidate, current), true);
    assert.equal(assess(productionSnapshot, adadaEntry, adadaEntry.candidate).passed, true);
  });
  await test('native simulator and pipeline both enforce category density and scene continuity; a forensic institution is not an invented crime location', () => {
    const c=clone(adadaEntry.candidate);
    c.clues[0].text='Atölyenin girişindeki kamera, bütün gece sanatçının hareketlerini kesintisiz biçimde kaydetti.';
    const bad=assess(productionSnapshot,adadaEntry,c);
    assert.equal(bad.passed,false);assert.ok(bad.result.blockers.some(x=>x.includes('Sahne Bütünlüğü')));
    const good=productionSnapshot.entries.find(e=>e.id==='pp_001');
    assert.equal(assess(productionSnapshot,good,good.candidate).passed,true);
    for(const id of productionPolicy.authoring.calibration_case_ids){const e=productionSnapshot.entries.find(e=>e.id===id);assert.equal(assess(productionSnapshot,e,e.candidate).passed,true);}
    const long=clone(adadaEntry.candidate);long.clues[0].text=Array(31).fill('görüntüler').join(' ');
    assert.ok(experienceCheck(long,'standard').issues.some(x=>x.includes('CLUE_TOO_LONG')));
    assert.equal(assess(productionSnapshot,adadaEntry,long).passed,false);
  });
  await test('logical signature rejects reordered clues, renamed IDs and swapped innocent labels; graph changes remain distinguishable', () => {
    const c=clone(adadaEntry.candidate), signature=canonicalLogicSignature(c);
    c.clues.reverse(); assert.equal(canonicalLogicSignature(c),signature);
    const regrouped=clone(c), regular=regrouped.clues.filter(x=>!x.isBonus);
    regular[0].logicRules.push(...regular[1].logicRules);
    regrouped.clues=regrouped.clues.filter(x=>x.id!==regular[1].id);
    assert.equal(canonicalLogicSignature(regrouped),signature);
    const swaps=new Map();
    for(const axis of ['suspects','weapons','locations']) c[axis].forEach((e,i)=>swaps.set(e.id,axis+'_'+(8-i)));
    for(const axis of ['suspects','weapons','locations']) c[axis].forEach(e=>{e.id=swaps.get(e.id);e.name='Different name';});
    for(const k of ['suspectId','weaponId','locationId']) c.solution[k]=swaps.get(c.solution[k]);
    for(const clue of c.clues) { for(const r of clue.logicRules) r.pair=r.pair.map(id=>swaps.get(id));
      for(const f of clue.qaSemanticFacts||[]) if(f.entityId) f.entityId=swaps.get(f.entityId); }
    for(const f of c.qaSemanticFacts||[]) if(f.entityId) f.entityId=swaps.get(f.entityId);
    assert.equal(canonicalLogicSignature(c),signature);
    const changed=clone(c); const rule=changed.clues.find(x=>!x.isBonus).logicRules[0];rule.action=rule.action==='confirm'?'eliminate':'confirm';
    assert.notEqual(canonicalLogicSignature(changed),signature);
    const duplicate={...adadaEntry,id:'duplicate',candidate:c};
    assert.equal(logicNoveltyCheck({...productionSnapshot,entries:[adadaEntry,duplicate]},adadaEntry,adadaEntry.candidate).passed,false);
  });
  await test('new verified planner produces genuinely different graphs across new cases and independently proves every core necessary', () => {
    let s={...productionSnapshot,entries:[...productionSnapshot.entries]};
    const source=s.entries.find(e=>e.id==='tren-yolculugunda-cinayet'), signatures=new Set();
    for(let i=0;i<5;i++){
      const e={...source,id:'structural_case_'+i,candidate:clone(source.candidate)};e.candidate.id=e.id;
      const p=textRepairPlan(s,e,e.candidate);assert.ok(p.distinctGraphsAvailable>20);
      assert.equal(verifyTextPlan(e.candidate,p).coreNecessary,true);
      assert.ok(!signatures.has(p.logicSignature));signatures.add(p.logicSignature);
      const c=clone(e.candidate);c.qaSemanticFacts=[{kind:'crime_component',...p.anchor}];
      c.clues.forEach(cl=>{const r=p.clues.find(x=>x.id===cl.id);cl.logicRules=[r.rule];cl.qaSemanticFacts=[];});
      assert.equal(canonicalLogicSignature(c),p.logicSignature);s.entries.push({...e,candidate:c});
    }
    assert.equal(signatures.size,5);
  });
  await test('valid distinct graph is retained for narrative-only fixes and writer/editor share category and continuity requirements', () => {
    const c=adadaEntry.candidate,p=textRepairPlan(productionSnapshot,adadaEntry,c);
    assert.equal(p.retainedGraph,true);
    assert.deepEqual(p.clues.map(x=>x.rule),c.clues.map(x=>x.logicRules[0]));
    const a=assess(productionSnapshot,adadaEntry,c), prompt=textRepairPrompt(adadaEntry,c,p,a,[]);
    assert.match(prompt,/target 25-55/);assert.doesNotMatch(prompt,/STORY: aim for 95-130|EACH CLUE: 35-70/);
    assert.match(prompt,/Never say the lethal method is already confirmed/);
    const feedback={certificate:{judge:validJudge()}};
    assert.deepEqual(JSON.parse(editorialExperiencePrompt(c,feedback)).quality_contract,experienceContract(c));
  });
  await test('new review is independently blind and category-aware; no old certificate or generous scores can waive real issues', async () => {
    const c=adadaEntry.candidate,seen=[];
    const r=await reviewCandidate(productionSnapshot,adadaEntry,c,storeFor(c.id),runFor(),async args=>{
      seen.push(JSON.parse(args.prompt));return {plan:args.purpose==='player'?playerFor(c):{...validJudge(),issues:['Opening and evidence do not form one event']}};
    });
    assert.equal(r.passed,false);
    assert.deepEqual(Object.keys(seen[0]).sort(),['player_case','version']);
    assert.equal(seen[0].player_case.solution,undefined);
    assert.equal(seen[1].quality_contract.experience.key,'standard_caylak');
    assert.equal(seen[1].logical_novelty.signature,canonicalLogicSignature(c));
  });
  await test('actual Adada review upgrade keeps all paid history and uses only two fresh category reviews, never another repair', async () => {
    const f=read('.case-qa/fixtures/adada-review-upgrade-20261013.json'),store=storeFor(f.case_id),before=stableHash(f.requests);
    store.state.cases[f.case_id]=clone(f.previous_record);store.state.requests=clone(f.requests);store.state.campaign_spent=f.previous_record.spent;
    const purposes=[];process.env.GEMINI_API_KEY='offline-experience-upgrade';
    // Replay the pre-upgrade certificate state even after production is approved.
    const upgradeSnapshot = { ...productionSnapshot, sidecar: clone(productionSnapshot.sidecar) };
    delete upgradeSnapshot.sidecar.cases[f.case_id].pipeline_review;
    const r=await repairOne(upgradeSnapshot,adadaEntry,store,{allowAI:true,caller:args=>{
      purposes.push(args.purpose);assert.ok(['player','judge'].includes(args.purpose));
      return callPaid({...args,transport:async()=>responseForFixture(args.purpose==='player'?playerFor(adadaEntry.candidate):validJudge())});
    }});
    assert.equal(r.status,'ready_for_gates');assert.deepEqual(purposes,['player','judge']);assert.equal(r.run.calls,2);
    assert.equal(Object.keys(store.state.requests).length,Object.keys(f.requests).length+2);
    assert.equal(stableHash(Object.fromEntries(Object.entries(store.state.requests).filter(([key])=>key in f.requests))),before);
    assert.ok(store.state.cases[f.case_id].spent>f.previous_record.spent);
    assert.equal(certificateValid(productionSnapshot,adadaEntry,adadaEntry.candidate,r.review.certificate),true);
  });
  await test('durable pushes verify lost acknowledgements, retry only the same commit twice and never overwrite another writer', () => {
    const old = '1'.repeat(40), next = '2'.repeat(40), other = '3'.repeat(40), branch = 'automation/test';
    const exercise = mode => {
      let head = old, pushes = 0;
      const git = (...args) => {
        if (args[0] === 'ls-remote') return head + '\trefs/heads/' + branch;
        assert.deepEqual(args, ['push','origin',next + ':refs/heads/' + branch]); pushes++;
        if (mode === 'ack') { head = next; throw new Error('lost acknowledgement'); }
        if (mode === 'conflict') { head = other; throw new Error('other writer'); }
        if (mode === 'permanent' || pushes === 1) throw new Error('temporary push failure');
        head = next; return '';
      };
      if (mode === 'conflict') assert.throws(() => pushCheckpoint(git, branch, old, next), /STATE_STALE_WRITER/);
      else if (mode === 'permanent') assert.throws(() => pushCheckpoint(git, branch, old, next), /push failure/);
      else pushCheckpoint(git, branch, old, next);
      assert.equal(pushes, ['ack','conflict'].includes(mode) ? 1 : 2);
    };
    for (const mode of ['ack','temporary','conflict','permanent']) exercise(mode);
    assert.throws(() => pushCheckpoint(() => { throw new Error('remote unavailable'); }, branch, old, next), /remote unavailable/);
  });
  await test('the exact live never-sent judge reservation resumes once; uncertain records and actual charges are retained', async () => {
    const fixture = read('.case-qa/fixtures/muze-unsent-judge-38168144752.json');
    const entry = snapshot.entries.find(e => e.id === 'muzede-kayip-eser');
    const make = () => {
      const store = storeFor(entry.id); store.state.cases[entry.id] = clone(fixture.record);
      store.state.cases[entry.id].candidate.qaPortfolioRegistry = clone(historicalRegistry);
      store.state.requests = clone(fixture.requests); store.state.campaign_spent = fixture.record.spent;
      return store;
    };
    const forged = make(); forged.state.requests[fixture.key].charged += 0.000001;
    assert.equal(reconcileKnownUnsent(currentSnapshot, entry, forged), false);
    const uncertain = make(); uncertain.state.cases[entry.id].failures = ['TRANSPORT_UNCERTAIN'];
    assert.equal(reconcileKnownUnsent(currentSnapshot, entry, uncertain), false);
    const store = make(), initial = clone(store.state.requests);
    assert.equal(reconcileKnownUnsent(currentSnapshot, entry, store), true);
    validateState(store.state);
    assert.ok(Math.abs(store.state.campaign_spent - 0.01217435) < 0.00000001);
    assert.equal(reconcileKnownUnsent(currentSnapshot, entry, store), false);
    for (const key of Object.keys(initial).filter(k => k !== fixture.key)) assert.deepEqual(store.state.requests[key], initial[key]);
    process.env.GEMINI_API_KEY = 'offline-unsent-test'; let transports = 0;
    const result = await repairOne(currentSnapshot, entry, store, { allowAI: true, caller: args => callPaid({ ...args,
      transport: async () => { transports++; assert.equal(args.purpose, 'judge'); return responseForFixture(validJudge()); } }) });
    assert.equal(transports, 1); assert.equal(result.status, 'ready_for_gates');
    assert.equal(Object.keys(store.state.requests).length, 4);
    assert.equal(store.state.requests[fixture.key].reservation_failures.length, 1);
    assert.equal(store.state.requests[fixture.key].reservation_failures[0].transport_not_started, true);
  });
  await test('live museum revision remains rejected after optional omissions; no hidden quality exception or renewed revision right', async () => {
    const fixture = read('.case-qa/fixtures/muze-editorial-gates-38169382703.json');
    const entry = snapshot.entries.find(e => e.id === fixture.case_id), record = clone(fixture.record);
    record.candidate.qaPortfolioRegistry = clone(historicalRegistry);
    const candidate = record.candidate, plan = Object.values(fixture.requests).find(r => r.purpose === 'editorial').plan;
    assert.equal(stableHash(candidate), record.candidate_hash);
    assert.throws(() => compileEditorialRevision(currentSnapshot, entry, candidate, plan), /EDITORIAL_GATES_FAILED/);
    assert.throws(() => compileBoundedEditorial(currentSnapshot, entry, candidate, plan), error =>
      /EDITORIAL_GATES_FAILED/.test(error.message) && error.assessment.result.score === 100 &&
      error.assessment.result.qualityFindings.length > 0);
    assert.equal(recoverBoundedEditorial(currentSnapshot, entry, candidate, record, fixture.requests), null);
    const store = storeFor(entry.id); store.state.cases[entry.id] = record;
    store.state.requests = clone(fixture.requests); store.state.campaign_spent = record.spent;
    const result = await repairOne(currentSnapshot, entry, store, { allowAI: true,
      caller: async () => { throw new Error('NO_MORE_PROVIDER_WORK_FOR_REJECTED_REVISION'); } });
    assert.equal(result.status, 'quarantined'); assert.equal(result.run.calls, 0);
    assert.deepEqual(store.state.requests, fixture.requests);
    assert.equal(store.state.cases[entry.id].spent, fixture.record.spent);
    const prompt = JSON.parse(editorialRevisionRequestPrompt(candidate, record.failed_review));
    assert.deepEqual(prompt.revision_constraints.preserved_core_hints,
      Object.fromEntries(candidate.clues.filter(c => !c.isBonus).map(c => [c.id, c.deductionHint])));
    assert.deepEqual(prompt.revision_constraints.entity_labels,
      [...candidate.suspects,...candidate.weapons,...candidate.locations].map(e => e.name));
  });
  const hintFixture = read('.case-qa/fixtures/muze-hint-scope-38167302955.json');
  const hintEntry = snapshot.entries.find(e => e.id === hintFixture.case_id);
  const hintCandidate = clone(hintFixture.record.candidate);
  hintCandidate.qaPortfolioRegistry = clone(historicalRegistry);
  const hintResponse = Object.values(hintFixture.requests).find(r => r.model === currentPolicy.models.repair).plan;
  const hintValue = { case_id: hintEntry.id, hints: Object.fromEntries(hintCandidate.clues.filter(c => !c.isBonus)
    .map(c => [c.id, hintResponse.clues[c.id].deductionHint])) };
  await test('actual Muze 96-point hint-only rejection recovers the exact paid response without admitting rejected rewrites', async () => {
    assert.equal(stableHash(hintCandidate), hintFixture.record.candidate_hash);
    const before = assess(currentSnapshot, hintEntry, hintCandidate);
    assert.equal(before.result.score, 96); assert.equal(hintOnly(before), true);
    const recovered = recoverHintCleanup(currentSnapshot, hintEntry, hintCandidate, hintFixture.record, hintFixture.requests);
    assert.equal(recovered.request_key, 'f2a90a77fdb082820616a6d17c34cedaf735fa628f393755102e3e6a26b88095');
    assert.equal(recovered.assessment.passed, true); assert.equal(recovered.assessment.result.score, 100);
    const withoutHints = c => { const x = clone(c); for (const clue of x.clues) if (!clue.isBonus) delete clue.deductionHint; return x; };
    assert.deepEqual(withoutHints(recovered.candidate), withoutHints(hintCandidate));
    assert.notEqual(hintResponse.story, recovered.candidate.story);
    assert.equal(validHints(hintCandidate, { ...hintValue, story: hintResponse.story }), false);
    assert.throws(() => compileHints(currentSnapshot, hintEntry, hintCandidate, { ...hintValue, story: hintResponse.story }), /PATCH_HINT/);
    const bad = clone(hintValue); bad.hints.c1 = 'Sergi Salonu nerede?';
    assert.equal(compileHints(currentSnapshot, hintEntry, hintCandidate, bad).assessment.passed, false);
    for (const field of ['source_hash','simulator_hash','candidate_hash']) {
      const record = clone(hintFixture.record); record[field] = 'wrong';
      assert.equal(recoverHintCleanup(currentSnapshot, hintEntry, hintCandidate, record, hintFixture.requests), null);
    }
    assert.equal(recoverHintCleanup(currentSnapshot, hintEntry, hintCandidate, hintFixture.record, {}), null);
    const pending = clone(hintFixture.requests); pending[recovered.request_key].status = 'uncertain';
    assert.equal(recoverHintCleanup(currentSnapshot, hintEntry, hintCandidate, hintFixture.record, pending), null);
    process.env.GEMINI_API_KEY = 'offline-hint-test';
    const store = storeFor(hintEntry.id); store.state.cases[hintEntry.id] = { ...clone(hintFixture.record), candidate: clone(hintCandidate) };
    store.state.requests = clone(hintFixture.requests); store.state.campaign_spent = hintFixture.record.spent;
    const history = stableHash(store.state.requests), calls = [];
    const result = await repairOne(currentSnapshot, hintEntry, store, { allowAI: true, caller: args => {
      calls.push(args.purpose); return callPaid({ ...args, transport: async () => responseForFixture(
        args.purpose === 'player' ? playerFor(recovered.candidate) : validJudge()) });
    } });
    assert.deepEqual(calls, ['player','judge']); assert.equal(result.status, 'ready_for_gates');
    assert.equal(stableHash(Object.fromEntries(Object.entries(store.state.requests).filter(([k]) => k in hintFixture.requests))), history);
    assert.equal(result.run.attempts[0].purpose, 'hint_cleanup'); assert.equal(result.run.attempts[0].cached, true);
  });
  await test('a first full repair at 96 switches to a strictly hint-only second request without renewing repair rights', async () => {
    process.env.GEMINI_API_KEY = 'offline-hint-test';
    const store = storeFor(hintEntry.id), calls = [];
    const first = Object.values(hintFixture.requests).find(r => r.model === currentPolicy.models.first_pass).plan;
    const revised = compileHints(currentSnapshot, hintEntry, hintCandidate, hintValue).candidate;
    const result = await repairOne(currentSnapshot, hintEntry, store, { allowAI: true, caller: args => {
      calls.push(args);
      if (calls.length === 2) {
        assert.deepEqual(args.schema.required, ['case_id','hints']);
        assert.match(args.prompt, /Only deductionHint may change/);
        assert.equal(args.repairMethod, TEXT_METHOD);
        assert.equal(args.validate(hintResponse), false);
      }
      return callPaid({ ...args, transport: async () => responseForFixture(args.purpose === 'repair' ?
        (calls.length === 1 ? first : hintValue) : args.purpose === 'player' ? playerFor(revised) : validJudge()) });
    } });
    assert.deepEqual(calls.map(c => c.purpose), ['repair','repair','player','judge']);
    assert.equal(result.status, 'ready_for_gates');
    assert.equal(Object.values(store.state.requests).filter(r => r.purpose === 'repair').length, 2);
    assert.throws(() => reserveRequest(store, currentPolicy, runFor(), hintEntry.id, currentPolicy.models.repair,
      requestBody(currentPolicy, currentPolicy.models.repair, 'third repair'), 'repair', new Date(), TEXT_METHOD), /REPAIR_LIMIT/);
  });
  const narrativeFixture = read('.case-qa/fixtures/pazar-editorial-rejection-38159952807.json');
  const latestNarrativeReview = read('.case-qa/fixtures/pazar-editorial-review-38165586423.json');
  const narrativeEntry = snapshot.entries.find(e => e.id === narrativeFixture.candidate.id);
  const narrativeCandidate = clone(narrativeFixture.candidate);
  narrativeCandidate.qaPortfolioRegistry = clone(historicalRegistry);
  const narrativeValue = { story: narrativeCandidate.story,
    clues: Object.fromEntries(narrativeCandidate.clues.map(c => [c.id, { text: c.text, deductionHint: c.deductionHint }])),
    profile_additions: Object.fromEntries(narrativeCandidate.suspects.map(s => [s.id,
      'Bugün ailesine verdiği sözü tutmak istiyor, yaşanan belirsizlik yüzünden duyduğu kaygıyı gizlemeye çalışıyor.'])) };
  await test('v2 writer and independent editor share criteria; blind player receives no criteria or answer', async () => {
    assert.equal(currentPolicy.review.prompt_version, 'fm-player-review-v2');
    assert.equal(currentPolicy.review.minimum_dimension_score, 4);
    for (const entry of snapshot.entries) assert.equal(qualityContract(entry.candidate).tier, entry.tier);
    const contract = qualityContract(narrativeCandidate, narrativeEntry.tier);
    const failed = { certificate: { judge: narrativeFixture.judge } };
    assert.deepEqual(JSON.parse(editorialRevisionPrompt(narrativeCandidate, failed)).quality_contract, contract);
    const a = assess(currentSnapshot, narrativeEntry, narrativeCandidate);
    assert.ok(repairPrompt(narrativeEntry, narrativeCandidate, a, []).includes(JSON.stringify(contract)));
    const plan = textRepairPlan(currentSnapshot, narrativeEntry, narrativeCandidate);
    assert.ok(textRepairPrompt(narrativeEntry, narrativeCandidate, plan, a, []).includes(JSON.stringify(contract)));
    const seen = [];
    const result = await reviewCandidate(currentSnapshot, narrativeEntry, narrativeCandidate, storeFor(narrativeEntry.id), runFor(), async args => {
      seen.push(JSON.parse(args.prompt));
      return { plan: args.purpose === 'player' ? playerFor(narrativeCandidate) : latestNarrativeReview.judge };
    });
    assert.deepEqual(Object.keys(seen[0]).sort(), ['player_case','version']);
    assert.equal(seen[0].player_case.solution, undefined);
    assert.deepEqual(seen[1].quality_contract, contract);
    assert.equal(result.passed, false);
    assert.deepEqual(result.certificate.judge, latestNarrativeReview.judge);
    assert.notEqual(reviewHash(snapshot, narrativeCandidate, {}), reviewHash(currentSnapshot, narrativeCandidate, {}));
    const oldCertificate = { schema: 'fm_case_review_v1', review_hash: reviewHash(snapshot, narrativeCandidate, {}),
      player: playerFor(narrativeCandidate), judge: validJudge() };
    assert.equal(certificateValid(snapshot, narrativeEntry, narrativeCandidate, oldCertificate), true);
    assert.equal(certificateValid(currentSnapshot, narrativeEntry, narrativeCandidate, oldCertificate), false);
    const changed = clone(narrativeCandidate); changed.difficulty = 'a different difficulty';
    assert.equal(stableHash(playerView(changed)), stableHash(playerView(narrativeCandidate)));
    assert.notEqual(reviewHash(currentSnapshot, changed, {}), reviewHash(currentSnapshot, narrativeCandidate, {}));
  });
  await test('v2 neutral motivations preserve original visual text and all deductions; exact schema and leakage gates fail closed', () => {
    assert.equal(validEditorialRevision(narrativeCandidate, narrativeValue), true);
    assert.deepEqual(editorialRevisionSchema(narrativeCandidate).properties.profile_additions.required, narrativeCandidate.suspects.map(s => s.id));
    const revised = compileEditorialRevision(currentSnapshot, narrativeEntry, narrativeCandidate, narrativeValue).candidate;
    assert.equal(assess(currentSnapshot, narrativeEntry, revised).passed, true);
    narrativeCandidate.suspects.forEach((s, i) => {
      assert.equal(revised.suspects[i].description, s.description + ' ' + narrativeValue.profile_additions[s.id]);
      assert.deepEqual({ ...revised.suspects[i], description: s.description }, s);
    });
    for (const field of ['weapons','locations','solution','clues']) assert.deepEqual(revised[field], narrativeCandidate[field]);
    assert.equal(validEditorialRevision(narrativeCandidate, { ...narrativeValue, solution: narrativeCandidate.solution }), false);
    const extra = clone(narrativeValue); extra.profile_additions.other = ''; assert.equal(validEditorialRevision(narrativeCandidate, extra), false);
    const empty = clone(narrativeValue); for (const id of Object.keys(empty.profile_additions)) empty.profile_additions[id] = '';
    assert.throws(() => compileEditorialRevision(currentSnapshot, narrativeEntry, narrativeCandidate, empty), /EDITORIAL_NO_CHANGE/);
    const short = clone(narrativeValue); short.profile_additions.s1 = 'Kaygılı görünüyor.';
    assert.throws(() => compileEditorialRevision(currentSnapshot, narrativeEntry, narrativeCandidate, short), /EDITORIAL_PROFILE_LENGTH/);
    const long = clone(narrativeValue); long.profile_additions.s1 = Array(21).fill('kaygı').join(' ');
    assert.throws(() => compileEditorialRevision(currentSnapshot, narrativeEntry, narrativeCandidate, long), /EDITORIAL_PROFILE_LENGTH/);
    const leak = clone(narrativeValue); leak.profile_additions.s1 = 'Baklava ve Tezgah yalnızca onun kontrolündeydi, başka hiç kimsenin bunlara erişimi yoktu.';
    assert.throws(() => compileEditorialRevision(currentSnapshot, narrativeEntry, narrativeCandidate, leak), /EDITORIAL_GATES_FAILED/);
  });
  await test('bounded editorial omissions preserve validated hints and profiles while all strict gates still apply', () => {
    const plan = clone(narrativeValue);
    plan.clues.c1.deductionHint = 'Baklava ve Tezgah hangi şüphelinin elindeydi?';
    plan.profile_additions.s1 = 'Baklava ve Tezgah yalnızca onun kontrolündeydi, başka hiç kimsenin bunlara erişimi yoktu.';
    const next = compileBoundedEditorial(currentSnapshot, narrativeEntry, narrativeCandidate, plan);
    assert.equal(next.assessment.passed, true);
    assert.ok(next.omitted_fields.includes('profile_additions.s1'));
    assert.equal(next.candidate.suspects[0].description, narrativeCandidate.suspects[0].description);
    assert.equal(next.candidate.clues[0].deductionHint, narrativeCandidate.clues[0].deductionHint);
    assert.equal(next.candidate.story, plan.story);
    for (const field of ['weapons','locations','solution']) assert.deepEqual(next.candidate[field], narrativeCandidate[field]);
    const short = clone(plan); short.story = 'Çok kısa.';
    assert.throws(() => compileBoundedEditorial(currentSnapshot, narrativeEntry, narrativeCandidate, short), /EDITORIAL_CONTENT_TOO_SHORT/);
    const invalid = clone(plan); invalid.solution = narrativeCandidate.solution;
    assert.throws(() => compileBoundedEditorial(currentSnapshot, narrativeEntry, narrativeCandidate, invalid), /EDITORIAL_RESPONSE_INVALID/);
  });
  await test('production v2 orchestration performs one motivation revision and entirely fresh reviews within seven lifetime requests', async () => {
    process.env.GEMINI_API_KEY = 'offline-v2-test';
    const store = storeFor(narrativeEntry.id), candidate = narrativeCandidate;
    Object.assign(store.state.cases[narrativeEntry.id], { candidate: clone(candidate), candidate_hash: stableHash(candidate),
      source_hash: narrativeEntry.sourceHash, simulator_hash: snapshot.simulatorHash, status: 'quarantined',
      failed_review: { passed: false, failures: ['EDITORIAL_REVIEW_FAILED'], certificate: {
        schema: 'fm_case_review_v1', review_hash: reviewHash(currentSnapshot, candidate, {}),
        player: playerFor(candidate), judge: narrativeFixture.judge } } });
    for (const [i, purpose] of ['repair','repair','player','judge'].entries()) store.state.requests['v2-prior-' + i] = {
      case_id: narrativeEntry.id, purpose, status: 'completed', charged: 0, day: '2026-10-11',
      ...(purpose === 'repair' ? { repair_method: TEXT_METHOD } : {}) };
    const revised = compileEditorialRevision(currentSnapshot, narrativeEntry, candidate, narrativeValue).candidate;
    const calls = [];
    const result = await repairOne(currentSnapshot, narrativeEntry, store, { allowAI: true, caller: args => {
      calls.push(args.purpose);
      return callPaid({ ...args, transport: async () => responseForFixture(args.purpose === 'editorial' ? narrativeValue :
        args.purpose === 'player' ? playerFor(revised) : validJudge()) });
    } });
    assert.deepEqual(calls, ['editorial','player','judge']);
    assert.equal(result.status, 'ready_for_gates');
    assert.equal(Object.keys(store.state.requests).length, 7);
    assert.equal(certificateValid(currentSnapshot, narrativeEntry, revised, result.review.certificate), true);
    assert.throws(() => reserveRequest(store, currentPolicy, runFor(), narrativeEntry.id, currentPolicy.models.repair,
      requestBody(currentPolicy, currentPolicy.models.repair, 'another revision'), 'editorial'), /CASE_REQUEST_LIMIT|EDITORIAL_LIMIT/);
    const exhausted = storeFor(narrativeEntry.id);
    exhausted.state.requests = clone(store.state.requests);
    exhausted.state.cases[narrativeEntry.id] = { ...clone(store.state.cases[narrativeEntry.id]), review: undefined };
    const before = stableHash(exhausted.state.requests);
    const run = runFor(); let transports = 0;
    await assert.rejects(() => callPaid({ store: exhausted, policy: currentPolicy, run, caseId: narrativeEntry.id,
      model: currentPolicy.models.reviewer, purpose: 'player', prompt: 'uncached v2 review',
      transport: async () => { transports++; return responseForFixture(playerFor(revised)); } }), /CASE_REQUEST_LIMIT/);
    assert.equal(transports, 0); assert.equal(stableHash(exhausted.state.requests), before);
    assert.deepEqual(reopenTextQuarantine(currentSnapshot, exhausted), []);
  });
  await test('live editorial rejection is actionable; one bounded prose revision requires entirely fresh player and judge calls', async () => {
    const oldKey = process.env.GEMINI_API_KEY; process.env.GEMINI_API_KEY = 'offline-editorial-test';
    const fixture = read('.case-qa/fixtures/pazar-editorial-rejection-38159952807.json');
    const entry = snapshot.entries.find(e => e.id === fixture.candidate.id), candidate = clone(fixture.candidate);
    candidate.qaPortfolioRegistry = clone(historicalRegistry);
    assert.equal(stableHash(candidate), fixture.candidate_hash);
    assert.equal(assess(snapshot, entry, candidate).passed, true);
    assert.equal(playerPass(policy, candidate, playerView(candidate), fixture.player), true);
    assert.equal(judgePass(policy, fixture.judge), false);
    const failed = { passed: false, failures: ['EDITORIAL_REVIEW_FAILED'], certificate: {
      schema: 'fm_case_review_v1', review_hash: reviewHash(snapshot, candidate, {}), player: fixture.player, judge: fixture.judge } };
    assert.equal(editorialFailure(snapshot, candidate, failed), true);
    assert.match(editorialPrompt(candidate, failed), /Baklava/);
    assert.match(editorialPrompt(candidate, failed), /tutanağı/);
    const value = { story: candidate.story + ' Kepenkler yarıya inerken mahallede yıllardır süren güven duygusu da sarsılmıştı. Halit’in akşam evine dönmesini bekleyen ailesine henüz kimse haber veremiyordu.',
      clues: Object.fromEntries(candidate.clues.map(c => [c.id, { text: c.text, deductionHint: c.deductionHint }])) };
    const revised = compileEditorial(snapshot, entry, candidate, value).candidate;
    assert.equal(assess(snapshot, entry, revised).passed, true);
    for (const axis of ['suspects','weapons','locations']) assert.equal(stableHash(revised[axis]), stableHash(candidate[axis]));
    assert.equal(stableHash(revised.solution), stableHash(candidate.solution));
    assert.equal(stableHash(revised.clues.map(c => c.logicRules)), stableHash(candidate.clues.map(c => c.logicRules)));
    assert.equal(validEditorial(candidate, { ...value, solution: candidate.solution }), false);
    assert.throws(() => compileEditorial(snapshot, entry, candidate, { ...value, story: candidate.story }), /EDITORIAL_NO_CHANGE/);
    assert.throws(() => compileEditorial(snapshot, entry, candidate, { ...value, story: 'Eksik.' }), /EDITORIAL_CONTENT/);
    const leaking = clone(value); leaking.story += ' Katil Komşu Satıcı idi; Baklava ile Tezgah üzerinde öldürdü.';
    assert.throws(() => compileEditorial(snapshot, entry, candidate, leaking), /EDITORIAL_GATES_FAILED/);
    const changed = clone(candidate); changed.story += ' Farklı.';
    assert.equal(editorialFailure(snapshot, changed, failed), false);
    const store = storeFor(entry.id);
    Object.assign(store.state.cases[entry.id], { candidate, candidate_hash: stableHash(candidate),
      source_hash: entry.sourceHash, simulator_hash: snapshot.simulatorHash, failed_review: failed,
      spent: 0.01502, status: 'quarantined' });
    store.state.campaign_spent = 0.01502;
    for (const [i,purpose] of ['repair','repair','player','judge'].entries()) store.state.requests['prior-' + i] = {
      case_id: entry.id, purpose, status: 'completed', charged: 0.01502 / 4, day: '2026-10-11',
      ...(purpose === 'repair' ? { repair_method: TEXT_METHOD } : {}) };
    const prior = stableHash(store.state.requests), calls = [];
    const result = await repairOne(snapshot, entry, store, { allowAI: true, caller: args => {
      calls.push(args.purpose);
      return callPaid({ ...args, transport: async () => responseForFixture(args.purpose === 'editorial' ? value :
        args.purpose === 'player' ? playerFor(revised) : validJudge()) });
    } });
    assert.deepEqual(calls, ['editorial','player','judge'], JSON.stringify({ failures: result.failures, attempts: result.run.attempts, status: result.status }));
    assert.equal(result.status, 'ready_for_gates');
    assert.equal(Object.keys(store.state.requests).length, 7);
    assert.equal(stableHash(Object.fromEntries(Object.entries(store.state.requests).filter(([k]) => k.startsWith('prior-')))), prior);
    assert.ok(store.state.campaign_spent > 0.01502);
    assert.equal(certificateValid(snapshot, entry, revised, result.review.certificate), true);
    assert.throws(() => reserveRequest(store, policy, runFor(), entry.id, policy.models.repair,
      requestBody(policy, policy.models.repair, 'another editorial request'), 'editorial'), /CASE_REQUEST_LIMIT|EDITORIAL_LIMIT/);
    const limited = { ...snapshot, policy: clone(policy) }; limited.policy.sequential.max_calls_per_execute = 2;
    const pendingStore = storeFor(entry.id);
    Object.assign(pendingStore.state.cases[entry.id], { candidate, candidate_hash: stableHash(candidate),
      source_hash: entry.sourceHash, simulator_hash: snapshot.simulatorHash, failed_review: failed });
    const pending = await repairOne(limited, entry, pendingStore, { allowAI: true,
      caller: () => { throw new Error('NO_PARTIAL_REVISION_CALLS'); } });
    assert.equal(pending.status, 'editorial_pending');
    const once = storeFor(entry.id);
    reserveRequest(once, policy, runFor(), entry.id, policy.models.repair,
      requestBody(policy, policy.models.repair, 'first editorial'), 'editorial');
    assert.throws(() => reserveRequest(once, policy, runFor(), entry.id, policy.models.repair,
      requestBody(policy, policy.models.repair, 'second editorial'), 'editorial'), /EDITORIAL_LIMIT/);
    const blindStore = storeFor(entry.id);
    Object.assign(blindStore.state.cases[entry.id], { candidate, candidate_hash: stableHash(candidate),
      source_hash: entry.sourceHash, simulator_hash: snapshot.simulatorHash, failed_review: failed });
    const blindCalls = [];
    const rejected = await repairOne(snapshot, entry, blindStore, { allowAI: true, caller: args => {
      blindCalls.push(args.purpose);
      return callPaid({ ...args, transport: async () => responseForFixture(args.purpose === 'editorial' ? value :
        { ...playerFor(revised), confidence: 20, unique_solution: false }) });
    } });
    assert.deepEqual(blindCalls, ['editorial','player']);
    assert.equal(rejected.status, 'quarantined'); assert.deepEqual(rejected.failures, ['BLIND_PLAYER_FAILED']);
    assert.equal(blindStore.state.cases[entry.id].review, undefined);
    // Reproduce the deployed run: rejection existed only in the request cache.
    const coldStore = storeFor(entry.id), reviewCost = Object.values(fixture.review_requests).reduce((s,r) => s + r.charged, 0);
    const deployedSnapshot = { ...snapshot, simulatorHash: '04352c0a4ce07097cb752a1980b144fa00722e78',
      entries: snapshot.entries.filter(e => historicalContext.comparison_cases.some(c => c.id === e.id)).map(e => {
        const saved = historicalContext.comparison_cases.find(c => c.id === e.id);
        return { ...e, raw: { ...e.raw, title: saved.title, story: saved.story } };
      }) };
    Object.assign(coldStore.state.cases[entry.id], { candidate, candidate_hash: stableHash(candidate),
      source_hash: entry.sourceHash, simulator_hash: deployedSnapshot.simulatorHash, spent: fixture.historical_spent });
    coldStore.state.campaign_spent = fixture.historical_spent;
    coldStore.state.requests = clone(fixture.review_requests);
    for (let i = 0; i < 2; i++) coldStore.state.requests['historical-repair-' + i] = {
      case_id: entry.id, purpose: 'repair', repair_method: TEXT_METHOD, status: 'completed', day: '2026-10-11',
      charged: (fixture.historical_spent - reviewCost) / 2 };
    const actualTransports = [];
    const recovered = await repairOne(deployedSnapshot, entry, coldStore, { allowAI: true, caller: args => callPaid({ ...args,
      transport: async () => { actualTransports.push(args.purpose); return responseForFixture(args.purpose === 'editorial' ? value :
        args.purpose === 'player' ? playerFor(revised) : validJudge()); } }) });
    assert.deepEqual(actualTransports, ['editorial','player','judge']);
    assert.equal(recovered.status, 'ready_for_gates'); assert.equal(recovered.run.calls, 3);
    assert.equal(Object.keys(coldStore.state.requests).length, 7);
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
  });
  await test('actual ara-hat false positive is corrected; the exact paid editorial request recovers with only two fresh reviews', async () => {
    const fixture = read('.case-qa/fixtures/pazar-editorial-name-rejection-38164243995.json');
    const base = read('.case-qa/fixtures/pazar-editorial-rejection-38159952807.json');
    const entry = snapshot.entries.find(e => e.id === base.candidate.id), candidate = clone(base.candidate);
    candidate.qaPortfolioRegistry = clone(historicalRegistry);
    const request = Object.values(fixture.requests).find(r => r.purpose === 'editorial');
    const oldPath = path.join(temporary, 'pre-ara-html.html');
    fs.writeFileSync(oldPath, execFileSync('git', ['show', fixture.record.simulator_hash]));
    const { loadEngine } = createRequire(import.meta.url)('../fm_case_qa_core.cjs');
    const old = { ...snapshot, simulatorHash: fixture.record.simulator_hash, engine: loadEngine(oldPath) };
    assert.throws(() => compileEditorial(old, entry, candidate, request.plan), /Ara Sokak/);
    const repaired = compileEditorial(snapshot, entry, candidate, request.plan);
    assert.equal(repaired.assessment.passed, true);
    for (const text of ['Ara Sokak', 'Ara Sokakta', 'Ara Sokağa', 'sokakta']) {
      const named = clone(request.plan); named.clues.c4.text += ' Kayıtlarda ' + text + ' ifadesi yer alıyor.';
      assert.throws(() => compileEditorial(snapshot, entry, candidate, named), /Ara Sokak/);
    }
    const record = { ...clone(fixture.record), candidate };
    assert.equal(recoverEditorial(snapshot, entry, candidate, record, fixture.requests).assessment.passed, true);
    for (const status of ['reserved','failed','invalid_response']) {
      const bad = clone(fixture.requests); Object.values(bad).find(r => r.purpose === 'editorial').status = status;
      assert.equal(recoverEditorial(snapshot, entry, candidate, record, bad), null);
    }
    assert.equal(recoverEditorial(snapshot, entry, candidate, { ...record, source_hash: 'stale' }, fixture.requests), null);
    assert.equal(recoverEditorial({ ...snapshot, simulatorHash: 'unrelated' }, entry, candidate, record, fixture.requests), null);
    const wrongKey = Object.fromEntries(Object.values(fixture.requests).map((r,i) => ['wrong-' + i, r]));
    assert.equal(recoverEditorial(snapshot, entry, candidate, record, wrongKey), null);
    const store = storeFor(entry.id); store.state.cases[entry.id] = record;
    store.state.requests = clone(fixture.requests); store.state.campaign_spent = record.spent;
    const history = stableHash(store.state.requests), oldKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'offline-editorial-recovery';
    try {
      const calls = [];
      const result = await repairOne(snapshot, entry, store, { allowAI: true, caller: args => {
        calls.push(args.purpose); return callPaid({ ...args, transport: async () => responseForFixture(
          args.purpose === 'player' ? playerFor(repaired.candidate) : validJudge()) });
      } });
      assert.deepEqual(calls, ['player','judge']); assert.equal(result.run.calls, 2);
      assert.equal(result.status, 'ready_for_gates'); assert.equal(result.run.attempts[0].cached, true);
      assert.equal(Object.keys(store.state.requests).length, 7);
      assert.equal(stableHash(Object.fromEntries(Object.entries(store.state.requests).filter(([k]) => fixture.requests[k]))), history);
      assert.equal(certificateValid(snapshot, entry, repaired.candidate, result.review.certificate), true);
    } finally { if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; }
  });
  await test('actual Pazar response failed only on an investigator title; corrected exact HTML still blocks true double disclosures', () => {
    const fixture = read('.case-qa/fixtures/pazar-live-candidate-38158353700.json');
    const entry = snapshot.entries.find(e => e.id === fixture.candidate.id), candidate = clone(fixture.candidate);
    candidate.qaPortfolioRegistry = clone(historicalRegistry);
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
    const candidate = clone(fixture.candidate); candidate.qaPortfolioRegistry = clone(historicalRegistry);
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
  await test('new-method recovery preserves money/history and keeps both versioned repair limits within the lifetime request cap', async () => {
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
    // Shared narrative criteria add ~3k characters to the previously bounded prompt.
    assert.ok(p.length < 17000); assert.doesNotMatch(p, /qaPortfolioRegistry|Allowed JSON Pointer/);
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
  fixture.qaPortfolioRegistry = clone(historicalRegistry);
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
      prompt: 'disk', transport: () => { throw new Error('UNEXPECTED_CALL'); } }), /RESERVATION_NOT_DURABLE/);
    assert.equal(Object.values(store.state.requests)[0].transport_not_started, true);
    assert.equal(store.state.campaign_spent, 0);
  });
  await test('a proven unsent reservation can start once after storage recovers; settlement failures never refund provider work', async () => {
    const store = storeFor(), run = runFor(); let transports = 0;
    const args = { store, policy, run, caseId: 'test', model: policy.models.first_pass, prompt: 'unsent-resume',
      transport: async () => { transports++; return response('{}'); } };
    store.save = () => { throw new Error('storage unavailable'); };
    await assert.rejects(callPaid(args), /RESERVATION_NOT_DURABLE/);
    assert.equal(transports, 0); assert.equal(run.calls, 1);
    store.save = () => validateState(store.state);
    await callPaid(args); await callPaid(args);
    assert.equal(transports, 1); assert.equal(run.calls, 2);
    assert.equal(Object.values(store.state.requests)[0].reservation_failures.length, 1);
    const charged = storeFor(); let saves = 0;
    charged.save = () => { saves++; if (saves === 2) throw new Error('settlement save failed'); };
    await assert.rejects(callPaid({ ...args, store: charged, run: runFor(), prompt: 'actual-charge' }), /settlement save failed/);
    const ledger = Object.values(charged.state.requests)[0];
    assert.equal(ledger.status, 'completed'); assert.ok(ledger.charged > 0);
    assert.equal(ledger.transport_not_started, undefined);
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
    await call('last-allowed', 'judge');
    await assert.rejects(call('extra', 'judge'), /CASE_REQUEST_LIMIT/);
    assert.equal(store.state.requests['historical-400'].charged, 0);
    assert.equal(store.state.requests['historical-404'].http_status, 404);
    const blocked = storeFor(entry.id);
    for (let i = 0; i < policy.sequential.max_requests_per_case; i++) blocked.state.requests['rejected-' + i] = {
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
  const words = text => (String(text || '').trim().match(/\S+/g) || []).length;
  const adadaLedger = () => {
    const fixture = read('.case-qa/fixtures/adada-ledger-20261017.json');
    const store = storeFor(fixture.case_id);
    store.state.cases[fixture.case_id] = clone(fixture.record);
    store.state.requests = clone(fixture.requests);
    store.state.campaign_spent = fixture.record.spent;
    validateState(store.state);
    return { fixture, store };
  };
  const pull = (body) => normalizePull(body);
  await test('Adada grant is one exact player/judge pair and does not raise the lifetime request cap', () => {
    assert.equal(productionPolicy.sequential.max_requests_per_case, 7);
    assert.equal(productionPolicy.review_revision.max_pair_uses, 1);
    const grants = loadRevisionGrants(root, productionPolicy);
    assert.equal(grants.length, 1);
    const grant = revisionGrantFor(productionSnapshot, adadaEntry);
    assert.equal(grant.id, 'adada-human-revision-9aabe510');
    assert.equal(grant.content_hash, adadaEntry.sourceHash);
    assert.deepEqual(grant.purposes, ['player', 'judge']);
    assert.equal(words(adadaEntry.candidate.story), 46);
    assert.equal(revisionGrantFor(productionSnapshot, { ...adadaEntry, sourceHash: 'ab'.repeat(32) }), null);
    assert.throws(() => validateGrant({ ...grant, uses: 2 }), /REVISION_GRANT_UNLIMITED/);
    assert.throws(() => validateGrant({ ...grant, purposes: ['repair', 'editorial'] }), /REVISION_GRANT_PURPOSE/);
    const store = storeFor(adadaEntry.id);
    assert.throws(() => reserveRequest(store, productionPolicy, runFor(), adadaEntry.id, productionPolicy.models.repair,
      requestBody(productionPolicy, productionPolicy.models.repair, 'grant-cannot-repair'), 'repair', new Date(), 'legacy_patch', grant), /REVISION_GRANT_PURPOSE/);
    assert.throws(() => reserveRequest(store, productionPolicy, runFor(), adadaEntry.id, productionPolicy.models.repair,
      requestBody(productionPolicy, productionPolicy.models.repair, 'grant-cannot-edit'), 'editorial', new Date(), 'legacy_patch', grant), /REVISION_GRANT_PURPOSE/);
    assert.equal(Object.keys(store.state.requests).length, 0);
    const body = requestBody(productionPolicy, productionPolicy.models.reviewer, 'uncertain-granted-player', { schema: { type: 'object' }, system: 'player' });
    const reserved = reserveRequest(store, productionPolicy, runFor(), adadaEntry.id, productionPolicy.models.reviewer, body, 'player', new Date(), 'legacy_patch', grant);
    assert.equal(store.state.requests[reserved.key].status, 'reserved');
    assert.throws(() => reserveRequest(store, productionPolicy, runFor(), adadaEntry.id, productionPolicy.models.reviewer, body, 'player', new Date(), 'legacy_patch', grant), /REPEATED_OR_UNCERTAIN_REQUEST/);
    assert.equal(store.state.requests[reserved.key].status, 'reserved');
    assert.equal(store.state.requests[reserved.key].charged > 0, true);
  });
  await test('six historical Adada requests stop a review pair before any call unless the exact grant applies once', async () => {
    const bare = { ...productionSnapshot, policy: clone(productionSnapshot.policy) };
    delete bare.policy.review_revision;
    const blockedLedger = adadaLedger();
    let blockedCalls = 0;
    const blocked = await repairOne(bare, adadaEntry, blockedLedger.store, { allowAI: true, caller: () => { blockedCalls++; throw new Error('UNEXPECTED_CALL'); } });
    assert.equal(blocked.status, 'review_pair_blocked');
    assert.equal(blocked.run.calls, 0);
    assert.equal(blockedCalls, 0);
    assert.equal(Object.keys(blockedLedger.store.state.requests).length, 6);
    assert.deepEqual(blockedLedger.store.state.requests, blockedLedger.fixture.requests);
    const source = fs.readFileSync('artifacts/dedektif/data/puzzles.ts');
    const { fixture, store } = adadaLedger();
    let transports = 0;
    const caller = args => callPaid({ ...args, transport: async () => {
      transports++;
      const plan = args.purpose === 'player' ? playerFor(adadaEntry.candidate) : validJudge();
      return responseForFixture(plan);
    } });
    const reviewed = await repairOne(productionSnapshot, adadaEntry, store, { allowAI: true, caller });
    assert.equal(reviewed.status, 'ready_for_gates');
    assert.equal(reviewed.run.attempts.filter(item => item.purpose === 'repair' || item.purpose === 'editorial').length, 0);
    assert.equal(transports, 2);
    assert.equal(reviewed.run.calls, 2);
    assert.equal(Object.keys(store.state.requests).length, 8);
    for (const [key, value] of Object.entries(fixture.requests)) assert.deepEqual(store.state.requests[key], value);
    assert.equal(Object.values(store.state.requests).filter(item => item.revision_grant_id === 'adada-human-revision-9aabe510').length, 2);
    assert.equal(words(store.state.cases[adadaEntry.id].archived_candidate.story), 44);
    assert.equal(words(store.state.cases[adadaEntry.id].candidate.story), 46);
    assert.ok(source.equals(fs.readFileSync('artifacts/dedektif/data/puzzles.ts')));
    assert.equal(certificateValid(productionSnapshot, adadaEntry, adadaEntry.candidate, reviewed.review.certificate), true);
    const wrong = await repairOne(productionSnapshot, { ...adadaEntry, sourceHash: 'cd'.repeat(32) }, adadaLedger().store,
      { allowAI: true, caller: () => { throw new Error('UNEXPECTED_CALL'); } });
    assert.equal(wrong.status, 'review_pair_blocked');
    assert.equal(wrong.run.calls, 0);
    let repeat = 0;
    const second = await repairOne(productionSnapshot, adadaEntry, store, { allowAI: true, caller: () => { repeat++; throw new Error('UNEXPECTED_CALL'); } });
    assert.equal(second.status, 'ready_for_gates');
    assert.equal(second.run.calls, 0);
    assert.equal(repeat, 0);
    assert.equal(transports, 2);
    assert.throws(() => reserveRequest(store, productionPolicy, runFor(), adadaEntry.id, productionPolicy.models.reviewer,
      requestBody(productionPolicy, productionPolicy.models.reviewer, 'another-granted-player'), 'player', new Date(), 'legacy_patch',
      revisionGrantFor(productionSnapshot, adadaEntry)), /REVISION_GRANT_EXHAUSTED|CASE_REQUEST_LIMIT/);
    assert.equal(Object.keys(store.state.requests).length, 8);
  });
  await test('changed player cards cannot use the source revision grant', () => {
    const source = adadaEntry.candidate;
    assert.equal(sameReviewTarget(source, clone(source)), true);
    assert.equal(revisionGrantFor(productionSnapshot, adadaEntry).content_hash, '40f10f3099f3bcbf99a1c61e5268403a05296e417ec22bbc344f80a94bd8cff2');
    for (const axis of ['suspects', 'weapons', 'locations']) {
      const changed = clone(source);
      assert.equal(typeof changed[axis][0].description, 'string');
      changed[axis][0].description += ' ek kart';
      assert.equal(sameReviewTarget(source, changed), false, axis);
      assert.equal(revisionGrantFor(productionSnapshot, adadaEntry, changed), null, axis);
    }
    const story = clone(source); story.story += ' ek cümle';
    const clue = clone(source); clue.clues[0].text += ' ek ipucu';
    const solution = clone(source); solution.solution = { ...solution.solution, weaponId: solution.solution.weaponId + '-x' };
    assert.equal(sameReviewTarget(source, story), false);
    assert.equal(sameReviewTarget(source, clue), false);
    assert.equal(sameReviewTarget(source, solution), false);
    const hidden = clone(source);
    hidden.suspects[0].generationPrompt = 'oyuncunun görmediği yazar notu';
    assert.equal(sameReviewTarget(source, hidden), true);
    assert.equal(productionPolicy.sequential.max_requests_per_case, 7);
  });
  await test('a revision grant buys one player and one judge, not a second key of either', () => {
    const grant = revisionGrantFor(productionSnapshot, adadaEntry);
    const store = storeFor(adadaEntry.id);
    const body = (text, system) => requestBody(productionPolicy, productionPolicy.models.reviewer, text, { schema: { type: 'object' }, system });
    const reserve = (text, purpose, system) => reserveRequest(store, productionPolicy, runFor(), adadaEntry.id,
      productionPolicy.models.reviewer, body(text, system), purpose, new Date(), 'legacy_patch', grant);
    const player = reserve('player-one', 'player', 'player');
    const spent = store.state.cases[adadaEntry.id].spent;
    assert.notEqual(requestKey(adadaEntry.id, productionPolicy.models.reviewer, body('player-two', 'player'), 'player'), player.key);
    assert.throws(() => reserve('player-two', 'player', 'player'), /REVISION_GRANT_EXHAUSTED/);
    assert.throws(() => reserve('player-one', 'player', 'player'), /REPEATED_OR_UNCERTAIN_REQUEST/);
    assert.equal(store.state.requests[player.key].status, 'reserved');
    assert.equal(Object.keys(store.state.requests).length, 1);
    assert.equal(store.state.cases[adadaEntry.id].spent, spent);
    store.state.requests[player.key].status = 'completed';
    store.state.requests[player.key].plan = { cached: true };
    const replay = reserve('player-one', 'player', 'player');
    assert.deepEqual(replay.cached, { cached: true });
    assert.equal(store.state.cases[adadaEntry.id].spent, spent);
    assert.equal(Object.keys(store.state.requests).length, 1);
    const judge = reserve('judge-one', 'judge', 'judge');
    const pairSpent = store.state.cases[adadaEntry.id].spent;
    assert.throws(() => reserve('judge-two', 'judge', 'judge'), /REVISION_GRANT_EXHAUSTED/);
    assert.throws(() => reserve('judge-one', 'judge', 'judge'), /REPEATED_OR_UNCERTAIN_REQUEST/);
    assert.equal(store.state.requests[judge.key].status, 'reserved');
    assert.equal(Object.values(store.state.requests).filter(item => item.purpose === 'player' && item.revision_grant_id === grant.id).length, 1);
    assert.equal(Object.values(store.state.requests).filter(item => item.purpose === 'judge' && item.revision_grant_id === grant.id).length, 1);
    assert.equal(Object.keys(store.state.requests).length, 2);
    assert.equal(store.state.cases[adadaEntry.id].spent, pairSpent);
    assert.equal(store.state.campaign_spent, pairSpent);
  });
  await test('merged, closed and stale pull requests reconcile without restoring old copy or spending', async () => {
    const { fixture, store } = adadaLedger();
    const requests = clone(store.state.requests);
    const pulls = [
      pull({ number: 98, state: 'closed', merged_at: '2026-10-13T19:07:01Z', merge_commit_sha: 'ac09f96af021e4a94c8a5f1a8cd5eabb83e97fba', title: 'reviewed Adada', head: { sha: '9c445af25917794286b61d7337733ad475a148ae' } }),
      pull({ number: 94, state: 'open', draft: true, title: 'old Adada draft', head: { sha: 'b'.repeat(40) } })
    ];
    const preview = queueAuditReport(productionSnapshot, store.state, pulls);
    assert.equal(preview.durable_store_updated, false);
    assert.equal(preview.queue_reconciled, false);
    assert.equal(preview.reconciliation_preview.find(item => item.id === adadaEntry.id).action, 'source_revised');
    assert.equal(preview.untracked_open_prs.some(item => item.number === 94 && item.role === 'untracked_open_pr'), true);
    assert.equal(store.state.cases[adadaEntry.id].status, 'awaiting_review');
    const applied = applyQueueReconciliation(store, productionSnapshot, pulls);
    assert.equal(applied.changed, true);
    assert.equal(store.state.cases[adadaEntry.id].status, 'source_revised');
    assert.equal(store.state.cases[adadaEntry.id].pr_state, 'merged');
    assert.equal(words(store.state.cases[adadaEntry.id].archived_candidate.story), 44);
    assert.equal(words(restoreBest(productionSnapshot, adadaEntry, store.state.cases[adadaEntry.id]).candidate.story), 46);
    assert.deepEqual(store.state.requests, requests);
    assert.equal(store.state.campaign_spent, fixture.record.spent);
    assert.equal(applyQueueReconciliation(store, productionSnapshot, pulls).changed, false);
    const closed = storeFor('keep');
    closed.state.cases.keep = { spent: 0, status: 'awaiting_review', source_hash: 'keep', pr_url: 'https://github.com/5n1katil/Faili-Mechul/pull/12', candidate: { story: 'eski aday' } };
    const closedPull = [pull({ number: 12, state: 'closed', title: 'abandoned' })];
    applyQueueReconciliation(closed, { entries: [{ id: 'keep', sourceHash: 'keep' }] }, closedPull);
    assert.equal(closed.state.cases.keep.status, 'review_closed');
    assert.equal(closed.state.cases.keep.candidate.story, 'eski aday');
    const unknown = storeFor('held');
    unknown.state.cases.held = { spent: 0, status: 'awaiting_review', source_hash: 'held', pr_url: 'https://github.com/5n1katil/Faili-Mechul/pull/77' };
    const held = reconcileQueue(unknown.state, { entries: [{ id: 'held', sourceHash: 'held' }] }, []);
    assert.equal(held.changed, false);
    assert.equal(held.notes[0].action, 'pr_unknown');
    assert.equal(unknown.state.cases.held.status, 'awaiting_review');
  });
  await test('an open review of the same source blocks a rival batch; a merged or stale review does not', async () => {
    const snapshot = batchSnapshot();
    const store = storeFor('b');
    store.state.cases.b = { spent: 0, status: 'awaiting_review', source_hash: 'b', pr_url: 'https://github.com/5n1katil/Faili-Mechul/pull/50' };
    applyQueueReconciliation(store, snapshot, [pull({ number: 50, state: 'open', draft: true, title: 'current source', head: { sha: 'c'.repeat(40) } })]);
    assert.equal(store.state.cases.b.status, 'awaiting_review');
    const blocked = await campaign(snapshot, store, { rows: batchRows, worker: () => { throw new Error('UNEXPECTED_CALL'); } });
    assert.equal(blocked.status, 'awaiting_existing_review');
    assert.equal(blocked.api_calls, 0);
    applyQueueReconciliation(store, snapshot, [pull({ number: 50, state: 'closed', merged_at: '2026-10-17T00:00:00Z', merge_commit_sha: 'd'.repeat(40), title: 'merged' })]);
    assert.equal(store.state.cases.b.status, 'merged');
    const seen = [];
    const resumed = await campaign(snapshot, store, { rows: batchRows, worker: async (bounded, entry) => {
      seen.push(entry.id);
      if (entry.id === 'a') return { ...batchResult('review_pair_blocked'), run: { calls: 0, spent: 0, attempts: [] } };
      if (entry.id === 'b') return batchResult('quarantined');
      return batchResult('GEMINI_HTTP_429');
    } });
    assert.deepEqual(seen, ['a', 'b', 'c']);
    assert.equal(resumed.stop_reason, 'GEMINI_HTTP_429');
    assert.equal(resumed.api_calls, 4);
    const stale = storeFor('b');
    stale.state.cases.b = { spent: 0, status: 'awaiting_review', source_hash: 'old-copy', pr_url: 'https://github.com/5n1katil/Faili-Mechul/pull/94', candidate: { story: 'eski taslak' } };
    applyQueueReconciliation(stale, snapshot, [pull({ number: 94, state: 'open', draft: true, title: 'stale draft', head: { sha: 'e'.repeat(40) } })]);
    assert.equal(stale.state.cases.b.status, 'stale_open_draft');
    assert.equal(stale.state.cases.b.candidate.story, 'eski taslak');
    let staleSeen = false;
    const moved = await campaign(snapshot, stale, { rows: batchRows, worker: async () => { staleSeen = true; return batchResult('quarantined'); } });
    assert.equal(staleSeen, true);
    assert.notEqual(moved.status, 'awaiting_existing_review');
  });
  await test('pull lookup keeps merged, closed and open states distinct', async () => {
    const pulls = await fetchQueuePulls({ cases: { a: { pr_url: 'https://github.com/5n1katil/Faili-Mechul/pull/98' } } }, {
      transport: async url => ({ ok: true, json: async () => url.includes('state=open')
        ? [{ number: 94, state: 'open', draft: true, title: 'stale', head: { sha: 'a'.repeat(40) } }]
        : { number: 98, state: 'closed', merged_at: '2026-10-13T19:07:01Z', merge_commit_sha: 'f'.repeat(40), title: 'merged' } })
    });
    assert.equal(pulls.find(item => item.number === 98).merged, true);
    assert.equal(pulls.find(item => item.number === 94).state, 'open');
    assert.equal(pulls.find(item => item.number === 94).merged, false);
    const abandoned = pull({ number: 3, state: 'closed', title: 'not merged' });
    assert.equal(abandoned.merged, false);
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
} finally { delete process.env.GEMINI_API_KEY; fs.rmSync(temporary, { recursive: true, force: true }); fs.rmSync(legacyDirectory, { recursive: true, force: true }); }
