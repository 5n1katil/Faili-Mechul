/**
 * gameplay-flow.test.ts
 * End-to-end gameplay flow tests for Dedektif (Playwright / React Native Web).
 *
 * Key patterns:
 * - Navigate directly to /oyun (tab clicks are unreliable in RNW)
 * - Expand Çaylak difficulty accordion before selecting a puzzle
 * - Use page.evaluate DOM click for React Native Pressable elements
 * - "SON ÇIKARIM" text triggers AccusationSheet
 * - p001 solution: Rıfat Bey / Bıçak / Mutfak
 */

import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:22971";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

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
  await page.goto(`${BASE}/oyun`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await page.waitForTimeout(1500);
}

/**
 * Expands the first visible difficulty accordion and verifies puzzle cards appear.
 * Throws if no accordion can be expanded — hard failure, not a skip.
 */
async function expandFirstDifficulty(page: Page): Promise<void> {
  const diffHeaders = ["Çaylak", "Dedektif", "Baş Komiser"];
  for (const diff of diffHeaders) {
    const header = page.getByText(diff, { exact: false }).first();
    if (!(await header.isVisible({ timeout: 2000 }).catch(() => false)))
      continue;
    await header.click({ force: true });
    await page.waitForTimeout(800);
    const content = await page.content();
    if (
      content.includes("Cinayeti") ||
      content.includes("Kayıp") ||
      content.includes("Gizemli")
    ) {
      return;
    }
  }
  throw new Error(
    "Could not expand any difficulty accordion to reveal puzzle cards"
  );
}

/**
 * Opens the first visible puzzle card and starts the game.
 * Throws if the puzzle card or start button cannot be found.
 */
async function startFirstPuzzle(page: Page): Promise<void> {
  const card = page
    .getByText(/cinayeti|kayıp|gizemli/i)
    .first();
  await expect(card).toBeVisible({ timeout: 5000 });
  await card.click({ force: true });
  await page.waitForTimeout(800);

  const basla = page.getByText(/başla|oyna/i).first();
  await expect(basla).toBeVisible({
    timeout: 6000,
  });
  await basla.click({ force: true });
  await page.waitForTimeout(1500);
}

/**
 * Opens "Konakta Gece Yarısı Cinayeti" (p001) under Çaylak and starts it.
 * Throws if the card or start button is not found.
 */
async function startP001(page: Page): Promise<void> {
  const p001 = page.getByText("Konakta Gece Yarısı Cinayeti").first();
  await expect(p001).toBeVisible({ timeout: 5000 });
  await p001.click({ force: true });
  await page.waitForTimeout(800);

  const basla = page.getByText(/başla|oyna/i).first();
  await expect(basla).toBeVisible({ timeout: 6000 });
  await basla.click({ force: true });
  await page.waitForTimeout(1500);
}

/**
 * Clicks a React Native Pressable identified by its exact text content.
 * Works around RNW Pressable not responding to Playwright click.
 */
async function rnClick(page: Page, exactText: string) {
  await page.evaluate((text) => {
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (el.textContent === text) {
        let p: Element | null = el.parentElement;
        while (p && !p.hasAttribute("tabindex")) p = p.parentElement;
        if (p) {
          (p as HTMLElement).click();
          return;
        }
      }
    }
  }, exactText);
  await page.waitForTimeout(400);
}

/**
 * Cycles the first small (grid-sized) empty-text pressable 3 times so it
 * reaches the "?" mark state (cycle: empty→cross→check→question).
 * Returns true if a candidate cell was found and clicked.
 */
async function cycleFirstGridCellToQuestion(page: Page): Promise<boolean> {
  const found = await page.evaluate(() => {
    const allTabEls = Array.from(
      document.querySelectorAll('[tabindex="0"]')
    ) as HTMLElement[];
    let cell: HTMLElement | null = null;
    for (const el of allTabEls) {
      if (el.innerText.trim()) continue;
      const { width, height } = el.getBoundingClientRect();
      if (width > 10 && width < 60 && height > 10 && height < 60) {
        cell = el;
        break;
      }
    }
    if (!cell) return false;
    cell.click();
    setTimeout(() => cell!.click(), 200);
    setTimeout(() => cell!.click(), 400);
    return true;
  });
  await page.waitForTimeout(700);
  return found;
}

