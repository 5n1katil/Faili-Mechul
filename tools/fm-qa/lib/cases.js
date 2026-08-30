'use strict';
/* Uretim dosyalarini okuma / yazma / birlestirme yardimcilari.
   n8n'e bagli degil; duz Node modulu. */

const STD_PATH = 'artifacts/dedektif/data/puzzles.ts';
const PRE_PATH = 'artifacts/dedektif/data/puzzles_database.json';
const QA_PATH = 'artifacts/dedektif/data/qa/qa_metadata.json';

const QA_TOP_KEYS = ['qaPattern', 'qaPortfolioRegistry', 'qaSemanticFacts', 'qaPolicy', 'qaAiReview'];
const QA_CLUE_KEYS = ['logicRules', 'qaRationale', 'qaSemanticFacts', 'qaMechanicBoundary', 'isCrimeAnchor'];

const DIFFICULTY_MAP = { caylak: 1, 'çaylak': 1, dedektif: 3, baskomiser: 5, 'başkomiser': 5 };

const txt = v => String(v == null ? '' : v).trim();
const arr = v => (Array.isArray(v) ? v : []);
const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
const caseId = c => txt(c && (c.puzzleId || c.id));

function parseStandard(source) {
  const marker = source.indexOf('export const PUZZLES');
  const eq = source.indexOf('=', marker);
  const start = source.indexOf('[', eq);
  if (marker < 0 || eq < 0 || start < 0) throw new Error('puzzles.ts icinde PUZZLES dizisi bulunamadi.');
  let depth = 0, quote = '', escaped = false, line = false, block = false, end = -1;
  for (let i = start; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (line) { if (ch === '\n') line = false; continue; }
    if (block) { if (ch === '*' && next === '/') { block = false; i++; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { line = true; i++; continue; }
    if (ch === '/' && next === '*') { block = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch.charCodeAt(0) === 96) { quote = ch; continue; }
    if (ch === '[') depth++;
    if (ch === ']' && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) throw new Error('PUZZLES dizisinin sonu bulunamadi.');
  return Function('"use strict";return (' + source.slice(start, end) + ');')();
}

function standardElementRanges(source) {
  const marker = source.indexOf('export const PUZZLES');
  const eq = source.indexOf('=', marker);
  const arrStart = source.indexOf('[', eq);
  if (arrStart < 0) throw new Error('PUZZLES dizisi bulunamadi.');
  const ranges = [];
  let depth = 0, quote = '', escaped = false, line = false, block = false, objStart = -1;
  for (let i = arrStart; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (line) { if (ch === '\n') line = false; continue; }
    if (block) { if (ch === '*' && next === '/') { block = false; i++; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { line = true; i++; continue; }
    if (ch === '/' && next === '*') { block = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch.charCodeAt(0) === 96) { quote = ch; continue; }
    if (ch === '[') { depth++; continue; }
    if (ch === ']') { depth--; if (depth === 0) break; continue; }
    if (ch === '{') { if (depth === 1 && objStart < 0) objStart = i; depth++; continue; }
    if (ch === '}') { depth--; if (depth === 1 && objStart >= 0) { ranges.push({ start: objStart, end: i + 1 }); objStart = -1; } continue; }
  }
  return ranges;
}

function loadAll(stdSource, preSource) {
  const standard = parseStandard(stdSource).map((raw, index) => ({
    raw: clone(raw), tier: 'standard', pack_id: 'standard_daily', index
  }));
  const db = JSON.parse(preSource);
  const premium = [];
  arr(db.packs).forEach((pack, pi) => arr(pack.puzzles).forEach((raw, index) => premium.push({
    raw: clone(raw), tier: 'premium', pack_id: txt(pack.packId) || ('pack_' + (pi + 1)),
    index, pack_index: pi
  })));
  return { standard, premium, all: standard.concat(premium) };
}

function difficultyLevel(raw) {
  if (typeof raw === 'number') return raw;
  const k = txt(raw).toLocaleLowerCase('tr-TR');
  return DIFFICULTY_MAP[k] != null ? DIFFICULTY_MAP[k] : null;
}

function prepareForEngine(raw, tier) {
  const c = clone(raw);
  c.caseTier = tier;
  c.isPremium = tier === 'premium';
  const lvl = difficultyLevel(c.difficultyLevel != null ? c.difficultyLevel : c.difficulty);
  if (lvl != null) c.difficultyLevel = lvl;
  return c;
}

function applyQaMetadata(rawCase, store) {
  const c = clone(rawCase);
  const entry = store && store.cases ? store.cases[caseId(c)] : null;
  if (!entry) return c;
  for (const k of QA_TOP_KEYS) if (entry[k] !== undefined) c[k] = entry[k];
  const clueMeta = entry.clues || {};
  c.clues = arr(c.clues).map(cl => {
    const m = clueMeta[txt(cl && cl.id)];
    if (!m) return cl;
    const merged = Object.assign({}, cl);
    for (const k of QA_CLUE_KEYS) if (m[k] !== undefined) merged[k] = m[k];
    return merged;
  });
  return c;
}

function splitQaFields(fullCase) {
  const game = clone(fullCase);
  const qa = { clues: {} };
  for (const k of QA_TOP_KEYS) if (game[k] !== undefined) { qa[k] = game[k]; delete game[k]; }
  /* motor icin eklenen gecici alanlar uretim dosyasina yazilmaz */
  delete game.caseTier; delete game.isPremium;
  game.clues = arr(game.clues).map(cl => {
    const copy = Object.assign({}, cl);
    const meta = {};
    for (const k of QA_CLUE_KEYS) if (copy[k] !== undefined) { meta[k] = copy[k]; delete copy[k]; }
    if (Object.keys(meta).length) qa.clues[txt(copy.id)] = meta;
    return copy;
  });
  return { game, qa };
}

/* Kimlik muhuru: adayin degistirmesine ASLA izin verilmeyen her sey. */
function identity(c) {
  return {
    case_id: caseId(c),
    suspects: arr(c.suspects).map(x => txt(x && x.id)),
    weapons: arr(c.weapons).map(x => txt(x && x.id)),
    locations: arr(c.locations).map(x => txt(x && x.id)),
    clues: arr(c.clues).map(x => txt(x && x.id)),
    solution: {
      s: txt(c.solution && (c.solution.suspectId || c.solution.suspect)),
      w: txt(c.solution && (c.solution.weaponId || c.solution.weapon)),
      l: txt(c.solution && (c.solution.locationId || c.solution.location))
    }
  };
}

function identityViolations(baseline, candidate) {
  const a = identity(baseline), b = identity(candidate);
  const out = [];
  if (a.case_id !== b.case_id) out.push(`Vaka kimligi degistirilmis: ${a.case_id} -> ${b.case_id}`);
  for (const k of ['suspects', 'weapons', 'locations', 'clues']) {
    if (a[k].length !== b[k].length) out.push(`${k} sayisi degistirilmis: ${a[k].length} -> ${b[k].length}`);
    else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(`${k} kimlikleri veya sirasi degistirilmis. Beklenen: [${a[k].join(',')}]`);
  }
  if (JSON.stringify(a.solution) !== JSON.stringify(b.solution)) {
    out.push(`Cozum degistirilmis. Beklenen: supheli=${a.solution.s}, silah=${a.solution.w}, mekan=${a.solution.l}`);
  }
  return out;
}

/* puzzles.ts icinde tek bir vakayi guvenle degistirir ve dogrular. */
function spliceStandard(source, targetId, gameObject) {
  const parsed = parseStandard(source);
  const ranges = standardElementRanges(source);
  if (parsed.length !== ranges.length) throw new Error('puzzles.ts ayristirma tutarsiz (dizi/aralik sayisi farkli).');
  const idx = parsed.findIndex(p => caseId(p) === targetId);
  if (idx < 0) throw new Error('Vaka puzzles.ts icinde bulunamadi: ' + targetId);
  const body = JSON.stringify(gameObject, null, 2).split('\n').map((l, i) => (i === 0 ? l : '  ' + l)).join('\n');
  const next = source.slice(0, ranges[idx].start) + body + source.slice(ranges[idx].end);

  const after = parseStandard(next);
  if (after.length !== parsed.length) throw new Error('Yazim sonrasi vaka sayisi degisti; iptal.');
  if (JSON.stringify(after[idx]) !== JSON.stringify(gameObject)) throw new Error('Yazilan vaka geri okundugunda eslesmedi; iptal.');
  for (let i = 0; i < parsed.length; i++) {
    if (i === idx) continue;
    if (JSON.stringify(parsed[i]) !== JSON.stringify(after[i])) throw new Error('Dokunulmayan vaka bozuldu: ' + caseId(parsed[i]));
  }
  return next;
}

module.exports = {
  STD_PATH, PRE_PATH, QA_PATH, QA_TOP_KEYS, QA_CLUE_KEYS, DIFFICULTY_MAP,
  txt, arr, clone, caseId, parseStandard, standardElementRanges, loadAll,
  difficultyLevel, prepareForEngine, applyQaMetadata, splitQaFields,
  identity, identityViolations, spliceStandard
};
