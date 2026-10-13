import { stableHash } from '../fm_case_qa_runner.mjs';
import { canonicalLogicSignature } from './logic-patterns.mjs';
import { experienceProfile } from './experience.mjs';
import { TEXT_METHOD, verifyTextPlan } from './text-repair.mjs';
const axes = ['suspects','weapons','locations'];
const permutations = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
const kinds = ['evidence','record','witness','forensic'];
const key = r => r.action + ':' + [...r.pair].sort().join(':');
function decorate(candidate, plan) {
  return { ...candidate, qaSemanticFacts: [{ kind: 'crime_component', ...plan.anchor }],
    clues: candidate.clues.map(c => { const row = plan.clues.find(r => r.id === c.id); return { ...c,
      type: row.type, logicRules: [row.rule], isCrimeAnchor: plan.anchor.source === 'clue:' + c.id,
      qaSemanticFacts: [] }; }) };
}
export function diverseTextPlan(snapshot, entry, candidate) {
  const profile = experienceProfile(candidate, entry.tier), core = candidate.clues.filter(c => !c.isBonus), bonus = candidate.clues.filter(c => c.isBonus);
  const known = new Set(snapshot.entries.filter(e => e.id !== entry.id).map(e => canonicalLogicSignature(e.candidate)).filter(Boolean));
  // Preserve a sound, genuinely distinct existing graph for narrative-only work.
  const fact = (candidate.qaSemanticFacts || []).concat(core.flatMap(c => c.qaSemanticFacts || []))
    .find(f => f.kind === 'crime_component' && ['weapon','location'].includes(f.component));
  if (fact && candidate.clues.every(c => c.logicRules?.length === 1)) {
    const retained = { method: TEXT_METHOD, experience: profile, anchor: { component: fact.component, entityId: fact.entityId, source: fact.source },
      clues: candidate.clues.map(c => ({ id: c.id, type: c.type, isBonus: c.isBonus, rule: c.logicRules[0] })) };
    try {
      const proof = verifyTextPlan(candidate, retained), signature = canonicalLogicSignature(decorate(candidate, retained));
      if (signature && !known.has(signature)) return { ...retained, proof, logicSignature: signature, retainedGraph: true };
    } catch { /* Build another proven dependency graph, never merely reorder it. */ }
  }
  const ids = axes.map(a => candidate[a].map(e => e.id));
  const worlds = [];
  for (const w of permutations) for (const l of permutations) {
    const owner = id => { const axis = ids.findIndex(a => a.includes(id)), pos = ids[axis].indexOf(id);
      return axis === 0 ? pos : (axis === 1 ? w : l).indexOf(pos); };
    worlds.push({ w,l,owner });
  }
  const pairs = [];
  for (let a = 0; a < 3; a++) for (let b = a+1; b < 3; b++) for (const x of ids[a]) for (const y of ids[b]) pairs.push([x,y]);
  const all = (1n << BigInt(worlds.length)) - 1n;
  const sameMasks = pairs.map(pair => worlds.reduce((mask,world,i) => world.owner(pair[0]) === world.owner(pair[1]) ? mask | (1n << BigInt(i)) : mask, 0n));
  const target = candidate.solution, targetS = ids[0].indexOf(target.suspectId);
  const targetWorlds = worlds.filter(world => ids[1][world.w[targetS]] === target.weaponId && ids[2][world.l[targetS]] === target.locationId);
  const variants = new Map();
  for (const component of ['weapon','location']) {
    const crime = target[component === 'weapon' ? 'weaponId' : 'locationId'];
    const good = worlds.reduce((mask,world,i) => {
      const culprit = world.owner(crime);
      return culprit === targetS && ids[1][world.w[culprit]] === target.weaponId && ids[2][world.l[culprit]] === target.locationId ? mask | (1n << BigInt(i)) : mask;
    }, 0n);
    for (const world of targetWorlds) {
      const rules = pairs.map((pair,i) => { const confirm = world.owner(pair[0]) === world.owner(pair[1]);
        return { rule: { action: confirm ? 'confirm' : 'eliminate', pair }, mask: confirm ? sameMasks[i] : all ^ sameMasks[i] }; });
      for (let a = 0; a < rules.length-3; a++) for (let b = a+1; b < rules.length-2; b++) for (let c = b+1; c < rules.length-1; c++) for (let d = c+1; d < rules.length; d++) {
        const chosen = [rules[a],rules[b],rules[c],rules[d]];
        const intersection = chosen.reduce((m,r) => m & r.mask, all);
        if (!intersection || (intersection & (all ^ good))) continue;
        if (chosen.some((_,i) => !(chosen.filter((_,j) => i !== j).reduce((m,r) => m & r.mask, all) & (all ^ good)))) continue;
        const ordered = chosen.map(r => r.rule).sort((x,y) => stableHash([entry.id,x]).localeCompare(stableHash([entry.id,y])));
        const anchorIndex = ordered.findIndex(r => r.pair.includes(crime));
        if (anchorIndex < 0) continue;
        const used = new Set(ordered.map(key));
        const positives = rules.filter(r => r.rule.action === 'confirm' && !used.has(key(r.rule)) &&
          r.rule.pair.every(id => !Object.values(target).includes(id)));
        if (positives.length < 2) continue;
        const plan = { method: TEXT_METHOD, experience: profile, anchor: { component, entityId: crime, source: 'clue:' + core[anchorIndex].id },
          clues: core.map((row,i) => ({ id: row.id, isBonus: false, type: i === anchorIndex ? (component === 'weapon' ? 'forensic' : 'record') : kinds[i], rule: ordered[i] }))
            .concat(bonus.map((row,i) => ({ id: row.id, isBonus: true, type: i ? 'witness' : 'record', rule: positives[i].rule }))) };
        const probe = decorate(candidate, plan), signature = canonicalLogicSignature(probe);
        if (!signature || known.has(signature) || variants.has(signature)) continue;
        const normalized = snapshot.engine.normalize(probe);
        const vector = snapshot.engine.fmProfileVector(snapshot.engine.fmPatternProfile(normalized));
        const collision = (candidate.qaPortfolioRegistry?.entries || []).some(e => e.puzzleId !== entry.id &&
          ['anchorSig','firstSig','actions','axes','miniSig'].filter(k => (e.signature || e)[k] && (e.signature || e)[k] === vector[k]).length >= 4);
        if (collision) continue;
        try { variants.set(signature, { ...plan, proof: verifyTextPlan(candidate, plan), vector, logicSignature: signature }); }
        catch { /* Independent exhaustive proof rejects the proposed graph. */ }
      }
    }
  }
  if (!variants.size) throw new Error('TEXT_PLAN_NO_DISTINCT_LOGIC_GRAPH');
  const options = [...variants.values()].sort((a,b) => stableHash([entry.id,a.logicSignature]).localeCompare(stableHash([entry.id,b.logicSignature])));
  return { ...options[0], distinctGraphsAvailable: options.length };
}
