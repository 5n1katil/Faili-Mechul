#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const VALIDATOR = path.join(__dirname, "validate-premium-suspect-info.js");
const SOURCE_PATHS = {
  db: path.join(ROOT, "data", "puzzles_database.json"),
  audit: path.join(ROOT, "qa", "premium-suspect-info-audit.json"),
  packs: path.join(ROOT, "data", "packs.ts"),
};

function loadSources() {
  return {
    db: JSON.parse(fs.readFileSync(SOURCE_PATHS.db, "utf8")),
    audit: JSON.parse(fs.readFileSync(SOURCE_PATHS.audit, "utf8")),
    packs: fs.readFileSync(SOURCE_PATHS.packs, "utf8"),
  };
}

function findPuzzle(db, puzzleId) {
  for (const pack of db.packs ?? []) {
    const puzzle = pack.puzzles?.find((item) => item.puzzleId === puzzleId);
    if (puzzle) return puzzle;
  }
  throw new Error(`Test vakası bulunamadı: ${puzzleId}`);
}

function runScenario(name, mutate, expectedStatus) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "premium-info-validator-"));
  try {
    const sources = loadSources();
    mutate?.(sources);

    const dbPath = path.join(tempRoot, "puzzles_database.json");
    const auditPath = path.join(tempRoot, "premium-suspect-info-audit.json");
    const packsPath = path.join(tempRoot, "packs.ts");
    fs.writeFileSync(dbPath, `${JSON.stringify(sources.db, null, 2)}\n`);
    fs.writeFileSync(auditPath, `${JSON.stringify(sources.audit, null, 2)}\n`);
    fs.writeFileSync(packsPath, sources.packs);

    const result = spawnSync(process.execPath, [VALIDATOR], {
      encoding: "utf8",
      env: {
        ...process.env,
        PREMIUM_INFO_DB_PATH: dbPath,
        PREMIUM_INFO_AUDIT_PATH: auditPath,
        PREMIUM_INFO_PACKS_PATH: packsPath,
      },
    });

    if (result.status !== expectedStatus) {
      process.stderr.write(result.stdout);
      process.stderr.write(result.stderr);
      throw new Error(`${name}: çıkış ${expectedStatus} beklenirken ${result.status} alındı.`);
    }
    console.log(`✓ ${name}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

runScenario("temiz 45-vaka denetimi geçer", null, 0);

runScenario("kaldırılmış semantik sızıntı geri dönerse kalır", ({ db }) => {
  const suspect = findPuzzle(db, "mit_005").suspects.find((item) => item.id === "s2");
  suspect.detail = "Gece çiçeklerinden uyku tozu hazırlar.";
}, 1);

runScenario("çekimli çözüm mekânı adı doğrudan yazılırsa kalır", ({ db }) => {
  const suspect = findPuzzle(db, "hw_002").suspects.find((item) => item.id === "s2");
  suspect.description = "Kostüm odasına düzenli girer.";
}, 1);

runScenario("özel isimli birleşik silah istisnasız kalır", ({ audit }) => {
  audit.intentionalReferences = audit.intentionalReferences.filter(
    (reference) =>
      !(reference.puzzleId === "mit_003" && reference.suspectId === "s3" && reference.kind === "weapon"),
  );
}, 1);

runScenario("satış kataloğu denetim listesinden saparsa kalır", (sources) => {
  sources.packs = sources.packs.replace(
    '  pack_vaka_arsivi: "com.failimechul.dedektif.pack_vaka_arsivi",',
    '  pack_vaka_arsivi: "com.failimechul.dedektif.pack_vaka_arsivi",\n' +
      '  pack_caylik: "com.failimechul.dedektif.pack_caylik",',
  );
}, 1);

runScenario("veritabanı olmayan yeni katalog ürünü eklenirse kalır", (sources) => {
  sources.packs = sources.packs.replace(
    '  pack_vaka_arsivi: "com.failimechul.dedektif.pack_vaka_arsivi",',
    '  pack_vaka_arsivi: "com.failimechul.dedektif.pack_vaka_arsivi",\n' +
      '  pack_yetim: "com.failimechul.dedektif.pack_yetim",',
  );
}, 1);

console.log("✓ Premium şüpheli info validator regresyon testleri geçti.");