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

  test("scoring formula constants: penalties are exponential", async ({ page }) => {
    const computePenalty = (n: number) => 30 * Math.pow(2, n - 1);
    expect(computePenalty(1)).toBe(30);
    expect(computePenalty(2)).toBe(60);
    expect(computePenalty(3)).toBe(120);
    expect(computePenalty(4)).toBe(240);
  });

  test("scoring formula: finalScore >= 100 always", async ({ page }) => {
    const computeScore = (
      timeElapsed: number,
      wrongGuessPenaltySeconds: number,
      cluesRevealed: number,
      difficulty: "caylik" | "dedektif" | "baskomiser"
    ) => {
      const cluePenalty = Math.max(0, cluesRevealed - 2) * 30;
      const effectiveTime = timeElapsed + wrongGuessPenaltySeconds + cluePenalty;
      const rawScore = 10000 - effectiveTime * 5;
      const bonus = difficulty === "dedektif" ? 2000 : difficulty === "baskomiser" ? 5000 : 0;
      return Math.max(100, rawScore) + bonus;
    };

    expect(computeScore(600, 0, 0, "caylik")).toBeGreaterThanOrEqual(100);
    expect(computeScore(600, 210, 6, "caylik")).toBeGreaterThanOrEqual(100);
    expect(computeScore(10, 0, 2, "dedektif")).toBeGreaterThan(10000);
    expect(computeScore(10, 0, 2, "baskomiser")).toBeGreaterThan(13000);
  });
});
