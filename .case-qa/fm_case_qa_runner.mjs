#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { evaluatePreclueLeakage } from './case_qa_preclue_guard.mjs';

const require = createRequire(import.meta.url);
const { loadEngine, evaluateCase } = require('./fm_case_qa_core.cjs');

const env = process.env;
const ROOT = path.resolve(env.FM_QA_ROOT || process.cwd());
const STANDARD_PATH = path.resolve(ROOT, env.FM_QA_STANDARD_PATH || 'artifacts/dedektif/data/puzzles.ts');
const PREMIUM_PATH = path.resolve(ROOT, env.FM_QA_PREMIUM_PATH || 'artifacts/dedektif/data/puzzles_database.json');
const SIDECAR_PATH = path.resolve(ROOT, env.FM_QA_SIDECAR_PATH || 'artifacts/dedektif/qa/case_qa_sidecars_v29_5.json');
const SIMULATOR_PATH = path.resolve(ROOT, env.FM_QA_SIMULATOR_PATH || '.case-qa/Faili_Mechul_Vaka_Simulatoru_v29_4_Otomasyon_Temeli.html');
const POLICY_PATH = path.resolve(ROOT, env.FM_QA_POLICY_PATH || '.case-qa/fm_case_qa_policy_v3_1.json');
const OUTPUT_DIR = path.resolve(ROOT, env.FM_QA_OUTPUT_DIR || '.case-qa-output');
const CACHE_DIR = path.resolve(ROOT, env.FM_QA_CACHE_DIR || '.case-qa-cache');

