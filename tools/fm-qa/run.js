#!/usr/bin/env node
'use strict';
/* ============================================================================
 * FAILI MECHUL - OTOMATIK QA ONARIM KOSUCUSU
 *
 * Tek calistirma ile 105 vakayi sirayla isler:
 *   vaka -> gercek v29.4 QA motoru -> 100 ise gec
 *        -> degilse: motor raporu + deterministik mantik brifingi ile LLM'e
 *           YAMA yazdir -> uygula -> tekrar puanla -> 100 olana kadar (sinirli)
 *   sonunda uretim dosyalarini gunceller; commit/PR isini GitHub Actions yapar.
 *
 * Neden yama (patch) dondurtuyoruz, tam vaka degil:
 *   - kimlik/cozum kaymasi YAPISAL olarak imkansiz hale gelir
 *   - cikti kucuk kalir: kesilme (truncation) riski ve maliyet duser
 * ==========================================================================*/

const fs = require('fs');
const path = require('path');
const { normalize, computeQA, buildReportText } = require('./engine.js');
const C = require('./lib/cases.js');
const SOLVER = require('./lib/solver.js');
const { callModel, TruncationError } = require('./lib/llm.js');

/* ------------------------------- argumanlar ------------------------------ */
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const hit = argv.find(a => a.startsWith('--' + name + '='));
  if (hit) return hit.split('=').slice(1).join('=');
  return argv.includes('--' + name) ? true : def;
};
const REPO = arg('repo', process.cwd());
const LIMIT = Number(arg('limit', 0)) || 0;            // 0 = hepsi
const START = Number(arg('start', 0)) || 0;
const ONLY = String(arg('only', '') || '').trim();
const MAX_ATTEMPTS = Number(arg('max-attempts', 4)) || 4;
const ACCEPT = Number(arg('acceptance', 100)) || 100;
const DRY = arg('dry-run', false) === true || String(arg('dry-run', 'false')) === 'true';
const PROVIDER = String(process.env.FM_PROVIDER || 'gemini').toLowerCase();

const log = (...a) => console.log(...a);
const p = f => path.join(REPO, f);

/* --------------------------- dosyalari yukle ----------------------------- */
let stdSource = fs.readFileSync(p(C.STD_PATH), 'utf8');
let preSource = fs.readFileSync(p(C.PRE_PATH), 'utf8');
let premiumDb = JSON.parse(preSource);
let qaStore = { version: 1, cases: {} };
try { qaStore = JSON.parse(fs.readFileSync(p(C.QA_PATH), 'utf8')); if (!qaStore.cases) qaStore = { version: 1, cases: {} }; }
catch (e) { log('QA metadata deposu yok, yenisi olusturulacak.'); }

const loaded = C.loadAll(stdSource, preSource);
log(`Yuklendi: ${loaded.standard.length} standart + ${loaded.premium.length} premium = ${loaded.all.length} vaka`);

/* ------------------------------ puanlama --------------------------------- */
function score(fullCase, tier) {
  const prepared = C.prepareForEngine(fullCase, tier);
  const nrm = normalize(prepared);
  const q = computeQA(nrm);
  return { q, report: buildReportText(nrm, q), prepared };
}

const FATAL_SECTIONS = ['structural', 'lazyEvidence', 'miniGame', 'literary', 'traceabilityPolicy',
  'ruleEntailment', 'mechanicContract', 'narrativeScope', 'disclosure', 'semantic',
  'visibleEvidenceScope', 'coreNecessity', 'crimeScope', 'patternGovernance', 'contentQuality'];

function blockingFlags(q) {
  const out = [];
  for (const s of FATAL_SECTIONS) {
    const sec = q[s];
    for (const f of ((sec && sec.flags) || [])) out.push(`[${s}] ${f}`);
  }
  return out;
}

