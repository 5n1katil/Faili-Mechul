#!/usr/bin/env node
/**
 * validate-parmak-izi.js
 *
 * Kapsamlı parmak izi eşleştirme doğrulayıcısı.
 *
 * Her parmak_izi ipucunun:
 *   1. Gerekli alanları içerdiğini (izler, sonuc, aciklama)
 *   2. En az bir iz tanımladığını
 *   3. Her izin geçerli izId, konum, ipucu ve eslesme alanlarına sahip olduğunu
 *   4. Görsel desenli oyunda eslesme şüphelisinin deseninin sahne deseniyle
 *      aynı olduğunu; eski metin tabanlı oyunda eslesme değerinin sonuc
 *      stringinde yer aldığını (handleConfirm ile bire bir uyumlu)
 *   5. Çift eşleşme vakalarında (rc_002 gibi) her iki eşleşmenin de sonuçta geçtiğini
 *
 * Çıkış kodları:
 *   0 — tüm kontroller geçti
 *   1 — bir veya daha fazla hata bulundu
 */

"use strict";

const fs = require("fs");
const path = require("path");

const DB_PATH = path.resolve(__dirname, "../data/puzzles_database.json");

// ---------------------------------------------------------------------------
// Veri yükle
// ---------------------------------------------------------------------------
let db;
try {
  db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
} catch (e) {
  console.error(`HATA: puzzles_database.json okunamadı:\n  ${e.message}`);
  process.exit(1);
}

