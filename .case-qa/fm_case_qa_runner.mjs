#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
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
const CASE_IDS = parseCaseIds(env.FM_QA_CASE_IDS);
const PROMPT_VERSION = 'fm-case-qa-patch-v4.0.0';
const AUTHORING_PROMPT_VERSION = 'fm-case-qa-authoring-v4.0.0';

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

function parseCaseIds(value) {
  let raw = String(value ?? '').trim();
  if (!raw || ['""', "''", '[]', 'null', 'undefined'].includes(raw.toLowerCase())) return new Set();
  try {
    const decoded = JSON.parse(raw);
    if (Array.isArray(decoded)) return new Set(decoded.map((item) => String(item).trim()).filter(Boolean));
    if (typeof decoded === 'string') raw = decoded.trim();
  } catch {
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1).trim();
    }
  }
  if (!raw) return new Set();
  return new Set(raw.split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean));
}

function selectEntriesForMode(entries, { mode, caseIds, caseLimit }) {
  if (mode === 'full') return entries;
  let selected = entries;
  if (caseIds.size) selected = selected.filter((entry) => caseIds.has(caseId(entry.raw)));
  if (caseLimit) selected = selected.slice(0, caseLimit);
  return selected;
}

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
const CLUE_AUTHORING = new Set(['logicRules', 'qaRationale', 'qaMechanicBoundary', 'qaSemanticFacts', 'isCrimeAnchor']);

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

function authoringCompleteness(caseData) {
  const missing = [];
  if (!isPlainObject(caseData?.qaPattern)) missing.push('/qaPattern');
  if (!Array.isArray(caseData?.qaPortfolioRegistry?.entries) || !caseData.qaPortfolioRegistry.entries.length) {
    missing.push('/qaPortfolioRegistry/entries');
  }
  if (!Array.isArray(caseData?.qaSemanticFacts)) missing.push('/qaSemanticFacts');
  if (!String(caseData?.qaAuthoringVersion || '').trim()) missing.push('/qaAuthoringVersion');
  const clues = Array.isArray(caseData?.clues) ? caseData.clues : [];
  let crimeAnchors = 0;
  clues.forEach((clue, index) => {
    if (clue?.isBonus === true) return;
    if (!Array.isArray(clue?.logicRules) || !clue.logicRules.length) missing.push(`/clues/${index}/logicRules`);
    const rationale = clue?.qaRationale;
    if (!isPlainObject(rationale) || !String(rationale.matrixEffect || '').trim() ||
        !String(rationale.evidenceLink || '').trim() || !String(rationale.evidenceKind || '').trim()) {
      missing.push(`/clues/${index}/qaRationale`);
    }
    if (!Array.isArray(clue?.qaSemanticFacts)) missing.push(`/clues/${index}/qaSemanticFacts`);
    if (clue?.isCrimeAnchor === true) crimeAnchors += 1;
  });
  if (crimeAnchors < 1) missing.push('/clues/*/isCrimeAnchor');
  return {
    schema_version: 'fm_case_qa_authoring_completeness_v1',
    complete: missing.length === 0,
    missing,
    non_bonus_clues: clues.filter((clue) => clue?.isBonus !== true).length,
    crime_anchor_count: crimeAnchors
  };
}

function authoringContract(caseData) {
  const errors = [];
  const categoryById = new Map();
  for (const [field, category] of [['suspects', 'suspect'], ['weapons', 'weapon'], ['locations', 'location']]) {
    for (const item of caseData?.[field] || []) categoryById.set(String(item.id), category);
  }
  const clues = Array.isArray(caseData?.clues) ? caseData.clues : [];
  const anchors = [];
  clues.forEach((clue, index) => {
    if (clue?.isBonus !== true && clue?.isCrimeAnchor === true) anchors.push({ clue, index });
    for (const [ruleIndex, rule] of (Array.isArray(clue?.logicRules) ? clue.logicRules : []).entries()) {
      const action = String(rule?.action || '').toLowerCase().replace(/[\s-]/g, '_');
      if (!['confirm', 'eliminate', 'eslesme', 'eşleşme', 'eslesme_yok', 'eşleşme_yok'].includes(action)) {
        errors.push(`/clues/${index}/logicRules/${ruleIndex}: invalid_action`);
      }
      const pair = Array.isArray(rule?.pair) ? rule.pair.map(String) : [];
      if (pair.length !== 2 || pair.some((id) => !categoryById.has(id))) {
        errors.push(`/clues/${index}/logicRules/${ruleIndex}: invalid_pair`);
      } else if (categoryById.get(pair[0]) === categoryById.get(pair[1])) {
        errors.push(`/clues/${index}/logicRules/${ruleIndex}: same_axis_pair`);
      }
    }
  });
  if (anchors.length !== 1) errors.push(`crime_anchor_count:${anchors.length}`);
  for (const { clue, index } of anchors) {
    const facts = (Array.isArray(clue.qaSemanticFacts) ? clue.qaSemanticFacts : [])
      .filter((fact) => fact?.kind === 'crime_component');
    const components = new Set(facts.map((fact) => String(fact.component || '')));
    if (facts.length !== 1 || components.size !== 1) errors.push(`/clues/${index}/qaSemanticFacts: anchor_requires_one_component`);
  }
  return {
    schema_version: 'fm_case_qa_authoring_contract_v1',
    passed: errors.length === 0,
    errors
  };
}

