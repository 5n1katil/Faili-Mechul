import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { read, clone, assess, guardedPatch, loadSnapshot } from './core.mjs';
import { compileTextPatch, textRepairPlan } from './text-repair.mjs';
import { compileHints, hintOnly } from './hint-cleanup.mjs';
import { experienceProfile } from './experience.mjs';
import { stableHash } from '../fm_case_qa_runner.mjs';
import { reviewTransport, reviewCandidate, reviewHash, validPlayer } from './review.mjs';
import { assertReviewPairReservable, completedRequest } from './review-revision.mjs';
import { callPaid, requestKey, Stop } from './provider.mjs';
import { enumerateTextGrid, verifyTextPlan } from './text-repair.mjs';

// Offline reuse of campaign 39130510026 responses. These candidates are not
// content-locked and have no independent player/judge review.
export const TREN_SOCRATIC_HINTS = {
  c1: 'Mandallı dar kabinde unutulan ince naylon ip hangi yeri gösteriyor?',
  c4: 'Parmak izi taraması beyaz saçlı yolcuyu hangi küçük çakıdan uzak tutuyor?'
};
// Replaces the recorded c4 sentence. Absence of a fingerprint does not prove
// that the white-haired passenger never received or used the knife. The logic
// rule stays eliminate s3–w2; only the visible evidence changes.
export const TREN_C4_TEXT = 'Seferin o kısa aralığında mühürlü teslim defteri ile kesintisiz kamera kaydı, küçük çakı bıçağını beyaz saçlı soğukkanlı beyefendinin ne teslim aldığını ne de kullandığını birlikte gösteriyor.';
export const TREN_C4_HINT = 'Mühürlü teslim defteri beyaz saçlı yolcuyu hangi küçük çakıdan kesin olarak uzak tutuyor?';
const TRACE_ABSENCE = /parmak\s*izi|swap\s+test|fiziksel\s+iz|temas\s+izi/iu;
const TRACE_MISSING = /bulunmad|rastlanmad|iz(?:i|ine)?\s+yok/iu;
const CUSTODY_RECORD = /teslim\s+defter|mühürlü\s+teslim|kesintisiz/iu;
const NOT_RECEIVED_OR_USED = /ne\s+teslim\s+ald|hiç\s+(?:teslim\s+)?almad|ne\s+de\s+kulland|kullanmad/iu;
export function eliminationSupported(text) {
  const raw = String(text || '');
  if (TRACE_ABSENCE.test(raw) && TRACE_MISSING.test(raw) && !NOT_RECEIVED_OR_USED.test(raw))
    return { supported: false, reason: 'TRACE_ABSENCE_IS_NOT_EXCLUSION' };
  if (!CUSTODY_RECORD.test(raw) || !NOT_RECEIVED_OR_USED.test(raw))
    return { supported: false, reason: 'ELIMINATION_NOT_GROUNDED' };
  return { supported: true, reason: 'custody_record' };
}
export function correctTrenEvidence(candidate) {
  const next = clone(candidate);
  const clue = next.clues.find(item => item.id === 'c4');
  const rule = clue?.logicRules?.[0];
  if (!rule || rule.action !== 'eliminate' || stableHash(rule.pair) !== stableHash(['s3', 'w2'])) throw new Error('TREN_C4_RULE');
  clue.text = TREN_C4_TEXT;
  clue.deductionHint = TREN_C4_HINT;
  if (clue.qaRationale) clue.qaRationale.evidenceLink = clue.text;
  for (const fact of clue.qaSemanticFacts || []) if (typeof fact.evidence === 'string') fact.evidence = clue.text;
  const support = eliminationSupported(clue.text);
  if (!support.supported) throw new Error(support.reason);
  return next;
}
export function prepareTrenCorrectionReview(snapshot) {
  const historical = recoverTrenHints(snapshot);
  const entry = snapshot.entries.find(item => item.id === historical.case_id);
  const corrected = correctTrenEvidence(historical.candidate);
  const transport = reviewTransport(snapshot, entry, corrected);
  const pinned = reviewTransport(snapshot, entry, historical.candidate);
  const plan = recordedResponse(historical.case_id) && read('.case-qa/fixtures/campaign-39130510026-repairs.json').cases[historical.case_id].recorded_plan;
  return {
    candidate: corrected,
    historical: historical.candidate,
    support: eliminationSupported(corrected.clues.find(item => item.id === 'c4').text),
    historical_support: eliminationSupported(historical.candidate.clues.find(item => item.id === 'c4').text),
    grid: verifyTextPlan(corrected, plan),
    without_c4: enumerateTextGrid(corrected, plan.clues.filter(item => !item.isBonus && item.id !== 'c4').map(item => item.rule), plan.anchor).length,
    candidate_content_hash: candidateContentHash(corrected),
    pinned_candidate_content_hash: candidateContentHash(historical.candidate),
    player_request_key: requestKey(entry.id, transport.model, transport.playerBody, 'player'),
    pinned_player_request_key: requestKey(entry.id, pinned.model, pinned.playerBody, 'player'),
    review_hash: reviewHash(snapshot, corrected, transport.pre.evidence),
    pinned_review_hash: reviewHash(snapshot, historical.candidate, pinned.pre.evidence),
    certificate: null,
    repair_rights_renewed: false
  };
}
export const HAMAM_ROLE_MONONYMS = ['s1', 's3'];

