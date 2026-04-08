/**
 * E2E tests for TimerDisplay component (Task #18)
 *
 * Verifies:
 * - Timer shows elapsed time in MM:SS format
 * - Penalty badge section shows ⚡×N +Xs badges for each wrong guess
 * - First badge: ⚡×1 +30s
 * - Second badge: ⚡×2 +60s
 * - Third badge: ⚡×3 +120s (exponential)
 * - Critical mode: timer turns red when ≤30s remain
 * - Shake animation fires on wrong guess (visual, not directly testable)
 */

export const TIMER_DISPLAY_TEST_PLAN = `
Scenario: TimerDisplay renders correct penalty progression badges

Setup:
- Navigate to the Oyun (game) tab on a baskomiser difficulty puzzle (360s time limit)
- Observe the timer widget at the top of the screen

Steps:
1. Verify initial state: timer shows a countdown, no ⚡ badges visible, only a "0" or nothing in the penalty section
2. Make one wrong accusation via the SUÇLA button (testID="accuse-button")
3. Verify: a ⚡×1 +30s badge appears in the timer widget area
4. Make a second wrong accusation
5. Verify: a ⚡×2 +60s badge appears alongside the first badge
6. If possible, make a third wrong accusation
7. Verify: a ⚡×3 +120s badge appears (exponential growth confirmed)
8. On a puzzle with <30s remaining, verify the timer text turns red/orange
`;
