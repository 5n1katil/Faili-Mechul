#!/usr/bin/env node
/**
 * Restore puzzles.ts from git HEAD (last committed curated content),
 * re-apply slug ids, manual avatar overrides, and optional story/clues
 * preserved from the current working tree.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");
const PUZZLES_PATH = path.join(ROOT, "data", "puzzles.ts");
const OYUN_PATH = path.join(ROOT, "app/(tabs)/oyun.tsx");
const AVATAR_OVERRIDES_PATH = path.join(ROOT, "data", "suspect-avatar-overrides.json");
const STORY_SNAPSHOT_PATH = path.join(ROOT, "data", "puzzle-story-clues-snapshot.json");

function titleToSlug(title) {
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

function loadAvatarOverrides() {
  if (!fs.existsSync(AVATAR_OVERRIDES_PATH)) return new Map();
  const raw = JSON.parse(fs.readFileSync(AVATAR_OVERRIDES_PATH, "utf-8"));
  const map = new Map();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_") || typeof v !== "string") continue;
    map.set(k, v);
  }
  return map;
}

/** Parse puzzle blocks from puzzles.ts source (regex-based, good enough for our structure). */
function parsePuzzleBlocks(src) {
  const blocks = [];
  const re = /{\s*\n\s*id:\s*"([^"]+)",\s*\n\s*title:\s*"([^"]+)",[\s\S]*?\n\s*solution:\s*\{[^}]+\},\s*\n\s*}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const chunk = m[0];
    const id = m[1];
    const title = m[2];
    const storyM = chunk.match(/story:\s*\n\s*"((?:[^"\\]|\\.)*)"/);
    const cluesM = chunk.match(/clues:\s*\[([\s\S]*?)\],\s*\n\s*solvabilityMeta/);
    blocks.push({
      id,
      title,
      slug: titleToSlug(title),
      story: storyM ? storyM[1] : "",
      cluesBlock: cluesM ? cluesM[1] : null,
      full: chunk,
    });
  }
  return blocks;
}

function extractStoryCluesSnapshot() {
  const cur = fs.readFileSync(PUZZLES_PATH, "utf-8");
  const blocks = parsePuzzleBlocks(cur);
  const out = {};
  for (const b of blocks) {
    if (b.cluesBlock) {
      out[b.slug] = { story: b.story, cluesBlock: b.cluesBlock };
    }
  }
  fs.writeFileSync(STORY_SNAPSHOT_PATH, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Snapshot: ${Object.keys(out).length} puzzles -> ${STORY_SNAPSHOT_PATH}`);
}

function restoreFromHead() {
  console.warn(
    "SKIP restoreFromHead — git HEAD uses Material icons (generic purple silhouettes).",
  );
  console.warn("Keep current puzzles.ts stories/clues; run assign-suspect-avatars + apply-suspect-avatar-overrides instead.");
}

function slugifyPuzzlesTs() {
  let src = fs.readFileSync(PUZZLES_PATH, "utf-8");
  const oldToSlug = {};
  src = src.replace(/id: "(p\d+)",\s*\n\s*title: "([^"]+)"/g, (_m, oldId, title) => {
    const slug = titleToSlug(title);
    oldToSlug[oldId] = slug;
    return `id: "${slug}",\n    title: "${title}"`;
  });

  if (!src.includes("export function titleToSlug")) {
    src = src.replace(
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

`,
    );
  }

  fs.writeFileSync(PUZZLES_PATH, src, "utf-8");

  const extraOld = ["p030", "p031", "p032", "p033", "p034", "p035", "p036", "p037", "p038", "p039", "p040", "p041"];
  const extraSlugs = extraOld.map((id) => oldToSlug[id]).filter(Boolean);
  let oyunTs = fs.readFileSync(OYUN_PATH, "utf-8");
  oyunTs = oyunTs.replace(
    /const EXTRA_FREE_PUZZLE_IDS: ReadonlySet<string> = new Set\(\[[\s\S]*?\]\);/,
    `const EXTRA_FREE_PUZZLE_IDS: ReadonlySet<string> = new Set([\n${extraSlugs.map((s) => `  "${s}",`).join("\n")}\n]);`,
  );
  fs.writeFileSync(OYUN_PATH, oyunTs, "utf-8");
  console.log(`Slugified ${Object.keys(oldToSlug).length} puzzle ids; updated EXTRA_FREE_PUZZLE_IDS`);
  return oldToSlug;
}

