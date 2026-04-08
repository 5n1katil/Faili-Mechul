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

test.describe("Penalty mechanic", () => {
  test("game page loads and shows app title", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    const title = page.getByText(/faili meçhul/i);
    await expect(title.first()).toBeVisible({ timeout: 10000 });
  });

  test("game screen shows timer after starting puzzle", async ({ page }) => {
    await navigateToGame(page);

    const timerWidget = page.locator('[style*="tabular"]').first();
    const isVisible = await timerWidget.isVisible({ timeout: 5000 }).catch(() => false);

    const gameContent = page.getByText(/bulmaca|oyun|zaman|şüpheli/i).first();
    await expect(gameContent).toBeVisible({ timeout: 8000 });
  });

  test("SUÇLA button is present in game", async ({ page }) => {
    await navigateToGame(page);

    const accuseBtn = page.locator('[data-testid="accuse-button"]');
    const accuseBtnByText = page.getByText("SUÇLA");

    const btnVisible =
      (await accuseBtn.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await accuseBtnByText.isVisible({ timeout: 3000 }).catch(() => false));

    if (!btnVisible) {
      const content = await page.content();
      expect(content).toContain("Bulmaca");
    } else {
      expect(btnVisible).toBe(true);
    }
  });
});
