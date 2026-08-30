#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DB_PATH = process.env.PREMIUM_INFO_DB_PATH || path.join(ROOT, "data", "puzzles_database.json");
const AUDIT_PATH = process.env.PREMIUM_INFO_AUDIT_PATH || path.join(ROOT, "qa", "premium-suspect-info-audit.json");
const PACKS_PATH = process.env.PREMIUM_INFO_PACKS_PATH || path.join(ROOT, "data", "packs.ts");

const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8"));
const packsSource = fs.readFileSync(PACKS_PATH, "utf8");
const failures = [];
const approved = [];

function normalize(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

const ENTITY_STOP_WORDS = new Set([
  "agir", "eski", "yeni", "oda", "odasi", "salon", "salonu", "alan", "alani",
  "bolum", "bolumu", "gizli", "olumcul", "zehirli", "araci", "tuzagi", "sivi",
  "sivisi", "tozu", "tozlari", "karisimi", "mekanizmasi", "blok", "blogu",
]);

const TURKISH_SUFFIXES = [
  "larinda", "lerinde", "larinin", "lerinin", "lardan", "lerden", "lari", "leri",
  "nda", "nde", "dan", "den", "nin", "nun", "in", "un", "si", "su", "ta", "te",
];

function stem(token) {
  for (const suffix of TURKISH_SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 4) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

function entityTerms(name, excludedWords = []) {
  const excludedStems = new Set(tokens(excludedWords.join(" ")).map(stem));
  return tokens(name)
    .filter((token) => token.length >= 4 && !ENTITY_STOP_WORDS.has(token))
    .map(stem)
    .filter((term) => !excludedStems.has(term));
}

function mentionsEntity(text, entityName, excludedWords = []) {
  const textTokens = tokens(text).map(stem);
  const terms = entityTerms(entityName, excludedWords);
  return terms.length > 0 && terms.every(
    (term) => textTokens.some((token) => token.startsWith(term) || term.startsWith(token)),
  );
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameValues(left, right) {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

const intentionalReferenceKeys = new Set(
  audit.intentionalReferences
    .filter(({ kind }) => kind === "weapon" || kind === "location")
    .map(
    ({ puzzleId, suspectId, kind }) => `${puzzleId}:${suspectId}:${kind}`,
    ),
);

const productIdBlock = packsSource.match(
  /export const PACK_PRODUCT_IDS:[\s\S]*?=\s*\{([\s\S]*?)\n\};/,
);
if (!productIdBlock) {
  failures.push("data/packs.ts içindeki PACK_PRODUCT_IDS kataloğu okunamadı.");
}

const catalogPackIds = productIdBlock
  ? [...productIdBlock[1].matchAll(/^\s*([a-zA-Z0-9_]+)\s*:/gm)].map((match) => match[1])
  : [];
const databasePackIds = new Set((db.packs ?? []).map((pack) => pack.packId));
const catalogOnlyProducts = audit.catalogOnlyProducts ?? [];
const catalogOnlyProductIds = catalogOnlyProducts.map(({ packId }) => packId);
const orphanCatalogIds = catalogPackIds.filter((packId) => !databasePackIds.has(packId));

if (!sameValues(orphanCatalogIds, catalogOnlyProductIds)) {
  failures.push(
    `Veritabanı paketi olmayan katalog ürünleri gerekçeli istisnalarla eşleşmiyor. ` +
    `Katalog orphan: [${sorted(orphanCatalogIds).join(", ")}], ` +
    `istisna: [${sorted(catalogOnlyProductIds).join(", ")}].`,
  );
}
for (const product of catalogOnlyProducts) {
  if (!product.reason?.trim()) {
    failures.push(`${product.packId}: katalog-only ürün istisnasının gerekçesi eksik.`);
  }
  if (!catalogPackIds.includes(product.packId)) {
    failures.push(`${product.packId}: katalog-only istisnası PACK_PRODUCT_IDS içinde yok.`);
  }
  if (databasePackIds.has(product.packId)) {
    failures.push(`${product.packId}: katalog-only istisnası artık veritabanı paketine sahip; istisna kaldırılmalı.`);
  }
}

const purchasablePackIds = catalogPackIds.filter(
  (packId) => databasePackIds.has(packId) && !catalogOnlyProductIds.includes(packId),
);

if (!sameValues(purchasablePackIds, audit.premiumPackIds)) {
  failures.push(
    `Denetlenen paketler canlı satış kataloğuyla eşleşmiyor. ` +
    `Katalog: [${sorted(purchasablePackIds).join(", ")}], ` +
    `denetim: [${sorted(audit.premiumPackIds).join(", ")}].`,
  );
}

const premiumPackIds = new Set(purchasablePackIds);
const premiumCases = [];
for (const pack of db.packs ?? []) {
  if (!premiumPackIds.has(pack.packId)) continue;
  for (const puzzle of pack.puzzles ?? []) {
    premiumCases.push({ packId: pack.packId, puzzle });
  }
}

if (premiumCases.length !== 45) {
  failures.push(`Premium vaka sayısı 45 olmalı; ${premiumCases.length} bulundu.`);
}

const currentCaseIds = new Set(premiumCases.map(({ puzzle }) => puzzle.puzzleId));
const reviewedCaseIds = new Set(Object.keys(audit.reviewedCases));
for (const puzzleId of currentCaseIds) {
  if (!reviewedCaseIds.has(puzzleId)) failures.push(`${puzzleId}: içerik denetimi kaydı eksik.`);
}
for (const puzzleId of reviewedCaseIds) {
  if (!currentCaseIds.has(puzzleId)) failures.push(`${puzzleId}: denetim kaydı artık premium vaka listesinde yok.`);
}

const allowedStatuses = new Set(["safe", "updated", "intentional-clue"]);
const updatedCaseIds = new Set(audit.updatedFields.map(({ puzzleId }) => puzzleId));
const intentionalCaseIds = new Set(audit.intentionalReferences.map(({ puzzleId }) => puzzleId));
for (const [puzzleId, status] of Object.entries(audit.reviewedCases)) {
  if (!allowedStatuses.has(status)) failures.push(`${puzzleId}: geçersiz denetim durumu "${status}".`);
  if (status === "updated" && !updatedCaseIds.has(puzzleId)) {
    failures.push(`${puzzleId}: "updated" durumu var ancak updatedFields kaydı yok.`);
  }
  if (status === "intentional-clue" && !intentionalCaseIds.has(puzzleId)) {
    failures.push(`${puzzleId}: "intentional-clue" durumu var ancak gerekçeli ilişki kaydı yok.`);
  }
  if (status === "safe" && (updatedCaseIds.has(puzzleId) || intentionalCaseIds.has(puzzleId))) {
    failures.push(`${puzzleId}: "safe" durumu değişiklik veya kasıtlı ilişki kaydıyla çelişiyor.`);
  }
}

for (const { packId, puzzle } of premiumCases) {
  const solution = puzzle.solution ?? {};
  const weapon = (puzzle.weapons ?? []).find((item) => item.id === solution.weaponId);
  const location = (puzzle.locations ?? []).find((item) => item.id === solution.locationId);
  const ref = `${packId}/${puzzle.puzzleId}`;

  if (!(puzzle.suspects ?? []).some((item) => item.id === solution.suspectId) || !weapon || !location) {
    failures.push(`${ref}: çözüm şüphelisi, silahı veya mekânı bulunamadı.`);
    continue;
  }

  for (const suspect of puzzle.suspects ?? []) {
    const suspectText = `${suspect.description ?? ""} ${suspect.detail ?? ""}`;
    const normalizedText = normalize(suspectText);
    const checks = [
      ["weapon", weapon.name, [suspect.name]],
      ["location", location.name, []],
    ];

    for (const [kind, entityName, excludedWords] of checks) {
      if (!mentionsEntity(suspectText, entityName, excludedWords)) continue;
      const key = `${puzzle.puzzleId}:${suspect.id}:${kind}`;
      if (intentionalReferenceKeys.has(key)) {
        approved.push(`${ref} ${suspect.name}: kasıtlı ${kind} ilişkisi`);
      } else {
        failures.push(
          `${ref} ${suspect.name}: şüpheli kartı çözülen ${kind === "weapon" ? "silahı" : "mekânı"} ` +
          `"${entityName}" doğrudan çağrıştırıyor; gerekçeli istisna veya metin düzeltmesi gerekli.`,
        );
      }
    }

    if (/\b(katil oldugunu|cinayeti isledi|onu oldurdu|kurbani oldurdu|kurbani zehirledi)\b/.test(normalizedText)) {
      failures.push(`${ref} ${suspect.name}: şüpheli kartında doğrudan suç itirafı/sonuç ifadesi var.`);
    }
  }
}

for (const reference of audit.intentionalReferences) {
  const entry = premiumCases.find(({ puzzle }) => puzzle.puzzleId === reference.puzzleId);
  const suspect = entry?.puzzle.suspects?.find((item) => item.id === reference.suspectId);
  if (!suspect) {
    failures.push(`${reference.puzzleId}/${reference.suspectId}: kasıtlı ilişki hedefi bulunamadı.`);
    continue;
  }
  if (!reference.reason?.trim()) {
    failures.push(`${reference.puzzleId}/${reference.suspectId}/${reference.kind}: istisna gerekçesi eksik.`);
  }
  if (reference.kind === "semantic" && !(reference.fragments?.length > 0)) {
    failures.push(`${reference.puzzleId}/${reference.suspectId}: semantik istisna için fragments eksik.`);
  }
  const suspectText = normalize(`${suspect.description ?? ""} ${suspect.detail ?? ""}`);
  for (const fragment of reference.fragments ?? []) {
    if (!suspectText.includes(normalize(fragment))) {
      failures.push(
        `${reference.puzzleId}/${reference.suspectId}: kasıtlı ilişki parçası artık metinde yok: "${fragment}".`,
      );
    }
  }
}

for (const regression of audit.forbiddenRegressions) {
  const entry = premiumCases.find(({ puzzle }) => puzzle.puzzleId === regression.puzzleId);
  const suspect = entry?.puzzle.suspects?.find((item) => item.id === regression.suspectId);
  if (!suspect) {
    failures.push(`${regression.puzzleId}/${regression.suspectId}: regresyon hedefi bulunamadı.`);
    continue;
  }
  const suspectText = normalize(`${suspect.description ?? ""} ${suspect.detail ?? ""}`);
  for (const fragment of regression.fragments) {
    if (suspectText.includes(normalize(fragment))) {
      failures.push(
        `${regression.puzzleId}/${regression.suspectId}: kaldırılmış çözüm sızıntısı geri dönmüş: "${fragment}".`,
      );
    }
  }
}

console.log(`Premium şüpheli info denetimi: ${premiumCases.length} vaka, ${reviewedCaseIds.size} kayıt.`);
console.log(`Gerekçeli kasıtlı ilişkiler: ${approved.length}.`);

if (failures.length > 0) {
  console.error(`\nERROR: ${failures.length} premium şüpheli info sorunu:\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log("✓ 45 premium vakanın şüpheli info kalite kapısı geçti.");