// The pinned simulator is the acceptance contract. Named difficulty labels are
// not numbers: the HTML leaves difficultyLevel null and treats that as hard.
// These predicates copy that behavior so the planner and the compiler reject
// a candidate before it can be retained at a non-passing score.
//
// This copy is not a resolution of the six-category split. Word bands already
// read caylak, dedektif and baskomiser, while anchor strictness does not.
// Teaching the simulator those names belongs in a separate pin update. Do not
// treat hardAnchorContract("caylak") === true as the intended end state.

export const CRIME_ANCHOR_SEMANTIC = /(ölüm|öldür|öldürül|cinayet|maktul|can ver|can çek|son nefes|hayat[ıi]n[ıi] kaybet|katled|kurban|öldürücü|ölümcül|zehirlen|cesedi?|nâ?aş|telef|katlin|suç aleti|cinayet silah|ölüm sebeb|asıl sebep|öldüğü|öldürdü|işlendiği|infaz|suikast|boğul|boğarak|bıçaklan|vurularak|ecel|son buldu|hayatına son|öldürme|faili|sustur)/i;

export function simulatorDifficultyLevel(candidate) {
  const value = candidate?.difficultyLevel ?? candidate?.difficulty;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number.parseInt(value.trim(), 10);
  return null;
}

export function hardAnchorContract(candidate) {
  const level = simulatorDifficultyLevel(candidate);
  return level == null || level >= 3;
}

// One confirm between two members of the solution triple is the simulator's
// direct Çift İfşa. A verified-text anchor carries exactly one rule, so a
// single eliminate cannot lock the other pair.
export function anchorConfirmsTwoCrimeComponents(candidate, rule) {
  if (!rule || rule.action !== 'confirm' || rule.pair?.length !== 2 || !candidate?.solution) return false;
  const triad = new Set([candidate.solution.suspectId, candidate.solution.weaponId, candidate.solution.locationId]);
  return rule.pair.every(id => triad.has(id));
}