/**
 * Reads the current displayed timer value (MM:SS before "SÜRE" label) and
 * returns it as total seconds.  Returns -1 if the timer cannot be found.
 */
async function getDisplayedTimerSeconds(page: Page): Promise<number> {
  const content = await page.content();
  const sureIdx = content.indexOf(">SÜRE<");
  if (sureIdx < 0) return -1;
  const before = content.slice(Math.max(0, sureIdx - 300), sureIdx);
  const match = before.match(/>(\d{2}):(\d{2})</);
  if (!match) return -1;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

/**
 * Test 1: Vakalar screen loads with difficulty category headers
 */
test("Vakalar screen loads and shows difficulty category headers", async ({
  page,
}) => {
  await loadApp(page);
  await goToVakalar(page);

  await expect(
    page.getByText(/standart|aktif vakalar/i).first()
  ).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({
    timeout: 5000,
  });
});

/**
 * Test 2: Expand accordion → puzzle cards appear → game starts with timer/grid
 */
test(
  "Expanding difficulty accordion reveals puzzles; game starts with visible timer and deduction grid",
  async ({ page }) => {
    await loadApp(page);
    await goToVakalar(page);

    await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({
      timeout: 8000,
    });

    await expandFirstDifficulty(page);
    await startFirstPuzzle(page);

    const content = await page.content();
    const hasTimer = content.includes("00:") || content.includes("SÜRE");
    const hasGrid =
      content.includes("ŞÜPHELILER") || content.includes("SİLAHLAR");
    expect(hasTimer).toBe(true);
    expect(hasGrid).toBe(true);
  }
);

/**
 * Test 3: Grid cell interaction — cycling an empty cell 3× produces the "?" mark
 */
test(
  "Grid cell marking: cycling an empty cell three times produces a '?' indicator",
  async ({ page }) => {
    await loadApp(page);
    await goToVakalar(page);

    await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({
      timeout: 8000,
    });

    await expandFirstDifficulty(page);
    await startFirstPuzzle(page);

    await expect(page.getByText("ŞÜPHELILER").first()).toBeVisible({
      timeout: 5000,
    });

    const contentBefore = await page.content();
    const qBefore = (contentBefore.match(/\?/g) || []).length;

    const cycled = await cycleFirstGridCellToQuestion(page);
    expect(cycled).toBe(true);

    const contentAfter = await page.content();
    const qAfter = (contentAfter.match(/\?/g) || []).length;

    expect(qAfter).toBeGreaterThan(qBefore);
  }
);

/**
 * Test 4: AccusationSheet opens from StickyAccuseBar and shows all three dropdowns
 */
test(
  "SON ÇIKARIM bar opens AccusationSheet with KİM / NEREDE / NEYLE dropdowns",
  async ({ page }) => {
    await loadApp(page);
    await goToVakalar(page);

    await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({
      timeout: 8000,
    });

    await expandFirstDifficulty(page);
    await startFirstPuzzle(page);

    await expect(page.getByText("SON ÇIKARIM").first()).toBeVisible({
      timeout: 8000,
    });
    await rnClick(page, "SON ÇIKARIM");

    await expect(page.getByText("Son Çıkarım").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("KİM").first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("NEREDE").first()).toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByText("NEYLE").first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Raporu Gönder").first()).toBeVisible({
      timeout: 3000,
    });
  }
);

/**
 * Test 5 (full p001 flow):
 *   a. Wrong accusation: timer jumps +30s, HATA counter increments 0→1
 *   b. Correct accusation: ResultScreen shows "VAKA ÇÖZÜLDÜ" with score
 *   c. Post-result: "Başka Bulmaca" navigates back to puzzle list
 *
 * p001 solution: Rıfat Bey / Bıçak / Mutfak
 */