function authoringCandidateDisposition(original, candidate) {
  const completeness = authoringCompleteness(candidate);
  const contract = authoringContract(candidate);
  const production_content_unchanged = stableHash(stripAuthoring(candidate)) === stableHash(stripAuthoring(original));
  return {
    completeness,
    contract,
    production_content_unchanged,
    retain_safe_partial: production_content_unchanged,
    accepted: completeness.complete && contract.passed && production_content_unchanged
  };
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

function allowedAuthoringPatchPath(pointer) {
  const parts = decodePointer(pointer);
  if (parts.some((part) => ['__proto__', 'prototype', 'constructor'].includes(part))) return false;
  if (parts.length === 1 && TOP_LEVEL_AUTHORING.has(parts[0])) return true;
  return parts.length === 3 && parts[0] === 'clues' && /^\d+$/.test(parts[1] || '') && CLUE_AUTHORING.has(parts[2]);
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

function expandSafeContainerOperations(baseCase, plan) {
  const expanded = [];
  for (const operation of plan.operations || []) {
    const parts = decodePointer(operation.path);
    if (parts.length !== 2 || parts[0] !== 'clues' || !/^\d+$/.test(parts[1] || '')) {
      expanded.push(operation);
      continue;
    }
    const index = Number(parts[1]);
    const existing = baseCase.clues?.[index];
    let replacement;
    try { replacement = JSON.parse(operation.value_json); } catch { throw new Error(`value_json geçersiz: ${operation.path}`); }
    if (!isPlainObject(existing) || !isPlainObject(replacement)) throw new Error(`Yasak yama yolu: ${operation.path}`);
    if (replacement.id !== undefined && String(replacement.id) !== String(existing.id)) {
      throw new Error(`CLUE_ID_GUARD: ${operation.path} id değiştiremez.`);
    }
    for (const [field, value] of Object.entries(replacement)) {
      if (field === 'id') continue;
      const childPath = `/clues/${index}/${field}`;
      if (!allowedPatchPath(childPath)) throw new Error(`Yasak yama yolu: ${childPath}`);
      expanded.push({
        ...operation,
        op: Object.hasOwn(existing, field) ? 'replace' : 'add',
        path: childPath,
        value_json: JSON.stringify(value),
        reason: `${operation.reason} [safe container expansion]`
      });
    }
  }
  if (expanded.length > 160) throw new Error('AI yama operasyonları güvenli açılım sonrası 160 sınırını aşıyor.');
  return { ...plan, operations: expanded };
}

function canonicalizeSingleCrimeAnchor(candidate) {
  const anchors = (candidate.clues || []).filter((clue) => clue?.isBonus !== true && clue?.isCrimeAnchor === true);
  if (anchors.length !== 1) return candidate;
  const anchor = anchors[0];
  const categoryById = new Map();
  for (const [field, category] of [['suspects', 'suspect'], ['weapons', 'weapon'], ['locations', 'location']]) {
    for (const item of candidate[field] || []) categoryById.set(String(item.id), category);
  }
  const solution = candidate.solution || {};
  const solutionByComponent = {
    suspect: String(solution.suspectId || ''),
    weapon: String(solution.weaponId || ''),
    location: String(solution.locationId || '')
  };
  const valid = (Array.isArray(anchor.qaSemanticFacts) ? anchor.qaSemanticFacts : []).filter((fact) => {
    const component = String(fact?.component || '');
    const entityId = String(fact?.entityId || '');
    return fact?.kind === 'crime_component' && categoryById.get(entityId) === component && String(fact?.evidence || '').trim();
  });
  const chosen = valid.find((fact) => solutionByComponent[String(fact.component)] === String(fact.entityId)) || valid[0];
  if (!chosen) return candidate;
  anchor.qaSemanticFacts = [{
    kind: 'crime_component',
    component: String(chosen.component),
    entityId: String(chosen.entityId),
    source: `clue:${anchor.id}`,
    evidence: String(chosen.evidence).trim()
  }];
  return candidate;
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
  plan = expandSafeContainerOperations(baseCase, plan);
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
  canonicalizeSingleCrimeAnchor(output);
  validateCandidateContract(output);
  return output;
}

function applyPatchPlanSafely(baseCase, plan) {
  try {
    return applyPatchPlan(baseCase, plan);
  } catch (error) {
    const message = String(error?.message || error);
    throw new Error(message.startsWith('PATCH_CONTRACT:') ? message : `PATCH_CONTRACT: ${message}`);
  }
}

function applyAuthoringPatchPlanSafely(baseCase, plan) {
  try {
    if (String(plan.case_id) !== caseId(baseCase)) throw new Error(`AI vaka ID uyuşmazlığı: ${plan.case_id}/${caseId(baseCase)}`);
    if (!Array.isArray(plan.operations) || plan.operations.length > 80) throw new Error('AI authoring operasyon sayısı geçersiz veya 80 sınırını aşıyor.');
    const productionHash = stableHash(stripAuthoring(baseCase));
    const output = clone(baseCase);
    for (const operation of plan.operations) {
      if (!['add', 'replace'].includes(operation.op)) throw new Error(`Yasak authoring işlemi: ${operation.op}`);
      if (!allowedAuthoringPatchPath(operation.path)) throw new Error(`AUTHORING_ONLY: Oyuncuya görünür/yasak yama yolu: ${operation.path}`);
      validateNestedPatchParent(output, operation.path);
      let value;
      try { value = JSON.parse(operation.value_json); } catch { throw new Error(`value_json geçersiz: ${operation.path}`); }
      value = canonicalizeKnownPatchValue(operation.path, value);
      const effectiveOp = operation.op === 'replace' && !patchTargetExists(output, operation.path) ? 'add' : operation.op;
      setPointer(output, operation.path, value, effectiveOp);
    }
    validateCandidateContract(output);
    if (stableHash(stripAuthoring(output)) !== productionHash) {
      throw new Error('AUTHORING_ONLY: Oyuncuya görünür vaka içeriği değişti.');
    }
    return output;
  } catch (error) {
    const message = String(error?.message || error);
    throw new Error(message.startsWith('PATCH_CONTRACT:') ? message : `PATCH_CONTRACT: ${message}`);
  }
}

function isRecoverablePatchContractError(message) {
  return /^PATCH_CONTRACT:/.test(String(message || ''));
}

function extractOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) for (const content of item.content || []) if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
  const diagnostic = {
    status: response?.status || null,
    incomplete_details: response?.incomplete_details || null,
    error: response?.error || null,
    output_types: (response?.output || []).map((item) => item?.type || null)
  };
  throw new Error(`OpenAI yanıtında output_text bulunamadı: ${JSON.stringify(diagnostic)}`);
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

async function callModel({ policy, budget, model, effort, prompt, key, maxOutputTokens, systemPrompt = SYSTEM_PROMPT }) {
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
          { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
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

const AUTHORING_SYSTEM_PROMPT = `You are the QA-authoring compiler for Faili Meçhul, a Turkish detective grid game.
Return only the strict patch plan requested by the schema.
This phase must NEVER rewrite player-visible content. It only documents the deduction already present in the supplied case.
Non-negotiable rules:
- Allowed top-level fields are qaPattern, qaPortfolioRegistry, qaSemanticFacts, qaPolicy, qaNameRationales, intentionalMononymIds, qaAuthoringVersion and qaDeductionGraph.
- Allowed clue fields are logicRules, qaRationale, qaMechanicBoundary, qaSemanticFacts and isCrimeAnchor.
- Never change story, atmosphere, entity names/profiles, clue text/title/hints/mechanics, IDs, solution, assets or icons.
- Use only existing suspect, weapon, location and clue IDs.
- Every logicRules value MUST use this exact canonical shape and no aliases:
  [{"action":"confirm","pair":["s1","w1"]}]
- action MUST be exactly "confirm" or "eliminate". Never use match, exclude, eşleşme, eslesme, doğrula, ele, type, relation or effect.
- pair MUST be an array of exactly two existing entity ID strings from two different axes (suspect+weapon, suspect+location or weapon+location). Never use objects, labels, clue IDs, field names or a single ID.
- Derive every logicRules action strictly from concrete player-visible evidence in that same clue. Do not invent evidence or silently repair weak prose.
- qaRationale must contain matrixEffect, evidenceLink and evidenceKind. matrixEffect must name the same entities as the declared rule pair.
- qaSemanticFacts must be arrays and may document only definite player-visible crime-component facts. The sole crime-anchor clue must contain exactly one fact with this exact shape: [{"kind":"crime_component","component":"weapon","entityId":"w1","source":"clue:c1","evidence":"visible evidence summary"}]. component must be suspect, weapon or location and entityId must belong to that axis.
- Exactly one non-bonus clue should be isCrimeAnchor:true when the clue visibly links exactly one solution component to the crime; all other clues should be false or omit the flag.
- If the visible case does not support a safe rule or anchor, leave it unresolved and explain that in assessment. Do not fabricate a passing score.
- Use add for absent fields and replace for existing fields. value_json is a JSON-encoded string.`;

function buildAuthoringPrompt({ caseData, completeness, contract, tier }) {
  const entityIds = {
    suspects: (caseData.suspects || []).map((item) => String(item.id)),
    weapons: (caseData.weapons || []).map((item) => String(item.id)),
    locations: (caseData.locations || []).map((item) => String(item.id)),
    clues: (caseData.clues || []).map((item) => String(item.id))
  };
  return `Compile ONLY the missing QA-only authoring metadata for this case.

Allowed JSON Pointer paths:
- /qaPattern, /qaPortfolioRegistry, /qaSemanticFacts, /qaPolicy, /qaNameRationales, /intentionalMononymIds, /qaAuthoringVersion, /qaDeductionGraph
- /clues/<existing index>/(logicRules|qaRationale|qaMechanicBoundary|qaSemanticFacts|isCrimeAnchor)

CASE TIER: ${tier}
EXISTING IDS: ${JSON.stringify(entityIds)}
MISSING AUTHORING CONTRACT: ${JSON.stringify(completeness.missing)}
INVALID AUTHORING CONTRACT: ${JSON.stringify(contract?.errors || [])}

CANONICAL CONTRACT REMINDER:
- logicRules: [{"action":"confirm|eliminate","pair":["existing_id_axis_A","existing_id_axis_B"]}]
- pair has exactly two string IDs from different axes.
- Replace every invalid existing logicRules value named above; do not only fill missing paths.
- The single isCrimeAnchor:true clue has exactly one qaSemanticFacts crime_component record whose component and entityId agree.
- If MISSING or INVALID arrays are non-empty, zero operations is never a valid answer.

CASE (player-visible content is read-only):
${JSON.stringify(caseData)}

Return the smallest complete authoring-only patch. Do not touch any other path.`;
}

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

function buildPrompt({ caseData, baselineResult, leakage, phase, previousAttemptError = null }) {
  const requiredGateNames = ['coreNecessity', 'patternGovernance', 'contentAndNames', 'semanticContract', 'visibleEvidence', 'mechanicContract', 'bonusFunctionality'];
  const failedRequiredGates = requiredGateNames.filter((name) => baselineResult.gates?.[name]?.passed !== true);
  const scoreConvergence = /^terra_final_verifier_(?:5|6)$/.test(phase);
  const phaseInstruction = phase === 'luna_first_pass'
    ? 'Reconstruct missing authoring evidence and repair only verified playability failures. Internally form a complete repair checklist before emitting operations.'
    : scoreConvergence
      ? `Exact-score convergence pass: the required gate list may already be empty, but this candidate is still NOT certified until the exact HTML simulator returns score=100 and productionReady=true. Every item in fixes and every advisory that does not begin with ✓ or ⓘ is mandatory in this pass. Do not return zero operations while score is below 100 or simulator_production_ready is false. In particular: (1) a 1-star case must retain at least 2 direct confirm rules while every non-bonus clue remains individually necessary; (2) names flagged for missing a recognizable semantic type must be minimally naturalized without changing the entity ID, physical class, visual identity, icon or gameplay role; (3) mini-game explanations may state the kind of deduction gained but must not name any suspect, weapon or location; and (4) remove monotony and other remaining exact-score advisories without reintroducing leakage. Re-evaluate the entire visible evidence chain internally before emitting one coherent patch.`
    : phase.startsWith('terra_final_verifier')
      ? `Final convergence pass: produce the complete minimal patch that clears every remaining required gate (${failedRequiredGates.join(', ') || 'none'}). This is an active repair pass, not a review. Preserve every currently passed gate and do not reintroduce earlier leakage. If incremental edits cannot make the core deduction unique, replace the necessary clue fields as a coherent set. Before emitting operations, verify internally that: (1) at least four non-bonus clues are individually necessary and together force exactly one suspect|weapon|location solution without bonus clues; (2) every player-visible entity reference is represented by that same clue's logicRules; (3) every bonus clue has a useful matrix effect but is unnecessary; and (4) deductionHint never names its answer.`
      : 'Repair only the remaining deterministic failures in the current candidate. Re-read every failed gate, preserve every passed gate, and do not repeat already-passed repairs.';
  return `${phaseInstruction}

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
${JSON.stringify(compactReport(baselineResult, leakage))}

FAILED REQUIRED GATES (all must pass after this patch):
${JSON.stringify(failedRequiredGates)}

AUTHORING CONTRACT STATUS (must also be complete after repair):
${JSON.stringify({
    completeness: authoringCompleteness(caseData),
    contract: authoringContract(caseData)
  })}

Canonical logicRules shape is [{"action":"confirm","pair":["s1","w1"]}] or [{"action":"eliminate","pair":["s1","l2"]}]. action has no other accepted value; pair is exactly two existing string IDs from different axes. If a clue cannot support a safe pair, minimally rewrite that clue's player-visible text/hint together with its QA-only fields so the resulting deduction is explicit, fair and consistent with the unchanged solution.

${previousAttemptError ? `PREVIOUS PATCH WAS REJECTED BEFORE EVALUATION:\n${previousAttemptError}\nDo not repeat that invalid path or contract violation. Use only indexes and fields that exist in CASE.` : ''}`;
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

function assessmentPenalty(assessment) {
  const result = assessment?.result || {};
  const leakage = assessment?.leakage || {};
  const requiredGateNames = ['coreNecessity', 'patternGovernance', 'contentAndNames', 'semanticContract', 'visibleEvidence', 'mechanicContract', 'bonusFunctionality'];
  const failedGateCount = requiredGateNames.filter((name) => result.gates?.[name]?.passed !== true).length;
  const blockerCount = Array.isArray(result.blockers) ? result.blockers.length : 0;
  const advisoryCount = Array.isArray(result.advisories)
    ? result.advisories.filter((item) => !/^✓|^ⓘ/.test(String(item))).length
    : 0;
  const scorePenalty = Math.max(0, 100 - Number(result.score || 0));
  const leakagePenalty =
    (leakage.solution_triple_exposed ? 6000 : 0) +
    (leakage.avatar_prompt_risk ? 4000 : 0) +
    (leakage.status === 'blocked_pending_content_repair' ? 2000 : 0) +
    (leakage.status === 'manual_review_required' ? 1000 : 0) +
    (leakage.passed === true ? 0 : 500);
  return leakagePenalty + (failedGateCount * 500) + (blockerCount * 20) + (advisoryCount * 2) + scorePenalty;
}

function classifyRepairEligibility(assessment, options = {}) {
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
    if (options.allowCalibratedSimulatorRepair) {
      return { eligible: true, queue: 'calibrated_simulator_repair', priority: 3, reason: 'gold_calibration_passed_and_exact_simulator_failed' };
    }
    return { eligible: false, queue: 'deep_review', priority: 3, reason: 'semantic_overlap_requires_case_context_review' };
  }
  if (options.allowCalibratedSimulatorRepair && assessment.passed !== true) {
    return { eligible: true, queue: 'calibrated_simulator_repair', priority: 4, reason: 'gold_calibration_passed_and_exact_simulator_failed' };
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

  const selected = selectEntriesForMode(entries, { mode: MODE, caseIds: CASE_IDS, caseLimit: CASE_LIMIT });
  const selectedIds = new Set(selected.map((entry) => caseId(entry.raw)));
  const engine = loadEngine(SIMULATOR_PATH);
  const registryEntries = buildPortfolioRegistry(engine, entries);
  const budget = new Budget(policy);
  const sourceSha = { standard: sha(standardSource), premium: sha(premiumSource), combined: sha(`${sha(standardSource)}:${sha(premiumSource)}`) };

  const concurrency = Math.max(1, Number(policy.budget.max_concurrent_calls || 4));
  const stateById = new Map(entries.map((entry) => {
    const id = caseId(entry.raw);
    const merged = mergeSidecar(entry.raw, sidecar.cases[id]);
    const candidate = bootstrapAuthoring(engine, merged.caseData, entry.tier, registryEntries);
    return [id, {
      entry,
      original: clone(entry.raw),
      candidate,
      merged_status: merged.status,
      authoring_attempt: null,
      authoring_attempts: [],
      authoring_ai_accepted: false,
      authoring_candidate: null,
      calibration_repair_attempts: [],
      calibration_repair_accepted: false
    }];
  }));

  async function compileAuthoring(state, options = {}) {
    const before = authoringCompleteness(state.candidate);
    const beforeContract = authoringContract(state.candidate);
    if (before.complete && beforeContract.passed) return state;
    if (!AI_ENABLED || MODE === 'audit') return state;
    const phase = options.phase || 'authoring_only';
    const model = options.model || policy.authoring?.model || policy.models.first_pass;
    const effort = options.effort || policy.authoring?.reasoning_effort || policy.models.first_pass_reasoning_effort;
    const prompt = buildAuthoringPrompt({
      caseData: state.candidate,
      completeness: before,
      contract: beforeContract,
      tier: state.entry.tier
    });
    const key = sha(`${AUTHORING_PROMPT_VERSION}|${sourceSha.combined}|${caseId(state.original)}|${phase}|${model}|${stableHash(state.candidate)}`);
    try {
      const response = await callModel({
        policy,
        budget,
        model,
        effort,
        prompt,
        key,
        maxOutputTokens: Number(policy.authoring?.max_output_tokens || 9000),
        systemPrompt: AUTHORING_SYSTEM_PROMPT
      });
      const candidate = applyAuthoringPatchPlanSafely(state.candidate, response.plan);
      const disposition = authoringCandidateDisposition(state.original, candidate);
      const attempt = {
        phase, model, cache_key: key, cached: response.cached,
        cost_usd: response.cost, operation_count: response.plan.operations.length,
        assessment: response.plan.assessment,
        completeness: disposition.completeness,
        contract: disposition.contract,
        production_content_unchanged: disposition.production_content_unchanged
      };
      state.authoring_attempt = attempt;
      state.authoring_attempts.push(attempt);
      if (disposition.retain_safe_partial) {
        // Keep every safe partial result. A targeted recovery pass can then fill
        // only the still-missing contract instead of paying to regenerate it.
        state.candidate = candidate;
      }
      if (disposition.accepted) {
        state.authoring_ai_accepted = true;
        state.authoring_candidate = clone(candidate);
      }
    } catch (error) {
      const attempt = { phase, model, cache_key: key, error: String(error?.message || error) };
      state.authoring_attempt = attempt;
      state.authoring_attempts.push(attempt);
    }
    return state;
  }

  async function runBoundedRepair(state, { scope, current: initialCandidate, assessment: initialAssessment }) {
    const id = caseId(state.original);
    let current = initialCandidate;
    let currentEval = initialAssessment;
    let previousAttemptError = null;
    let terminalStatus = 'quarantined_after_bounded_attempts';
    const recordedAttempts = [];
    const readiness = (candidate, assessed) => {
      const completeness = authoringCompleteness(candidate);
      const contract = authoringContract(candidate);
      return {
        completeness,
        contract,
        passed: completeness.complete && contract.passed && assessed.passed === true,
        penalty: assessmentPenalty(assessed) + (completeness.missing.length * 1200) + (contract.errors.length * 1200)
      };
    };
    // Keep the original six attempts/cache keys intact, then add two narrowly
    // targeted exact-score passes. This reuses prior idempotent responses while
    // allowing a 90/100, all-required-gates-passed candidate to converge.
    const goldAttemptLimit = Math.max(8, Number(policy.repair?.gold_max_attempts_per_case || 6));
    const baseAttempts = [
      { phase: 'luna_first_pass', model: policy.models.first_pass, effort: policy.models.first_pass_reasoning_effort },
      { phase: 'terra_escalation', model: policy.models.escalation, effort: policy.models.escalation_reasoning_effort },
      {
        phase: 'terra_final_verifier',
        model: policy.models.final_cleanup || policy.models.escalation,
        effort: scope === 'gold_calibration'
          ? (policy.repair?.gold_final_reasoning_effort || policy.models.final_cleanup_reasoning_effort || policy.models.escalation_reasoning_effort)
          : (policy.models.final_cleanup_reasoning_effort || policy.models.escalation_reasoning_effort),
        maxOutputTokens: Number(policy.models.final_cleanup_max_output_tokens || policy.models.max_output_tokens || 12000)
      }
    ];
    const attempts = scope === 'gold_calibration'
      ? [
          ...baseAttempts,
          ...Array.from({ length: Math.max(0, goldAttemptLimit - baseAttempts.length) }, (_, index) => ({
            phase: `terra_final_verifier_${index + 2}`,
            model: policy.models.final_cleanup || policy.models.escalation,
            effort: policy.repair?.gold_final_reasoning_effort || 'high',
            maxOutputTokens: Number(policy.models.final_cleanup_max_output_tokens || policy.models.max_output_tokens || 12000)
          }))
        ]
      : baseAttempts;
    for (const attempt of attempts) {
      const prompt = buildPrompt({ caseData: current, baselineResult: currentEval.result, leakage: currentEval.leakage, phase: attempt.phase, previousAttemptError });
      const key = sha(`${PROMPT_VERSION}|${sourceSha.combined}|${id}|${scope}|${attempt.phase}|${attempt.model}|${stableHash(current)}`);
      try {
        const response = await callModel({
          policy,
          budget,
          model: attempt.model,
          effort: attempt.effort,
          prompt,
          key,
          maxOutputTokens: Number(attempt.maxOutputTokens || policy.models.max_output_tokens || 12000)
        });
        const candidate = applyPatchPlanSafely(current, response.plan);
        const assessed = evaluate(engine, state.original, candidate);
        const previousReadiness = readiness(current, currentEval);
        const candidateReadiness = readiness(candidate, assessed);
        const previousPenalty = previousReadiness.penalty;
        const candidatePenalty = candidateReadiness.penalty;
        const retained = candidateReadiness.passed || candidatePenalty < previousPenalty;
        recordedAttempts.push({
          phase: `${scope}:${attempt.phase}`, model: attempt.model, cache_key: key, cached: response.cached,
          cost_usd: response.cost, operation_count: response.plan.operations.length,
          assessment: response.plan.assessment, result: compactReport(assessed.result, assessed.leakage),
          authoring_completeness: candidateReadiness.completeness,
          authoring_contract: candidateReadiness.contract,
          calibration: assessed.calibration, previous_penalty: previousPenalty, candidate_penalty: candidatePenalty,
          retained_as_best: retained, monotonic_guard: retained ? 'improved_or_accepted' : 'rejected_regression'
        });
        if (candidateReadiness.passed) {
          current = candidate;
          currentEval = assessed;
          terminalStatus = 'accepted_100';
          break;
        }
        if (retained) { current = candidate; currentEval = assessed; }
      } catch (error) {
        const message = String(error?.message || error);
        recordedAttempts.push({ phase: `${scope}:${attempt.phase}`, model: attempt.model, cache_key: key, error: message });
        if (/BUDGET_CAP/.test(message)) { terminalStatus = 'budget_stopped'; break; }
        if (isRecoverablePatchContractError(message)) { previousAttemptError = message; continue; }
        break;
      }
    }
    const finalReadiness = readiness(current, currentEval);
    return {
      candidate: current,
      assessment: currentEval,
      attempts: recordedAttempts,
      status: terminalStatus,
      passed: finalReadiness.passed,
      completeness: finalReadiness.completeness,
      contract: finalReadiness.contract
    };
  }

  const selectedStates = selected.map((entry) => stateById.get(caseId(entry.raw)));
  const goldIds = new Set(policy.authoring?.calibration_case_ids || []);
  let campaignCalibrated = false;
  if (AI_ENABLED && MODE === 'full' && goldIds.size) {
    const goldStates = selectedStates.filter((state) => goldIds.has(caseId(state.original)));
    if (goldStates.length !== goldIds.size) throw new Error('CALIBRATION_GATE: Altın-vaka kümesinin tamamı full seçimde bulunamadı.');
    for (const state of goldStates) {
      await compileAuthoring(state, { phase: 'gold_authoring_luna' });
      const completeness = authoringCompleteness(state.candidate);
      const contract = authoringContract(state.candidate);
      if (!completeness.complete || !contract.passed) {
        await compileAuthoring(state, {
          phase: 'gold_authoring_recovery',
          model: policy.authoring?.gold_recovery_model || policy.models.escalation,
          effort: policy.authoring?.gold_recovery_reasoning_effort || policy.models.escalation_reasoning_effort
        });
      }
    }
    const calibrationRegistry = buildPortfolioRegistry(engine, entries.map((entry) => ({
      raw: stateById.get(caseId(entry.raw)).candidate
    })));
    const failures = [];
    for (const state of goldStates) {
      state.candidate.qaPortfolioRegistry = { schema_version: 'fm_qa_portfolio_registry_v1', entries: clone(calibrationRegistry) };
      const completeness = authoringCompleteness(state.candidate);
      const contract = authoringContract(state.candidate);
      const assessed = evaluate(engine, state.original, state.candidate);
      if (completeness.complete && contract.passed && assessed.passed) continue;
      const repaired = await runBoundedRepair(state, {
        scope: 'gold_calibration', current: state.candidate, assessment: assessed
      });
      state.calibration_repair_attempts = repaired.attempts;
      if (repaired.passed) {
        state.candidate = repaired.candidate;
        state.calibration_repair_accepted = true;
      } else {
        failures.push({
          case_id: caseId(state.original),
          stage: (!completeness.complete || !contract.passed) ? 'authoring_contract_and_bounded_gold_repair' : 'bounded_gold_repair',
          completeness: repaired.completeness,
          contract: repaired.contract,
          authoring_attempts: state.authoring_attempts,
          repair_attempts: repaired.attempts,
          result: compactReport(repaired.assessment.result, repaired.assessment.leakage)
        });
      }
    }
    if (!failures.length) {
      const finalCalibrationRegistry = buildPortfolioRegistry(engine, entries.map((entry) => ({
        raw: stateById.get(caseId(entry.raw)).candidate
      })));
      for (const state of goldStates) {
        state.candidate.qaPortfolioRegistry = { schema_version: 'fm_qa_portfolio_registry_v1', entries: clone(finalCalibrationRegistry) };
        const finalAssessment = evaluate(engine, state.original, state.candidate);
        const finalCompleteness = authoringCompleteness(state.candidate);
        const finalContract = authoringContract(state.candidate);
        if (!finalCompleteness.complete || !finalContract.passed || !finalAssessment.passed) {
          failures.push({
            case_id: caseId(state.original), stage: 'final_gold_registry',
            completeness: finalCompleteness,
            contract: finalContract,
            authoring_attempts: state.authoring_attempts,
            repair_attempts: state.calibration_repair_attempts,
            result: compactReport(finalAssessment.result, finalAssessment.leakage)
          });
        }
      }
    }
    if (failures.length) throw new Error(`CALIBRATION_GATE: Altın-vaka authoring + bounded repair sertifikasyonu tamamlanamadı; kalan vakalara geçilmedi. ${JSON.stringify(failures)}`);
    campaignCalibrated = true;
  }

  await mapLimit(selectedStates.filter((state) => !state.authoring_ai_accepted), concurrency, compileAuthoring);

  const globalRegistry = buildPortfolioRegistry(engine, entries.map((entry) => ({ raw: stateById.get(caseId(entry.raw)).candidate })));
  for (const state of selectedStates) {
    state.candidate.qaPortfolioRegistry = { schema_version: 'fm_qa_portfolio_registry_v1', entries: clone(globalRegistry) };
  }

  const rows = await mapLimit(selectedStates, concurrency, async (state) => {
    const entry = state.entry;
    const id = caseId(state.original);
    const original = state.original;
    const bootstrapped = state.candidate;
    const completeness = authoringCompleteness(bootstrapped);
    const contract = authoringContract(bootstrapped);
    const baseline = evaluate(engine, original, bootstrapped);
    const authoringReady = completeness.complete && contract.passed;
    const bulkRepairUnlocked = campaignCalibrated && policy.repair?.repair_all_exact_failures_after_gold_calibration === true;
    const authoringRecoveryUnlocked = bulkRepairUnlocked && policy.repair?.repair_incomplete_authoring_after_gold_calibration === true;
    const repairEligibility = authoringReady
      ? classifyRepairEligibility(baseline, { allowCalibratedSimulatorRepair: bulkRepairUnlocked })
      : authoringRecoveryUnlocked
        ? { eligible: true, queue: 'authoring_and_content_repair', priority: 0, reason: 'gold_calibrated_recovery_for_incomplete_authoring_contract' }
        : { eligible: false, queue: 'authoring_required', priority: 0, reason: 'qa_only_authoring_contract_incomplete' };
    const row = {
      case_id: id,
      case_title: String(original.title || ''),
      case_tier: entry.tier,
      pack_id: entry.pack_id || null,
      source_index: entry.source_index,
      sidecar_status: state.merged_status,
      authoring_evidence_present: hasAuthoring(bootstrapped),
      authoring_completeness: completeness,
      authoring_contract: contract,
      authoring_attempt: state.authoring_attempt,
      authoring_attempts: state.authoring_attempts,
      baseline: compactReport(baseline.result, baseline.leakage),
      calibration: baseline.calibration,
      repair_eligibility: repairEligibility,
      status: state.calibration_repair_accepted ? 'accepted_100' : !authoringReady ? repairEligibility.queue : baseline.passed ? 'preserved_100' : repairEligibility.eligible ? 'confirmed_repair_required' : repairEligibility.queue,
      attempts: clone(state.calibration_repair_attempts),
      accepted_authoring_candidate: authoringReady && (state.authoring_ai_accepted || state.merged_status === 'applied') ? (state.authoring_candidate || bootstrapped) : null,
      accepted_candidate: state.calibration_repair_accepted ? bootstrapped : null,
      error: null
    };
    if (authoringReady && baseline.passed) return row;
    if (!AI_ENABLED || MODE === 'audit') return row;
    if (!repairEligibility.eligible) return row;
    row.status = 'repair_pending';
    const repaired = await runBoundedRepair(state, { scope: 'bulk', current: bootstrapped, assessment: baseline });
    row.attempts.push(...repaired.attempts);
    row.status = repaired.status;
    if (repaired.passed) {
      row.accepted_candidate = repaired.candidate;
      row.authoring_completeness = repaired.completeness;
      row.authoring_contract = repaired.contract;
    }
    return row;
  });

  const rowById = new Map(rows.map((row) => [row.case_id, row]));
  const finalCandidateById = new Map(entries.map((entry) => {
    const id = caseId(entry.raw);
    return [id, rowById.get(id)?.accepted_candidate || stateById.get(id).candidate];
  }));
  const finalRegistry = buildPortfolioRegistry(engine, entries.map((entry) => ({ raw: finalCandidateById.get(caseId(entry.raw)) })));
  for (const row of rows) {
    const candidate = finalCandidateById.get(row.case_id);
    candidate.qaPortfolioRegistry = { schema_version: 'fm_qa_portfolio_registry_v1', entries: clone(finalRegistry) };
    if (row.accepted_candidate) row.accepted_candidate.qaPortfolioRegistry = clone(candidate.qaPortfolioRegistry);
    if (row.accepted_authoring_candidate) row.accepted_authoring_candidate.qaPortfolioRegistry = clone(candidate.qaPortfolioRegistry);
    const assessed = evaluate(engine, stateById.get(row.case_id).original, candidate);
    row.final_campaign = {
      passed: assessed.passed,
      result: compactReport(assessed.result, assessed.leakage),
      calibration: assessed.calibration
    };
    if (row.status === 'accepted_100' && !assessed.passed) {
      row.status = 'quarantined_final_campaign_regression';
      row.accepted_candidate = null;
    }
    if (row.status === 'preserved_100' && !assessed.passed) row.status = 'final_campaign_regression';
  }

  const accepted = new Map(rows.filter((row) => row.status === 'accepted_100').map((row) => [row.case_id, row.accepted_candidate]));
  const acceptedAuthoring = new Map(rows
    .filter((row) => row.accepted_authoring_candidate)
    .map((row) => [row.case_id, row.accepted_authoring_candidate]));
  const standardReplacements = new Map();
  const premiumOutput = clone(premiumDb);
  for (const [id, candidate] of acceptedAuthoring) {
    const original = stateById.get(id).original;
    sidecar.cases[id] = {
      schema_version: 'fm_case_qa_sidecar_entry_v2',
      simulator_version: '29.4',
      prompt_version: AUTHORING_PROMPT_VERSION,
      source_content_hash: stableHash(stripAuthoring(original)),
      overlay: authoringOverlay(candidate),
      authoring_contract: authoringContract(candidate),
      production_content_unchanged: stableHash(stripAuthoring(candidate)) === stableHash(stripAuthoring(original)),
      validated_at: new Date().toISOString()
    };
  }
  for (const entry of entries) {
    const id = caseId(entry.raw);
    if (!accepted.has(id)) continue;
    const candidate = accepted.get(id);
    const production = restoreBaselineAuthoring(candidate, entry.raw);
    sidecar.cases[id] = {
      schema_version: 'fm_case_qa_sidecar_entry_v2',
      simulator_version: '29.4',
      prompt_version: PROMPT_VERSION,
      source_content_hash: stableHash(stripAuthoring(production)),
      overlay: authoringOverlay(candidate),
      authoring_contract: authoringContract(candidate),
      production_content_unchanged: stableHash(stripAuthoring(candidate)) === stableHash(stripAuthoring(production)),
      validated_at: new Date().toISOString()
    };
    if (entry.tier === 'standard') standardReplacements.set(id, production);
    else premiumOutput.packs[entry.pack_index].puzzles[entry.source_index] = production;
  }
  sidecar.schema_version = 'fm_case_qa_sidecars_v29_5';
  sidecar.count = Object.keys(sidecar.cases).length;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const patchedStandard = replaceStandardCases(standardSource, standardReplacements);
  const patchedPremium = `${JSON.stringify(premiumOutput, null, 2)}\n`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'puzzles.ts'), patchedStandard);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'puzzles_database.json'), patchedPremium);
  writeJson(path.join(OUTPUT_DIR, 'case_qa_sidecars_v29_5.json'), sidecar);

  const reportRows = rows.map(({ accepted_candidate, accepted_authoring_candidate, ...row }) => ({
    ...row,
    candidate_hash: accepted_candidate ? stableHash(accepted_candidate) : null,
    authoring_candidate_hash: accepted_authoring_candidate ? stableHash(authoringOverlay(accepted_authoring_candidate)) : null
  }));
  const report = {
    schema_version: 'fm_case_qa_batch_run_v4_0',
    run_id: env.GITHUB_RUN_ID || `local-${Date.now()}`,
    mode: MODE,
    ai_enabled: AI_ENABLED,
    campaign_calibrated: campaignCalibrated,
    apply_to_worktree: APPLY_TO_WORKTREE,
    source: { standard_path: path.relative(ROOT, STANDARD_PATH), premium_path: path.relative(ROOT, PREMIUM_PATH), sidecar_path: path.relative(ROOT, SIDECAR_PATH), sha256: sourceSha },
    selection: {
      requested_case_ids: [...CASE_IDS],
      case_limit: CASE_LIMIT,
      full_mode_filters_ignored: MODE === 'full' && (CASE_IDS.size > 0 || CASE_LIMIT > 0),
      selected_count: selected.length,
      selected_case_ids: [...selectedIds]
    },
    summary: {
      total_repository_cases: entries.length,
      selected_cases: rows.length,
      scoring_trust: campaignCalibrated ? 'gold_calibrated_for_bulk_repair' : 'authoring_inventory_only',
      final_campaign_passed: rows.filter((row) => row.final_campaign?.passed).length,
      campaign_complete_105: rows.length === entries.length && rows.every((row) => row.final_campaign?.passed),
      authoring_required: rows.filter((row) => row.status === 'authoring_required').length,
      authoring_compiled: rows.filter((row) => row.authoring_attempt && row.accepted_authoring_candidate).length,
      authoring_contract_rejected: rows.filter((row) => row.authoring_attempt && !row.accepted_authoring_candidate).length,
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
      publishable_authoring_case_ids: [...acceptedAuthoring.keys()],
      publishable_case_ids: [...accepted.keys()],
      publishable_change_count: new Set([...acceptedAuthoring.keys(), ...accepted.keys()]).size,
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
    '# Faili Meçhul Case QA production campaign',
    '',
    `- Run: ${report.run_id}`,
    `- Kaynak SHA: \`${sourceSha.combined}\``,
    `- Seçilen vaka: ${rows.length}`,
    `- QA metadata sözleşmesi tamamlanan: ${report.summary.publishable_authoring_case_ids.length}`,
    `- Korunan 100/100: ${report.summary.preserved_100}`,
    `- Yeni kabul edilen 100/100: ${report.summary.accepted_100}`,
    `- Karantina: ${report.summary.quarantined}`,
    `- API çağrısı: ${report.summary.api_calls}`,
    `- Hesaplanan maliyet: $${report.summary.actual_or_conservative_cost_usd}`,
    '',
    'Bu değişiklik yalnız 105/105 tam HTML simülatörü, kimlik, ipucu-öncesi sızıntı, uygulama regresyonu ve web build kapılarının tamamı geçerse otomatik birleştirilir. Doğrudan `main` yazımı yapılmaz.',
    '',
    '## Kabul edilen vakalar',
    '',
    ...(report.summary.publishable_case_ids.length ? report.summary.publishable_case_ids.map((id) => `- \`${id}\``) : ['- Yok']),
    '',
    '## QA-only metadata katmanı',
    '',
    ...(report.summary.publishable_authoring_case_ids.length ? report.summary.publishable_authoring_case_ids.map((id) => `- \`${id}\``) : ['- Yok'])
  ].join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'draft_pr_body.md'), `${prBody}\n`);

  if (APPLY_TO_WORKTREE && (accepted.size || acceptedAuthoring.size)) {
    fs.writeFileSync(STANDARD_PATH, patchedStandard);
    fs.writeFileSync(PREMIUM_PATH, patchedPremium);
    writeJson(SIDECAR_PATH, sidecar);
  }
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

export {
  applyAuthoringPatchPlanSafely,
  applyPatchPlanSafely,
  authoringCandidateDisposition,
  authoringCompleteness,
  authoringContract,
  authoringOverlay,
  buildAuthoringPrompt,
  buildPrompt,
  canonicalizeSingleCrimeAnchor,
  expandSafeContainerOperations,
  isRecoverablePatchContractError,
  parseCaseIds,
  selectEntriesForMode,
  stripAuthoring
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    writeJson(path.join(OUTPUT_DIR, 'fatal_error.json'), { schema_version: 'fm_case_qa_fatal_error_v1', message: String(error?.message || error), stack: String(error?.stack || '') });
    console.error(error);
    process.exitCode = 1;
  });
}
