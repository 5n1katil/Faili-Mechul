#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import {
  applyAuthoringPatchPlanSafely,
  authoringCandidateDisposition,
  authoringCompleteness,
  authoringContract,
  parseCaseIds,
  selectEntriesForMode,
  stripAuthoring
} from './fm_case_qa_runner.mjs';

const require = createRequire(import.meta.url);
const { loadEngine, evaluateCase } = require('./fm_case_qa_core.cjs');

function locateStandardArray(source) {
  const marker = source.indexOf('export const PUZZLES');
  const start = source.indexOf('[', source.indexOf('=', marker));
  let depth = 0, quote = '', escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '[') depth += 1;
    if (char === ']' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error('PUZZLES dizisi bulunamadı.');
}

const standardSource = fs.readFileSync('artifacts/dedektif/data/puzzles.ts', 'utf8');
const standard = Function(`"use strict"; return (${locateStandardArray(standardSource)});`)();
const premiumDb = JSON.parse(fs.readFileSync('artifacts/dedektif/data/puzzles_database.json', 'utf8'));
const allCases = [...standard, ...(premiumDb.packs || []).flatMap((pack) => pack.puzzles || [])];

assert.equal(parseCaseIds('').size, 0);
assert.equal(parseCaseIds('""').size, 0, 'n8n iki-tırnak boş değeri sahte vaka kimliğine dönüştü.');
assert.deepEqual([...parseCaseIds('["rc_001","pp_001"]')], ['rc_001', 'pp_001']);
assert.deepEqual([...parseCaseIds('rc_001, pp_001')], ['rc_001', 'pp_001']);
const sourceEntries = allCases.map((raw) => ({ raw }));
assert.equal(
  selectEntriesForMode(sourceEntries, { mode: 'full', caseIds: new Set(['nonexistent']), caseLimit: 1 }).length,
  105,
  'Full mod vaka filtreleri yüzünden 105-vaka kampanyasını daralttı.'
);
assert.equal(
  selectEntriesForMode(sourceEntries, { mode: 'pilot', caseIds: new Set(['rc_001']), caseLimit: 1 }).length,
  1,
  'Pilot mod kesin vaka filtresini uygulamadı.'
);

for (const goldId of ['rc_001', 'pp_001']) {
  const gold = allCases.find((item) => String(item.puzzleId || item.id) === goldId);
  assert.ok(gold, `Altın vaka bulunamadı: ${goldId}`);
  const status = authoringCompleteness(gold);
  assert.equal(status.complete, false, `${goldId} ham içerik yanlışlıkla authoring-tam ilan edildi.`);
  assert.ok(status.missing.some((item) => item.includes('logicRules')), `${goldId} eksik QA sözleşmesi görünmedi.`);
}

const base = {
  puzzleId: 'fixture_001',
  story: 'Maktul arşiv odasında öldürüldü; kayıt defteri şüpheliyi bıçağa bağlıyor.',
  suspects: [{ id: 's1', name: 'Ada' }, { id: 's2', name: 'Bora' }],
  weapons: [{ id: 'w1', name: 'Bıçak' }, { id: 'w2', name: 'Zehir' }],
  locations: [{ id: 'l1', name: 'Arşiv' }, { id: 'l2', name: 'Salon' }],
  clues: [{ id: 'c1', title: 'Kayıt', text: 'Kayıt Ada ile bıçağı eşleştiriyor.', isBonus: false }],
  solution: { suspectId: 's1', weaponId: 'w1', locationId: 'l1' },
  qaPattern: { anchorSource: 'clue:c1', anchorComponent: 'weapon', designIntent: 'Davranış kalibrasyonu için özgün kayıt eksenli bir test zinciri.' },
  qaPortfolioRegistry: { entries: [{ puzzleId: 'fixture_001', title: 'Fixture', signature: {} }] }
};

