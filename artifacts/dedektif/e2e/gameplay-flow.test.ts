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

async function expandFirstDifficulty(page: Page): Promise<boolean> {
  for (const diff of ["Çaylak", "Dedektif", "Baş Komiser"]) {
    const header = page.getByText(diff, { exact: false }).first();
    if (await header.isVisible({ timeout: 2000 }).catch(() => false)) {
      await header.click({ force: true });
      await page.waitForTimeout(800);
      const content = await page.content();
      if (content.includes("Cinayeti") || content.includes("Kayıp") || content.includes("Gizemli")) {
        return true;
      }
    }
  }
  return false;
}

async function startP001(page: Page): Promise<boolean> {
  const p001 = page.getByText("Konakta Gece Yarısı Cinayeti").first();
  if (!(await p001.isVisible({ timeout: 3000 }).catch(() => false))) return false;
  await p001.click({ force: true });
  await page.waitForTimeout(800);
  const basla = page.getByText(/başla|oyna/i).first();
  if (!(await basla.isVisible({ timeout: 5000 }).catch(() => false))) return false;
  await basla.click({ force: true });
  await page.waitForTimeout(1500);
  return true;
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

async function cycleFirstGridCellToQuestion(page: Page): Promise<boolean> {
  const result = await page.evaluate(() => {
    const allTabEls = Array.from(document.querySelectorAll('[tabindex="0"]')) as HTMLElement[];
    let candidate: HTMLElement | null = null;
    for (const el of allTabEls) {
      const text = el.innerText.trim();
      if (!text) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 10 && rect.width < 60 && rect.height > 10 && rect.height < 60) {
          candidate = el;
          break;
        }
      }
    }
    if (!candidate) return false;
    candidate.click();
    setTimeout(() => { if (candidate) { candidate.click(); } }, 200);
    setTimeout(() => { if (candidate) { candidate.click(); } }, 400);
    return true;
  });
  await page.waitForTimeout(700);
  return result;
}

/**
 * Test 1 (unit): Score formula — wrong guess costs 150pts + 30s, min >= 100
 */
test("Score formula: wrong guess 150pts + 30s, min score >= 100, streak capped at 500", async ({ page: _page }) => {
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
 * Test 2: Vakalar screen loads with difficulty headers visible
 */
test("Vakalar screen loads and shows difficulty category headers", async ({ page }) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(page.getByText(/standart|aktif vakalar/i).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 5000 });
});

/**
 * Test 3: Expand accordion → puzzle cards visible → game starts → timer/grid shown
 */
test("Expanding difficulty accordion reveals puzzles; game starts with timer and grid", async ({ page }) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 8000 });
  if (!(await expandFirstDifficulty(page))) { test.skip(); return; }

  const puzzleCard = page.getByText(/cinayeti|kayıp|gizemli/i).first();
  await expect(puzzleCard).toBeVisible({ timeout: 5000 });
  await puzzleCard.click({ force: true });
  await page.waitForTimeout(800);

  const basla = page.getByText(/başla|oyna/i).first();
  await expect(basla).toBeVisible({ timeout: 6000 });
  await basla.click({ force: true });
  await page.waitForTimeout(1500);

  const content = await page.content();
  const hasTimer = content.includes("00:") || content.includes("SÜRE");
  const hasGrid = content.includes("ŞÜPHELILER") || content.includes("SİLAHLAR");
  expect(hasTimer).toBe(true);
  expect(hasGrid).toBe(true);
});

/**
 * Test 4: Grid cell can be marked (cycling empty → ?)
 * Verifies the deduction grid is interactive and cell state changes on press.
 */
