import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { parseStandard, mergeSidecar, bootstrapAuthoring, buildPortfolioRegistry, evaluate,
  authoringCompleteness, authoringContract, protectedIdentity, stableHash, compactReport,
  normalizeCandidateMetadata, applyPatchPlanSafely, validateCandidateContract,
  assessmentPenalty, buildPrompt, restoreBaselineAuthoring, stripAuthoring, authoringOverlay,
  replaceStandardCases } from '../fm_case_qa_runner.mjs';
import { assertNearReadyCleanup } from '../fm_case_qa_cleanup_guard.mjs';

const { loadEngine } = createRequire(import.meta.url)('../fm_case_qa_core.cjs');
export const clone = value => JSON.parse(JSON.stringify(value));
export const idOf = value => String(value.puzzleId || value.id || '');
export const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(`${file}.tmp`, file);
}
export function loadSnapshot(root, policy) {
  if (policy.simulator.minimum_score !== 100 || policy.publication?.auto_merge !== false || policy.publication?.draft_only !== true)
    throw new Error('UNSAFE_PIPELINE_POLICY');
  const standardText = fs.readFileSync(path.join(root, policy.source.standard_path), 'utf8');
  const premium = read(path.join(root, policy.source.premium_path));
  const sidecar = read(path.join(root, policy.source.sidecar_path));
  const entries = [
    ...parseStandard(standardText).cases.map(raw => ({ tier: 'standard', raw })),
    ...premium.packs.flatMap((pack, pi) => pack.puzzles.map((raw, ci) => ({ tier: 'premium', raw, pi, ci })))
  ];
  if (Array.from(entries).some(e => !e || !e.raw || typeof e.raw !== 'object'))
    throw new Error('SOURCE_COUNTS_OR_DUPLICATE_IDS');
  const ids = entries.map(e => idOf(e.raw));
  const inventory = read(path.join(root, policy.source.inventory_path));
  if (inventory.schema !== 'fm_case_inventory_v1' || !Array.isArray(inventory.cases) || !inventory.cases.length ||
      inventory.cases.some(e => !e.id || !['standard', 'premium'].includes(e.tier)) ||
      new Set(inventory.cases.map(e => e.id)).size !== inventory.cases.length ||
      ids.some(id => !id) || new Set(ids).size !== entries.length ||
      stableHash(entries.map(e => ({ id: idOf(e.raw), tier: e.tier }))) !== stableHash(inventory.cases))
    throw new Error('SOURCE_COUNTS_OR_DUPLICATE_IDS');
  const html = fs.readFileSync(path.join(root, policy.simulator.path));
  const blob = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${html.length}\0`), html])).digest('hex');
  if (blob !== policy.simulator.git_blob_sha) throw new Error('EXACT_HTML_HASH_MISMATCH');
  const engine = loadEngine(path.join(root, policy.simulator.path));
  const registry = buildPortfolioRegistry(engine, entries);
  for (const entry of entries) {
    entry.id = idOf(entry.raw);
    const overlay = sidecar.cases?.[entry.id];
    entry.sourceHash = stableHash({ raw: entry.raw, overlay });
    entry.candidate = bootstrapAuthoring(engine, mergeSidecar(entry.raw, overlay).caseData, entry.tier, registry);
  }
  const finalRegistry = buildPortfolioRegistry(engine, entries.map(e => ({ raw: e.candidate })));
  for (const entry of entries) entry.candidate.qaPortfolioRegistry = { schema_version: 'fm_qa_portfolio_registry_v1', entries: clone(finalRegistry) };
  return { root, policy, inventory, engine, entries, sidecar, premium, standardText, simulatorHash: blob };
}
export function assess(snapshot, entry, candidate) {
  const result = evaluate(snapshot.engine, entry.raw, candidate);
  const completeness = authoringCompleteness(candidate);
  const contract = authoringContract(candidate);
  return { ...result, completeness, contract,
    passed: result.passed && completeness.complete && contract.passed && protectedIdentity(entry.raw) === protectedIdentity(candidate),
    penalty: assessmentPenalty(result) + 1200 * (completeness.missing.length + contract.errors.length) };
}
export function scan(snapshot) {
  return snapshot.entries.map(entry => {
    const a = assess(snapshot, entry, entry.candidate);
    return { id: entry.id, tier: entry.tier, source_hash: entry.sourceHash, passed: a.passed,
      score: a.result.score, productionReady: a.result.simulatorProductionReady === true,
      result: compactReport(a.result, a.leakage), missing_authoring: a.completeness.missing, contract_errors: a.contract.errors };
  });
}
export function selectNext(rows, activeId, records = {}) {
  const eligible = row => !row.passed && !['quarantined', 'awaiting_review'].includes(records[row.id]?.status);
  const active = rows.find(r => r.id === activeId);
  return active && eligible(active) ? active : rows.find(eligible) || null;
}
export function counts(rows) {
  const done = tier => rows.filter(r => (!tier || r.tier === tier) && r.passed).length;
  return { standard: done('standard'), premium: done('premium'), total: done(), expected: rows.length,
    unresolved: rows.length - done(), complete: rows.length > 0 && rows.every(r => r.passed) };
}
export function nearReady(a) { return a.result.score >= 90 && a.calibration.failed_required_gates.length === 0; }
export function logicalFailure(a) {
  return !a.completeness.complete || !a.contract.passed ||
    ['coreNecessity', 'semanticContract', 'visibleEvidence', 'mechanicContract', 'bonusFunctionality']
      .some(name => a.result.gates?.[name]?.passed !== true);
}
export function better(next, before) {
  // Score cannot go backwards, nor can any previously passed safety gate.
  const gates = Object.entries(before.result.gates || {}).filter(([, value]) => value.passed === true);
  return next.result.identityGuard?.passed === true && next.result.score >= before.result.score &&
    (!before.leakage.passed || next.leakage.passed) &&
    gates.every(([name]) => next.result.gates?.[name]?.passed === true) &&
    (next.passed || next.penalty < before.penalty);
}
export function guardedPatch(snapshot, entry, current, plan, before) {
  if (plan.case_id !== entry.id) throw new Error('PATCH_CASE_ID_MISMATCH');
  const patched = applyPatchPlanSafely(current, plan);
  // The model never changes the grading policy or the portfolio it is graded against.
  for (const field of ['qaPolicy', 'qaPortfolioRegistry', 'intentionalMononymIds'])
    if (stableHash(current[field] ?? null) !== stableHash(patched[field] ?? null)) throw new Error(`LOCKED_FIELD:${field}`);
  if (nearReady(before)) assertNearReadyCleanup(current, patched);
  const candidate = normalizeCandidateMetadata(snapshot.engine, patched);
  validateCandidateContract(candidate);
  if (protectedIdentity(candidate) !== protectedIdentity(entry.raw)) throw new Error('IMMUTABLE_IDENTITY');
  return { candidate, assessment: assess(snapshot, entry, candidate) };
}
export function repairPrompt(entry, candidate, assessment, rejected) {
  const small = clone(candidate);
  // Do not send the full portfolio registry to the model. The evaluator keeps it.
  delete small.qaPortfolioRegistry;
  for (const axis of ['suspects', 'weapons', 'locations']) for (const entity of small[axis] || [])
    for (const key of ['icon', 'avatar', 'image', 'asset', 'fingerprint', 'fp', 'parmakIziDeseni']) delete entity[key];
  let prompt = buildPrompt({ caseData: small, baselineResult: assessment.result, leakage: assessment.leakage,
    phase: nearReady(assessment) ? 'exact_score_cleanup' : 'luna_first_pass', previousRejectedCandidates: rejected.slice(-2) });
  // Projection is for transport only: omitted registry data is present in the
  // actual candidate, not an authoring defect for the model to reconstruct.
  const projectedStatus = JSON.stringify({ completeness: authoringCompleteness(small), contract: authoringContract(small) });
  const actualStatus = JSON.stringify({ completeness: authoringCompleteness(candidate), contract: authoringContract(candidate) });
  prompt = prompt.replace('AUTHORING CONTRACT STATUS (must also be complete after repair):\n' + projectedStatus,
    'AUTHORING CONTRACT STATUS (must also be complete after repair):\n' + actualStatus);
  prompt = prompt.replace('- /qaPattern, /qaPortfolioRegistry, /qaSemanticFacts, /qaPolicy, /qaNameRationales, /intentionalMononymIds, /qaAuthoringVersion, /qaDeductionGraph',
    '- /qaPattern, /qaSemanticFacts, /qaNameRationales, /qaAuthoringVersion, /qaDeductionGraph');
  prompt = 'PIPELINE CODE LOCK: qaPolicy, qaPortfolioRegistry, intentionalMononymIds and all IDs/assets/solution are immutable. The portfolio registry is intentionally omitted from CASE and remains available to the evaluator. Never add or replace these locked fields.\n\n' + prompt;
  prompt += '\nNever suppress a gate. Return the smallest coherent repair for the reported deficit. Removed asset fields still exist in the real case and must not be changed. A positive witness statement that an entity was at a location supports confirm, not eliminate. Evidence about the crime weapon or location does not by itself identify the culprit. qaSemanticFacts must not turn an unsupported culprit identity into evidence. Repair visible prose and rules together; metadata alone cannot make an ambiguous core solvable.';
  return prompt;
}
export function restoreBest(snapshot, entry, record) {
  let current = clone(entry.candidate);
  let assessment = assess(snapshot, entry, current);
  const sameSimulator = record?.simulator_hash === snapshot.simulatorHash;
  // Only this audited team-title correction can re-evaluate an old checkpoint.
  // It must pass EVERY current gate; old review certificates are not migrated.
  const correctedSimulator = record?.simulator_hash === 'cb53e6613d6379de097599634de26524f4510fbc' &&
    snapshot.simulatorHash === '04352c0a4ce07097cb752a1980b144fa00722e78';
  if (record?.source_hash === entry.sourceHash && (sameSimulator || correctedSimulator) &&
      record.candidate && record.candidate_hash === stableHash(record.candidate)) {
    try {
      const restored = clone(record.candidate);
      restored.qaPortfolioRegistry = clone(current.qaPortfolioRegistry);
      validateCandidateContract(restored);
      if (protectedIdentity(restored) !== protectedIdentity(entry.raw) ||
          stableHash(restored.qaPolicy) !== stableHash(current.qaPolicy)) throw new Error('STALE_POLICY');
      const a = assess(snapshot, entry, restored);
      if (better(a, assessment) && (sameSimulator || a.passed)) { current = restored; assessment = a; }
    } catch { /* Keep today's main source on invalid checkpoint. */ }
  }
  const normalized = normalizeCandidateMetadata(snapshot.engine, current);
  const a = assess(snapshot, entry, normalized);
  if (better(a, assessment)) { current = normalized; assessment = a; }
  return { candidate: current, assessment };
}
export function assertScope(before, after, selectedId) {
  const selected = new Set(Array.isArray(selectedId) ? selectedId : [selectedId]);
  if (before.entries.length !== after.entries.length) throw new Error('DIFF_CASE_COUNT');
  for (const [i, entry] of before.entries.entries()) {
    const next = after.entries[i];
    if (entry.id !== next.id || entry.tier !== next.tier) throw new Error('DIFF_ORDER');
    if (!selected.has(entry.id) && (stableHash(entry.raw) !== stableHash(next.raw) ||
        stableHash(before.sidecar.cases[entry.id] ?? null) !== stableHash(after.sidecar.cases[entry.id] ?? null)))
      throw new Error(`DIFF_UNSELECTED_CASE:${entry.id}`);
    if (protectedIdentity(entry.raw) !== protectedIdentity(next.raw)) throw new Error(`DIFF_IDENTITY:${entry.id}`);
  }
  const top = db => { const out = clone(db); for (const pack of out.packs) delete pack.puzzles; return out; };
  if (stableHash(top(before.premium)) !== stableHash(top(after.premium))) throw new Error('DIFF_PACK_METADATA');
  const standardShell = text => { const { range } = parseStandard(text); return text.slice(0, range.start) + text.slice(range.end); };
  if (standardShell(before.standardText) !== standardShell(after.standardText)) throw new Error('DIFF_STANDARD_CODE');
  // Exact file changes are additionally checked by git diff in the certification workflow.
  const allowed = new Set(after.entries.map(e => e.id));
  if (Object.keys(after.sidecar.cases).some(id => !allowed.has(id))) throw new Error('SIDECAR_UNKNOWN_CASE');
  const shell = s => { const out = clone(s); delete out.cases; delete out.count; return out; };
  if (stableHash(shell(before.sidecar)) !== stableHash(shell(after.sidecar))) throw new Error('SIDECAR_GLOBAL_CHANGE');
}
export function assertNoRegression(beforeRows, afterRows, selectedId) {
  const after = new Map(afterRows.map(r => [r.id, r]));
  for (const id of Array.isArray(selectedId) ? selectedId : [selectedId])
    if (!after.get(id)?.passed) throw new Error('SELECTED_NOT_100');
  for (const row of beforeRows) if (row.passed && !after.get(row.id)?.passed) throw new Error(`PORTFOLIO_REGRESSION:${row.id}`);
}
export function stageCandidate(snapshot, entry, candidate, reviewCertificate) {
  const production = restoreBaselineAuthoring(candidate, entry.raw);
  const sidecar = clone(snapshot.sidecar);
  sidecar.cases[entry.id] = { schema_version: 'fm_case_qa_sidecar_entry_v2', simulator_version: '29.4',
    prompt_version: 'fm-case-pipeline-v1', source_content_hash: stableHash(stripAuthoring(production)),
    overlay: authoringOverlay(candidate), authoring_contract: authoringContract(candidate),
    production_content_unchanged: stableHash(stripAuthoring(entry.raw)) === stableHash(stripAuthoring(production)),
    ...(reviewCertificate ? { pipeline_review: clone(reviewCertificate) } : {}) };
  sidecar.count = Object.keys(sidecar.cases).length;
  const premium = clone(snapshot.premium);
  let standard = snapshot.standardText;
  if (entry.tier === 'standard') standard = replaceStandardCases(standard, new Map([[entry.id, production]]));
  else premium.packs[entry.pi].puzzles[entry.ci] = production;
  const paths = [snapshot.policy.source.standard_path, snapshot.policy.source.premium_path, snapshot.policy.source.sidecar_path];
  const previous = paths.map(p => fs.readFileSync(path.join(snapshot.root, p)));
  try {
    if (entry.tier === 'standard') fs.writeFileSync(path.join(snapshot.root, paths[0]), standard);
    else write(path.join(snapshot.root, paths[1]), premium);
    write(path.join(snapshot.root, paths[2]), sidecar);
    const next = loadSnapshot(snapshot.root, snapshot.policy);
    assertScope(snapshot, next, entry.id);
    assertNoRegression(scan(snapshot), scan(next), entry.id);
    return next;
  } catch (error) {
    paths.forEach((p, i) => fs.writeFileSync(path.join(snapshot.root, p), previous[i]));
    throw error;
  }
}