const MODE = String(env.FM_QA_MODE || 'audit').toLowerCase();
const AI_ENABLED = String(env.FM_QA_ALLOW_AI || 'false').toLowerCase() === 'true';
const APPLY_TO_WORKTREE = String(env.FM_QA_APPLY_TO_WORKTREE || 'false').toLowerCase() === 'true';
const CASE_LIMIT = Math.max(0, Number(env.FM_QA_CASE_LIMIT || 0));
const CASE_IDS = new Set(String(env.FM_QA_CASE_IDS || '').split(',').map((item) => item.trim()).filter(Boolean));
const PROMPT_VERSION = 'fm-case-qa-patch-v3.3.0';

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function sha(value) { return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex'); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function stableHash(value) { return sha(JSON.stringify(stable(value))); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function caseId(caseData) { return String(caseData?.puzzleId || caseData?.id || ''); }

function locateStandardArray(source) {
  const marker = source.indexOf('export const PUZZLES');
  const eq = source.indexOf('=', marker);
  const start = source.indexOf('[', eq);
  if (marker < 0 || eq < 0 || start < 0) throw new Error('puzzles.ts içinde PUZZLES dizisi bulunamadı.');
  let depth = 0;
  let quote = '';
  let escaped = false;
  let line = false;
  let block = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (line) { if (char === '\n') line = false; continue; }
    if (block) { if (char === '*' && next === '/') { block = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { line = true; index += 1; continue; }
    if (char === '/' && next === '*') { block = true; index += 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '[') depth += 1;
    if (char === ']' && --depth === 0) return { start, end: index + 1 };
  }
  throw new Error('puzzles.ts PUZZLES dizisinin sonu bulunamadı.');
}

function parseStandard(source) {
  const range = locateStandardArray(source);
  const cases = Function(`"use strict"; return (${source.slice(range.start, range.end)});`)();
  if (!Array.isArray(cases)) throw new Error('PUZZLES bir dizi değil.');
  return { cases, range };
}

function topLevelObjectRanges(arrayText, absoluteStart) {
  const ranges = [];
  let arrayDepth = 0;
  let objectDepth = 0;
  let objectStart = -1;
  let quote = '';
  let escaped = false;
  let line = false;
  let block = false;
  for (let index = 0; index < arrayText.length; index += 1) {
    const char = arrayText[index];
    const next = arrayText[index + 1];
    if (line) { if (char === '\n') line = false; continue; }
    if (block) { if (char === '*' && next === '/') { block = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { line = true; index += 1; continue; }
    if (char === '/' && next === '*') { block = true; index += 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '[') { arrayDepth += 1; continue; }
    if (char === ']') { arrayDepth -= 1; continue; }
    if (arrayDepth !== 1) continue;
    if (char === '{') {
      if (objectDepth === 0) objectStart = index;
      objectDepth += 1;
    } else if (char === '}') {
      objectDepth -= 1;
      if (objectDepth === 0 && objectStart >= 0) {
        ranges.push({ start: absoluteStart + objectStart, end: absoluteStart + index + 1 });
        objectStart = -1;
      }
    }
  }
  return ranges;
}

function replaceStandardCases(source, replacements) {
  if (!replacements.size) return source;
  const parsed = parseStandard(source);
  const ranges = topLevelObjectRanges(source.slice(parsed.range.start, parsed.range.end), parsed.range.start);
  if (ranges.length !== parsed.cases.length) throw new Error(`puzzles.ts nesne aralığı sayısı uyuşmuyor: ${ranges.length}/${parsed.cases.length}`);
  const edits = [];
  parsed.cases.forEach((item, index) => {
    const id = caseId(item);
    if (!replacements.has(id)) return;
    const indentMatch = source.slice(0, ranges[index].start).match(/(^|\n)([ \t]*)[^\n]*$/);
    const indent = indentMatch?.[2] || '  ';
    const rendered = JSON.stringify(replacements.get(id), null, 2).split('\n').map((line, lineIndex) => lineIndex ? `${indent}${line}` : line).join('\n');
    edits.push({ ...ranges[index], rendered });
  });
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.rendered + output.slice(edit.end);
  return output;
}

const TOP_LEVEL_AUTHORING = new Set([
  'qaPattern', 'qaPortfolioRegistry', 'qaSemanticFacts', 'qaPolicy', 'qaNameRationales',
  'intentionalMononymIds', 'qaAuthoringVersion', 'qaDeductionGraph'
]);
const CLUE_AUTHORING = new Set(['logicRules', 'qaRationale', 'qaMechanicBoundary', 'qaSemanticFacts']);

function stripAuthoring(caseData) {
  const output = clone(caseData);
  for (const key of TOP_LEVEL_AUTHORING) delete output[key];
  for (const clue of output.clues || []) for (const key of CLUE_AUTHORING) delete clue[key];
  return output;
}

function authoringOverlay(caseData) {
  const topLevel = {};
  for (const key of TOP_LEVEL_AUTHORING) if (caseData[key] !== undefined) topLevel[key] = clone(caseData[key]);
  const clues = {};
  for (const clue of caseData.clues || []) {
    const fields = {};
    for (const key of CLUE_AUTHORING) if (clue[key] !== undefined) fields[key] = clone(clue[key]);
    if (Object.keys(fields).length) clues[String(clue.id)] = fields;
  }
  return { top_level: topLevel, clues };
}

function mergeSidecar(caseData, entry) {
  const output = clone(caseData);
  if (!entry || entry.source_content_hash !== stableHash(stripAuthoring(caseData))) return { caseData: output, status: entry ? 'stale_hash_ignored' : 'missing' };
  Object.assign(output, clone(entry.overlay?.top_level || {}));
  const byId = new Map((output.clues || []).map((clue) => [String(clue.id), clue]));
  for (const [id, fields] of Object.entries(entry.overlay?.clues || {})) if (byId.has(id)) Object.assign(byId.get(id), clone(fields));
  return { caseData: output, status: 'applied' };
}

function hasAuthoring(caseData) {
  return Boolean(
    caseData.qaPattern || caseData.qaPortfolioRegistry || caseData.qaSemanticFacts ||
    (caseData.clues || []).some((clue) => (clue.logicRules || []).length || clue.qaRationale || clue.qaMechanicBoundary)
  );
}

function deterministicPatternRole(profile) {
  if (!profile?.miniIndex) return null;
  if (profile.miniIndex === profile.core.length) return 'climax';
  if (profile.miniIndex === 1) return 'pivot';
  return 'verification';
}

function buildPortfolioRegistry(engine, entries) {
  return entries.map((entry) => {
    const normalized = engine.normalize(clone(entry.raw));
    const profile = engine.fmPatternProfile(normalized);
    return {
      puzzleId: caseId(entry.raw),
      title: String(entry.raw.title || ''),
      signature: clone(engine.fmProfileVector(profile))
    };
  });
}

function bootstrapAuthoring(engine, caseData, tier, registryEntries) {
  const output = clone(caseData);
  output.qaPolicy = { ...(output.qaPolicy || {}), caseTier: tier };
  const normalized = engine.normalize(clone(output));
  const profile = engine.fmPatternProfile(normalized);
  const vector = clone(engine.fmProfileVector(profile));
  const miniClue = profile.miniIndex ? profile.core[profile.miniIndex - 1] : null;
  if (!output.qaPattern || typeof output.qaPattern !== 'object') {
    output.qaPattern = {
      anchorSource: String(profile.anchor?.source || 'none'),
      ...(profile.anchor?.component && profile.anchor.component !== '?' ? { anchorComponent: profile.anchor.component } : {}),
      ...(miniClue?.id ? { miniGameClueId: String(miniClue.id), miniGameRole: deterministicPatternRole(profile) } : {}),
      designIntent: `Deterministik miras-vaka imzası: ${vector.anchorSig}; ${vector.firstSig}; ${vector.actions}; ${vector.axes}; ${vector.miniSig}.`
    };
  }
  if (!output.qaPortfolioRegistry || !Array.isArray(output.qaPortfolioRegistry.entries) || !output.qaPortfolioRegistry.entries.length) {
    output.qaPortfolioRegistry = { schema_version: 'fm_qa_portfolio_registry_v1', entries: clone(registryEntries) };
  }
  output.qaAuthoringVersion ||= 'fm_case_qa_authoring_v3_2_deterministic_bootstrap';
  return output;
}

function decodePointer(pathValue) {
  if (!pathValue.startsWith('/')) throw new Error(`JSON Pointer '/' ile başlamalı: ${pathValue}`);
  return pathValue.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function allowedPatchPath(pointer) {
  const parts = decodePointer(pointer);
  if (parts.some((part) => ['__proto__', 'prototype', 'constructor'].includes(part))) return false;
  if (TOP_LEVEL_AUTHORING.has(parts[0])) return true;
  if (['story', 'atmosphere', 'subtitle', 'deductionSummary', 'assetManifest'].includes(parts[0])) return true;
  if (['suspects', 'weapons', 'locations'].includes(parts[0])) {
    return /^\d+$/.test(parts[1] || '') && ['name', 'description', 'detail', 'info', 'profile', 'visualDefinition', 'visualProfile', 'generationPrompt', 'avatarPrompt'].includes(parts[2]);
  }
  if (parts[0] === 'clues' && /^\d+$/.test(parts[1] || '')) return Boolean(parts[2]) && parts[2] !== 'id';
  return false;
}

function setPointer(target, pointer, value, op) {
  const parts = decodePointer(pointer);
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (cursor[key] == null) cursor[key] = /^\d+$/.test(parts[index + 1]) ? [] : {};
    cursor = cursor[key];
    if (!cursor || typeof cursor !== 'object') throw new Error(`Yama yolu nesne/dizi değil: ${pointer}`);
  }
  const finalKey = parts.at(-1);
  if (op === 'replace' && !(finalKey in cursor)) throw new Error(`replace hedefi yok: ${pointer}`);
  cursor[finalKey] = value;
}

function patchTargetExists(target, pointer) {
  const parts = decodePointer(pointer);
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (cursor == null || typeof cursor !== 'object' || !(key in cursor)) return false;
    cursor = cursor[key];
  }
  return cursor != null && typeof cursor === 'object' && parts.at(-1) in cursor;
}

function validateNestedPatchParent(target, pointer) {
  const parts = decodePointer(pointer);
  if (!['suspects', 'weapons', 'locations', 'clues'].includes(parts[0])) return;
  const collection = target[parts[0]];
  const index = Number(parts[1]);
  if (!Array.isArray(collection) || !Number.isInteger(index) || index < 0 || index >= collection.length) {
    throw new Error(`Yama hedef dizin sınırı dışında: ${pointer}`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalizeKnownPatchValue(pointer, value) {
  const parts = decodePointer(pointer);
  const field = parts.at(-1);
  if (['qaSemanticFacts', 'logicRules', 'assetManifest'].includes(field)) {
    if (Array.isArray(value)) return value;
    // A single structured record is an unambiguous shorthand for a one-item
    // collection. Canonicalize it before the simulator can call `.map()`.
    if (isPlainObject(value)) return [value];
    throw new Error(`PATCH_CONTRACT: ${pointer} dizi veya tek nesne olmalıdır.`);
  }
  if (field === 'intentionalMononymIds' && !Array.isArray(value)) {
    throw new Error(`PATCH_CONTRACT: ${pointer} dizi olmalıdır.`);
  }
  if (field === 'qaMechanicBoundary' && !isPlainObject(value)) {
    throw new Error(`PATCH_CONTRACT: ${pointer} nesne olmalıdır.`);
  }
  return value;
}

function validateCandidateContract(candidate) {
  for (const field of ['suspects', 'weapons', 'locations', 'clues']) {
    if (!Array.isArray(candidate[field])) throw new Error(`PATCH_CONTRACT: /${field} dizi olmalıdır.`);
  }
  if (candidate.qaSemanticFacts !== undefined && !Array.isArray(candidate.qaSemanticFacts)) {
    throw new Error('PATCH_CONTRACT: /qaSemanticFacts dizi olmalıdır.');
  }
  if (candidate.assetManifest !== undefined && !Array.isArray(candidate.assetManifest)) {
    throw new Error('PATCH_CONTRACT: /assetManifest dizi olmalıdır.');
  }
  if (candidate.intentionalMononymIds !== undefined && !Array.isArray(candidate.intentionalMononymIds)) {
    throw new Error('PATCH_CONTRACT: /intentionalMononymIds dizi olmalıdır.');
  }
  for (const field of ['qaPattern', 'qaPortfolioRegistry', 'qaPolicy', 'qaDeductionGraph']) {
    if (candidate[field] !== undefined && !isPlainObject(candidate[field])) {
      throw new Error(`PATCH_CONTRACT: /${field} nesne olmalıdır.`);
    }
  }
  for (const [index, clue] of candidate.clues.entries()) {
    if (!isPlainObject(clue)) throw new Error(`PATCH_CONTRACT: /clues/${index} nesne olmalıdır.`);
    if (clue.logicRules !== undefined && !Array.isArray(clue.logicRules)) {
      throw new Error(`PATCH_CONTRACT: /clues/${index}/logicRules dizi olmalıdır.`);
    }
    if (clue.qaSemanticFacts !== undefined && !Array.isArray(clue.qaSemanticFacts)) {
      throw new Error(`PATCH_CONTRACT: /clues/${index}/qaSemanticFacts dizi olmalıdır.`);
    }
    if (clue.qaMechanicBoundary !== undefined && !isPlainObject(clue.qaMechanicBoundary)) {
      throw new Error(`PATCH_CONTRACT: /clues/${index}/qaMechanicBoundary nesne olmalıdır.`);
    }
  }
}

function applyPatchPlan(baseCase, plan) {
  if (String(plan.case_id) !== caseId(baseCase)) throw new Error(`AI vaka ID uyuşmazlığı: ${plan.case_id}/${caseId(baseCase)}`);
  if (!Array.isArray(plan.operations) || plan.operations.length > 80) throw new Error('AI yama operasyon sayısı geçersiz veya 80 sınırını aşıyor.');
  const output = clone(baseCase);
  for (const operation of plan.operations) {
    if (!['add', 'replace'].includes(operation.op)) throw new Error(`Yasak yama işlemi: ${operation.op}`);
    if (!allowedPatchPath(operation.path)) throw new Error(`Yasak yama yolu: ${operation.path}`);
    validateNestedPatchParent(output, operation.path);
    let value;
    try { value = JSON.parse(operation.value_json); } catch { throw new Error(`value_json geçersiz: ${operation.path}`); }
    value = canonicalizeKnownPatchValue(operation.path, value);
    // Structured-output models occasionally emit `replace` for an allowed field
    // that is absent in legacy cases. Canonicalize that single recoverable JSON
    // Patch mismatch to `add`; array/entity indexes must still already exist.
    const effectiveOp = operation.op === 'replace' && !patchTargetExists(output, operation.path) ? 'add' : operation.op;
    setPointer(output, operation.path, value, effectiveOp);
  }
  validateCandidateContract(output);
  return output;
}

function extractOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) for (const content of item.content || []) if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
  throw new Error('OpenAI yanıtında output_text bulunamadı.');
}

const PATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['case_id', 'assessment', 'operations'],
  properties: {
    case_id: { type: 'string' },
    assessment: { type: 'string' },
    operations: {
      type: 'array',
      maxItems: 80,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['op', 'path', 'value_json', 'reason'],
        properties: {
          op: { type: 'string', enum: ['add', 'replace'] },
          path: { type: 'string' },
          value_json: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    }
  }
};

class Budget {
  constructor(policy) {
    this.hard = Number(policy.budget.hard_budget);
    this.warning = Number(policy.budget.warning_budget);
    this.spent = 0;
    this.reserved = 0;
    this.calls = [];
  }
  reserve(amount) {
    if (this.spent + this.reserved + amount > this.hard) return false;
    this.reserved += amount;
    return true;
  }
  settle(reserved, actual, metadata) {
    this.reserved = Math.max(0, this.reserved - reserved);
    this.spent += actual;
    this.calls.push({ ...metadata, cost_usd: actual });
  }
}

function rateFor(policy, model) {
  const rate = policy.models.pricing_usd_per_million_tokens?.[model];
  if (!rate) throw new Error(`Model fiyatı policy içinde yok: ${model}`);
  return rate;
}

function usageCost(policy, model, usage) {
  const rate = rateFor(policy, model);
  return ((Number(usage?.input_tokens || 0) * Number(rate.input)) + (Number(usage?.output_tokens || 0) * Number(rate.output))) / 1_000_000;
}

function projectedCost(policy, model, prompt, maxOutputTokens) {
  const rate = rateFor(policy, model);
  const estimatedInput = Math.ceil(prompt.length / 3.2);
  return ((estimatedInput * Number(rate.input)) + (maxOutputTokens * Number(rate.output))) / 1_000_000;
}

async function callModel({ policy, budget, model, effort, prompt, key, maxOutputTokens }) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cacheFile = path.join(CACHE_DIR, `${key}.json`);
  if (fs.existsSync(cacheFile)) {
    const cached = readJson(cacheFile);
    return { plan: cached.plan, cached: true, usage: cached.usage || {}, cost: 0 };
  }
  if (!env.OPENAI_API_KEY) throw new Error('FM_QA_ALLOW_AI=true fakat OPENAI_API_KEY tanımlı değil.');
  const projected = projectedCost(policy, model, prompt, maxOutputTokens);
  if (!budget.reserve(projected)) throw new Error(`BUDGET_CAP: ${model} çağrısı hard budget sınırını aşacaktı.`);
  let response;
  let requestSent = false;
  try {
    requestSent = true;
    const http = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': key
      },
      body: JSON.stringify({
        model,
        reasoning: { effort },
        max_output_tokens: maxOutputTokens,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
          { role: 'user', content: [{ type: 'input_text', text: prompt }] }
        ],
        text: { format: { type: 'json_schema', name: 'fm_case_patch', strict: true, schema: PATCH_SCHEMA } }
      })
    });
    response = await http.json();
    if (!http.ok) throw new Error(`OpenAI HTTP ${http.status}: ${JSON.stringify(response).slice(0, 1200)}`);
    const plan = JSON.parse(extractOutputText(response));
    const actual = usageCost(policy, model, response.usage);
    budget.settle(projected, actual, { model, cached: false, input_tokens: response.usage?.input_tokens || 0, output_tokens: response.usage?.output_tokens || 0 });
    writeJson(cacheFile, { schema_version: 'fm_case_qa_ai_cache_v1', key, model, usage: response.usage || {}, plan });
    return { plan, cached: false, usage: response.usage || {}, cost: actual };
  } catch (error) {
    const conservativeCharge = requestSent && response?.usage ? usageCost(policy, model, response.usage) : (requestSent ? projected : 0);
    budget.settle(projected, conservativeCharge, { model, cached: false, failed: true });
    throw error;
  }
}

