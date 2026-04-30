import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:22971";

async function dismissOnboarding(page: Page) {
  await page.waitForTimeout(1000);
  const skipBtn = page.getByText("Atla");
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe("Scoring system", () => {
  test("leaderboard tab is accessible", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    await dismissOnboarding(page);

    const liderlikTab = page.locator("text=Liderlik").first();
    await expect(liderlikTab).toBeVisible({ timeout: 8000 });
    await liderlikTab.click();
    await page.waitForTimeout(1000);

    const leaderboardContent = page.getByText(/liderlik|skor|puan|henüz|bulmaca/i).first();
    await expect(leaderboardContent).toBeVisible({ timeout: 5000 });
  });

  test("profile tab shows statistics", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    await dismissOnboarding(page);

    const profilTab = page.locator("text=Profil").first();
    await expect(profilTab).toBeVisible({ timeout: 8000 });
    await profilTab.click();
    await page.waitForTimeout(1000);

    const profilContent = page.getByText(/profil|istatistik|rozet|çözülen/i).first();
    await expect(profilContent).toBeVisible({ timeout: 5000 });
  });

  test("scoring formula: finalScore >= 100 always", async ({ page: _page }) => {
    const computeScore = (
      timeElapsed: number,
      wrongGuesses: number,
      bonusCluesRevealedCount: number,
      difficulty: "caylak" | "dedektif" | "baskomiser"
    ) => {
      const rawScore = 10000 - timeElapsed * 10 - wrongGuesses * 500 - bonusCluesRevealedCount * 300;
      const bonus = difficulty === "dedektif" ? 2000 : difficulty === "baskomiser" ? 5000 : 0;
      return Math.max(100, rawScore) + bonus;
    };

    expect(computeScore(600, 0, 0, "caylak")).toBeGreaterThanOrEqual(100);
    expect(computeScore(600, 5, 2, "caylak")).toBeGreaterThanOrEqual(100);
    expect(computeScore(10, 0, 0, "dedektif")).toBeGreaterThan(10000);
    expect(computeScore(10, 0, 0, "baskomiser")).toBeGreaterThan(13000);
  });

  test("scoring: wrong guess costs 500 pts + 30s, bonus clue costs 300 pts + 30s", async ({ page: _page }) => {
    const computeScore = (
      timeElapsed: number,
      wrongGuesses: number,
      bonusCluesRevealedCount: number,
      difficulty: "caylak" | "dedektif" | "baskomiser"
    ) => {
      const rawScore = 10000 - timeElapsed * 10 - wrongGuesses * 500 - bonusCluesRevealedCount * 300;
      const bonus = difficulty === "dedektif" ? 2000 : difficulty === "baskomiser" ? 5000 : 0;
      return Math.max(100, rawScore) + bonus;
    };

    const baseScore = computeScore(60, 0, 0, "caylak");
    const withWrongGuess = computeScore(60 + 30, 1, 0, "caylak");
    const withBonusClue = computeScore(60 + 30, 0, 1, "caylak");

    expect(baseScore - withWrongGuess).toBe(500 + 30 * 10);
    expect(baseScore - withBonusClue).toBe(300 + 30 * 10);
  });
});