/* ------------------------------ yama semasi ------------------------------ */
const S_STR = { type: 'STRING' };
const logicRuleSchema = {
  type: 'OBJECT',
  properties: {
    action: { type: 'STRING', enum: ['confirm', 'eliminate'] },
    pair: { type: 'ARRAY', items: S_STR }
  },
  required: ['action', 'pair']
};
const qaRationaleSchema = {
  type: 'OBJECT',
  properties: {
    matrixEffect: S_STR,
    evidenceLink: S_STR,
    evidenceKind: { type: 'STRING', enum: ['forensic', 'documentary', 'record', 'witness', 'mechanical', 'medical', 'physical', 'audio', 'digital', 'transaction', 'inventory', 'chain_of_custody'] }
  },
  required: ['matrixEffect', 'evidenceLink', 'evidenceKind']
};
const semanticFactSchema = {
  type: 'OBJECT',
  properties: {
    kind: { type: 'STRING', enum: ['crime_component'] },
    component: { type: 'STRING', enum: ['suspect', 'weapon', 'location'] },
    entityId: S_STR,
    evidence: S_STR
  },
  required: ['kind', 'component', 'entityId', 'evidence']
};
const PATCH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    story: S_STR,
    solutionNarrative: S_STR,
    entities: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { id: S_STR, name: S_STR, description: S_STR, detail: S_STR },
        required: ['id']
      }
    },
    clues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: S_STR,
          text: S_STR,
          deductionHint: S_STR,
          isCrimeAnchor: { type: 'BOOLEAN' },
          logicRules: { type: 'ARRAY', items: logicRuleSchema },
          qaRationale: qaRationaleSchema,
          qaSemanticFacts: { type: 'ARRAY', items: semanticFactSchema },
          qaMechanicBoundary: {
            type: 'OBJECT',
            properties: { primaryEvidence: S_STR, wrapperTextRole: S_STR },
            required: ['primaryEvidence', 'wrapperTextRole']
          }
        },
        required: ['id']
      }
    },
    qaPattern: {
      type: 'OBJECT',
      properties: {
        anchorSource: S_STR, anchorComponent: S_STR,
        miniGameClueId: S_STR,
        miniGameRole: { type: 'STRING', enum: ['pivot', 'climax', 'misdirection', 'reversal', 'verification'] },
        designIntent: S_STR
      },
      required: ['anchorSource', 'anchorComponent', 'designIntent']
    },
    notes: S_STR
  },
  required: ['clues']
};

/* Yamayi vakaya uygular. Varlik/ipucu EKLEYEMEZ veya SILEMEZ; yalnizca
   mevcut kimliklerin alanlarini gunceller. Kimlik kaymasi bu yuzden imkansiz. */
function applyPatch(base, patch) {
  const c = C.clone(base);
  if (patch.story) c.story = patch.story;
  if (patch.solutionNarrative) c.solutionNarrative = patch.solutionNarrative;
  if (patch.qaPattern) c.qaPattern = Object.assign({}, c.qaPattern, patch.qaPattern);

  const byId = new Map((patch.entities || []).map(e => [C.txt(e.id), e]));
  for (const key of ['suspects', 'weapons', 'locations']) {
    c[key] = C.arr(c[key]).map(e => {
      const up = byId.get(C.txt(e.id));
      if (!up) return e;
      const n = Object.assign({}, e);
      if (up.name) n.name = up.name;
      if (up.description) n.description = up.description;
      if (up.detail) n.detail = up.detail;
      return n;
    });
  }

  const clueById = new Map((patch.clues || []).map(x => [C.txt(x.id), x]));
  c.clues = C.arr(c.clues).map(cl => {
    const up = clueById.get(C.txt(cl.id));
    if (!up) return cl;
    const n = Object.assign({}, cl);
    if (up.text) n.text = up.text;
    if (up.deductionHint) n.deductionHint = up.deductionHint;
    if (up.isCrimeAnchor !== undefined) n.isCrimeAnchor = up.isCrimeAnchor;
    if (up.logicRules) n.logicRules = up.logicRules;
    if (up.qaRationale) n.qaRationale = up.qaRationale;
    if (up.qaSemanticFacts) n.qaSemanticFacts = up.qaSemanticFacts;
    if (up.qaMechanicBoundary) n.qaMechanicBoundary = up.qaMechanicBoundary;
    return n;
  });

  /* Portfoy defteri her vakada en az kendi kaydini tasimalidir. */
  if (!c.qaPortfolioRegistry || !Array.isArray(c.qaPortfolioRegistry.entries) || !c.qaPortfolioRegistry.entries.length) {
    c.qaPortfolioRegistry = { entries: [{ puzzleId: C.caseId(c), note: 'self' }] };
  }
  return c;
}