const SYSTEM_PROMPT = `You are the bounded repair engine for Faili Meçhul, a Turkish detective grid game.
Return only the strict patch plan requested by the schema.
Non-negotiable rules:
- Keep puzzle ID, entity IDs, clue IDs, icons/assets, and the solution suspect/weapon/location IDs unchanged.
- Preserve every solution ID. A suspect, weapon or location display name may change only when the deterministic report identifies a real language defect or a direct pre-clue identity leak. Keep the same entity ID, physical class, visual identity and gameplay role; never rename merely for style.
- Every non-bonus clue must contain logicRules grounded in player-visible evidence.
- All non-bonus clues together must produce one unique solution; removing any one must restore ambiguity. Bonus clues are never required.
- qaSemanticFacts must always be an array. Every item must use exactly the semantic fact contract {kind:"crime_component",component:"suspect"|"weapon"|"location",entityId:"existing matching-category ID",source:"story"|"clue:<existing clue ID>",evidence:"player-visible evidence"}. Never put qaRationale or arbitrary traceability records in qaSemanticFacts.
- Every clue with logicRules must contain qaRationale {matrixEffect,evidenceLink,evidenceKind}. evidenceKind must be one of forensic, documentary, record, witness, mechanical, medical, physical or audio; motive alone cannot justify a matrix action.
- deductionHint must be a clear Socratic question without leaking names or the solution.
- Premium cases need one genuinely playable advanced mechanic that contributes to deduction.
- For context_only encrypted mechanics, keep the visible wrapper text at or below the deterministic character limit in the QA report; the decoded mechanic must remain necessary.
- Every bonus clue must have at least one useful logicRules matrix effect while remaining unnecessary for the unique core solution.
- After changing clue text or logicRules, remove every suspect, weapon or location name/marker that is not represented by that same clue's declared rule pair.
- Keep qaPattern aligned with the candidate's actual deterministic pattern profile reported by QA.
- Remove pre-clue suspect↔weapon/location leakage from profiles and avatar prompt sources. Suspect visual descriptions may use role, era, clothing, age, posture and mood, but not a distinctive weapon/location mapping.
- Preserve story identity, historical setting, tone and difficulty. Make the smallest sufficient patch.
- Use only add/replace operations and only paths permitted by the user message.
- Use add when the final field does not yet exist; use replace only when the final field already exists in the supplied case JSON.
- value_json is a JSON-encoded string containing the exact replacement value.`;