test(
  "p001: wrong accusation adds 30s to timer and increments HATA; correct accusation shows result; Başka Bulmaca returns to list",
  async ({ page }) => {
    await loadApp(page);
    await goToVakalar(page);

    await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({
      timeout: 8000,
    });

    await expandFirstDifficulty(page);
    await startP001(page);

    await expect(page.getByText("SON ÇIKARIM").first()).toBeVisible({
      timeout: 8000,
    });

    // --- Verify initial HATA counter is 0 ---
    const contentStart = await page.content();
    const hataIdx = contentStart.indexOf(">HATA<");
    expect(hataIdx).toBeGreaterThan(
      0,
      "HATA counter label must be visible on game screen"
    );
    const nearHata0 = contentStart.slice(Math.max(0, hataIdx - 400), hataIdx);
    expect(nearHata0).toContain(">0<");

    // --- Capture timer before wrong accusation ---
    const timerBefore = await getDisplayedTimerSeconds(page);
    expect(timerBefore).toBeGreaterThanOrEqual(0);

    // --- Submit wrong accusation ---
    await rnClick(page, "SON ÇIKARIM");
    await expect(page.getByText("Son Çıkarım").first()).toBeVisible({
      timeout: 5000,
    });

    await rnClick(page, "KİM");
    await rnClick(page, "Nazik Hanım");
    await rnClick(page, "NEREDE");
    await rnClick(page, "Kütüphane");
    await rnClick(page, "NEYLE");
    await rnClick(page, "Zehir");

    await rnClick(page, "Raporu Gönder");
    await page.waitForTimeout(600);

    // Error toast is visible
    const toast = page.getByText(/yanlış suçlama|30 saniye/i).first();
    await expect(toast).toBeVisible({ timeout: 4000 });

    // --- HATA counter must now show 1 ---
    const contentWrong = await page.content();
    const hataIdx2 = contentWrong.indexOf(">HATA<");
    const nearHata1 = contentWrong.slice(Math.max(0, hataIdx2 - 400), hataIdx2);
    expect(nearHata1).toContain(">1<");

    // --- Timer must have jumped by at least 30s ---
    const timerAfter = await getDisplayedTimerSeconds(page);
    expect(timerAfter).toBeGreaterThanOrEqual(0);
    expect(timerAfter - timerBefore).toBeGreaterThanOrEqual(
      28,
      `Timer should jump ≥30s on wrong accusation (before: ${timerBefore}s, after: ${timerAfter}s)`
    );

    // --- Submit correct accusation ---
    await rnClick(page, "KİM");
    await rnClick(page, "Rıfat Bey");
    await rnClick(page, "NEREDE");
    await rnClick(page, "Mutfak");
    await rnClick(page, "NEYLE");
    await rnClick(page, "Bıçak");

    await rnClick(page, "Raporu Gönder");
    await page.waitForTimeout(1500);

    // ResultScreen is visible with "VAKA ÇÖZÜLDÜ"
    await expect(page.getByText(/vaka çözüldü/i).first()).toBeVisible({
      timeout: 8000,
    });

    // Score (4+ digit number) is displayed
    const resultContent = await page.content();
    const hasPuan =
      resultContent.includes("PUAN") ||
      resultContent.includes("puan") ||
      resultContent.includes("Puan");
    const hasNumericScore = /\d{4,5}/.test(resultContent);
    expect(hasPuan || hasNumericScore).toBe(true);

    // --- "Başka Bulmaca" navigates back to puzzle list ---
    const bashkaBulmaca = page.getByText("Başka Bulmaca").first();
    await expect(bashkaBulmaca).toBeVisible({ timeout: 5000 });
    await rnClick(page, "Başka Bulmaca");
    await page.waitForTimeout(1000);

    await expect(
      page.getByText(/standart|aktif vakalar|çaylak|dedektif/i).first()
    ).toBeVisible({ timeout: 8000 });
  }
);
