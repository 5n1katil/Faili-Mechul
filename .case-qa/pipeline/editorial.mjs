import { stableHash, validateCandidateContract, protectedIdentity } from '../fm_case_qa_runner.mjs';
import { clone, assess } from './core.mjs';
import { playerPass, playerView, reviewHash, validJudge, judgePass } from './review.mjs';

export const EDITORIAL_VERSION = 'fm-editorial-revision-v1';
const object = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const string = { type: 'string' };
export function editorialSchema(candidate) {
  return object({ story: string, clues: object(Object.fromEntries(candidate.clues.map(c =>
    [c.id, object({ text: string, deductionHint: string })]))) });
}
export function validEditorial(candidate, value) {
  const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) &&
    stableHash(Object.keys(v).sort()) === stableHash(keys.sort());
  return exact(value, ['story','clues']) && typeof value.story === 'string' &&
    exact(value.clues, candidate.clues.map(c => c.id)) && candidate.clues.every(c =>
      exact(value.clues[c.id], ['text','deductionHint']) &&
      ['text','deductionHint'].every(k => typeof value.clues[c.id][k] === 'string'));
}
export function editorialFailure(snapshot, candidate, review) {
  const certificate = review?.certificate;
  return review?.failures?.length === 1 && review.failures[0] === 'EDITORIAL_REVIEW_FAILED' &&
    certificate?.schema === 'fm_case_review_v1' &&
    validJudge(certificate.judge) && !judgePass(snapshot.policy, certificate.judge) &&
    certificate.review_hash === reviewHash(snapshot, candidate, {}) &&
    playerPass(snapshot.policy, candidate, playerView(candidate), certificate.player) &&
    candidate.clues.every(c => !c.mechanicType || c.mechanicType === 'text');
}
export function editorialPrompt(candidate, review) {
  const visible = clone(candidate); delete visible.qaPortfolioRegistry;
  return JSON.stringify({ version: EDITORIAL_VERSION, case: visible,
    editorial_feedback: review.certificate.judge,
    instructions: 'Revise Turkish narrative to resolve every concrete editor defect. Keep the same victim, setting, profiles, entities, solution, six clues and ALL exact clue relations and anchor. Do not invent other pairings or crime disclosures. Make evidence vivid and natural, with a specific dramatic hook and credible causal stakes, not repetitive bureaucratic boilerplate. If an everyday item is lethal, establish a credible general mechanism without revealing which item, person or place in the opening; the designated anchor alone may establish its one component. Make no unsupported claim that proves a second relation. Each suspect accesses one distinct listed item in one distinct listed place during the same interval; preserve that explicit player rule. Core clues use card-grounded descriptive references rather than exact entity names. Only bonuses may use names. Story 95-130 words, minimum 60; clues 35-70 words, hints short Socratic questions. Return only story and ALL clue text/hints. No changes to profiles, cards, rules, IDs, assets, bonus roles, types or metadata. The compiler refreshes evidence quotations only. All simulator and independent review gates apply again.' });
}
export function compileEditorial(snapshot, entry, candidate, value) {
  if (!validEditorial(candidate, value)) throw new Error('EDITORIAL_RESPONSE_INVALID');
  if (value.story.trim().split(/\s+/).length < 60 || candidate.clues.some(c =>
    value.clues[c.id].text.trim().length < 40 || value.clues[c.id].deductionHint.trim().length < 12))
    throw new Error('EDITORIAL_CONTENT_TOO_SHORT');
  const next = clone(candidate); next.story = value.story;
  for (const c of next.clues) {
    const oldText = c.text, row = value.clues[c.id];
    c.text = row.text; c.deductionHint = row.deductionHint;
    // Only regenerate existing verbatim traceability, never add new facts.
    if (c.qaRationale?.evidenceLink === oldText) c.qaRationale.evidenceLink = row.text;
    for (const fact of c.qaSemanticFacts || []) if (fact.evidence === oldText) fact.evidence = row.text;
    for (const fact of next.qaSemanticFacts || [])
      if (fact.source === 'clue:' + c.id && fact.evidence === oldText) fact.evidence = row.text;
  }
  validateCandidateContract(next);
  if (stableHash(next) === stableHash(candidate)) throw new Error('EDITORIAL_NO_CHANGE');
  if (protectedIdentity(next) !== protectedIdentity(entry.raw)) throw new Error('EDITORIAL_IDENTITY_CHANGED');
  const assessment = assess(snapshot, entry, next);
  if (!assessment.passed) throw new Error('EDITORIAL_GATES_FAILED:' + JSON.stringify({
    blockers: assessment.result.blockers, quality_findings: assessment.result.qualityFindings,
    leakage: assessment.leakage.findings }));
  return { candidate: next, assessment };
}