function compactReport(result, leakage) {
  return {
    score: result.score,
    simulator_production_ready: result.productionReady,
    blockers: result.blockers,
    fixes: result.fixes,
    advisories: result.advisories,
    gates: result.gates,
    leakage: {
      status: leakage.status,
      severity: leakage.severity,
      avatar_prompt_risk: leakage.avatar_prompt_risk,
      solution_triple_exposed: leakage.solution_triple_exposed,
      findings: leakage.findings,
      required_actions: leakage.required_actions
    }
  };
}

function buildPrompt({ caseData, baselineResult, leakage, phase }) {
  return `${phase === 'luna_first_pass' ? 'Reconstruct missing authoring evidence and repair only verified playability failures.' : 'Repair only the remaining deterministic failures in the current candidate. Re-read every failed gate and do not repeat already-passed repairs.'}

Allowed JSON Pointer paths:
- /story, /atmosphere, /subtitle, /deductionSummary, /assetManifest
- /suspects/<index>/(name|description|detail|info|profile|visualDefinition|visualProfile|generationPrompt|avatarPrompt)
- /weapons/<index>/(name|description|detail|info|profile|visualDefinition|visualProfile|generationPrompt|avatarPrompt)
- /locations/<index>/(name|description|detail|info|profile|visualDefinition|visualProfile|generationPrompt|avatarPrompt)
- /clues/<index>/<any field except id>
- /qaPattern, /qaPortfolioRegistry, /qaSemanticFacts, /qaPolicy, /qaNameRationales, /intentionalMononymIds, /qaAuthoringVersion, /qaDeductionGraph

CASE:
${JSON.stringify(caseData)}

DETERMINISTIC QA REPORT:
${JSON.stringify(compactReport(baselineResult, leakage))}`;
}

