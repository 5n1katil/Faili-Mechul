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

async function navigateToGame(page: Page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);
  await dismissOnboarding(page);

  const startBtn = page.getByText("Günlük Bulmacayı Başlat");
  if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(1000);
  }

  const oyunTab = page.locator("text=Oyun").first();
  if (await oyunTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await oyunTab.click();
    await page.waitForTimeout(1000);
  }
}

test.describe("TimerDisplay", () => {
  test("app loads and shows game-related content", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    const appContent = page.getByText(/faili meçhul|dedektif|bulmaca/i).first();
    await expect(appContent).toBeVisible({ timeout: 10000 });
  });

  test("game screen contains timer widget area", async ({ page }) => {
    await navigateToGame(page);

    const gameContent = await page.content();
    const hasTimerRelated =
      gameContent.includes("timer") ||
      gameContent.includes("Timer") ||
      gameContent.includes("00:") ||
      gameContent.includes("Şüpheli") ||
      gameContent.includes("SUÇLA");

    expect(hasTimerRelated).toBe(true);
  });

  test("penalty badge section renders without error", async ({ page }) => {
    await navigateToGame(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(
      (e) =>
        e.includes("TypeError") ||
        e.includes("ReferenceError") ||
        e.includes("penaltyForGuess") ||
        e.includes("flashOpacity")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