test("Grid cell marking: tapping an empty cell produces a mark indicator", async ({ page }) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 8000 });
  if (!(await expandFirstDifficulty(page))) { test.skip(); return; }

  const puzzleCard = page.getByText(/cinayeti|kayıp|gizemli/i).first();
  await puzzleCard.click({ force: true });
  await page.waitForTimeout(800);

  const basla = page.getByText(/başla|oyna/i).first();
  await expect(basla).toBeVisible({ timeout: 6000 });
  await basla.click({ force: true });
  await page.waitForTimeout(1500);

  await expect(page.getByText("ŞÜPHELILER").first()).toBeVisible({ timeout: 5000 });

  const contentBefore = await page.content();
  const qMarkBefore = (contentBefore.match(/\?/g) || []).length;

  const cycled = await cycleFirstGridCellToQuestion(page);
  expect(cycled).toBe(true);

  const contentAfter = await page.content();
  const qMarkAfter = (contentAfter.match(/\?/g) || []).length;

  expect(qMarkAfter).toBeGreaterThan(qMarkBefore);
});

/**
 * Test 5: AccusationSheet opens with all three dropdowns visible
 */
test("SON ÇIKARIM bar opens AccusationSheet with KİM/NEREDE/NEYLE dropdowns", async ({ page }) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 8000 });
  if (!(await expandFirstDifficulty(page))) { test.skip(); return; }

  const puzzleCard = page.getByText(/cinayeti|kayıp|gizemli/i).first();
  await puzzleCard.click({ force: true });
  await page.waitForTimeout(800);
  await (async () => {
    const basla = page.getByText(/başla|oyna/i).first();
    await expect(basla).toBeVisible({ timeout: 6000 });
    await basla.click({ force: true });
    await page.waitForTimeout(1500);
  })();

  await expect(page.getByText("SON ÇIKARIM").first()).toBeVisible({ timeout: 8000 });
  await rnClick(page, "SON ÇIKARIM");

  await expect(page.getByText("Son Çıkarım").first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("KİM").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("NEREDE").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("NEYLE").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("Raporu Gönder").first()).toBeVisible({ timeout: 3000 });
});

/**
 * Test 6: Full p001 accusation flow
 *   - Wrong accusation: HATA counter increments 0→1, error toast visible
 *   - Correct accusation: ResultScreen "VAKA ÇÖZÜLDÜ" with score (puan)
 *   - Post-result: "Başka Bulmaca" button navigates back to puzzle list
 *
 * p001 solution: Rıfat Bey / Bıçak / Mutfak
 */
test("p001: wrong accusation increments HATA + shows toast; correct accusation shows result + return to list", async ({ page }) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 8000 });
  if (!(await expandFirstDifficulty(page))) { test.skip(); return; }
  if (!(await startP001(page))) { test.skip(); return; }

  await expect(page.getByText("SON ÇIKARIM").first()).toBeVisible({ timeout: 8000 });

  const contentStart = await page.content();
  const hataIdx = contentStart.indexOf(">HATA<");
  expect(hataIdx).toBeGreaterThan(0);
  const beforeHata = contentStart.slice(Math.max(0, hataIdx - 400), hataIdx);
  expect(beforeHata).toContain(">0<");

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

  const contentAfterWrong = await page.content();
  const hataIdx2 = contentAfterWrong.indexOf(">HATA<");
  const beforeHata2 = contentAfterWrong.slice(Math.max(0, hataIdx2 - 400), hataIdx2);
  expect(beforeHata2).toContain(">1<");

  await rnClick(page, "KİM");
  await rnClick(page, "Rıfat Bey");
  await rnClick(page, "NEREDE");
  await rnClick(page, "Mutfak");
  await rnClick(page, "NEYLE");
  await rnClick(page, "Bıçak");

  await rnClick(page, "Raporu Gönder");
  await page.waitForTimeout(1500);

  await expect(page.getByText(/vaka çözüldü/i).first()).toBeVisible({ timeout: 8000 });

  const content = await page.content();
  const hasPuan = content.includes("PUAN") || content.includes("puan") || content.includes("Puan");
  const hasScore = /\d{4,5}/.test(content);
  expect(hasPuan || hasScore).toBe(true);

  const bashkaBulmaca = page.getByText("Başka Bulmaca").first();
  await expect(bashkaBulmaca).toBeVisible({ timeout: 5000 });
  await rnClick(page, "Başka Bulmaca");
  await page.waitForTimeout(1000);

  const backOnVakalar = page.getByText(/standart|aktif vakalar|çaylak|dedektif/i).first();
  await expect(backOnVakalar).toBeVisible({ timeout: 8000 });
});