/* ============================================================================
 * DETERMINISTIK METADATA ISKELESI
 * Motorun istedigi metadata'nin BUYUK KISMI mekanik olarak turetilebilir.
 * Ne kadarini burada ucretsiz uretirsek, LLM'e o kadar az is kalir; yakinsama
 * artar, maliyet duser. LLM'e yalnizca METIN yazma isi birakilir.
 *
 * Ayrica: motorun "gereklilik" tanimi bizim izgara tabanli tanimimizdan
 * FARKLI (izgarayi degil oyuncunun ulastigi CEVABI olcuyor). Bu yuzden
 * iskeleti motora ONAYLATIYORUZ: aday uret -> motorla puanla -> mantik
 * bayraklari temizlenene kadar farkli tohumlarla dene.
 * ==========================================================================*/
const LOGIC_SECTIONS = ['coreNecessity', 'ruleEntailment', 'traceabilityPolicy'];

function nameOf(fullCase, id) {
  for (const k of ['suspects', 'weapons', 'locations']) {
    const hit = C.arr(fullCase[k]).find(e => C.txt(e && e.id) === C.txt(id));
    if (hit) return C.txt(hit.name) || C.txt(id);
  }
  return C.txt(id);
}

/* Ipucu metninde gercekten gecen bir kanit sozcugu bul (evidenceLink icin). */
const EVIDENCE_WORDS = [
  ['laboratuvar', 'forensic'], ['adli', 'forensic'], ['otopsi', 'medical'], ['tabip', 'medical'],
  ['parmak iz', 'forensic'], ['kan', 'forensic'], ['analiz', 'forensic'], ['numune', 'forensic'],
  ['kayit', 'record'], ['kayıt', 'record'], ['defter', 'documentary'], ['mektup', 'documentary'],
  ['not', 'documentary'], ['belge', 'documentary'], ['fatura', 'transaction'], ['makbuz', 'transaction'],
  ['tanik', 'witness'], ['tanık', 'witness'], ['ifade', 'witness'], ['muhafiz', 'witness'], ['muhafız', 'witness'],
  ['bekci', 'witness'], ['bekçi', 'witness'], ['kamera', 'digital'], ['telefon', 'digital'],
  ['ses', 'audio'], ['muhur', 'physical'], ['mühür', 'physical'], ['iz', 'physical'], ['envanter', 'inventory']
];
function evidenceFromText(text) {
  const t = String(text || '').toLocaleLowerCase('tr-TR');
  for (const [w, kind] of EVIDENCE_WORDS) if (t.includes(w)) return { link: w, kind };
  return { link: 'ipucu metnindeki dogrudan gozlem', kind: 'physical' };
}

function buildScaffold(fullCase, assignment) {
  const c = C.clone(fullCase);
  const sol = SOLVER.solutionOf(c);
  const byClue = new Map(assignment.map(a => [a.clueId, a.rule]));
  let anchorSet = false;

  c.clues = C.arr(c.clues).map(cl => {
    const n = Object.assign({}, cl);
    const rule = byClue.get(C.txt(cl.id));
    if (rule) {
      n.logicRules = [rule];
      const a = nameOf(c, rule.pair[0]), b = nameOf(c, rule.pair[1]);
      const ev = evidenceFromText(cl.text);
      n.qaRationale = {
        matrixEffect: rule.action === 'confirm' ? `${a} ↔ ${b} dogrulanir` : `${a} ≠ ${b} elenir`,
        evidenceLink: ev.link,
        evidenceKind: ev.kind
      };
      if (!anchorSet && cl.isBonus !== true) { n.isCrimeAnchor = true; anchorSet = true; }
    }
    return n;
  });

  /* Cinayet capasi: tam olarak bir bilesen beyan edilir. */
  const anchor = c.clues.find(x => x.isCrimeAnchor === true);
  if (anchor) {
    /* Capa TAM OLARAK bir suc bileseni beyan etmeli (motor sarti).
       Beyan edilen bilesen, capanin kendi kuralinin dokundugu eksenden secilir. */
    const pr = (anchor.logicRules && anchor.logicRules[0] && anchor.logicRules[0].pair) || [];
    const cats = pr.map(id => (SOLVER.makeCtx(c).cat.get(id) || ''));
    let comp = 'weapon', ent = sol.weaponId;
    if (cats.includes('L') && !cats.includes('W')) { comp = 'location'; ent = sol.locationId; }
    anchor.qaSemanticFacts = [{ kind: 'crime_component', component: comp, entityId: ent, evidence: C.txt(anchor.text).slice(0, 140) }];
    if (c.qaPattern) c.qaPattern.anchorComponent = comp;
  }

  const firstCore = c.clues.find(x => x && x.isBonus !== true);
  c.qaPattern = Object.assign({
    anchorSource: 'clue:' + (anchor ? anchor.id : (firstCore ? firstCore.id : 'c1')),
    anchorComponent: (anchor && anchor.qaSemanticFacts && anchor.qaSemanticFacts[0] && anchor.qaSemanticFacts[0].component) || 'weapon',
    miniGameClueId: (c.clues.find(x => x && x.mechanicType && x.mechanicType !== 'text') || {}).id || '',
    miniGameRole: 'pivot',
    designIntent: 'Bu vaka, kanit zincirini adim adim daraltarak tek cozume goturur; her temel ipucu ayri bir izgara iliskisini kapatir.'
  }, c.qaPattern || {});
  c.qaPortfolioRegistry = c.qaPortfolioRegistry && Array.isArray(c.qaPortfolioRegistry.entries) && c.qaPortfolioRegistry.entries.length
    ? c.qaPortfolioRegistry : { entries: [{ puzzleId: C.caseId(c), note: 'self' }] };
  return c;
}

