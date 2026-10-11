#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { read, write, clone, idOf, loadSnapshot, assess } from './core.mjs';
import { bootstrapAuthoring, buildPortfolioRegistry, stableHash } from '../fm_case_qa_runner.mjs';

export function validateNewCase(snapshot, raw, tier) {
  const id = idOf(raw);
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !['standard', 'premium'].includes(tier)) throw new Error('INTAKE_ID_OR_TIER');
  if (snapshot.entries.some(e => e.id === id)) throw new Error('INTAKE_DUPLICATE_CASE');
  for (const [axis, solutionKey] of [['suspects', 'suspectId'], ['weapons', 'weaponId'], ['locations', 'locationId']]) {
    if (!Array.isArray(raw[axis]) || raw[axis].length < 3 || raw[axis].some(e => !e.id || !e.name) ||
        new Set(raw[axis].map(e => e.id)).size !== raw[axis].length ||
        !raw[axis].some(e => e.id === raw.solution?.[solutionKey])) throw new Error('INTAKE_ENTITY_OR_SOLUTION:' + axis);
  }
  if (!Array.isArray(raw.clues) || raw.clues.filter(c => !c.isBonus).length < 2 ||
      raw.clues.some(c => !c.id || typeof c.text !== 'string' || !c.text.trim()) ||
      new Set(raw.clues.map(c => c.id)).size !== raw.clues.length || typeof raw.story !== 'string' || !raw.story.trim())
    throw new Error('INTAKE_CLUES_OR_STORY');
  return id;
}
export function previewNewCase(snapshot, raw, tier) {
  const id = validateNewCase(snapshot, raw, tier);
  const registry = buildPortfolioRegistry(snapshot.engine, [...snapshot.entries, { raw }]);
  const candidate = bootstrapAuthoring(snapshot.engine, clone(raw), tier, registry);
  const entry = { id, tier, raw, candidate, sourceHash: stableHash(raw) };
  const a = assess(snapshot, entry, candidate);
  return { schema: 'fm_case_intake_v1', id, tier, source_hash: stableHash(raw),
    status: 'draft_only', deterministic_qa_passed: a.passed, score: a.result.score,
    missing_authoring: a.completeness.missing, contract_errors: a.contract.errors,
    blockers: a.result.blockers, raw: clone(raw) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, tier] = process.argv.slice(2);
  if (!file || !tier) throw new Error('Usage: node .case-qa/pipeline/intake.mjs CASE.json standard|premium');
  const root = process.cwd(), snapshot = loadSnapshot(root, read('.case-qa/pipeline/policy.json'));
  const result = previewNewCase(snapshot, read(path.resolve(file)), tier);
  write(path.join(root, '.case-qa/intake', result.id + '.json'), result);
  console.log(JSON.stringify({ id: result.id, status: result.status, score: result.score,
    message: 'Draft saved. No production case, inventory, API call or asset was changed.' }, null, 2));
}