const authoringPlan = {
  case_id: 'fixture_001',
  assessment: 'QA-only fixture authoring',
  operations: [
    { op: 'add', path: '/qaSemanticFacts', value_json: '[]', reason: 'root contract' },
    { op: 'add', path: '/qaAuthoringVersion', value_json: '"fixture-v1"', reason: 'version contract' },
    { op: 'add', path: '/clues/0/logicRules', value_json: '[{"action":"confirm","pair":["s1","w1"]}]', reason: 'visible record' },
    { op: 'add', path: '/clues/0/qaRationale', value_json: '{"matrixEffect":"Ada ↔ Bıçak doğrulanır","evidenceLink":"Kayıt metni Ada ile bıçağı açıkça eşleştiriyor.","evidenceKind":"record"}', reason: 'traceability' },
    { op: 'add', path: '/clues/0/qaSemanticFacts', value_json: '[{"kind":"crime_component","component":"weapon","entityId":"w1","source":"clue:c1","evidence":"Kayıt bıçağı ölüm aracı olarak gösterir."}]', reason: 'single crime component' },
    { op: 'add', path: '/clues/0/isCrimeAnchor', value_json: 'true', reason: 'crime anchor' }
  ]
};

const authored = applyAuthoringPatchPlanSafely(base, authoringPlan);
assert.deepEqual(stripAuthoring(authored), stripAuthoring(base), 'QA-only plan oyuncuya görünür içeriği değiştirdi.');
assert.equal(authoringCompleteness(authored).complete, true);
assert.equal(authoringContract(authored).passed, true);
assert.equal(Object.hasOwn(stripAuthoring(authored).clues[0], 'isCrimeAnchor'), false, 'isCrimeAnchor üretim içeriğine sızdı.');

const partialPlan = {
  case_id: 'fixture_001', assessment: 'safe partial authoring',
  operations: [{ op: 'add', path: '/qaSemanticFacts', value_json: '[]', reason: 'partial recovery fixture' }]
};
const partial = applyAuthoringPatchPlanSafely(base, partialPlan);
const partialDisposition = authoringCandidateDisposition(base, partial);
assert.equal(partialDisposition.retain_safe_partial, true, 'Güvenli kısmi QA metadata sonucu recovery için korunmadı.');
assert.equal(partialDisposition.accepted, false, 'Eksik QA metadata sonucu yanlışlıkla tamamlanmış kabul edildi.');
assert.deepEqual(stripAuthoring(partial), stripAuthoring(base), 'Kısmi QA metadata oyuncu içeriğini değiştirdi.');

const forbidden = {
  case_id: 'fixture_001', assessment: 'forbidden content rewrite',
  operations: [{ op: 'replace', path: '/story', value_json: '"Değiştirildi"', reason: 'must fail' }]
};
assert.throws(() => applyAuthoringPatchPlanSafely(base, forbidden), /AUTHORING_ONLY/);

const broken = structuredClone(authored);
broken.clues[0].logicRules = [{ action: 'confirm', pair: ['s1', 's2'] }];
assert.equal(authoringContract(broken).passed, false);
assert.ok(authoringContract(broken).errors.some((item) => item.includes('same_axis_pair')));
const engine = loadEngine('.case-qa/Faili_Mechul_Vaka_Simulatoru_v29_4_Otomasyon_Temeli.html');
const brokenResult = evaluateCase(engine, broken, { baseline: base });
assert.equal(brokenResult.productionReady, false, 'Exact v29.4 motoru bozuk aynı-eksen kuralını kabul etti.');
assert.ok(brokenResult.score < 100, 'Exact v29.4 motoru bilinen bozuk fixture için 100 verdi.');

const runnerSource = fs.readFileSync('.case-qa/fm_case_qa_runner.mjs', 'utf8');
assert.match(runnerSource, /scope: 'gold_calibration'/, 'Full kampanya altın vakalarda bounded repair sertifikasyonu çalıştırmıyor.');
assert.match(runnerSource, /stage: 'authoring_contract'/, 'Altın-vaka authoring sözleşme aşaması ayrı raporlanmıyor.');
assert.match(runnerSource, /stage: 'bounded_gold_repair'/, 'Altın-vaka bounded repair aşaması ayrı raporlanmıyor.');

const workflowSource = fs.readFileSync('.github/workflows/fm-case-qa-v3.yml', 'utf8');
assert.match(workflowSource, /actions\/cache\/restore@v4/, 'AI cache restore açıkça tanımlı değil.');
assert.match(workflowSource, /actions\/cache\/save@v4/, 'Başarısız QA sonrası AI cache kaydı tanımlı değil.');
assert.match(workflowSource, /Save idempotent response cache even when QA stops safely[\s\S]*if: always\(\)/, 'AI cache hata halinde korunmuyor.');

console.log('✓ Full selection, two-stage gold calibration, safe authoring recovery, cache persistence and metadata isolation are enforced.');