/* Motor tarafindan ONAYLANAN bir mantik iskeleti ara. */
function findEngineApprovedScaffold(fullCase, tier, { seeds = 24 } = {}) {
  const ctx = SOLVER.makeCtx(fullCase);
  const core = C.arr(fullCase.clues).filter(x => x && x.isBonus !== true);
  if (!ctx.valid || core.length < 2) return null;
  let best = null;
  for (let s = 0; s < seeds; s++) {
    const set = SOLVER.findRuleSetEngineStyle(ctx, core.length, { tries: 80, seed: 1000 + s * 37 });
    if (!set) continue;
    const assignment = core.map((c2, i) => ({ clueId: String(c2.id), rule: set[i] }));
    const candidate = buildScaffold(fullCase, assignment);
    const { q } = score(candidate, tier);
    const logicFlags = LOGIC_SECTIONS.reduce((n, sec) => n + (((q[sec] || {}).flags) || []).length, 0);
    const totalFlags = blockingFlags(q).length;
    if (!best || logicFlags < best.logicFlags || (logicFlags === best.logicFlags && totalFlags < best.totalFlags)) {
      best = { candidate, assignment, logicFlags, totalFlags, score: q.total };
    }
    if (logicFlags === 0) break;
  }
  return best;
}

/* ------------------------------- istem (prompt) -------------------------- */
const SYSTEM_TEXT = `Sen Turkce bir dedektif-dedüksiyon oyunu icin QA onarim editorusun.
Gorevin: verilen vakayi, QA simulatorunun raporundaki eksikleri kapatacak sekilde ONARMAK.

MUTLAK KURALLAR:
1. Vaka kimligini, supheli/silah/mekan kimliklerini ve sayilarini, ipucu kimliklerini ve
   COZUM ucgenini ASLA degistirme. Bunlari zaten degistiremezsin; yalnizca alanlari guncelle.
2. logicRules yazarken sana verilen "EKLENEBILECEK KISITLAR" listesindeki kisitlari kullan.
   Bir kisiti YALNIZCA o ipucunun METNI gercekten onu destekliyorsa o ipucuna bagla.
   Metin desteklemiyorsa once ipucu metnini o kisiti dogal olarak anlatacak sekilde yeniden yaz.
3. Tum TEMEL (isBonus=false) ipuclari birlikte tek bir cozum vermeli; her temel ipucu GEREKLI
   olmali (biri cikarilinca cozum belirsizlesmeli). BONUS ipuclari asla zorunlu olmamali.
4. deductionHint kisi/nesne adi vermeden izgara iliskisine yonlendiren Sokratik bir soru olmali.
5. Turkce dogal, akici ve edebi olmali. Kuru/robotik liste cumleleri kurma.
6. Oyuncuya gorunen metinler ipuclari acilmadan cozum ucgenini ele vermemeli.
7. Yalnizca DEGISTIRDIGIN alanlari dondur. Degismeyen alanlari yazma.
8. COK ONEMLI: Brifing "Mantik iskeleti gecerli" diyorsa, logicRules alanini HIC DONDURME.
   Kurallar zaten dogrulanmistir; onlara dokunursan vakayi bozarsin. O durumda isin
   SADECE metin yazmaktir: ipucu metinleri, deductionHint, profiller ve hikaye.
9. Her ipucunun metni, kendi logicRules kuralinda gecen varliklari (supheli/silah/mekan)
   dogal biçimde ANMALIDIR; aksi halde kanit koprusu kurulmus sayilmaz.`;

