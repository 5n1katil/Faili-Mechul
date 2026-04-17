#!/usr/bin/env node
/**
 * validate-puzzles.js
 *
 * Strict validator for icon names used by the Dedektif app.
 *
 * Checks:
 *   1. Every `icon: "..."` value in data/puzzles.ts matches a real
 *      MaterialIcons glyph name (hyphen-separated, exact match).
 *   2. Every value in packs.ts EMOJI_TO_MATERIAL is a valid glyph name.
 *   3. Every `<MaterialIcons name="..." />` literal in components/ and
 *      app/ is a valid glyph name.
 *   4. Every emoji used as an `icon` in data/puzzles_database.json has a
 *      mapping entry in packs.ts EMOJI_TO_MATERIAL (full string OR first
 *      code point), so `emojiToMaterialIcon()` cannot fall through to the
 *      default `help-outline` placeholder ("?").
 *
 * The MaterialIcons font shipped with @expo/vector-icons only renders
 * hyphenated glyph names. Underscores DO NOT render — they fall back to
 * an empty glyph that displays as "?". The validator therefore rejects
 * any underscore-style name.
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — one or more failures (details printed to stderr)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Locate MaterialIcons glyph map
// ---------------------------------------------------------------------------

function findGlyphmap() {
  const pkg = require.resolve("@expo/vector-icons/package.json");
  const candidate = path.join(
    path.dirname(pkg),
    "build",
    "vendor",
    "react-native-vector-icons",
    "glyphmaps",
    "MaterialIcons.json",
  );
  if (!fs.existsSync(candidate)) {
    console.error(`ERROR: MaterialIcons.json not found at:\n  ${candidate}`);
    process.exit(1);
  }
  return candidate;
}

const GLYPH_NAMES = new Set(
  Object.keys(JSON.parse(fs.readFileSync(findGlyphmap(), "utf-8"))),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

function buildLineIndex(source) {
  const offsets = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") offsets.push(i + 1);
  }
  return (idx) => {
    let lo = 0, hi = offsets.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (offsets[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

function walkDir(dir, exts, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(rel, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(rel);
  }
  return out;
}

const failures = [];
const fail = (msg) => failures.push(msg);

// ---------------------------------------------------------------------------
// Check 1: data/puzzles.ts icon values
// ---------------------------------------------------------------------------

{
  const src = readFile("data/puzzles.ts");
  const lineOf = buildLineIndex(src);
  const re = /\bicon:\s*["']([^"']+)["']/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    if (!GLYPH_NAMES.has(name)) {
      fail(`puzzles.ts:${lineOf(m.index)}  invalid icon "${name}" (must be a hyphenated MaterialIcons glyph)`);
    }
  }
  console.log(`  data/puzzles.ts: ${seen.size} unique icon name(s) checked.`);
}

// ---------------------------------------------------------------------------
// Check 2: packs.ts EMOJI_TO_MATERIAL values
// ---------------------------------------------------------------------------

let emojiToMaterialKeys; // captured for Check 4
{
  const src = readFile("data/packs.ts");
  const lineOf = buildLineIndex(src);
  const startMarker = "const EMOJI_TO_MATERIAL: Record<string, string> = {";
  const startIdx = src.indexOf(startMarker);
  if (startIdx < 0) {
    fail(`packs.ts: EMOJI_TO_MATERIAL block not found`);
  } else {
    const blockStart = startIdx + startMarker.length;
    const endIdx = src.indexOf("};", blockStart);
    const body = src.slice(blockStart, endIdx);
    const baseOffset = blockStart;

    const entryRe = /"([^"]+)"\s*:\s*"([^"]+)"/g;
    const keys = new Set();
    let valuesChecked = 0;
    let badValues = 0;
    let em;
    while ((em = entryRe.exec(body)) !== null) {
      const [, key, value] = em;
      keys.add(key);
      valuesChecked++;
      if (!GLYPH_NAMES.has(value)) {
        badValues++;
        fail(`packs.ts:${lineOf(baseOffset + em.index)}  EMOJI_TO_MATERIAL["${key}"] = "${value}" — not a valid glyph`);
      }
    }
    emojiToMaterialKeys = keys;
    console.log(`  data/packs.ts: ${valuesChecked} emoji→icon entries checked${badValues ? ` (${badValues} invalid)` : ""}.`);
  }
}

// ---------------------------------------------------------------------------
// Check 3: <MaterialIcons name="..." /> literals across components/ and app/
// ---------------------------------------------------------------------------

{
  const files = [
    ...walkDir("components", [".ts", ".tsx"]),
    ...walkDir("app", [".ts", ".tsx"]),
    ...walkDir("utils", [".ts", ".tsx"]),
  ];
  // Match: <MaterialIcons ... name="literal-string" ...>
  // Only literal string values; expression names (`name={x}`) are skipped.
  const tagRe = /<MaterialIcons\b[\s\S]*?\/?\s*>/g;
  const nameRe = /\bname=["']([a-z][a-z0-9-]*)["']/;
  let totalChecked = 0;
  let invalid = 0;
  for (const rel of files) {
    const src = readFile(rel);
    const lineOf = buildLineIndex(src);
    let tm;
    while ((tm = tagRe.exec(src)) !== null) {
      const tag = tm[0];
      const nm = tag.match(nameRe);
      if (!nm) continue;
      totalChecked++;
      const value = nm[1];
      if (!GLYPH_NAMES.has(value)) {
        invalid++;
        fail(`${rel}:${lineOf(tm.index)}  <MaterialIcons name="${value}"> — not a valid glyph`);
      }
    }
  }
  console.log(`  components/app/utils: ${totalChecked} literal MaterialIcons name(s) checked${invalid ? ` (${invalid} invalid)` : ""}.`);
}

// ---------------------------------------------------------------------------
// Check 4: every emoji icon in puzzles_database.json has a mapping
// ---------------------------------------------------------------------------

if (emojiToMaterialKeys) {
  const dbPath = path.join(ROOT, "data/puzzles_database.json");
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    const usedEmojis = new Map(); // emoji -> sample reference
    for (const pack of db.packs ?? []) {
      for (const p of pack.puzzles ?? []) {
        const collect = (arr) => {
          for (const e of arr ?? []) {
            if (!e.icon) continue;
            if (!usedEmojis.has(e.icon)) {
              usedEmojis.set(e.icon, `${pack.packId}/${p.puzzleId}: ${e.name}`);
            }
          }
        };
        collect(p.suspects);
        collect(p.weapons);
        collect(p.locations);
      }
    }
    let unmapped = 0;
    for (const [emoji, ref] of usedEmojis) {
      if (emojiToMaterialKeys.has(emoji)) continue;
      // emojiToMaterialIcon falls back to first code point — if THAT is mapped, fine
      const first = emoji[0];
      if (first && emojiToMaterialKeys.has(first)) continue;
      unmapped++;
      fail(`puzzles_database.json  emoji "${emoji}" is not in EMOJI_TO_MATERIAL — falls back to "?"  (e.g. ${ref})`);
    }
    console.log(`  data/puzzles_database.json: ${usedEmojis.size} unique emoji icon(s) checked${unmapped ? ` (${unmapped} unmapped)` : ""}.`);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (failures.length === 0) {
  console.log("\n✓ All icon checks passed.");
  process.exit(0);
}

console.error(`\nERROR: ${failures.length} icon validation failure(s):\n`);
for (const f of failures) console.error(`  ✗  ${f}`);
console.error(
  `\nFix: use exact hyphenated MaterialIcons glyph names (e.g. "local-pharmacy", "content-cut").`,
);
console.error(
  `Reference: https://fonts.google.com/icons?icon.set=Material+Icons`,
);
process.exit(1);
