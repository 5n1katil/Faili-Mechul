'use strict';
/* ============================================================================
 * KISIT ANALIZCISI + KURAL SETI ARAYICISI   (deterministik, ucretsiz, hizli)
 *
 * Sistemin can damari. Amaci LLM'e "sen mantik kur" DEMEMEK.
 * Cozum ucgeni zaten bellidir. Tekil-cozum ve gereklilik matematigi burada,
 * kesin olarak cozulur; LLM'e kalan is yalnizca "su ipucunun metnini, kendisine
 * atanan kisiti durustce anlatacak sekilde yaz" — saf bir yazim isi.
 *
 * Performans notu: dunyalar vaka basina BIR KEZ uretilir ve tum arama boyunca
 * yeniden kullanilir; adaylar mevcut hayatta kalan kume uzerinde suzulur.
 * ==========================================================================*/

function ids(list) {
  return (Array.isArray(list) ? list : []).map(x => String((x && x.id) || '').trim()).filter(Boolean);
}

function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) out.push([arr[i]].concat(p));
  }
  return out;
}

function solutionOf(caseData) {
  const s = (caseData && caseData.solution) || {};
  return {
    suspectId: String(s.suspectId || s.suspect || '').trim(),
    weaponId: String(s.weaponId || s.weapon || '').trim(),
    locationId: String(s.locationId || s.location || '').trim()
  };
}

/* --------------------------------------------------------------------------
 * Baglam: dunyalar + kimlik->eksen haritasi bir kez hesaplanir.
 * ------------------------------------------------------------------------*/
function makeCtx(caseData) {
  const S = ids(caseData.suspects), W = ids(caseData.weapons), L = ids(caseData.locations);
  const cat = new Map();
  S.forEach(x => cat.set(x, 'S')); W.forEach(x => cat.set(x, 'W')); L.forEach(x => cat.set(x, 'L'));
  let worlds = [];
  const valid = S.length > 0 && S.length === W.length && S.length === L.length;
  if (valid) {
    for (const wp of permutations(W)) for (const lp of permutations(L)) {
      worlds.push(S.map((s, i) => ({ S: s, W: wp[i], L: lp[i] })));
    }
  }
  return { S, W, L, cat, worlds, valid, sol: solutionOf(caseData) };
}

function ruleHoldsCtx(ctx, rule, world) {
  const pair = (rule && (rule.pair || rule.cift)) || [];
  if (pair.length !== 2) return true;
  const ca = ctx.cat.get(pair[0]), cb = ctx.cat.get(pair[1]);
  if (!ca || !cb || ca === cb) return true;
  const same = world.some(t => t[ca] === pair[0] && t[cb] === pair[1]);
  const action = String((rule && rule.action) || '').toLowerCase();
  if (action === 'confirm') return same;
  if (action === 'eliminate' || action === 'eslesme_yok') return !same;
  return true;
}

function filterWorlds(ctx, pool, rules) {
  return pool.filter(w => rules.every(r => ruleHoldsCtx(ctx, r, w)));
}

function worldMatchesSolution(world, sol) {
  const row = world.find(t => t.S === sol.suspectId);
  return !!row && row.W === sol.weaponId && row.L === sol.locationId;
}

function collectRules(caseData, { includeBonus = false, dropClueId = null } = {}) {
  const out = [];
  for (const cl of (caseData.clues || [])) {
    if (!cl) continue;
    if (!includeBonus && cl.isBonus === true) continue;
    if (dropClueId && String(cl.id) === String(dropClueId)) continue;
    for (const r of (Array.isArray(cl.logicRules) ? cl.logicRules : [])) {
      out.push({ clueId: String(cl.id), action: String(r.action || '').toLowerCase(), pair: (r.pair || r.cift || []).slice() });
    }
  }
  return out;
}

/* --------------------------------------------------------------------------
 * TESHIS
 * ------------------------------------------------------------------------*/
