import { read, clone, assess, guardedPatch } from './core.mjs';
import { compileTextPatch, textRepairPlan } from './text-repair.mjs';
import { compileHints, hintOnly } from './hint-cleanup.mjs';
import { experienceProfile } from './experience.mjs';
import { stableHash } from '../fm_case_qa_runner.mjs';
import { reviewTransport, reviewCandidate } from './review.mjs';
import { assertReviewPairReservable } from './review-revision.mjs';
import { Stop } from './provider.mjs';

// Offline reuse of campaign 39130510026 responses. These candidates are not
// content-locked and have no independent player/judge review.
export const TREN_SOCRATIC_HINTS = {
  c1: 'Mandallı dar kabinde unutulan ince naylon ip hangi yeri gösteriyor?',
  c4: 'Parmak izi taraması beyaz saçlı yolcuyu hangi küçük çakıdan uzak tutuyor?'
};
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
function recordedResponse(id) {
  const saved = read('.case-qa/fixtures/campaign-39130510026-repairs.json');
  const response = saved.cases?.[id]?.responses?.find(item => item.model.includes('3.8'));
  if (!response?.plan) throw new Error('RECORDED_REVIEW_HASH');
  return response;
}
export function verifyRecordedReview(snapshot, id, bindings = read(BINDING_PATH)) {
  if (bindings?.schema !== 'fm_recorded_review_binding_v1' || bindings.simulator_pin !== snapshot.simulatorHash)
    throw new Error('RECORDED_REVIEW_HASH');
  const pin = bindings.cases?.[id];
  const recovered = id === 'tren-yolculugunda-cinayet' ? recoverTrenHints(snapshot) :
    id === 'tarihi-hamamda-cinayet' ? recoverHamamRoles(snapshot) : null;
  if (!pin || !recovered) throw new Error('RECORDED_REVIEW_CASE');
  const entry = snapshot.entries.find(item => item.id === id);
  const response = recordedResponse(id);
  const proof = {
    case_id: id,
    source_hash: entry?.sourceHash || '',
    response_model: response.model,
    response_hash: stableHash(response.plan),
    plan_signature: recovered.recorded_plan,
    candidate_hash: stableHash(recovered.candidate),
    candidate: recovered.candidate,
    qa: recovered.qa
  };
  if (proof.source_hash !== pin.source_hash || proof.response_model !== pin.response_model ||
      proof.response_hash !== pin.response_hash || proof.plan_signature !== pin.plan_signature ||
      proof.candidate_hash !== pin.candidate_hash || proof.qa.passed !== true || proof.qa.production_ready !== true ||
      proof.qa.content_locked !== false || proof.qa.independent_review !== false)
    throw new Error('RECORDED_REVIEW_HASH');
  return proof;
}
// Explicit player/judge admission for the two recovered candidates. It does not
// repair, publish, open quarantine, or spend; the caller performs any later call.
export async function reviewRecordedRecovery(snapshot, id, store, run, caller, bindings) {
  if (typeof caller !== 'function') throw new Error('RECORDED_REVIEW_CALLER');
  const proof = verifyRecordedReview(snapshot, id, bindings);
  const record = store.state.cases?.[id];
  if (record?.status !== 'quarantined') throw new Error('RECORDED_REVIEW_QUARANTINE');
  if (record.source_hash && record.source_hash !== proof.source_hash) throw new Error('RECORDED_REVIEW_HASH');
  const entry = snapshot.entries.find(item => item.id === id);
  const transport = reviewTransport(snapshot, entry, proof.candidate);
  if (!transport.pre.passed) throw new Error('RECORDED_REVIEW_NOT_READY');
  const specs = [
    { model: transport.model, body: transport.playerBody, purpose: 'player' },
    { model: transport.model, body: transport.judgeBody, purpose: 'judge' }
  ];
  let gate;
  try { gate = assertReviewPairReservable(store, snapshot.policy, run, id, specs); }
  catch (error) {
    if (error instanceof Stop && run.calls === 0) return {
      case_id: id, admitted: false, status: 'review_pair_blocked', failures: [error.message], calls: 0,
      queue_status: record.status, content_locked: false
    };
    throw error;
  }
  if (gate.calls !== 2) throw new Error('RECORDED_REVIEW_PAIR');
  const review = await reviewCandidate(snapshot, entry, proof.candidate, store, run, caller, { sameTarget: false });
  return {
    case_id: id, admitted: review.passed === true, status: review.passed ? 'reviewed' : 'review_failed',
    failures: review.failures || [], calls: gate.calls, projected: gate.projected, review,
    candidate_hash: proof.candidate_hash, queue_status: record.status, content_locked: false
  };
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
