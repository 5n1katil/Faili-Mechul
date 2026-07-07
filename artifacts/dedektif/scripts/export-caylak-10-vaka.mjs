import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dedektifRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(dedektifRoot, "../..");

const STANDART_IDS = [
  "folklor-festivalinde-olum",
  "termal-otelde-supheli-vaka",
  "koy-dugununde-trajedi",
  "uskudarda-kayip-vapur",
  "sultanahmette-turist-tuzagi",
];

const ANALYSES = {
  "folklor-festivalinde-olum":
    "Ankara folklor festivalinde koordinatör sahnede elektrik şokuyla ölür; ipuçları voltaj yanığını sahne + elektrik sabotajına, suçu ses altyapısına hakim teknik personele bağlar. Çözüm: Ses Teknikeri + Elektrik Darbesi + Sahne.",
  "termal-otelde-supheli-vaka":
    "Bursa termal otelinde ünlü şarkıcı buharlı saunada boğularak ölür; ipuçları nefes kesilmesini sauna mekanına, suçu takıntılı eski hayrana yönlendirir. Çözüm: Eski Hayranı + Boğma + Sauna.",
  "koy-dugununde-trajedi":
    "Doğu Anadolu köy düğününde gelinin babası ahır arkasında av tüfeğiyle vurulur; halay alibisi damadı ve fotoğrafçıyı temizler, kan davalı muhtarı işaret eder. Çözüm: Köy Muhtarı + Av Tüfeği + Ahır Arkası.",
  "uskudarda-kayip-vapur":
    "Boğaz vapuru üzerinde yönetici motor dairesinde halatla boğulur; kaptan ve iskelede kalan yolcu elenir, biletçi/güverte görevlisinin alt kata erişimi suçu işaret eder. Çözüm: Muzaffer + Gemi Halatı + Motor Dairesi.",
  "sultanahmette-turist-tuzagi":
    "Sultanahmet'te turist gasp değil, Yerebatan Sarnıcı'nda uyuşturucu şişeyle hedefli suikasttır; sokak satıcısı ve çatıdaki fotoğrafçı elenir, resmi rehber suçlu kalır. Çözüm: Ayşen Demir + Uyuşturucu Şişe + Yerebatan Sarnıcı.",
  yeni_c01:
    "Büyükada köşkünde kapalı alan cinayeti; çapraz eleme ile Tarık (vazo/kütüphane) ve Sabri (yastık/yatak) ayrılır — asıl katil emeklilik intikamı için çayı zehirleyen Eski Sekreteri Nilgün. Çözüm: Nilgün + Zehirli Çay + Mutfak.",
  yeni_c02:
    "Bursa tarihi hamamında tekstil tüccarı göbek taşında bakır kovayla öldürülür; Fikri soyunma odasında, Nuri su deposunda elenir, zimmet skandalı olan Muhasebeci Dilara kalır. Çözüm: Dilara + Kaynar Su Kovası + Göbek Taşı.",
  yeni_c03:
    "Kemeraltı kuyumcusunda hırsızlık değil intikam; kare pirinç göçüğü terazi kefesini, vitrindeki çırak Ferdi'yi işaret eder. Çözüm: Ferdi + Kuyumcu Terazisi + Vitrin Önü.",
  yeni_c04:
    "Nişantaşı atölyesinde Paris defilesi öncesi tasarımcı dikiş makasıyla öldürülür; Bülent ofiste, Sevgi boya odasında elenir, ismi afişten silinen Hande intikam alır. Çözüm: Hande + Dikiş Makası + Dikiş Atölyesi.",
  yeni_c05:
    "Uludağ'da kar fırtınasıyla izole dağ evinde maktul yatak odasında sedatif aşırı dozla ölür; Rasim garajda, Selim oturma odasında elenir, Doktor Leyla gece içeceğine ilaç karıştırır. Çözüm: Leyla + Uyku İlacı Aşırı Dozu + Yatak Odası.",
};

function extractPuzzleFromTs(source, id) {
  const marker = `id: "${id}"`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Puzzle not found: ${id}`);
  const objStart = source.lastIndexOf("{", start);
  let depth = 0;
  let i = objStart;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  const chunk = source.slice(objStart, i);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${chunk});`)();
}

const ts = fs.readFileSync(path.join(dedektifRoot, "data/puzzles.ts"), "utf8");
const db = JSON.parse(
  fs.readFileSync(path.join(dedektifRoot, "data/puzzles_database.json"), "utf8"),
);
const pack = db.packs.find((p) => p.packId === "pack_caylik");
if (!pack) throw new Error("pack_caylik not found");

const standartCases = STANDART_IDS.map((id, idx) => {
  const data = extractPuzzleFromTs(ts, id);
  return {
    caseNumber: idx + 1,
    title: data.title,
    region: ["Ankara", "Bursa", "Doğu Anadolu", "İstanbul", "İstanbul"][idx],
    source: "artifacts/dedektif/data/puzzles.ts",
    format: "standart",
    analysis: ANALYSES[id],
    puzzle: data,
  };
});

const premiumCases = pack.puzzles.map((puzzle, idx) => ({
  caseNumber: idx + 6,
  title: puzzle.title,
  region: puzzle.subtitle,
  source: "artifacts/dedektif/data/puzzles_database.json (pack_caylik)",
  format: "premium",
  analysis: ANALYSES[puzzle.puzzleId],
  puzzle,
}));

const output = {
  meta: {
    description:
      "Faili Meçhul — Çaylak seviyesi 10 başlangıç vakası. Gemini premium dedüksiyon rewrite için read-only referans.",
    generatedAt: new Date().toISOString(),
    standartFormatNotes:
      "Vaka 1–5: puzzles.ts — solvabilityMeta, 6 clues (4 free + 2 bonus), difficulty caylak.",
    premiumFormatNotes:
      "Vaka 6–10: pack_caylik — solution_table, 8 clues with pointCost/mechanicType, gridSize 3x3, timeLimit 540.",
    rewriteRedLines: [
      "Sadece metin alanları değiştirilebilir: story, atmosphere, clues.*.text, deductionHint, solutionNarrative vb.",
      "id, solution, mechanicType, interaktif veri (parmakIziVerisi, timelineVerisi, sesMetni) korunmalı.",
    ],
  },
  cases: [...standartCases, ...premiumCases],
};

const outPath = path.join(repoRoot, "attached_assets/caylak_10_vaka_gemini.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
console.log(`Wrote ${output.cases.length} cases to ${outPath}`);