function buildUserText({ fullCase, report, briefing, flags, attempt, previousProblem }) {
  const parts = [];
  if (attempt > 1) {
    parts.push(`BU ${attempt}. DENEME. Onceki denemen kabul edilmedi.`);
    if (previousProblem) parts.push('Onceki denemedeki sorun:\n' + previousProblem);
    parts.push('');
  }
  parts.push('=== VAKA (JSON) ===');
  parts.push(JSON.stringify(fullCase, null, 1));
  parts.push('');
  parts.push('=== DETERMINISTIK MANTIK BRIFINGI ===');
  parts.push(briefing);
  parts.push('');
  if (flags.length) {
    parts.push('=== SIMULATORUN ENGELLEYICI BULGULARI ===');
    flags.forEach((f, i) => parts.push(`${i + 1}. ${f}`));
    parts.push('');
  }
  parts.push('=== SIMULATOR RAPORU (ozet) ===');
  parts.push(String(report).slice(0, 6000));
  parts.push('');
  parts.push('Yukaridaki eksikleri kapatan YAMA nesnesini dondur.');
  return parts.join('\n');
}

/* ------------------------------ mock saglayici --------------------------- */
/* API anahtari olmadan tum donguyu test edebilmek icin deterministik taklit.
   Gercek calistirmada kullanilmaz. */
function mockPatch(fullCase) {
  /* Gercek sistemin yapacaginin aynisi: deterministik iskeleti kullan. */
  const ctx = SOLVER.makeCtx(fullCase);
  const sk = SOLVER.proposeLogicSkeleton(fullCase, ctx);
  const sol = SOLVER.solutionOf(fullCase);
  const core = C.arr(fullCase.clues).filter(c => c && c.isBonus !== true);
  const bonus = C.arr(fullCase.clues).filter(c => c && c.isBonus === true);
  if (!sk) return { clues: core.map(c => ({ id: c.id })), notes: 'iskelet bulunamadi' };

  const clues = sk.assignment.map((a, i) => ({
    id: a.clueId,
    logicRules: [a.rule],
    qaRationale: { matrixEffect: `${a.rule.pair[0]} ${a.rule.action} ${a.rule.pair[1]}`, evidenceLink: 'laboratuvar analizi ve kayit incelemesi', evidenceKind: 'forensic' },
    isCrimeAnchor: i === 0,
    qaSemanticFacts: i === 0 ? [{ kind: 'crime_component', component: 'weapon', entityId: sol.weaponId, evidence: 'adli rapor' }] : undefined
  }));
  /* Bonuslar: cekirdek kurallari TEKRARLAMAYAN, ayri bir eleme tasimali. */
  const used = new Set(sk.rules.map(r => r.action + '|' + r.pair.slice().sort().join('|')));
  const spare = SOLVER.allSolutionSafeConstraints(ctx)
    .filter(r => !used.has(r.action + '|' + r.pair.slice().sort().join('|')));
  bonus.forEach((b, i) => {
    const r = spare[i % Math.max(1, spare.length)];
    if (r) clues.push({ id: b.id, logicRules: [r], qaRationale: { matrixEffect: 'bonus', evidenceLink: 'tanik ifadesi', evidenceKind: 'witness' } });
  });
  return {
    clues,
    qaPattern: { anchorSource: 'clue:' + core[0].id, anchorComponent: 'weapon', miniGameClueId: '', miniGameRole: 'pivot', designIntent: 'Mock saglayici tarafindan uretilen tasarim niyeti metni.' },
    notes: 'mock+iskelet'
  };
}

/* ------------------------------- ana dongu -------------------------------- */
const results = [];
const usageTotal = { input: 0, output: 0, thinking: 0, calls: 0 };

function flushToDisk() {
  fs.mkdirSync(path.dirname(p(C.QA_PATH)), { recursive: true });
  fs.writeFileSync(p(C.QA_PATH), JSON.stringify(qaStore, null, 2) + '\n', 'utf8');
  fs.writeFileSync(p(C.STD_PATH), stdSource, 'utf8');
  fs.writeFileSync(p(C.PRE_PATH), JSON.stringify(premiumDb, null, 2) + '\n', 'utf8');
}