function diagnose(caseData, ctx) {
  ctx = ctx || makeCtx(caseData);
  if (!ctx.valid) return { ok: false, fatal: 'Izgara eksenleri gecersiz veya esit uzunlukta degil.', S: ctx.S, W: ctx.W, L: ctx.L };

  const coreRules = collectRules(caseData, { includeBonus: false });
  const allRules = collectRules(caseData, { includeBonus: true });
  const coreSurv = filterWorlds(ctx, ctx.worlds, coreRules);
  const allSurv = filterWorlds(ctx, ctx.worlds, allRules);

  const solutionSurvives = coreSurv.some(w => worldMatchesSolution(w, ctx.sol));
  const unique = coreSurv.length === 1 && solutionSurvives;

  const coreClueIds = (caseData.clues || [])
    .filter(c => c && c.isBonus !== true && Array.isArray(c.logicRules) && c.logicRules.length)
    .map(c => String(c.id));
  const redundant = [];
  for (const cid of coreClueIds) {
    const without = collectRules(caseData, { includeBonus: false, dropClueId: cid });
    if (filterWorlds(ctx, ctx.worlds, without).length <= 1) redundant.push(cid);
  }

  return {
    ok: unique && !redundant.length,
    S: ctx.S, W: ctx.W, L: ctx.L,
    total_worlds: ctx.worlds.length,
    core_rule_count: coreRules.length,
    surviving_worlds_with_core_clues: coreSurv.length,
    solution_survives_core_clues: solutionSurvives,
    unique_solution_from_core_clues: unique,
    redundant_core_clues: redundant,
    bonus_dependency: !unique && allSurv.length === 1,
    contradictory_rules: coreSurv.length === 0,
    solution: ctx.sol
  };
}

/* --------------------------------------------------------------------------
 * COZUMU KORUYAN TUM TEKIL KISITLAR
 * Cozum satirindaki cift -> confirm; diger her cross-eksen cifti -> eliminate.
 * ------------------------------------------------------------------------*/