function evaluate(engine, original, candidate) {
  const result = evaluateCase(engine, candidate, { baseline: original, includeFullQa: false });
  const leakage = evaluatePreclueLeakage(candidate);
  const requiredGateNames = ['coreNecessity', 'patternGovernance', 'contentAndNames', 'semanticContract', 'visibleEvidence', 'mechanicContract', 'bonusFunctionality'];
  const failedRequiredGates = requiredGateNames.filter((name) => result.gates?.[name]?.passed !== true);
  const passed = result.score === 100 && failedRequiredGates.length === 0 && result.identityGuard?.passed === true && leakage.passed === true && leakage.avatar_prompt_risk === false;
  return {
    result,
    leakage,
    passed,
    calibration: {
      schema_version: 'fm_case_qa_calibration_v3_2',
      automation_certified: passed,
      failed_required_gates: failedRequiredGates,
      advisory_count: Array.isArray(result.advisories) ? result.advisories.filter((item) => !/^✓|^ⓘ/.test(String(item))).length : 0,
      raw_simulator_production_ready: result.productionReady === true
    }
  };
}

function classifyRepairEligibility(assessment) {
  const leakage = assessment.leakage || {};
  if (leakage.status === 'blocked_pending_content_repair') {
    return {
      eligible: true,
      queue: leakage.solution_triple_exposed ? 'critical_solution_leak' : 'confirmed_preclue_leak',
      priority: leakage.solution_triple_exposed ? 1 : 2,
      reason: 'deterministic_preclue_guard_confirmed_content_repair'
    };
  }
  if (leakage.status === 'manual_review_required') {
    return { eligible: false, queue: 'deep_review', priority: 3, reason: 'semantic_overlap_requires_case_context_review' };
  }
  return { eligible: false, queue: 'deterministic_qa_review', priority: 4, reason: 'no_confirmed_preclue_leak' };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function lane() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}