function persistCase(entry, fullCase) {
  const split = C.splitQaFields(fullCase);
  qaStore.cases[C.caseId(fullCase)] = split.qa;
  if (entry.tier === 'premium') {
    const pack = premiumDb.packs[entry.pack_index];
    if (!pack || C.caseId(pack.puzzles[entry.index]) !== C.caseId(fullCase)) {
      throw new Error('Premium konum eslesmedi: ' + C.caseId(fullCase));
    }
    pack.puzzles[entry.index] = split.game;
  } else {
    stdSource = C.spliceStandard(stdSource, C.caseId(fullCase), split.game);
  }
}

async function processCase(entry, position) {
  const id = C.caseId(entry.raw);
  const merged = C.applyQaMetadata(entry.raw, qaStore);
  let current = merged;

  let { q, report } = score(current, entry.tier);
  let flags = blockingFlags(q);

  if (q.total >= ACCEPT && !flags.length) {
    log(`  [${position}] ${id.padEnd(28)} ZATEN ${q.total}/100 — atlandi (maliyet 0)`);
    return { case_id: id, tier: entry.tier, status: 'already_passing', score: q.total, attempts: 0, best_case_kept: current };
  }

  log(`  [${position}] ${id.padEnd(28)} baslangic ${q.total}/100, ${flags.length} engelleyici bulgu`);

  /* ---- ADIM 0: UCRETSIZ DETERMINISTIK ISKELE --------------------------------
     Mantik kurallarini LLM'e YAZDIRMIYORUZ. Motor tarafindan onaylanan gecerli
     bir kural setini burada, para harcamadan buluyoruz. LLM'e yalnizca metin
     yazma isi kaliyor. (Bu adim onceki surumde yanlislikla devre disiydi.) */
  const scaffold = findEngineApprovedScaffold(current, entry.tier, { seeds: 24 });
  if (scaffold) {
    const sc = score(scaffold.candidate, entry.tier);
    const scFlags = blockingFlags(sc.q);
    if (sc.q.total > q.total || scFlags.length < flags.length) {
      current = scaffold.candidate; q = sc.q; report = sc.report; flags = scFlags;
      log(`      ucretsiz iskele: ${q.total}/100, ${flags.length} bulgu (API maliyeti 0)`);
    }
  } else {
    log('      ucretsiz iskele: gecerli kural seti bulunamadi');
  }

  /* Iskele sifir engelleyici bulguya ulastiysa vaka yapisal olarak SAGLAMDIR.
     Bu durumda AI'nin isi yalnizca yumusak puani yukseltmektir; bir denemede
     iyilestiremezse elimizdekini korur ve dururuz. AI'nin saglam bir vakayi
     bozmasina izin verilmez. */
  const polishOnly = flags.length === 0;
  if (polishOnly) log('      (cila modu: yapisal olarak saglam, AI yalnizca iyilestirebilir)');

  /* Iskele tek basina yeterliyse LLM'e hic gitmeyiz. */
  if (q.total >= ACCEPT && !flags.length) {
    return {
      case_id: id, tier: entry.tier, status: 'repaired', score: q.total,
      attempts: 0, fixed_without_ai: true, repaired_case: current
    };
  }

  let previousProblem = null;
  let lastSignature = null;      /* ayni sonucu tekrar tekrar uretmeyi engeller */
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const briefing = SOLVER.buildLogicBriefing(current);
    let patch;
    try {
      if (PROVIDER === 'mock') {
        patch = mockPatch(current);
      } else {
        const userText = buildUserText({ fullCase: current, report, briefing, flags, attempt, previousProblem });
        const out = await callModel({ systemText: SYSTEM_TEXT, userText, schema: PATCH_SCHEMA });
        usageTotal.input += out.usage.input; usageTotal.output += out.usage.output;
        usageTotal.thinking += out.usage.thinking; usageTotal.calls += 1;
        patch = JSON.parse(out.text);
      }
    } catch (e) {
      if (e instanceof TruncationError) {
        previousProblem = 'Cevabin cok uzundu ve kesildi. DAHA KISA don: yalnizca degistirdigin alanlari yaz.';
        log(`      deneme ${attempt}: cikti kesildi, daha kisa istenecek`);
        continue;
      }
      log(`      deneme ${attempt}: API hatasi: ${e.message}`);
      previousProblem = 'Onceki cevap islenemedi: ' + e.message;
      continue;
    }

    const candidate = applyPatch(current, patch);

    /* Kimlik muhru: yama yapisal olarak bozamaz ama yine de dogruluyoruz. */
    const violations = C.identityViolations(merged, candidate);
    if (violations.length) {
      previousProblem = 'Kimlik ihlali: ' + violations.join(' | ');
      log(`      deneme ${attempt}: kimlik ihlali, reddedildi`);
      continue;
    }

    const scored = score(candidate, entry.tier);
    const newFlags = blockingFlags(scored.q);
    const diag = SOLVER.diagnose(candidate);
    log(`      deneme ${attempt}: ${scored.q.total}/100, ${newFlags.length} bulgu, kalan dunya ${diag.surviving_worlds_with_core_clues}`);

    if (scored.q.total >= ACCEPT && !newFlags.length) {
      return { case_id: id, tier: entry.tier, status: 'repaired', score: scored.q.total, attempts: attempt, repaired_case: candidate };
    }

    /* Ayni puan + ayni bulgular tekrar geldiyse model tikanmistir; bos yere
       para harcamayalim. */
    const signature = scored.q.total + '|' + newFlags.join('~');
    if (signature === lastSignature) {
      log(`      deneme ${attempt}: onceki denemeyle ayni sonuc, tekrar denemek anlamsiz — duruluyor`);
      return {
        case_id: id, tier: entry.tier, status: 'quarantined', score: q.total,
        attempts: attempt, stopped_early: true,
        blocking_flag_count: flags.length,
        soft_gap_only: flags.length === 0,
        remaining_flags: flags.slice(0, 10),
        best_case_kept: current
      };
    }
    lastSignature = signature;

    /* Ilerleme varsa yeni haliyle devam et; yoksa ayni tabandan tekrar dene. */
    const improved = scored.q.total > q.total || newFlags.length < flags.length;
    if (improved) {
      current = candidate; q = scored.q; report = scored.report; flags = newFlags;
    }

    /* Cila modunda AI iyilestiremediyse israr etmeyiz: elimizdeki saglam
       surumu koruyup dururuz. Boylece hem para hem kalite korunur. */
    if (polishOnly && !improved) {
      log(`      deneme ${attempt}: iyilestirme yok — saglam surum korunuyor, duruluyor`);
      return {
        case_id: id, tier: entry.tier,
        status: q.total >= ACCEPT ? 'repaired' : 'quarantined',
        score: q.total, attempts: attempt, stopped_early: true,
        blocking_flag_count: flags.length, soft_gap_only: flags.length === 0,
        repaired_case: q.total >= ACCEPT ? current : undefined,
        best_case_kept: current
      };
    }
    previousProblem = [
      'Puan hala ' + scored.q.total + '/100.',
      diag.surviving_worlds_with_core_clues !== 1 ? `Temel ipuclari ${diag.surviving_worlds_with_core_clues} olasilik birakiyor; tam 1 olmali.` : '',
      diag.redundant_core_clues.length ? 'Gereksiz temel ipuclari: ' + diag.redundant_core_clues.join(', ') : '',
      newFlags.length ? 'Kalan bulgular:\n- ' + newFlags.slice(0, 8).join('\n- ') : ''
    ].filter(Boolean).join('\n');
  }

  return {
    case_id: id, tier: entry.tier, status: 'quarantined', score: q.total, attempts: MAX_ATTEMPTS,
    blocking_flag_count: flags.length,
    soft_gap_only: flags.length === 0,
    remaining_flags: flags.slice(0, 10),
    best_case_kept: current
  };
}

