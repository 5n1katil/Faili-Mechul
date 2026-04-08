/**
 * E2E tests for penalty mechanic (Task #18)
 *
 * Verifies:
 * - Wrong accusation increments wrongGuesses counter
 * - First wrong guess adds 30s penalty
 * - Second wrong guess adds 60s penalty (exponential: 30×2^1)
 * - Game continues (no game-over) after wrong guesses
 * - TimerDisplay shows ⚡ penalty badges after each wrong guess
 * - Correct accusation ends the game successfully
 */

export const PENALTY_TEST_PLAN = `
Scenario: Penalty mechanic - wrong accusations add exponential time penalties

Setup:
- Navigate to the Oyun (game) tab
- Start or resume a puzzle
- The timer should be running

Steps:
1. Verify the timer display shows "00:00" format and no penalty badges initially
2. In the deduction grid (L-shaped grid), select any suspect row
3. Without solving correctly, tap the SUÇLA button (testID="accuse-button")
4. Confirm the wrong-accusation dialog if one appears
5. Verify:
   - wrongGuesses counter changes to 1
   - A ⚡×1 +30s badge appears in the timer display
   - The game does NOT end (puzzle stays active)
6. Make a second wrong accusation (different wrong answer)
7. Verify:
   - wrongGuesses counter changes to 2
   - A ⚡×2 +60s badge appears in the timer display
   - The game still does NOT end
8. Make the correct accusation (select the solution suspect/weapon/location)
9. Verify the result screen appears with a score
`;