function restoreBaselineAuthoring(productionCandidate, original) {
  const output = stripAuthoring(productionCandidate);
  for (const key of TOP_LEVEL_AUTHORING) if (original[key] !== undefined) output[key] = clone(original[key]);
  const oldById = new Map((original.clues || []).map((clue) => [String(clue.id), clue]));
  for (const clue of output.clues || []) {
    const old = oldById.get(String(clue.id));
    if (!old) continue;
    for (const key of CLUE_AUTHORING) if (old[key] !== undefined) clue[key] = clone(old[key]);
  }
  return output;
}

async function main() {
  if (!['audit', 'pilot', 'full'].includes(MODE)) throw new Error(`FM_QA_MODE geçersiz: ${MODE}`);
  if (MODE === 'pilot' && AI_ENABLED && !CASE_IDS.size) throw new Error('GÜVENLİ PİLOT KİLİDİ: AI pilotu için FM_QA_CASE_IDS ile en az bir kesin vaka ID seçilmelidir.');
  const policy = readJson(POLICY_PATH);
  const standardSource = fs.readFileSync(STANDARD_PATH, 'utf8');
  const premiumSource = fs.readFileSync(PREMIUM_PATH, 'utf8');
  const parsedStandard = parseStandard(standardSource);
  const premiumDb = JSON.parse(premiumSource);
  const sidecar = fs.existsSync(SIDECAR_PATH) ? readJson(SIDECAR_PATH) : { schema_version: 'fm_case_qa_sidecars_v29_5', cases: {} };
  sidecar.cases ||= {};
  const entries = [
    ...parsedStandard.cases.map((raw, index) => ({ tier: 'standard', raw, source_index: index })),
    ...(premiumDb.packs || []).flatMap((pack, packIndex) => (pack.puzzles || []).map((raw, sourceIndex) => ({ tier: 'premium', raw, pack_index: packIndex, source_index: sourceIndex, pack_id: pack.packId })))
  ];
  if (entries.length !== Number(policy.source.expected_total_cases)) throw new Error(`Vaka sayısı kaydı: ${entries.length}/${policy.source.expected_total_cases}`);

  let selected = entries;
  if (CASE_IDS.size) selected = selected.filter((entry) => CASE_IDS.has(caseId(entry.raw)));
  if (CASE_LIMIT) selected = selected.slice(0, CASE_LIMIT);
  const selectedIds = new Set(selected.map((entry) => caseId(entry.raw)));
  const engine = loadEngine(SIMULATOR_PATH);
  const registryEntries = buildPortfolioRegistry(engine, entries);
  const registryIndexByCaseId = new Map(registryEntries.map((item, index) => [String(item.puzzleId), index]));
  const budget = new Budget(policy);
  const sourceSha = { standard: sha(standardSource), premium: sha(premiumSource), combined: sha(`${sha(standardSource)}:${sha(premiumSource)}`) };

  const concurrency = Math.max(1, Number(policy.budget.max_concurrent_calls || 4));
  const rows = await mapLimit(selected, concurrency, async (entry) => {
    const id = caseId(entry.raw);
    const original = clone(entry.raw);
    const merged = mergeSidecar(original, sidecar.cases[id]);
    const registryIndex = registryIndexByCaseId.get(id) ?? 0;
    const bootstrapped = bootstrapAuthoring(engine, merged.caseData, entry.tier, [registryEntries[registryIndex]]);
    const baseline = evaluate(engine, original, bootstrapped);
    const repairEligibility = classifyRepairEligibility(baseline);
    sidecar.cases[id] = {
      schema_version: 'fm_case_qa_sidecar_entry_v1',
      simulator_version: '29.4',
      prompt_version: PROMPT_VERSION,
      source_content_hash: stableHash(stripAuthoring(original)),
      overlay: authoringOverlay(bootstrapped),
      bootstrap_mode: 'deterministic_v3_2',
      validated_at: new Date().toISOString()
    };
    const row = {
      case_id: id,
      case_title: String(original.title || ''),
      case_tier: entry.tier,
      pack_id: entry.pack_id || null,
      source_index: entry.source_index,
      sidecar_status: merged.status === 'applied' ? 'applied' : 'deterministic_bootstrap_applied',
      authoring_evidence_present: hasAuthoring(bootstrapped),
      baseline: compactReport(baseline.result, baseline.leakage),
      calibration: baseline.calibration,
      repair_eligibility: repairEligibility,
      status: baseline.passed ? 'preserved_100' : repairEligibility.eligible ? 'confirmed_repair_required' : repairEligibility.queue,
      attempts: [],
      accepted_candidate: null,
      error: null
    };
    if (baseline.passed) return row;
    if (!AI_ENABLED || MODE === 'audit') return row;
    if (!repairEligibility.eligible) return row;
    row.status = 'repair_pending';

    let current = bootstrapped;
    let currentEval = baseline;
    const attempts = [
      { phase: 'luna_first_pass', model: policy.models.first_pass, effort: policy.models.first_pass_reasoning_effort },
      { phase: 'terra_escalation', model: policy.models.escalation, effort: policy.models.escalation_reasoning_effort },
      { phase: 'luna_final_cleanup', model: policy.models.first_pass, effort: policy.models.first_pass_reasoning_effort }
    ];
    for (const attempt of attempts) {
      const prompt = buildPrompt({ caseData: current, baselineResult: currentEval.result, leakage: currentEval.leakage, phase: attempt.phase });
      const key = sha(`${PROMPT_VERSION}|${sourceSha.combined}|${id}|${attempt.phase}|${attempt.model}|${stableHash(current)}`);
      try {
        const response = await callModel({ policy, budget, model: attempt.model, effort: attempt.effort, prompt, key, maxOutputTokens: Number(policy.models.max_output_tokens || 12000) });
        const candidate = applyPatchPlan(current, response.plan);
        const assessed = evaluate(engine, original, candidate);
        row.attempts.push({
          phase: attempt.phase,
          model: attempt.model,
          cache_key: key,
          cached: response.cached,
          cost_usd: response.cost,
          operation_count: response.plan.operations.length,
          assessment: response.plan.assessment,
          result: compactReport(assessed.result, assessed.leakage),
          calibration: assessed.calibration
        });
        current = candidate;
        currentEval = assessed;
        if (assessed.passed) {
          row.status = 'accepted_100';
          row.accepted_candidate = candidate;
          break;
        }
      } catch (error) {
        const message = String(error?.message || error);
        row.attempts.push({ phase: attempt.phase, model: attempt.model, cache_key: key, error: message });
        if (/BUDGET_CAP/.test(message)) {
          row.status = 'budget_stopped';
          break;
        }
        // A malformed bounded patch must never reach the simulator or the
        // repository. The policy already budgets one escalation attempt, so
        // only contract failures may proceed to that second model.
        if (/^PATCH_CONTRACT:/.test(message)) continue;
        break;
      }
    }
    if (row.status === 'repair_pending') row.status = 'quarantined_after_bounded_attempts';
    return row;
  });

  const accepted = new Map(rows.filter((row) => row.status === 'accepted_100').map((row) => [row.case_id, row.accepted_candidate]));
  const standardReplacements = new Map();
  const premiumOutput = clone(premiumDb);
  for (const entry of entries) {
    const id = caseId(entry.raw);
    if (!accepted.has(id)) continue;
    const candidate = accepted.get(id);
    const production = restoreBaselineAuthoring(candidate, entry.raw);
    sidecar.cases[id] = {
      schema_version: 'fm_case_qa_sidecar_entry_v1',
      simulator_version: '29.4',
      prompt_version: PROMPT_VERSION,
      source_content_hash: stableHash(stripAuthoring(production)),
      overlay: authoringOverlay(candidate),
      validated_at: new Date().toISOString()
    };
    if (entry.tier === 'standard') standardReplacements.set(id, production);
    else premiumOutput.packs[entry.pack_index].puzzles[entry.source_index] = production;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const patchedStandard = replaceStandardCases(standardSource, standardReplacements);
  const patchedPremium = `${JSON.stringify(premiumOutput, null, 2)}\n`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'puzzles.ts'), patchedStandard);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'puzzles_database.json'), patchedPremium);
  writeJson(path.join(OUTPUT_DIR, 'case_qa_sidecars_v29_5.json'), sidecar);

  const reportRows = rows.map(({ accepted_candidate, ...row }) => ({ ...row, candidate_hash: accepted_candidate ? stableHash(accepted_candidate) : null }));
  const report = {
    schema_version: 'fm_case_qa_batch_run_v3_2',
    run_id: env.GITHUB_RUN_ID || `local-${Date.now()}`,
    mode: MODE,
    ai_enabled: AI_ENABLED,
    apply_to_worktree: APPLY_TO_WORKTREE,
    source: { standard_path: path.relative(ROOT, STANDARD_PATH), premium_path: path.relative(ROOT, PREMIUM_PATH), sidecar_path: path.relative(ROOT, SIDECAR_PATH), sha256: sourceSha },
    selection: { requested_case_ids: [...CASE_IDS], case_limit: CASE_LIMIT, selected_count: selected.length, selected_case_ids: [...selectedIds] },
    summary: {
      total_repository_cases: entries.length,
      selected_cases: rows.length,
      preserved_100: rows.filter((row) => row.status === 'preserved_100').length,
      accepted_100: rows.filter((row) => row.status === 'accepted_100').length,
      audit_only_needs_repair: rows.filter((row) => row.status === 'audit_only_needs_repair').length,
      confirmed_repair_required: rows.filter((row) => row.status === 'confirmed_repair_required').length,
      critical_solution_leak: rows.filter((row) => row.repair_eligibility?.queue === 'critical_solution_leak').length,
      deep_review_queue: rows.filter((row) => row.status === 'deep_review').length,
      deterministic_qa_review_queue: rows.filter((row) => row.status === 'deterministic_qa_review').length,
      ai_repair_eligible_case_ids: rows.filter((row) => row.repair_eligibility?.eligible).sort((a, b) => a.repair_eligibility.priority - b.repair_eligibility.priority).map((row) => row.case_id),
      quarantined: rows.filter((row) => row.status.startsWith('quarantined')).length,
      budget_stopped: rows.filter((row) => row.status === 'budget_stopped').length,
      publishable_case_ids: [...accepted.keys()],
      api_calls: budget.calls.length,
      actual_or_conservative_cost_usd: Number(budget.spent.toFixed(6)),
      warning_budget_reached: budget.spent >= budget.warning,
      hard_budget_usd: budget.hard,
      main_branch_changed: false,
      direct_main_write_permitted: false
    },
    api_usage: budget.calls,
    cases: reportRows
  };
  writeJson(path.join(OUTPUT_DIR, 'fm_case_qa_run_report.json'), report);
  const prBody = [
    '# Faili Meçhul Case QA v3',
    '',
    `- Run: ${report.run_id}`,
    `- Kaynak SHA: \`${sourceSha.combined}\``,
    `- Seçilen vaka: ${rows.length}`,
    `- Korunan 100/100: ${report.summary.preserved_100}`,
    `- Yeni kabul edilen 100/100: ${report.summary.accepted_100}`,
    `- Karantina: ${report.summary.quarantined}`,
    `- API çağrısı: ${report.summary.api_calls}`,
    `- Hesaplanan maliyet: $${report.summary.actual_or_conservative_cost_usd}`,
    '',
    'Bu PR taslaktır. `main` otomatik birleştirilmez. Yalnız deterministik simülatör, kimlik ve ipucu-öncesi sızıntı kapılarının tamamını geçen adaylar dahildir.',
    '',
    '## Kabul edilen vakalar',
    '',
    ...(report.summary.publishable_case_ids.length ? report.summary.publishable_case_ids.map((id) => `- \`${id}\``) : ['- Yok'])
  ].join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'draft_pr_body.md'), `${prBody}\n`);

  if (APPLY_TO_WORKTREE && accepted.size) {
    fs.writeFileSync(STANDARD_PATH, patchedStandard);
    fs.writeFileSync(PREMIUM_PATH, patchedPremium);
    writeJson(SIDECAR_PATH, sidecar);
  }
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

main().catch((error) => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  writeJson(path.join(OUTPUT_DIR, 'fatal_error.json'), { schema_version: 'fm_case_qa_fatal_error_v1', message: String(error?.message || error), stack: String(error?.stack || '') });
  console.error(error);
  process.exitCode = 1;
});