function allSolutionSafeConstraints(ctx) {
  const { S, W, L, sol } = ctx;
  const out = [];
  const inSolRow = (a, b) => {
    const set = new Set([sol.suspectId, sol.weaponId, sol.locationId]);
    return set.has(a) && set.has(b);
  };
  const add = (a, b) => out.push({ action: inSolRow(a, b) ? 'confirm' : 'eliminate', pair: [a, b] });
  for (const s of S) { for (const w of W) add(s, w); for (const l of L) add(s, l); }
  for (const w of W) for (const l of L) add(w, l);
  return out;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* Gecerlilik: tam olarak 1 dunya + dogru cozum + her kural gerekli. */
function evaluateSet(ctx, rules) {
  const surv = filterWorlds(ctx, ctx.worlds, rules);
  if (surv.length !== 1) return { ok: false, worlds: surv.length };
  if (!worldMatchesSolution(surv[0], ctx.sol)) return { ok: false, worlds: 1, wrongSolution: true };
  for (let i = 0; i < rules.length; i++) {
    const without = rules.filter((_, j) => j !== i);
    if (filterWorlds(ctx, ctx.worlds, without).length === 1) return { ok: false, redundantIndex: i };
  }
  return { ok: true, worlds: 1 };
}

/* Tam olarak k kurallik gecerli set ara (acgozlu + rastgele yeniden baslatma). */
function findRuleSet(ctx, k, { tries = 200, seed = 7 } = {}) {
  if (!ctx.valid || !(k > 0)) return null;
  const pool = allSolutionSafeConstraints(ctx);
  const solOnly = ctx.worlds.filter(w => worldMatchesSolution(w, ctx.sol));
  if (!solOnly.length) return null;
  const rnd = mulberry32(seed);

  for (let t = 0; t < tries; t++) {
    const order = shuffled(pool, rnd);
    const chosen = [];
    let surv = ctx.worlds;
    for (const c of order) {
      if (chosen.length >= k) break;
      const next = surv.filter(w => ruleHoldsCtx(ctx, c, w));
      if (next.length === surv.length) continue;      // hicbir sey elemiyor
      if (next.length === 0) continue;                // celiski
      const remaining = k - chosen.length - 1;
      if (remaining === 0 && next.length !== 1) continue;   // son kural tekillestirmeli
      if (remaining > 0 && next.length === 1) continue;     // erken tekillesme
      chosen.push(c); surv = next;
    }
    if (chosen.length !== k || surv.length !== 1) continue;
    const ev = evaluateSet(ctx, chosen);
    if (ev.ok) return chosen;
  }
  return null;
}

/* Bu izgarayi tekillestirmek icin EN AZ kac kisit gerekir? (acgozlu alt sinir) */
function minimumConstraintsNeeded(ctx) {
  if (!ctx.valid) return null;
  const pool = allSolutionSafeConstraints(ctx);
  let surv = ctx.worlds, n = 0;
  while (surv.length > 1 && n < 40) {
    let best = null, bestLen = surv.length;
    for (const c of pool) {
      const next = surv.filter(w => ruleHoldsCtx(ctx, c, w));
      if (next.length && next.length < bestLen) { best = c; bestLen = next.length; }
    }
    if (!best) break;
    surv = surv.filter(w => ruleHoldsCtx(ctx, best, w)); n++;
  }
  return surv.length === 1 ? n : null;
}


/* ============================================================================
 * MOTORUN GERCEK GEREKLILIK KRITERI  (birebir taklit)
 *
 * Motor izgaranin tamamini degil, YALNIZ KATILIN SATIRINI sabitlemeyi arar:
 *   cevap adaylari = hayatta kalan her dunyada, beklenen suphelinin (W,L) cifti
 *   tekil cozum   = bu kume tam olarak {beklenen (W,L)}
 *   gereklilik    = bir ipucu cikarilinca bu kume genisliyor
 * Bizim eski kriterimiz ("tam 1 dunya") gereginden katiydi ve motorun
 * kabul ettigi setleri bulamiyordu.
 * ==========================================================================*/
function answerKeySet(ctx, rules) {
  const surv = filterWorlds(ctx, ctx.worlds, rules);
  const out = new Set();
  for (const w of surv) {
    const row = w.find(t => t.S === ctx.sol.suspectId) || w[0];
    if (row) out.add(row.S + '|' + row.W + '|' + row.L);
  }
  return { keys: out, worlds: surv.length };
}

function expectedKey(ctx) {
  return ctx.sol.suspectId + '|' + ctx.sol.weaponId + '|' + ctx.sol.locationId;
}

/* Motor kriterine gore gecerlilik: tekil cevap + her kural gerekli. */
function evaluateSetEngineStyle(ctx, rules) {
  const want = expectedKey(ctx);
  const full = answerKeySet(ctx, rules);
  if (full.keys.size !== 1 || !full.keys.has(want)) {
    return { ok: false, answers: full.keys.size, reason: 'tekil cevap yok' };
  }
  for (let i = 0; i < rules.length; i++) {
    const without = rules.filter((_, j) => j !== i);
    const t = answerKeySet(ctx, without);
    if (t.keys.size === 1 && t.keys.has(want)) {
      return { ok: false, redundantIndex: i, reason: 'kural ' + i + ' gereksiz' };
    }
  }
  return { ok: true };
}

/* Motor kriterini hedefleyen arama. */
function findRuleSetEngineStyle(ctx, k, { tries = 300, seed = 3 } = {}) {
  if (!ctx.valid || !(k > 0)) return null;
  const pool = allSolutionSafeConstraints(ctx);
  const want = expectedKey(ctx);
  const rnd = mulberry32(seed);

  for (let t = 0; t < tries; t++) {
    const order = shuffled(pool, rnd);
    const chosen = [];
    let surv = ctx.worlds;
    let keys = answerKeySet(ctx, []).keys.size;
    for (const c of order) {
      if (chosen.length >= k) break;
      const next = surv.filter(w => ruleHoldsCtx(ctx, c, w));
      if (!next.length) continue;
      const nk = new Set();
      for (const w of next) { const r = w.find(x => x.S === ctx.sol.suspectId) || w[0]; if (r) nk.add(r.S + '|' + r.W + '|' + r.L); }
      if (nk.size >= keys) continue;                       // cevap kumesini daraltmiyor
      const remaining = k - chosen.length - 1;
      if (remaining === 0 && nk.size !== 1) continue;       // son kural tekillestirmeli
      if (remaining > 0 && nk.size === 1) continue;         // erken tekillesme
      chosen.push(c); surv = next; keys = nk.size;
    }
    if (chosen.length !== k) continue;
    const ev = evaluateSetEngineStyle(ctx, chosen);
    if (ev.ok) return chosen;
  }
  return null;
}

/* Temel ipucu sayisina uyan bir mantik iskeleti oner. */
function proposeLogicSkeleton(caseData, ctx) {
  ctx = ctx || makeCtx(caseData);
  const core = (caseData.clues || []).filter(c => c && c.isBonus !== true);
  const k = core.length;
  if (!ctx.valid || k < 2) return null;
  const set = findRuleSetEngineStyle(ctx, k, { tries: 250, seed: 11 }) || findRuleSet(ctx, k, { tries: 120, seed: 11 });
  if (!set) return null;
  return {
    size: k,
    rules: set,
    assignment: core.map((c, i) => ({ clueId: String(c.id), rule: set[i] }))
  };
}

/* --------------------------------------------------------------------------
 * LLM'e verilecek brifing.
 * ------------------------------------------------------------------------*/
function buildLogicBriefing(caseData) {
  const ctx = makeCtx(caseData);
  const d = diagnose(caseData, ctx);
  const lines = [];
  lines.push('MANTIK DURUMU (deterministik olarak hesaplandi, tahmin degil):');
  if (d.fatal) { lines.push('- KRITIK: ' + d.fatal); return lines.join('\n'); }
  lines.push(`- Izgara ${d.S.length}x${d.S.length}, toplam olasi dunya: ${d.total_worlds}`);
  lines.push(`- Cozum: supheli=${d.solution.suspectId}, silah=${d.solution.weaponId}, mekan=${d.solution.locationId}`);
  lines.push(`- Temel ipuclari uygulandiginda kalan olasilik: ${d.surviving_worlds_with_core_clues} (HEDEF: tam olarak 1)`);
  if (d.contradictory_rules) lines.push('- HATA: Kurallar CELISIYOR; hicbir olasilik ayakta kalmiyor.');
  if (!d.solution_survives_core_clues && !d.contradictory_rules) lines.push('- HATA: Mevcut kurallar GERCEK COZUMU eliyor.');
  if (d.bonus_dependency) lines.push('- HATA: Cozum yalnizca BONUS ipuclariyla tekillesiyor; bonuslar zorunlu olamaz.');
  if (d.redundant_core_clues.length) lines.push(`- HATA: Gereksiz temel ipuclari: ${d.redundant_core_clues.join(', ')}`);
  if (d.ok) lines.push('- DURUM: Mantik iskeleti gecerli.');

  if (!d.ok) {
    const sk = proposeLogicSkeleton(caseData, ctx);
    if (sk) {
      lines.push('');
      lines.push('HAZIR MANTIK ISKELETI (bizim tarafimizdan DOGRULANDI: tekil cozum + her ipucu gerekli).');
      lines.push('Bu atamayi AYNEN kullan. Senin isin, her ipucunun METNINI kendi kuralini durustce');
      lines.push('anlatacak sekilde yeniden yazmak. Kuralari degistirme.');
      for (const a of sk.assignment) {
        lines.push(`  ipucu ${a.clueId}: {"action":"${a.rule.action}","pair":["${a.rule.pair[0]}","${a.rule.pair[1]}"]}`);
      }
    } else {
      const core = (caseData.clues || []).filter(c => c && c.isBonus !== true).length;
      const min = minimumConstraintsNeeded(ctx);
      lines.push('');
      if (min != null && core < min) {
        lines.push(`YAPISAL EKSIK: Bu vakada ${core} temel ipucu var, fakat ${d.S.length}x${d.S.length} izgarayi`);
        lines.push(`tekillestirmek icin en az ${min} bagimsiz kisit gerekiyor. Mevcut ipucu sayisiyla adil`);
        lines.push('bir tekil cozum matematiksel olarak MUMKUN DEGIL. Bu vaka icin yeni temel ipucu eklenmelidir;');
        lines.push('bu, otomasyonun tek basina karar veremeyecegi bir icerik genisletmesidir.');
      } else {
        lines.push('NOT: Temel ipucu sayisina birebir uyan bir iskelet bulunamadi.');
        lines.push('Kurallari kendin kur; tum temel ipuclari birlikte TEK cozum vermeli ve her biri gerekli olmali.');
      }
    }
  }
  return lines.join('\n');
}

module.exports = {
  makeCtx, diagnose, collectRules, filterWorlds, ruleHoldsCtx, worldMatchesSolution,
  solutionOf, allSolutionSafeConstraints, evaluateSet, findRuleSet,
  proposeLogicSkeleton, buildLogicBriefing, minimumConstraintsNeeded,
  answerKeySet, expectedKey, evaluateSetEngineStyle, findRuleSetEngineStyle
};