function applyAvatarOverrides() {
  const overrides = loadAvatarOverrides();
  if (overrides.size === 0) return;
  let src = fs.readFileSync(PUZZLES_PATH, "utf-8");
  const SUSPECT_RE =
    /(\{\s*id:\s*"(s\d+)"\s*,\s*name:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*description:\s*"((?:[^"\\]|\\.)*)"\s*,\s*icon:\s*")[^"]*(")/g;
  const PUZZLE_ID_RE = /^[ \t]{4}id:\s*"([^"]+)",/gm;
  const anchors = [];
  let pm;
  while ((pm = PUZZLE_ID_RE.exec(src)) !== null) {
    anchors.push({ offset: pm.index, id: pm[1] });
  }
  function puzzleIdAt(offset) {
    let lo = 0;
    let hi = anchors.length - 1;
    let pick = anchors[0]?.id ?? "";
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (anchors[mid].offset <= offset) {
        pick = anchors[mid].id;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return pick;
  }
  let n = 0;
  src = src.replace(SUSPECT_RE, (full, prefix, sid, _name, _desc, suffix, offset) => {
    const key = `${puzzleIdAt(offset)}:${sid}`;
    const icon = overrides.get(key);
    if (!icon) return full;
    n++;
    return `${prefix}${icon}${suffix}`;
  });
  fs.writeFileSync(PUZZLES_PATH, src, "utf-8");
  console.log(`Applied ${n} manual avatar override(s)`);
}

/** Re-apply longer story + clues from snapshot for puzzles that were expanded in a later edit pass. */
function applyStoryCluesSnapshot(slugsToApply) {
  if (!fs.existsSync(STORY_SNAPSHOT_PATH)) return;
  const snapshot = JSON.parse(fs.readFileSync(STORY_SNAPSHOT_PATH, "utf-8"));
  let src = fs.readFileSync(PUZZLES_PATH, "utf-8");
  let applied = 0;
  for (const slug of slugsToApply) {
    const snap = snapshot[slug];
    if (!snap) continue;
    const puzzleRe = new RegExp(
      `(id:\\s*"${slug}"[\\s\\S]*?story:\\s*\\n\\s*")((?:[^"\\\\]|\\\\.)*)("[\\s\\S]*?clues:\\s*\\[)[\\s\\S]*?(\\],\\s*\\n\\s*solvabilityMeta)`,
    );
    if (!puzzleRe.test(src)) {
      console.warn(`  skip story/clues (not found): ${slug}`);
      continue;
    }
    src = src.replace(puzzleRe, `$1${snap.story}$3\n${snap.cluesBlock}$4`);
    applied++;
  }
  fs.writeFileSync(PUZZLES_PATH, src, "utf-8");
  console.log(`Re-applied story/clues for ${applied} puzzle(s) from snapshot`);
}

const NINE_DEDECTIVE_SLUGS = [
  "bogazda-kayip-elmas",
  "kapalicarsida-gizem",
  "universitede-karanlik-sir",
  "muzede-kayip-eser",
  "tren-yolculugunda-cinayet",
  "carsamba-suikasti",
  "kutuphanede-sessiz-suc",
  "saat-fabrikasinda-gizem",
  "karakoyde-neon-gece",
];

const mode = process.argv[2] || "full";
if (mode === "snapshot-only") {
  extractStoryCluesSnapshot();
  process.exit(0);
}

extractStoryCluesSnapshot();
slugifyPuzzlesTs();
applyStoryCluesSnapshot(NINE_DEDECTIVE_SLUGS);
console.log("Then run: node scripts/assign-suspect-avatars.js && node scripts/apply-suspect-avatar-overrides.js");

console.log("\nDone. Run: node scripts/validate-puzzles.js");
