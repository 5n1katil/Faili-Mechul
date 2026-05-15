#!/usr/bin/env node
/** Slugify puzzle ids only — does not touch story/clues. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function titleToSlug(title) {
  const tr = {
    ğ: "g", ü: "u", ş: "s", ı: "i", ö: "o", ç: "c",
    Ğ: "g", Ü: "u", Ş: "s", İ: "i", Ö: "o", Ç: "c",
    â: "a", Â: "a",
  };
  let s = title.toLowerCase();
  for (const [k, v] of Object.entries(tr)) s = s.split(k).join(v);
  return s
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

let puzzlesTs = fs.readFileSync(path.join(ROOT, "data/puzzles.ts"), "utf8");

const oldToSlug = {};
puzzlesTs = puzzlesTs.replace(
  /id: "(p\d+)",\s*\n\s*title: "([^"]+)"/g,
  (_m, oldId, title) => {
    const slug = titleToSlug(title);
    oldToSlug[oldId] = slug;
    return `id: "${slug}",\n    title: "${title}"`;
  }
);

const slugs = Object.values(oldToSlug);
if (new Set(slugs).size !== slugs.length) {
  console.error("Duplicate slugs!");
  process.exit(1);
}

if (!puzzlesTs.includes("export function titleToSlug")) {
  puzzlesTs = puzzlesTs.replace(
    'export type Difficulty = "caylak" | "dedektif" | "baskomiser";\n\n',
    `export type Difficulty = "caylak" | "dedektif" | "baskomiser";\n\nexport function titleToSlug(title: string): string {
  const tr: Record<string, string> = {
    "ğ": "g", "ü": "u", "ş": "s", "ı": "i", "ö": "o", "ç": "c",
    "â": "a", "Â": "a",
  };
  let s = title.toLowerCase();
  for (const [k, v] of Object.entries(tr)) s = s.split(k).join(v);
  return s
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

`
  );
}

fs.writeFileSync(path.join(ROOT, "data/puzzles.ts"), puzzlesTs);

const extraOld = ["p030", "p031", "p032", "p033", "p034", "p035", "p036", "p037", "p038", "p039", "p040", "p041"];
const extraSlugs = extraOld.map((id) => oldToSlug[id]);
let oyunTs = fs.readFileSync(path.join(ROOT, "app/(tabs)/oyun.tsx"), "utf8");
oyunTs = oyunTs.replace(
  /const EXTRA_FREE_PUZZLE_IDS: ReadonlySet<string> = new Set\(\[[\s\S]*?\]\);/,
  `const EXTRA_FREE_PUZZLE_IDS: ReadonlySet<string> = new Set([\n${extraSlugs.map((s) => `  "${s}",`).join("\n")}\n]);`
);
fs.writeFileSync(path.join(ROOT, "app/(tabs)/oyun.tsx"), oyunTs);

console.log("OK", Object.keys(oldToSlug).length, "slugs");
console.log(JSON.stringify(oldToSlug, null, 2));
