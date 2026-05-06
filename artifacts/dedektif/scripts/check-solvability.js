#!/usr/bin/env node
import { PUZZLES } from "../data/puzzles";

const failures = [];

for (const puzzle of PUZZLES) {
  const suspectIds = puzzle.suspects.map((s) => s.id);
  const weaponIds = puzzle.weapons.map((w) => w.id);
  const locationIds = puzzle.locations.map((l) => l.id);

  const allEliminated = new Set([
    ...(puzzle.solvabilityMeta?.freeEliminations ?? []),
    ...(puzzle.solvabilityMeta?.bonusEliminations ?? []),
  ]);

  const expected = new Set([
    ...suspectIds.filter((id) => id !== puzzle.solution.suspectId),
    ...weaponIds.filter((id) => id !== puzzle.solution.weaponId),
    ...locationIds.filter((id) => id !== puzzle.solution.locationId),
  ]);

  for (const id of expected) {
    if (!allEliminated.has(id)) {
      failures.push(`${puzzle.id}: missing elimination id "${id}"`);
    }
  }

  for (const id of allEliminated) {
    if (!expected.has(id)) {
      failures.push(`${puzzle.id}: invalid elimination id "${id}"`);
    }
  }
}

if (failures.length > 0) {
  console.error(`ERROR: ${failures.length} solvability issue(s):`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(`✓ Solvability metadata check passed for ${PUZZLES.length} puzzle(s).`);
