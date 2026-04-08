/**
 * E2E tests for scoring system (Task #18)
 *
 * Verifies scoring formula:
 * - effectiveTime = timeElapsed + wrongGuessPenaltySeconds + max(0, cluesRevealed.length - 2) × 30
 * - rawScore = 10000 - effectiveTime × 5
 * - bonus: caylik=0, dedektif=+2000, baskomiser=+5000
 * - finalScore = max(100, rawScore) + bonus
 *
 * Also verifies leaderboard deduplication by puzzleId (name+puzzleId key).
 */

export const SCORING_TEST_PLAN = `
Scenario: Score computed correctly after solving a puzzle

Setup:
- Navigate to the Oyun (game) tab
- Choose a caylik difficulty puzzle (e.g. p001)

Steps:
1. Immediately accuse the correct solution without revealing any extra clues
2. On the result screen, note the displayed score
3. Verify: score should be approximately 10000 (no penalty, 0 clues over 2, minimal time elapsed)
4. Navigate to Liderlik (leaderboard) tab
5. Verify your entry appears for the correct puzzleId
6. Enter a name and submit if prompted
7. Play the same puzzle again with 1 wrong guess
8. Verify the result screen shows a lower score (penalty applied)
9. On the leaderboard, verify only one entry per player per puzzle (deduplication by name+puzzleId)

Scenario: Wrong guess penalty accumulates in score
1. Start a puzzle
2. Make 1 wrong guess (adds 30s to effective time = -150 to raw score)
3. Make 2nd wrong guess (adds 60s more = -300 more)
4. Solve correctly
5. Verify result screen score is lower than a clean solve would produce
6. Verify wrongGuesses count shown matches how many wrong guesses were made
`;
