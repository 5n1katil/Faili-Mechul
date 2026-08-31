const clone = value => JSON.parse(JSON.stringify(value));
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

// Near-ready cases may refine prose/evidence and change ONE clue's deduction.
// This is enforced on the resulting object, not merely requested in a prompt.
// General reconstruction belongs to the lower-scoring repair path.
export function assertNearReadyCleanup(before, after) {
  const fail = reason => { throw new Error(`PATCH_CONTRACT: NEAR_READY_SCOPE: ${reason}`); };
  if (!Array.isArray(after.clues) || before.clues.length !== after.clues.length) fail('clue count changed');
  const changedSources = new Set();
  let changedRules = 0;
  for (let i = 0; i < before.clues.length; i++) {
    if (!same(before.clues[i], after.clues[i])) changedSources.add(`clue:${before.clues[i].id}`);
    if (!same(before.clues[i].logicRules, after.clues[i].logicRules)) changedRules++;
  }
  if (changedRules > 1) fail('at most one clue logicRules may change');
  const snapshot = input => {
    const output = clone(input);
    if (output.qaPattern) delete output.qaPattern.designIntent;
    for (const clue of output.clues) {
      for (const field of ['text', 'type', 'deductionHint', 'qaRationale', 'qaSemanticFacts', 'logicRules']) delete clue[field];
    }
    if (Array.isArray(output.qaSemanticFacts)) output.qaSemanticFacts = output.qaSemanticFacts
      .filter(fact => !changedSources.has(fact.source));
    return output;
  };
  if (!same(snapshot(before), snapshot(after))) fail('identity, roles, order, policy, profiles, story or unrelated facts changed');
  return { changed_rule_clues: changedRules, changed_clue_sources: [...changedSources] };
}