function recordedCandidate(snapshot, id) {
  const saved = read('.case-qa/fixtures/campaign-39130510026-repairs.json');
  const entry = snapshot.entries.find(item => item.id === id);
  const response = saved.cases[id].responses.find(item => item.model.includes('3.8')).plan;
  const recorded = { ...saved.cases[id].recorded_plan, experience: experienceProfile(entry.candidate, entry.tier) };
  const today = textRepairPlan(snapshot, entry, entry.candidate);
  const compiled = guardedPatch(snapshot, entry, entry.candidate,
    compileTextPatch(entry.candidate, recorded, response), assess(snapshot, entry, entry.candidate));
  return { entry, recorded, today, compiled };
}
const cardSnapshot = candidate => ({
  story: candidate.story,
  cards: ['suspects', 'weapons', 'locations'].map(axis => candidate[axis].map(entity => ({
    id: entity.id, name: entity.name, description: entity.description, detail: entity.detail || ''
  }))),
  evidence: candidate.clues.map(clue => ({ id: clue.id, text: clue.text, rules: clue.logicRules }))
});
function outcome(assessment) {
  return {
    passed: assessment.passed === true,
    score: assessment.result.score,
    production_ready: assessment.result.simulatorProductionReady === true,
    blockers: assessment.result.blockers,
    independent_review: false,
    content_locked: false
  };
}
export function recoverTrenHints(snapshot) {
  const { entry, recorded, today, compiled } = recordedCandidate(snapshot, 'tren-yolculugunda-cinayet');
  if (recorded.logicSignature !== today?.logicSignature) throw new Error('TREN_RECORDED_PLAN_MISMATCH');
  if (!hintOnly(compiled.assessment)) throw new Error('TREN_HINT_PATH_UNAVAILABLE');
  const hints = Object.fromEntries(compiled.candidate.clues.filter(clue => !clue.isBonus).map(clue => [clue.id, clue.deductionHint]));
  const before = clone(hints);
  Object.assign(hints, TREN_SOCRATIC_HINTS);
  const next = compileHints(snapshot, entry, compiled.candidate, { case_id: entry.id, hints }, compiled.assessment);
  return {
    case_id: entry.id, hint_path: 'compileHints',
    recorded_plan: recorded.logicSignature, today_plan: today.logicSignature,
    changed_hints: Object.keys(before).filter(id => before[id] !== next.candidate.clues.find(clue => clue.id === id).deductionHint),
    visible_unchanged: stableHash(cardSnapshot(compiled.candidate)) === stableHash(cardSnapshot(next.candidate)),
    candidate: next.candidate, qa: outcome(next.assessment)
  };
}
export function recoverHamamRoles(snapshot, roleIds = HAMAM_ROLE_MONONYMS) {
  const { entry, recorded, today, compiled } = recordedCandidate(snapshot, 'tarihi-hamamda-cinayet');
  if (!today || recorded.logicSignature === today.logicSignature) throw new Error('HAMAM_PLAN_MUST_STAY_RECORDED');
  const candidate = clone(compiled.candidate);
  candidate.intentionalMononymIds = [...roleIds];
  return {
    case_id: entry.id, recorded_plan: recorded.logicSignature, today_plan: today.logicSignature,
    names: candidate.suspects.map(entity => entity.name),
    candidate, qa: outcome(assess(snapshot, entry, candidate))
  };
}
const BINDING_PATH = '.case-qa/fixtures/recorded-review-bindings.json';
const baselineCache = new Map();
function contentFiles(policy) {
  return [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path,
    policy.simulator.path, policy.source.inventory_path, policy.review.media_evidence_path];
}
// The pre-publication tree pinned by the binding. Historical recovery reads this
// commit, not whatever sidecar the current production source happens to contain.
export function loadRecordedBaseline(gitRoot, policy, sha) {
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('RECORDED_REVIEW_HASH');
  const key = gitRoot + '\0' + sha;
  if (baselineCache.has(key)) return baselineCache.get(key);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-recorded-baseline-'));
  for (const file of contentFiles(policy)) {
    const data = execFileSync('git', ['show', sha + ':' + file], { cwd: gitRoot, maxBuffer: 8 * 1024 * 1024 });
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
  }
  const snapshot = loadSnapshot(dir, policy);
  snapshot.gitRoot = gitRoot;
  baselineCache.set(key, snapshot);
  return snapshot;
}
export function candidateContentHash(candidate) {
  const copy = clone(candidate);
  delete copy.qaPortfolioRegistry;
  return stableHash(copy);
}
function changedFields(left, right) {
  const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
  return [...keys].filter(key => stableHash(left?.[key] ?? null) !== stableHash(right?.[key] ?? null)).sort();
}
function recordedResponse(id) {
  const saved = read('.case-qa/fixtures/campaign-39130510026-repairs.json');
  const response = saved.cases?.[id]?.responses?.find(item => item.model.includes('3.8'));
  if (!response?.plan) throw new Error('RECORDED_REVIEW_HASH');
  return response;
}
export function verifyRecordedReview(snapshot, id, bindings = read(BINDING_PATH)) {
  if (bindings?.schema !== 'fm_recorded_review_binding_v1' || bindings.simulator_pin !== snapshot.simulatorHash ||
      !/^[a-f0-9]{40}$/.test(bindings.baseline_commit || ''))
    throw new Error('RECORDED_REVIEW_HASH');
  const pin = bindings.cases?.[id];
  const recovered = id === 'tren-yolculugunda-cinayet' ? recoverTrenHints(snapshot) :
    id === 'tarihi-hamamda-cinayet' ? recoverHamamRoles(snapshot) : null;
  if (!pin || !recovered) throw new Error('RECORDED_REVIEW_CASE');
  const entry = snapshot.entries.find(item => item.id === id);
  const response = recordedResponse(id);
  const contentHash = candidateContentHash(recovered.candidate);
  const proof = {
    case_id: id,
    source_hash: entry?.sourceHash || '',
    response_model: response.model,
    response_hash: stableHash(response.plan),
    plan_signature: recovered.recorded_plan,
    candidate_hash: stableHash(recovered.candidate),
    candidate_content_hash: contentHash,
    pinned_candidate_hash: pin.candidate_hash,
    portfolio_drift: false,
    candidate: recovered.candidate,
    qa: recovered.qa
  };
  const sameCase = proof.source_hash === pin.source_hash && proof.response_model === pin.response_model &&
    proof.response_hash === pin.response_hash && proof.plan_signature === pin.plan_signature &&
    contentHash === pin.candidate_content_hash && proof.qa.passed === true && proof.qa.production_ready === true &&
    proof.qa.content_locked === false && proof.qa.independent_review === false &&
    stableHash(recovered.candidate.qaPortfolioRegistry ?? null) === stableHash(entry?.candidate?.qaPortfolioRegistry ?? null);
  if (!sameCase) throw new Error('RECORDED_REVIEW_HASH');
  if (proof.candidate_hash === pin.candidate_hash) return proof;
  // Another accepted case changes only the portfolio registry. The stored full
  // hash stays the baseline pin; it is not rewritten to the new registry.
  const baseline = loadRecordedBaseline(snapshot.gitRoot || snapshot.root, snapshot.policy, bindings.baseline_commit);
  const pinned = id === 'tren-yolculugunda-cinayet' ? recoverTrenHints(baseline) : recoverHamamRoles(baseline);
  if (stableHash(pinned.candidate) !== pin.candidate_hash || candidateContentHash(pinned.candidate) !== contentHash)
    throw new Error('RECORDED_REVIEW_HASH');
  const changed = changedFields(pinned.candidate, recovered.candidate);
  if (changed.length !== 1 || changed[0] !== 'qaPortfolioRegistry') throw new Error('RECORDED_REVIEW_HASH');
  proof.portfolio_drift = true;
  return proof;
}
export function recordedReviewSpecs(snapshot, entry, candidate, store) {
  const transport = reviewTransport(snapshot, entry, candidate);
  if (!transport.pre.passed) return { transport, specs: null };
  const cachedPlayer = completedRequest(store, entry.id, transport.model, transport.playerBody, 'player');
  const knownPlayer = cachedPlayer && validPlayer(cachedPlayer.plan) ? cachedPlayer.plan : null;
  const judgeBody = reviewTransport(snapshot, entry, candidate, knownPlayer).judgeBody;
  const cachedJudge = knownPlayer ? completedRequest(store, entry.id, transport.model, judgeBody, 'judge') : null;
  const specs = [];
  if (!knownPlayer) specs.push({ model: transport.model, body: transport.playerBody, purpose: 'player' });
  if (!cachedJudge) specs.push({ model: transport.model, body: judgeBody, purpose: 'judge' });
  return { transport, knownPlayer, judgeBody, specs };
}
function recordedOutcome(snapshot, id, proof, entry, record, run, status, extra = {}) {
  return {
    case_id: id, candidate: proof.candidate, candidate_hash: proof.candidate_hash,
    candidate_content_hash: proof.candidate_content_hash, pinned_candidate_hash: proof.pinned_candidate_hash,
    portfolio_drift: proof.portfolio_drift === true,
    assessment: assess(snapshot, entry, proof.candidate), run,
    status, failures: extra.failures || [], review: extra.review || null, calls: run.calls,
    queue_status: record.status, provider_error: extra.provider_error || null
  };
}
// Explicit player/judge admission. Repair, quarantine release and publication
// stay outside this function. callPaid reserves and stores every new response.
export async function reviewRecordedRecovery(snapshot, id, store, run, options = {}) {
  if (typeof options === 'function') throw new Error('RECORDED_REVIEW_CALLER');
  const proof = verifyRecordedReview(snapshot, id, options.bindings);
  const record = store.state.cases?.[id];
  if (record?.status !== 'quarantined') throw new Error('RECORDED_REVIEW_QUARANTINE');
  if (record.source_hash && record.source_hash !== proof.source_hash) throw new Error('RECORDED_REVIEW_HASH');
  const entry = snapshot.entries.find(item => item.id === id);
  if (id === 'tren-yolculugunda-cinayet') {
    const clue = proof.candidate.clues.find(item => item.id === 'c4');
    const support = eliminationSupported(clue?.text);
    if (!support.supported) {
      const corrected = correctTrenEvidence(proof.candidate);
      const transport = reviewTransport(snapshot, entry, corrected);
      const pinned = reviewTransport(snapshot, entry, proof.candidate);
      return {
        ...recordedOutcome(snapshot, id, proof, entry, record, run, 'text_logic_gap', { failures: ['TEXT_LOGIC_GAP'] }),
        correction: {
          reason: support.reason,
          candidate_content_hash: candidateContentHash(corrected),
          pinned_candidate_content_hash: proof.candidate_content_hash,
          player_request_key: requestKey(id, transport.model, transport.playerBody, 'player'),
          pinned_player_request_key: requestKey(id, pinned.model, pinned.playerBody, 'player'),
          review_hash: reviewHash(snapshot, corrected, transport.pre.evidence),
          pinned_review_hash: reviewHash(snapshot, proof.candidate, pinned.pre.evidence),
          certificate: null,
          repair_rights_renewed: false
        }
      };
    }
  }
  const planned = recordedReviewSpecs(snapshot, entry, proof.candidate, store);
  if (!planned.transport.pre.passed || !planned.specs) throw new Error('RECORDED_REVIEW_NOT_READY');
  if (planned.specs.length > 2) throw new Error('RECORDED_REVIEW_PAIR');
  if (planned.specs.length) {
    let gate;
    try { gate = assertReviewPairReservable(store, snapshot.policy, run, id, planned.specs); }
    catch (error) {
      if (error instanceof Stop && run.calls === 0) return recordedOutcome(snapshot, id, proof, entry, record, run, 'review_pair_blocked', { failures: [error.message] });
      throw error;
    }
    if (gate.calls !== planned.specs.length) throw new Error('RECORDED_REVIEW_PAIR');
  }
  const caller = args => callPaid({ ...args, ...(options.transport ? { transport: options.transport } : {}) });
  let review;
  try { review = await reviewCandidate(snapshot, entry, proof.candidate, store, run, caller, { sameTarget: false }); }
  catch (error) {
    if (!(error instanceof Stop)) throw error;
    return recordedOutcome(snapshot, id, proof, entry, record, run, error.message, { failures: [error.message], provider_error: error.provider_error || null });
  }
  return recordedOutcome(snapshot, id, proof, entry, record, run, review.passed ? 'ready_for_gates' : 'quarantined',
    { review, failures: review.failures || [] });
}
export function reviewPairRoom(policy, record) {
  const rows = (record.requests || []).filter(item => !(item.status === 'failed' && item.transport_not_started === true));
  const cap = policy.sequential.max_requests_per_case;
  const verifiedLimit = policy.sequential.verified_text_repair_limit;
  const verified = rows.filter(item => item.purpose === 'repair' && item.repair_method === 'verified_text_v1').length;
  const remaining = cap - rows.length;
  return {
    status: record.status, used: rows.length, cap, remaining,
    verified_text: verified + '/' + verifiedLimit,
    verified_text_remaining: verifiedLimit - verified,
    lifetime_pair_fits: remaining >= 2,
    quarantine_open: false
  };
}
