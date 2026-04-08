# E2E Test Plans — Faili Meçhul

These files document the end-to-end test scenarios for the game mechanics introduced in Task #18.

## Files

| File | What it tests |
|------|---------------|
| `penalty-mechanic.test.ts` | Wrong accusation → exponential penalty, game continues |
| `timer-display.test.ts` | ⚡×N progression badges, critical-mode red timer |
| `scoring.test.ts` | Score formula, leaderboard deduplication by puzzleId |

## Running

E2E tests are executed via the Playwright-based testing subagent. Export the `*_TEST_PLAN` constant and pass it to `runTest()`.

## Key Invariants

- 1st wrong guess: +30s penalty → ⚡×1 +30s badge
- 2nd wrong guess: +60s penalty → ⚡×2 +60s badge
- 3rd wrong guess: +120s penalty → ⚡×3 +120s badge
- Game never ends on wrong guess (no lives / game-over mechanic)
- Leaderboard deduplication key: `${playerName}__${puzzleId}`
