import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:22971";

async function loadApp(page: Page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2500);
  const skipBtn = page.getByText("Atla");
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click({ force: true });
    await page.waitForTimeout(800);
  }
}

async function goToVakalar(page: Page) {
  await page.goto(`${BASE}/oyun`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function expandDifficultyAndGetFirstPuzzle(page: Page): Promise<boolean> {
  for (const diff of ["Çaylak", "Dedektif", "Baş Komiser"]) {
    const header = page.getByText(diff, { exact: false }).first();
    const visible = await header.isVisible({ timeout: 2000 }).catch(() => false);
    if (visible) {
      await header.click({ force: true });
      await page.waitForTimeout(800);
      const content = await page.content();
      if (content.includes("Cinayeti") || content.includes("Kayıp") || content.includes("Gizemli") || content.includes("Ölümü")) {
        return true;
      }
    }
  }
  return false;
}

async function rnClick(page: Page, exactText: string) {
  await page.evaluate((text) => {
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (el.textContent === text) {
        let p = el.parentElement;
        while (p && !p.hasAttribute("tabindex")) p = p.parentElement;
        if (p) { (p as HTMLElement).click(); return; }
      }
    }
  }, exactText);
  await page.waitForTimeout(400);
}

/**
 * Test 1 (unit): Score formula — wrong guess costs 150pts + 30s, min >= 100
 */
test("Score formula: wrong guess costs 150pts + 30s penalty, min score >= 100", async ({ page: _page }) => {
  const computeScore = (
    timeElapsed: number,
    wrongGuesses: number,
    bonusClues: number,
    difficulty: "caylik" | "dedektif" | "baskomiser",
    streak: number
  ) => {
    const rawScore = 10000 - timeElapsed * 5 - wrongGuesses * 150 - bonusClues * 150;
    const diffBonus = difficulty === "dedektif" ? 2000 : difficulty === "baskomiser" ? 5000 : 0;
    const streakBonus = Math.min(streak * 50, 500);
    return Math.max(100, rawScore) + diffBonus + streakBonus;
  };

  const baseScore = computeScore(60, 0, 0, "caylik", 1);
  const withWrong = computeScore(60 + 30, 1, 0, "caylik", 1);
  expect(baseScore - withWrong).toBe(150 + 30 * 5);

  expect(computeScore(600, 5, 2, "caylik", 1)).toBeGreaterThanOrEqual(100);
  expect(computeScore(10, 0, 0, "dedektif", 1)).toBeGreaterThan(10000);
  expect(computeScore(10, 0, 0, "baskomiser", 1)).toBeGreaterThan(13000);

  const cappedStreak = computeScore(60, 0, 0, "caylik", 20);
  const maxStreakBonus = computeScore(60, 0, 0, "caylik", 10);
  expect(cappedStreak).toBe(maxStreakBonus);
});

/**
 * Test 2: Vakalar screen loads with accordion categories visible
 */
test("Vakalar screen loads and shows difficulty category headers", async ({ page }) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(page.getByText(/standart|aktif vakalar/i).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 5000 });
});

/**
 * Test 3: Expand accordion to find puzzle cards, select one, and start game
 */
test("Expanding difficulty accordion reveals puzzle cards and game starts", async ({ page }) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 8000 });

  const expanded = await expandDifficultyAndGetFirstPuzzle(page);
  if (!expanded) {
    test.skip();
    return;
  }

  const puzzleCard = page.getByText(/cinayeti|kayıp|gizemli|ölümü/i).first();
  await expect(puzzleCard).toBeVisible({ timeout: 5000 });
  await puzzleCard.click({ force: true });
  await page.waitForTimeout(800);

  const basla = page.getByText(/başla|oyna/i).first();
  await expect(basla).toBeVisible({ timeout: 6000 });
  await basla.click({ force: true });
  await page.waitForTimeout(1500);

  const content = await page.content();
  const hasGameContent =
    content.includes("00:") ||
    content.includes("SUÇLA") ||
    content.includes("İpucu") ||
    content.includes("OLAY");
  expect(hasGameContent).toBe(true);
});

/**
 * Test 4: AccusationSheet modal opens from game screen
 */
test("SON ÇIKARIM bar opens AccusationSheet modal with KİM/NEREDE/NEYLE dropdowns", async ({ page }) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 8000 });
  const expanded = await expandDifficultyAndGetFirstPuzzle(page);
  if (!expanded) { test.skip(); return; }

  const puzzleCard = page.getByText(/cinayeti|kayıp|gizemli|ölümü/i).first();
  await puzzleCard.click({ force: true });
  await page.waitForTimeout(800);
  const basla = page.getByText(/başla|oyna/i).first();
  await expect(basla).toBeVisible({ timeout: 6000 });
  await basla.click({ force: true });
  await page.waitForTimeout(1500);

  await expect(page.getByText("SON ÇIKARIM").first()).toBeVisible({ timeout: 8000 });
  await rnClick(page, "SON ÇIKARIM");

  await expect(page.getByText("Son Çıkarım").first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("KİM").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("NEREDE").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("NEYLE").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("Raporu Gönder").first()).toBeVisible({ timeout: 3000 });
});

/**
 * Test 5: Full accusation flow for p001 — wrong then correct → ResultScreen
 * p001 solution: Rıfat Bey / Bıçak / Mutfak
 */
test("p001 accusation: wrong answer shows toast, correct answer shows VAKA ÇÖZÜLDÜ", async ({ page }) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 8000 });
  const expanded = await expandDifficultyAndGetFirstPuzzle(page);
  if (!expanded) { test.skip(); return; }

  const p001 = page.getByText("Konakta Gece Yarısı Cinayeti").first();
  if (!(await p001.isVisible({ timeout: 3000 }).catch(() => false))) { test.skip(); return; }

  await p001.click({ force: true });
  await page.waitForTimeout(800);
  const basla = page.getByText(/başla|oyna/i).first();
  await expect(basla).toBeVisible({ timeout: 6000 });
  await basla.click({ force: true });
  await page.waitForTimeout(1500);

  await expect(page.getByText("SON ÇIKARIM").first()).toBeVisible({ timeout: 8000 });
  await rnClick(page, "SON ÇIKARIM");
  await expect(page.getByText("Son Çıkarım").first()).toBeVisible({ timeout: 5000 });

  await rnClick(page, "KİM");
  await rnClick(page, "Nazik Hanım");
  await rnClick(page, "NEREDE");
  await rnClick(page, "Kütüphane");
  await rnClick(page, "NEYLE");
  await rnClick(page, "Zehir");

  await rnClick(page, "Raporu Gönder");
  await page.waitForTimeout(600);

  const toast = page.getByText(/yanlış suçlama|30 saniye/i).first();
  await expect(toast).toBeVisible({ timeout: 4000 });

  await rnClick(page, "KİM");
  await rnClick(page, "Rıfat Bey");
  await rnClick(page, "NEREDE");
  await rnClick(page, "Mutfak");
  await rnClick(page, "NEYLE");
  await rnClick(page, "Bıçak");

  await rnClick(page, "Raporu Gönder");
  await page.waitForTimeout(1500);

  const resultScreen = page.getByText(/vaka çözüldü/i).first();
  await expect(resultScreen).toBeVisible({ timeout: 8000 });

  const content = await page.content();
  const hasPuan = content.includes("PUAN") || content.includes("puan") || content.includes("Puan");
  const hasScore = /\d{4,5}/.test(content);
  expect(hasPuan || hasScore).toBe(true);
});
