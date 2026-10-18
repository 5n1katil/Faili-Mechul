import { read, clone, assess, guardedPatch } from './core.mjs';
import { compileTextPatch, textRepairPlan } from './text-repair.mjs';
import { compileHints, hintOnly } from './hint-cleanup.mjs';
import { experienceProfile } from './experience.mjs';
import { stableHash } from '../fm_case_qa_runner.mjs';

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
