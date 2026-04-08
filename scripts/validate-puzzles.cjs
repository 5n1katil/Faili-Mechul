#!/usr/bin/env node
/**
 * Logical solvability validation script for puzzles.ts
 *
 * Checks every puzzle in artifacts/dedektif/data/puzzles.ts for:
 *   1. Solution IDs reference valid declared entities.
 *   2. Every clue has isBonus explicitly set.
 *   3. Every puzzle has at least 4 free clues and at least 2 bonus clues.
 *   4. Difficulty is one of: caylik, dedektif, baskomiser.
 *   5. dayIndex is present.
 *   6. solvabilityMeta is present with freeEliminations and bonusEliminations.
 *   7. LOGICAL CHECK — free + bonus eliminations leave exactly the solution
 *      (one suspect, one weapon, one location), and eliminated IDs are valid.
 *   8. Free clues alone eliminate at least 2 options (not trivially easy).
 *
 * Run: node scripts/validate-puzzles.cjs  (from workspace root)
 */

const fs = require("fs");
const path = require("path");

const PUZZLES_FILE = path.resolve(
  __dirname,
  "..",
  "artifacts/dedektif/data/puzzles.ts"
);

const raw = fs.readFileSync(PUZZLES_FILE, "utf8");

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

function extractJsonArray(src, key) {
  const re = new RegExp(`\\b${key}:\\s*(\\[[^\\]]*\\])`);
  const m = src.match(re);
  if (!m) return null;
  try {
    return JSON.parse(m[1].replace(/'/g, '"'));
  } catch {
    return null;
  }
}

function extractSolvabilityMeta(src) {
  const metaRe = /solvabilityMeta:\s*\{([^}]+)\}/s;
  const m = src.match(metaRe);
  if (!m) return null;
  const block = m[1];

  const freeRe = /freeEliminations:\s*(\[[^\]]*\])/;
  const bonusRe = /bonusEliminations:\s*(\[[^\]]*\])/;

  const freeMatch = block.match(freeRe);
  const bonusMatch = block.match(bonusRe);

  if (!freeMatch || !bonusMatch) return null;

  try {
    const freeEliminations = JSON.parse(freeMatch[1].replace(/'/g, '"'));
    const bonusEliminations = JSON.parse(bonusMatch[1].replace(/'/g, '"'));
    return { freeEliminations, bonusEliminations };
  } catch {
    return null;
  }
}

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

  const allIds = extractAll(src, "id");
  const suspectIds = allIds.filter((v) => /^s\d+$/.test(v));
  const weaponIds = allIds.filter((v) => /^w\d+$/.test(v));
  const locationIds = allIds.filter((v) => /^l\d+$/.test(v));
  const allEntityIds = [...suspectIds, ...weaponIds, ...locationIds];

  const solutionMatch = src.match(
    /solution:\s*\{\s*suspectId:\s*"([^"]+)",\s*weaponId:\s*"([^"]+)",\s*locationId:\s*"([^"]+)"/
  );
  let solutionSuspect = null, solutionWeapon = null, solutionLocation = null;

  if (!solutionMatch) {
    puzzleErrors.push("missing or malformed `solution` field");
  } else {
    [, solutionSuspect, solutionWeapon, solutionLocation] = solutionMatch;
    if (!suspectIds.includes(solutionSuspect))
      puzzleErrors.push(`solution.suspectId "${solutionSuspect}" not declared in suspects`);
    if (!weaponIds.includes(solutionWeapon))
      puzzleErrors.push(`solution.weaponId "${solutionWeapon}" not declared in weapons`);
    if (!locationIds.includes(solutionLocation))
      puzzleErrors.push(`solution.locationId "${solutionLocation}" not declared in locations`);
  }

  const freeClues = countOccurrences(src, "isBonus: false");
  const bonusClues = countOccurrences(src, "isBonus: true");

  if (freeClues < 4)
    puzzleErrors.push(`only ${freeClues} free clue(s); need ≥ 4`);
  if (bonusClues < 2)
    puzzleErrors.push(`only ${bonusClues} bonus clue(s); need ≥ 2`);

  const clueBlockCount = countOccurrences(src, '\\bid:\\s*"c\\d+"');
  if (freeClues + bonusClues !== clueBlockCount) {
    puzzleErrors.push(
      `${clueBlockCount} clue(s) total but only ${freeClues + bonusClues} have isBonus set`
    );
  }

  const diff = extractFirst(src, "difficulty");
  if (!["caylik", "dedektif", "baskomiser"].includes(diff)) {
    puzzleErrors.push(`unknown difficulty "${diff}"`);
  }

  if (!src.match(/\bdayIndex:\s*\d+/)) puzzleErrors.push("missing dayIndex");

  const meta = extractSolvabilityMeta(src);
  if (!meta) {
    puzzleErrors.push("missing or malformed solvabilityMeta block");
  } else {
    const { freeEliminations, bonusEliminations } = meta;
    const allEliminations = [...freeEliminations, ...bonusEliminations];

    for (const elim of allEliminations) {
      if (!allEntityIds.includes(elim)) {
        puzzleErrors.push(`solvabilityMeta eliminates unknown ID "${elim}"`);
      }
    }

    const hasDuplicates = allEliminations.length !== new Set(allEliminations).size;
    if (hasDuplicates) {
      puzzleErrors.push("solvabilityMeta has duplicate elimination IDs");
    }

    if (freeEliminations.length < 2) {
      puzzleErrors.push(
        `freeEliminations has only ${freeEliminations.length} item(s); free clues must narrow down ≥ 2 options`
      );
    }

    if (solutionSuspect && solutionWeapon && solutionLocation) {
      const elimSet = new Set(allEliminations);

      const remainingSuspects = suspectIds.filter((s) => !elimSet.has(s));
      const remainingWeapons = weaponIds.filter((w) => !elimSet.has(w));
      const remainingLocations = locationIds.filter((l) => !elimSet.has(l));

      const solutionInEliminations =
        elimSet.has(solutionSuspect) ||
        elimSet.has(solutionWeapon) ||
        elimSet.has(solutionLocation);

      if (solutionInEliminations) {
        puzzleErrors.push(
          "solvabilityMeta eliminates the solution itself — contradiction!"
        );
      } else {
        if (remainingSuspects.length !== 1) {
          puzzleErrors.push(
            `after all eliminations: ${remainingSuspects.length} suspect(s) remain [${remainingSuspects.join(",")}]; need exactly 1`
          );
        } else if (remainingSuspects[0] !== solutionSuspect) {
          puzzleErrors.push(
            `after all eliminations: remaining suspect is "${remainingSuspects[0]}" but solution is "${solutionSuspect}"`
          );
        }

        if (remainingWeapons.length !== 1) {
          puzzleErrors.push(
            `after all eliminations: ${remainingWeapons.length} weapon(s) remain [${remainingWeapons.join(",")}]; need exactly 1`
          );
        } else if (remainingWeapons[0] !== solutionWeapon) {
          puzzleErrors.push(
            `after all eliminations: remaining weapon is "${remainingWeapons[0]}" but solution is "${solutionWeapon}"`
          );
        }

        if (remainingLocations.length !== 1) {
          puzzleErrors.push(
            `after all eliminations: ${remainingLocations.length} location(s) remain [${remainingLocations.join(",")}]; need exactly 1`
          );
        } else if (remainingLocations[0] !== solutionLocation) {
          puzzleErrors.push(
            `after all eliminations: remaining location is "${remainingLocations[0]}" but solution is "${solutionLocation}"`
          );
        }
      }
    }
  }

  const diff2 = extractFirst(src, "difficulty");
  const label = `${id} (${diff2}, ${suspectIds.length}s×${weaponIds.length}w×${locationIds.length}l, ${freeClues}f+${bonusClues}b)`;

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
  console.log("\nAll puzzles pass logical solvability validation ✅");
}