const packs = db.packs ?? [];
if (!Array.isArray(packs) || packs.length === 0) {
  console.error("HATA: Veritabanında geçerli 'packs' dizisi bulunamadı.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tüm bulmacaları topla
// ---------------------------------------------------------------------------
const allPuzzles = [];
for (const pack of packs) {
  for (const puzzle of pack.puzzles ?? []) {
    allPuzzles.push({ packId: pack.packId, puzzle });
  }
}

// ---------------------------------------------------------------------------
// Parmak izi ipuçlarını doğrula
// ---------------------------------------------------------------------------
const errors = [];
const results = [];
let totalChecked = 0;
let totalFingerprints = 0;

for (const { packId, puzzle } of allPuzzles) {
  const clues = puzzle.clues ?? [];
  for (let clueIdx = 0; clueIdx < clues.length; clueIdx++) {
    const clue = clues[clueIdx];
    if (clue.mechanicType !== "parmak_izi") continue;

    totalChecked++;
    const loc = `${packId}/${puzzle.puzzleId} ipucu[${clueIdx}] "${clue.title ?? clue.id}"`;

    const v = clue.parmakIziVerisi;

    // --- Yapısal kontroller ---
    if (!v) {
      errors.push(`${loc}: parmakIziVerisi eksik`);
      continue;
    }
    if (!v.aciklama || typeof v.aciklama !== "string") {
      errors.push(`${loc}: aciklama eksik veya string değil`);
    }
    if (!v.sonuc || typeof v.sonuc !== "string") {
      errors.push(`${loc}: sonuc eksik veya string değil`);
    }
    if (!Array.isArray(v.izler) || v.izler.length === 0) {
      errors.push(`${loc}: izler dizisi eksik veya boş`);
      continue;
    }

    const sonuc = v.sonuc ?? "";
    const scenePattern = v.sahneGorseli ?? null;
    const suspectPatterns = new Map(
      (puzzle.suspects ?? []).map((suspect) => [suspect.id, suspect.parmakIziDeseni ?? null])
    );

    if (scenePattern) {
      const matchingSuspects = [...suspectPatterns.entries()]
        .filter(([, pattern]) => pattern === scenePattern)
        .map(([suspectId]) => suspectId);
      if (matchingSuspects.length !== 1) {
        errors.push(
          `${loc}: sahneGorseli="${scenePattern}" tam olarak bir şüpheliyle eşleşmeli; ` +
          `${matchingSuspects.length} eşleşme bulundu (${matchingSuspects.join(", ") || "yok"})`
        );
      }
    }
    let correctInThisClue = 0;

    let decoyCount = 0;

    for (let izIdx = 0; izIdx < v.izler.length; izIdx++) {
      const iz = v.izler[izIdx];
      totalFingerprints++;
      const izLoc = `${loc} iz[${izIdx}] (${iz.izId ?? "?"})`;

      // --- iz alan kontrolleri ---
      if (!iz.izId || typeof iz.izId !== "string") {
        errors.push(`${izLoc}: izId eksik veya string değil`);
      }
      if (!iz.konum || typeof iz.konum !== "string") {
        errors.push(`${izLoc}: konum eksik veya string değil`);
      }
      if (!iz.ipucu || typeof iz.ipucu !== "string") {
        errors.push(`${izLoc}: ipucu eksik veya string değil`);
      }
      if (!iz.eslesme || typeof iz.eslesme !== "string") {
        errors.push(`${izLoc}: eslesme eksik veya string değil`);
        continue;
      }

      // --- Eşleşme kontrolü (handleConfirm mantığı) ---
      // Yeni görsel oyunda seçilen şüphelinin parmakIziDeseni sahneGorseli ile
      // karşılaştırılır. Eski metin tabanlı oyunda sonuc.includes kullanılır.
      const matches = scenePattern
        ? suspectPatterns.get(iz.eslesme) === scenePattern
        : sonuc.includes(iz.eslesme);

      if (iz.isDecoy === true) {
        // Yanlış iz (decoy): eslesme sonuçta OLMAMALI
        decoyCount++;
        if (matches) {
          errors.push(
            `${izLoc}: isDecoy=true ama eslesme="${iz.eslesme}" sonuçta bulundu!\n` +
            `  Bu bir çelişki — gerçek iz ile decoy iz karıştırılmış.\n` +
            (scenePattern
              ? `  sahneGorseli: "${scenePattern}"`
              : `  sonuc: "${sonuc}"`)
          );
        }
      } else {
        // Normal iz: eslesme sonuçta OLMALI
        if (!matches) {
          errors.push(
            `${izLoc}: eslesme="${iz.eslesme}" sonuçta bulunamadı!\n` +
            (scenePattern
              ? `  şüpheli deseni: "${suspectPatterns.get(iz.eslesme) ?? "yok"}", sahneGorseli: "${scenePattern}"`
              : `  sonuc: "${sonuc}"`)
          );
        } else {
          correctInThisClue++;
        }
      }
    }

    // Her parmak izi clue'da en az bir doğru iz olmalı
    if (correctInThisClue === 0) {
      errors.push(`${loc}: Hiçbir iz sonuçla eşleşmiyor!`);
    }

    const nonDecoyCount = v.izler.filter((iz) => !iz.isDecoy).length;

    // --- Sonuç kaydı ---
    results.push({
      loc,
      puzzleId: puzzle.puzzleId,
      packId,
      izlerCount: v.izler.length,
      nonDecoyCount,
      correctCount: correctInThisClue,
      decoyCount,
      sonuc,
      isDoubleMatch: nonDecoyCount > 1,
    });
  }
}

// ---------------------------------------------------------------------------
// Özet çıktı
// ---------------------------------------------------------------------------
console.log(`\n${"─".repeat(60)}`);
console.log("  PARMAK İZİ DOĞRULAMA RAPORU");
console.log(`${"─".repeat(60)}\n`);
console.log(`Toplam bulmaca sayısı     : ${allPuzzles.length}`);
console.log(`Parmak izi ipucu sayısı   : ${totalChecked}`);
console.log(`Toplam iz sayısı          : ${totalFingerprints}`);
console.log(`Çift eşleşme vakası       : ${results.filter((r) => r.isDoubleMatch).length}`);

if (results.length > 0) {
  console.log("\n▶ Kontrol edilen vakalar:\n");
  for (const r of results) {
    const badge = r.correctCount === r.nonDecoyCount ? "✅" : "❌";
    const extra = r.isDoubleMatch
      ? ` [ÇİFT EŞLEŞMİ: her iki iz geçerli]`
      : "";
    const decoyNote = r.decoyCount > 0 ? ` (+${r.decoyCount} decoy)` : "";
    console.log(`  ${badge} ${r.puzzleId.padEnd(12)} ${r.loc.split("/").pop() ?? ""}${extra}${decoyNote}`);
  }
}

// Çift eşleşme özel raporu
const doubleMatches = results.filter((r) => r.isDoubleMatch);
if (doubleMatches.length > 0) {
  console.log("\n▶ Çift eşleşme vakaları (her iki seçenek de doğru sayılır):\n");
  for (const r of doubleMatches) {
    console.log(`  ✅ ${r.puzzleId}: ${r.correctCount}/${r.nonDecoyCount} iz eşleşti — "${r.sonuc}"`);
  }
}

// Decoy özeti
const withDecoys = results.filter((r) => r.decoyCount > 0);
if (withDecoys.length > 0) {
  console.log("\n▶ Yanıltıcı iz (decoy) içeren vakalar:\n");
  for (const r of withDecoys) {
    console.log(`  🎭 ${r.puzzleId}: ${r.decoyCount} yanıltıcı iz — yanlış seçim "Yanlış iz — tekrar dene" gösterir`);
  }
}

console.log(`\n${"─".repeat(60)}`);

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} HATA BULUNDU:\n`);
  for (const err of errors) {
    console.error(`  • ${err}`);
  }
  console.error("");
  process.exit(1);
} else {
  console.log(`\n✅ Tüm ${totalChecked} parmak izi ipucu ve ${totalFingerprints} iz doğrulandı. Hata yok.\n`);
  process.exit(0);
}
