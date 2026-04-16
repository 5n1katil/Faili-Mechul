#!/usr/bin/env node
/**
 * validate-puzzles.js
 *
 * Validates every icon string in data/puzzles.ts against the known-valid
 * MaterialIcons glyph map shipped with @expo/vector-icons.
 *
 * Exit codes:
 *   0 — all icons are valid
 *   1 — one or more invalid icon names found (details printed to stderr)
 *
 * Usage:
 *   node scripts/validate-puzzles.js
 *   pnpm --filter @workspace/dedektif validate
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// 1. Locate the MaterialIcons glyph map
// ---------------------------------------------------------------------------

function findMaterialIconsGlyphmap() {
  const vectorIconsPackage = require.resolve("@expo/vector-icons/package.json");
  const vectorIconsRoot = path.dirname(vectorIconsPackage);
  const candidate = path.join(
    vectorIconsRoot,
    "build",
    "vendor",
    "react-native-vector-icons",
    "glyphmaps",
    "MaterialIcons.json",
  );
  if (!fs.existsSync(candidate)) {
    console.error(
      `ERROR: Could not locate MaterialIcons.json at expected path:\n  ${candidate}`,
    );
    process.exit(1);
  }
  return candidate;
}

const glyphmapPath = findMaterialIconsGlyphmap();
// The glyph map uses only hyphenated names (e.g. "content-cut").
// @expo/vector-icons MaterialIcons normalises underscores → hyphens at
// render-time, so we mirror that here so the validator accepts both forms.
const glyphNames = Object.keys(JSON.parse(fs.readFileSync(glyphmapPath, "utf-8")));
const validIcons = new Set([
  ...glyphNames,
  ...glyphNames.map((n) => n.replace(/-/g, "_")),
]);

// ---------------------------------------------------------------------------
// 2. Read puzzles.ts and extract every icon: "..." value
// ---------------------------------------------------------------------------

const puzzlesPath = path.resolve(__dirname, "..", "data", "puzzles.ts");
if (!fs.existsSync(puzzlesPath)) {
  console.error(`ERROR: puzzles.ts not found at:\n  ${puzzlesPath}`);
  process.exit(1);
}

const source = fs.readFileSync(puzzlesPath, "utf-8");

// Matches   icon: "some_name"   or   icon: 'some_name'
// Capture group 1 = the raw icon string
const ICON_RE = /\bicon:\s*["']([^"']+)["']/g;

const findings = [];
let match;
let lineNumber = 1;
const lines = source.split("\n");
const lineOffsets = [];
let offset = 0;
for (const line of lines) {
  lineOffsets.push(offset);
  offset += line.length + 1;
}

function getLineNumber(index) {
  let lo = 0;
  let hi = lineOffsets.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (lineOffsets[mid] <= index) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo + 1;
}

const seen = new Map();

while ((match = ICON_RE.exec(source)) !== null) {
  const iconName = match[1];
  const line = getLineNumber(match.index);
  if (!validIcons.has(iconName)) {
    findings.push({ iconName, line });
  }
  if (!seen.has(iconName)) {
    seen.set(iconName, line);
  }
}

// ---------------------------------------------------------------------------
// 3. Report results
// ---------------------------------------------------------------------------

const totalExtracted = seen.size;

if (findings.length === 0) {
  console.log(
    `✓ All ${totalExtracted} unique icon name(s) in puzzles.ts are valid MaterialIcons.`,
  );
  process.exit(0);
}

const uniqueBad = [...new Map(findings.map((f) => [f.iconName, f])).values()];

console.error(
  `\nERROR: ${uniqueBad.length} invalid MaterialIcon name(s) found in puzzles.ts:\n`,
);

for (const { iconName, line } of uniqueBad) {
  console.error(`  ✗  "${iconName}"  (first seen at line ${line})`);
}

console.error(
  `\nFix: replace the names above with valid MaterialIcons identifiers.`,
);
console.error(
  `Reference: https://fonts.google.com/icons?icon.set=Material+Icons`,
);
process.exit(1);
