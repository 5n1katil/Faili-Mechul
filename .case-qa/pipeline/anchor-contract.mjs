// The pinned simulator is the acceptance contract. Categories are shared with
// experience.mjs: caylak matches numeric 1-2, dedektif matches 3, and
// baskomiser matches 4-5. A label is not rewritten into a stored number.
// Only the novice category may confirm two members of the solution triple
// in the anchor. Unknown values stay strict; they are not novice.

import { experienceCategory } from './experience.mjs';

export const CRIME_ANCHOR_SEMANTIC = /(ölüm|öldür|öldürül|cinayet|maktul|can ver|can çek|son nefes|hayat[ıi]n[ıi] kaybet|katled|kurban|öldürücü|ölümcül|zehirlen|cesedi?|nâ?aş|telef|katlin|suç aleti|cinayet silah|ölüm sebeb|asıl sebep|öldüğü|öldürdü|işlendiği|infaz|suikast|boğul|boğarak|bıçaklan|vurularak|ecel|son buldu|hayatına son|öldürme|faili|sustur)/i;

export function simulatorDifficultyLevel(candidate) {
  const resolved = experienceCategory(candidate);
  return resolved.source === 'number' ? resolved.level : null;
}

export function hardAnchorContract(candidate) {
  return experienceCategory(candidate).category !== 'caylak';
}

// One confirm between two members of the solution triple is the simulator's
// direct Çift İfşa. A verified-text anchor carries exactly one rule, so a
// single eliminate cannot lock the other pair.
export function anchorConfirmsTwoCrimeComponents(candidate, rule) {
  if (!rule || rule.action !== 'confirm' || rule.pair?.length !== 2 || !candidate?.solution) return false;
  const triad = new Set([candidate.solution.suspectId, candidate.solution.weaponId, candidate.solution.locationId]);
  return rule.pair.every(id => triad.has(id));
}
