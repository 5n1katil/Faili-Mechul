#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadEngine, evaluateCase } = require('./fm_case_qa_core.cjs');

const ROOT = path.resolve(process.env.FM_QA_ROOT || process.cwd());
const OUTPUT_DIR = path.resolve(ROOT, process.env.FM_QA_OUTPUT_DIR || '.case-qa-output');
const POLICY_PATH = path.resolve(ROOT, process.env.FM_QA_POLICY_PATH || '.case-qa/fm_case_qa_policy_v3_1.json');
const PHASE = String(process.env.FM_QA_CERT_PHASE || 'pre').toLowerCase();

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function gitBlobSha(value) {
  const body = Buffer.from(value, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest('hex');
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function stableHash(value) { return sha256(JSON.stringify(stable(value))); }
function caseId(value) { return String(value?.puzzleId || value?.id || ''); }

function locateStandardArray(source) {
  const marker = source.indexOf('export const PUZZLES');
  const eq = source.indexOf('=', marker);
  const start = source.indexOf('[', eq);
  if (marker < 0 || eq < 0 || start < 0) throw new Error('puzzles.ts içinde PUZZLES dizisi bulunamadı.');
  let depth = 0, quote = '', escaped = false, line = false, block = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index], next = source[index + 1];
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
    if (char === ']' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error('puzzles.ts PUZZLES dizisinin sonu bulunamadı.');
}

function parseSources(policy) {
  const standardPath = path.resolve(ROOT, policy.source.standard_path);
  const premiumPath = path.resolve(ROOT, policy.source.premium_path);
  const standardSource = fs.readFileSync(standardPath, 'utf8');
  const standard = Function(`"use strict"; return (${locateStandardArray(standardSource)});`)();
  const premiumDb = readJson(premiumPath);
  const premium = (premiumDb.packs || []).flatMap((pack) => pack.puzzles || []);
  if (!Array.isArray(standard)) throw new Error('Standart vaka kaynağı dizi değil.');
  return {
    standard,
    premium,
    entries: [
      ...standard.map((raw) => ({ tier: 'standard', raw })),
      ...premium.map((raw) => ({ tier: 'premium', raw }))
    ],
    sourceHashes: {
      standard_sha256: sha256(standardSource),
      premium_sha256: sha256(fs.readFileSync(premiumPath, 'utf8'))
    }
  };
}

function idsOf(list, prefix) {
  return (Array.isArray(list) ? list : []).map((item, index) => String(item?.id || `${prefix}${index + 1}`));
}
function solutionIdentity(caseData) {
  const source = caseData.solution || caseData.correctSolution || caseData.answer || {};
  return stable(source);
}
function assetIdentity(caseData) {
  const rows = [];
  const capture = (scope, item) => {
    if (!item || typeof item !== 'object') return;
    for (const key of ['icon', 'avatar', 'avatarPath', 'image', 'imagePath', 'asset', 'assetPath', 'file', 'filePath']) {
      if (item[key] !== undefined) rows.push([scope, key, item[key]]);
    }
  };
  capture('case', caseData);
  for (const [group, prefix] of [['suspects','s'], ['weapons','w'], ['locations','l'], ['clues','c']]) {
    (caseData[group] || []).forEach((item, index) => capture(`${prefix}:${String(item?.id || index)}`, item));
  }
  if (caseData.assetManifest !== undefined) rows.push(['case', 'assetManifest', caseData.assetManifest]);
  return stable(rows);
}
function identityManifest(entries) {
  return entries.map(({ tier, raw }) => ({
    tier,
    case_id: caseId(raw),
    suspects: idsOf(raw.suspects, 's'),
    weapons: idsOf(raw.weapons, 'w'),
    locations: idsOf(raw.locations, 'l'),
    clues: idsOf(raw.clues, 'c'),
    solution: solutionIdentity(raw),
    assets: assetIdentity(raw)
  }));
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function certify() {
  const policy = readJson(POLICY_PATH);
  const simulatorPath = path.resolve(ROOT, policy.simulator.path);
  const simulatorHtml = fs.readFileSync(simulatorPath, 'utf8');
  const parsed = parseSources(policy);
  const failures = [];
  const warnings = [];
  const ids = parsed.entries.map((entry) => caseId(entry.raw));

  assert(parsed.standard.length === Number(policy.source.expected_standard_cases),
    `Standart vaka sayısı ${parsed.standard.length}/${policy.source.expected_standard_cases}`, failures);
  assert(parsed.premium.length === Number(policy.source.expected_premium_cases),
    `Premium vaka sayısı ${parsed.premium.length}/${policy.source.expected_premium_cases}`, failures);
  assert(parsed.entries.length === Number(policy.source.expected_total_cases),
    `Toplam vaka sayısı ${parsed.entries.length}/${policy.source.expected_total_cases}`, failures);
  assert(ids.every(Boolean), 'Boş vaka kimliği bulundu.', failures);
  assert(new Set(ids).size === ids.length, 'Yinelenen vaka kimliği bulundu.', failures);
  assert((simulatorHtml.match(/<script(?:\s[^>]*)?>/gi) || []).length === 1,
    'Simülatör HTML tam olarak bir çalıştırılabilir script bloğu içermeli.', failures);
  assert(simulatorHtml.includes('Vaka Simülatörü v29.4'), 'HTML içinde v29.4 kimliği bulunamadı.', failures);

  const actualBlobSha = gitBlobSha(simulatorHtml);
  assert(actualBlobSha === policy.simulator.git_blob_sha,
    `Simülatör blob kilidi uyuşmuyor: ${actualBlobSha}/${policy.simulator.git_blob_sha}`, failures);

  const engine = loadEngine(simulatorPath);
  for (const method of ['normalize', 'computeQA', 'fmCaseTier', 'fmRequiresAdvancedMechanic', 'strictCoreNecessityCheck']) {
    assert(typeof engine?.[method] === 'function', `HTML motor API eksik: ${method}`, failures);
  }

  const evaluationRows = [];
  for (const entry of parsed.entries) {
    const id = caseId(entry.raw);
    try {
      const directOne = engine.computeQA(engine.normalize(structuredClone(entry.raw)));
      const wrapperOne = evaluateCase(engine, structuredClone(entry.raw), { baseline: structuredClone(entry.raw) });
      const directTwo = engine.computeQA(engine.normalize(structuredClone(entry.raw)));
      const wrapperTwo = evaluateCase(engine, structuredClone(entry.raw), { baseline: structuredClone(entry.raw) });
      const signatureOne = stableHash({
        total: directOne.total,
        ready: directOne.productionReady,
        flags: directOne.topFlags,
        fixes: directOne.fixes,
        wrapper: {
          score: wrapperOne.score,
          simulatorProductionReady: wrapperOne.simulatorProductionReady,
          productionReady: wrapperOne.productionReady,
          blockers: wrapperOne.blockers,
          gates: wrapperOne.gates
        }
      });
      const signatureTwo = stableHash({
        total: directTwo.total,
        ready: directTwo.productionReady,
        flags: directTwo.topFlags,
        fixes: directTwo.fixes,
        wrapper: {
          score: wrapperTwo.score,
          simulatorProductionReady: wrapperTwo.simulatorProductionReady,
          productionReady: wrapperTwo.productionReady,
          blockers: wrapperTwo.blockers,
          gates: wrapperTwo.gates
        }
      });
      assert(Number(wrapperOne.score) === Number(directOne.total),
        `${id}: HTML doğrudan skoruyla sarmalayıcı skoru uyuşmuyor.`, failures);
      assert(wrapperOne.simulatorProductionReady === (directOne.productionReady === true),
        `${id}: productionReady eşliği bozuk.`, failures);
      assert(wrapperOne.productionReady === wrapperOne.simulatorProductionReady,
        `${id}: değişmemiş vaka kendi kimlik korumasından geçmedi.`, failures);
      assert(signatureOne === signatureTwo, `${id}: simülatör deterministik değil.`, failures);
      evaluationRows.push({
        case_id: id,
        tier: entry.tier,
        score: wrapperOne.score,
        production_ready: wrapperOne.productionReady,
        deterministic_signature: signatureOne
      });
    } catch (error) {
      failures.push(`${id || 'unknown'}: HTML motor değerlendirmesi çöktü: ${error.message}`);
    }
  }

  assert(evaluationRows.length === parsed.entries.length,
    `HTML motorunda değerlendirilen vaka ${evaluationRows.length}/${parsed.entries.length}`, failures);

  const manifest = identityManifest(parsed.entries);
  const preManifestPath = path.join(OUTPUT_DIR, 'fm_case_qa_certification_identity_pre.json');
  if (PHASE === 'pre') {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(preManifestPath, JSON.stringify(manifest, null, 2) + '\n');
  } else {
    if (!fs.existsSync(preManifestPath)) {
      failures.push('Onarım sonrası kimlik karşılaştırması için pre manifest bulunamadı.');
    } else {
      const before = readJson(preManifestPath);
      assert(stableHash(before) === stableHash(manifest),
        'Vaka/entity/clue/solution/asset kimliği onarım sırasında değişti.', failures);
    }
  }

  const report = {
    schema_version: 'fm_case_qa_certification_v3_4',
    phase: PHASE,
    certified: failures.length === 0,
    simulator: {
      version: policy.simulator.version,
      path: policy.simulator.path,
      git_blob_sha: actualBlobSha,
      sha256: sha256(simulatorHtml),
      html_script_blocks: (simulatorHtml.match(/<script(?:\s[^>]*)?>/gi) || []).length,
      execution_contract: 'exact_html_script_loaded_in_node_vm'
    },
    sources: {
      ...parsed.sourceHashes,
      standard_cases: parsed.standard.length,
      premium_cases: parsed.premium.length,
      total_cases: parsed.entries.length,
      unique_case_ids: new Set(ids).size
    },
    evaluation: {
      evaluated_cases: evaluationRows.length,
      deterministic_repetitions_per_case: 2,
      direct_html_wrapper_parity_failures: failures.filter((item) => item.includes('eşliği') || item.includes('skoruyla')).length
    },
    identity_manifest_sha256: stableHash(manifest),
    failures,
    warnings
  };
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, `fm_case_qa_certification_${PHASE}.json`), JSON.stringify(report, null, 2) + '\n');
  if (failures.length) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

certify();