(async () => {
  let list = loaded.all;
  if (ONLY) list = list.filter(e => C.caseId(e.raw) === ONLY);
  else {
    list = list.slice(START);
    if (LIMIT) list = list.slice(0, LIMIT);
  }
  log(`Islenecek vaka sayisi: ${list.length}  |  saglayici: ${PROVIDER}  |  deneme siniri: ${MAX_ATTEMPTS}  |  esik: ${ACCEPT}`);
  log('');

  let pos = 0;
  for (const entry of list) {
    pos++;
    let r;
    try {
      r = await processCase(entry, `${pos}/${list.length}`);
    } catch (e) {
      r = { case_id: C.caseId(entry.raw), tier: entry.tier, status: 'error', error: String(e.message) };
      log(`  [${pos}/${list.length}] HATA: ${e.message}`);
    }
    if (r.status === 'repaired' && !DRY) {
      try {
        persistCase(entry, r.repaired_case);
        flushToDisk();          /* her vakadan sonra diske yaz: kosu yarida kesilse bile ilerleme korunur */
        r.persisted = true;
      } catch (e) {
        r.status = 'persist_failed'; r.error = String(e.message);
        log(`      YAZIM HATASI: ${e.message}`);
      }
    }
    /* Elle dogrulama icin: motora verilen TAM vaka JSON'unu diske yaz.
       Bu dosyayi kendi HTML simulatorunuze yapistirip ayni puani gormelisiniz. */
    try {
      const dumpDir = p('qa-reports/cases');
      fs.mkdirSync(dumpDir, { recursive: true });
      const best = r.repaired_case || r.best_case_kept;
      if (best) {
        fs.writeFileSync(path.join(dumpDir, r.case_id + '.simulator-input.json'),
          JSON.stringify(C.prepareForEngine(best, entry.tier), null, 2), 'utf8');
      }
      fs.writeFileSync(path.join(dumpDir, r.case_id + '.baseline.json'),
        JSON.stringify(C.prepareForEngine(C.applyQaMetadata(entry.raw, qaStore), entry.tier), null, 2), 'utf8');
    } catch (e) { /* dokum basarisiz olsa da kosu devam eder */ }

    delete r.repaired_case;
    delete r.best_case_kept;
    results.push(r);
  }

  const by = s => results.filter(r => r.status === s).length;
  const summary = {
    generated_at: new Date().toISOString(),
    provider: PROVIDER,
    model: process.env.FM_MODEL || null,
    dry_run: DRY,
    acceptance_score: ACCEPT,
    max_attempts: MAX_ATTEMPTS,
    processed: results.length,
    already_passing: by('already_passing'),
    repaired: by('repaired'),
    quarantined: by('quarantined'),
    /* Engelleyici bulgusu SIFIR olan ama esigin altinda kalanlar: bunlar
       icerik olarak saglam, yalnizca motorun yumusak tavsiyeleri eksik. */
    quarantined_soft_gap_only: results.filter(r => r.status === 'quarantined' && r.soft_gap_only).length,
    errors: by('error') + by('persist_failed'),
    token_usage: usageTotal,
    results
  };
  fs.mkdirSync(p('qa-reports'), { recursive: true });
  fs.writeFileSync(p('qa-reports/last-run.json'), JSON.stringify(summary, null, 2), 'utf8');

  const md = [
    '# QA Otomatik Onarim Raporu',
    '',
    `- Tarih: ${summary.generated_at}`,
    `- Saglayici/model: ${summary.provider} / ${summary.model || '-'}`,
    `- Islenen vaka: **${summary.processed}**`,
    `- Zaten 100 olan: **${summary.already_passing}**`,
    `- Onarilan: **${summary.repaired}**`,
    `- Karantinaya alinan: **${summary.quarantined}**`,
    `  - bunlardan engelleyici bulgusu SIFIR olanlar (yalnizca yumusak tavsiye eksik): **${summary.quarantined_soft_gap_only}**`,
    `- Hata: **${summary.errors}**`,
    `- Token: girdi ${usageTotal.input}, cikti ${usageTotal.output}, dusunme ${usageTotal.thinking}, cagri ${usageTotal.calls}`,
    '',
    '| Vaka | Tier | Durum | Puan | Deneme |',
    '|---|---|---|---|---|',
    ...results.map(r => `| ${r.case_id} | ${r.tier || '-'} | ${r.status} | ${r.score != null ? r.score : '-'} | ${r.attempts != null ? r.attempts : '-'} |`)
  ].join('\n');
  fs.writeFileSync(p('qa-reports/last-run.md'), md, 'utf8');

  log('');
  log('================ OZET ================');
  log(`islenen=${summary.processed} zaten100=${summary.already_passing} onarilan=${summary.repaired} karantina=${summary.quarantined} (bunlardan yalnizca-yumusak-fark=${summary.quarantined_soft_gap_only}) hata=${summary.errors}`);
  log(`token: girdi=${usageTotal.input} cikti=${usageTotal.output} dusunme=${usageTotal.thinking} cagri=${usageTotal.calls}`);
  log('======================================');

  if (summary.errors > 0) process.exitCode = 0;   /* hata olsa da ilerleme commit edilsin */
})();
