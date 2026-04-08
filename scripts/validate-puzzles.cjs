#!/usr/bin/env node
/**
 * Structural validation script for puzzles.ts
 *
 * Checks every puzzle in artifacts/dedektif/data/puzzles.ts for:
 *   1. Solution IDs (suspectId, weaponId, locationId) reference valid entities.
 *   2. Every clue has isBonus explicitly set.
 *   3. Every puzzle has at least 4 free clues and at least 2 bonus clues.
 *   4. Difficulty is one of: caylik, dedektif, baskomiser.
 *   5. dayIndex is present.
 *
 * Run: node scripts/validate-puzzles.js   (from workspace root)
 */

const fs = require("fs");
const path = require("path");

const PUZZLES_FILE = path.resolve(
  __dirname,
  "..",
  "artifacts/dedektif/data/puzzles.ts"
);

const raw = fs.readFileSync(PUZZLES_FILE, "utf8");

// Extract all values for a given unquoted key like   id: "s1"
function extractAll(src, key) {
  const re = new RegExp(`\\b${key}:\\s*"([^"]+)"`, "g");
  const results = [];
  let m;
  while ((m = re.exec(src)) !== null) results.push(m[1]);
  return results;
}

function extractFirst(src, key) {
  const re = new RegExp(`\\b${key}:\\s*"([^"]+)"`);
  const m = src.match(re);
  return m ? m[1] : null;
}

function countOccurrences(src, pattern) {
  return (src.match(new RegExp(pattern, "g")) || []).length;
}

// Split file into per-puzzle blocks by looking for the `id: "pNNN"` line
const startPositions = [];
const blockRe = /\n\s*id:\s*"(p\d+)"/g;
let match;
while ((match = blockRe.exec(raw)) !== null) {
  startPositions.push({ id: match[1], pos: match.index });
}

const puzzleBlocks = [];
for (let i = 0; i < startPositions.length; i++) {
  const start = startPositions[i].pos;
  const end =
    i + 1 < startPositions.length ? startPositions[i + 1].pos : raw.length;
  puzzleBlocks.push({ id: startPositions[i].id, src: raw.slice(start, end) });
}

let passed = 0;
let failed = 0;

for (const { id, src } of puzzleBlocks) {
  const puzzleErrors = [];

  // 1. Collect declared entity IDs (filter out clue IDs like c1, c2...)
  const allIds = extractAll(src, "id");
  const suspectIds = allIds.filter((v) => /^s\d+$/.test(v));
  const weaponIds = allIds.filter((v) => /^w\d+$/.test(v));
  const locationIds = allIds.filter((v) => /^l\d+$/.test(v));

  // 2. Check solution references
  const solutionMatch = src.match(
    /solution:\s*\{\s*suspectId:\s*"([^"]+)",\s*weaponId:\s*"([^"]+)",\s*locationId:\s*"([^"]+)"/
  );
  if (!solutionMatch) {
    puzzleErrors.push("missing or malformed `solution` field");
  } else {
    const [, sId, wId, lId] = solutionMatch;
    if (!suspectIds.includes(sId))
      puzzleErrors.push(`solution.suspectId "${sId}" not declared in suspects`);
    if (!weaponIds.includes(wId))
      puzzleErrors.push(`solution.weaponId "${wId}" not declared in weapons`);
    if (!locationIds.includes(lId))
      puzzleErrors.push(
        `solution.locationId "${lId}" not declared in locations`
      );
  }

  // 3. Count free and bonus clues
  const freeClues = countOccurrences(src, "isBonus: false");
  const bonusClues = countOccurrences(src, "isBonus: true");

  if (freeClues < 4)
    puzzleErrors.push(`only ${freeClues} free clue(s); need ≥ 4`);
  if (bonusClues < 2)
    puzzleErrors.push(`only ${bonusClues} bonus clue(s); need ≥ 2`);

  // 4. Ensure every clue object has isBonus set (count { id: "c... blocks)
  const clueBlockCount = countOccurrences(src, '\\bid:\\s*"c\\d+"');
  if (freeClues + bonusClues !== clueBlockCount) {
    puzzleErrors.push(
      `${clueBlockCount} clue(s) total but only ${
        freeClues + bonusClues
      } have isBonus set`
    );
  }

  // 5. Difficulty validation
  const diff = extractFirst(src, "difficulty");
  if (!["caylik", "dedektif", "baskomiser"].includes(diff)) {
    puzzleErrors.push(`unknown difficulty "${diff}"`);
  }

  // 6. dayIndex present
  if (!src.match(/\bdayIndex:\s*\d+/)) puzzleErrors.push("missing dayIndex");

  const label = `${id} (${diff}, ${suspectIds.length}s×${weaponIds.length}w×${locationIds.length}l, ${freeClues}f+${bonusClues}b)`;

  if (puzzleErrors.length === 0) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    puzzleErrors.forEach((e) => console.log(`      → ${e}`));
    failed++;
  }
}

console.log(`\n══════════════════════════════════════════`);
console.log(`  Total puzzles : ${puzzleBlocks.length}`);
console.log(`  Passed        : ${passed}`);
console.log(`  Failed        : ${failed}`);
console.log(`══════════════════════════════════════════`);

if (failed > 0) {
  console.error("\nValidation FAILED — fix the errors listed above.");
  process.exit(1);
} else {
  console.log("\nAll puzzles pass structural validation ✅");
}
