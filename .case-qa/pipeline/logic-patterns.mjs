import { stableHash } from '../fm_case_qa_runner.mjs';
const axes = ['suspects','weapons','locations'];
const fields = ['suspectId','weaponId','locationId'];
const letters = ['S','W','L'];
function patternInput(candidate) {
  const core = (candidate.clues || []).filter(c => !c.isBonus);
  const anchor = (candidate.qaSemanticFacts || []).concat(core.flatMap(c => c.qaSemanticFacts || []))
    .filter(f => f.kind === 'crime_component');
  const components = [...new Set(anchor.map(f => f.component))];
  const anchorAxis = ({ suspect: 0, weapon: 1, location: 2 })[components[0]];
  if (!core.length || !axes.every(a => candidate[a]?.length) || components.length !== 1 || anchorAxis === undefined ||
      anchor.some(f => f.entityId !== candidate.solution?.[fields[anchorAxis]]) ||
      core.some(c => !c.logicRules?.length || c.logicRules.some(r => !['confirm','eliminate'].includes(r.action) || r.pair?.length !== 2))) return null;
  const ids = axes.flatMap(a => candidate[a].map(e => e.id));
  if (new Set(ids).size !== ids.length || core.some(c => c.logicRules.some(r => r.pair.some(id => !ids.includes(id))))) return null;
  return { core, anchor: components[0] };
}
export function canonicalLogicSignature(candidate) {
  const input = patternInput(candidate); if (!input) return null;
  const { core, anchor } = input;
  if (!axes.every((a,i) => candidate[a].some(e => e.id === candidate.solution?.[fields[i]]))) return null;
  const mechanic = c => c.mechanicType && c.mechanicType !== 'text' ?
    [c.mechanicType, c.sifre?.presentation?.style || c.miniGameData?.type || ''].join(':') : 'text';
  if (axes.every(a => candidate[a].length === 3)) {
    let canonical = null;
    for (let mask = 0; mask < 8; mask++) {
      const label = new Map();
      axes.forEach((axis, i) => {
        label.set(candidate.solution[fields[i]], letters[i] + '0');
        const other = candidate[axis].filter(e => e.id !== candidate.solution[fields[i]]).map(e => e.id);
        if (mask & (1 << i)) other.reverse();
        other.forEach((id,j) => label.set(id,letters[i] + (j+1)));
      });
      const rules = [...new Set(core.flatMap(c => c.logicRules.map(r =>
        (r.action === 'confirm' ? 'C:' : 'E:') + r.pair.map(id => label.get(id)).sort().join('-'))))].sort();
      const mechanics = core.filter(c => mechanic(c) !== 'text').map(c => ({ mechanic: mechanic(c),
        rules: c.logicRules.map(r => (r.action === 'confirm' ? 'C:' : 'E:') + r.pair.map(id => label.get(id)).sort().join('-')).sort() }));
      const value = JSON.stringify({ anchor, rules, mechanics: mechanics.map(g => JSON.stringify(g)).sort() });
      if (canonical === null || value < canonical) canonical = value;
    }
    return 'exact-3x3-v1:' + stableHash(canonical);
  }
  // Typed graph refinement for larger/compound formats. Collisions reject
  // conservatively; they never grant uniqueness by changing IDs or clue order.
  const nodes = [], edges = [];
  const add = color => (nodes.push(color), nodes.length - 1);
  const entities = new Map();
  axes.forEach((a,i) => candidate[a].forEach(e => entities.set(e.id, add(letters[i] + ':' + (e.id === candidate.solution[fields[i]] ? 'solution' : 'other')))));
  const declared=new Set();
  for (const c of core) {
    const group = mechanic(c)==='text'?null:add('clue:' + mechanic(c));
    for (const r of c.logicRules) {
      const key=r.action+':'+[...r.pair].sort().join(':');
      if(group===null&&declared.has(key))continue;declared.add(key);
      const rule = add('rule:' + r.action); if(group!==null)edges.push([group,rule]);
      r.pair.forEach(id => edges.push([rule,entities.get(id)]));
    }
  }
  let colors = nodes.map(stableHash);
  for (let round = 0; round < 12; round++) colors = colors.map((color,i) => stableHash([color,
    edges.flatMap(([a,b]) => a === i ? [colors[b]] : b === i ? [colors[a]] : []).sort()]));
  return 'typed-graph-v1:' + stableHash({ anchor, colors: colors.sort() });
}
export function logicNoveltyCheck(snapshot, entry, candidate) {
  const signature = canonicalLogicSignature(candidate);
  if (!signature) return { passed: false, issues: ['LOGIC_PATTERN_UNVERIFIED'], signature: null, compared: 0, unknown: snapshot.entries.length - 1 };
  const others = snapshot.entries.filter(e => e.id !== entry.id).map(e => ({ id: e.id, signature: canonicalLogicSignature(e.candidate) }));
  const collisions = others.filter(e => e.signature === signature).map(e => e.id);
  return { passed: !collisions.length, signature, collisions, compared: others.filter(e => e.signature).length,
    unknown: others.filter(e => !e.signature).length,
    issues: collisions.length ? ['LOGIC_PATTERN_DUPLICATE:' + collisions.join(',')] : [] };
}

export function logicPatternSummary(candidate) {
  const input=patternInput(candidate); if(!input) return null;
  const labels=new Map();
  axes.forEach((axis,i)=>{let next=1;candidate[axis].forEach(e=>labels.set(e.id,letters[i]+(e.id===candidate.solution[fields[i]]?0:next++)));});
  return {anchor:input.anchor,core:input.core.map(c=>({clue_id:c.id,
    relations:c.logicRules.map(r=>({action:r.action,pair:r.pair.map(id=>labels.get(id))})),
    mechanic:c.mechanicType||'text'}))};
}
