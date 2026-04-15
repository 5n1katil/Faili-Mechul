import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:22971";

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2500);
  const skip = page.getByText("Atla");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skip.click({ force: true });
    await page.waitForTimeout(800);
  }
}

async function goToVakalar(page: Page) {
  await page.goto(`${BASE}/oyun`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function expandCaylik(page: Page) {
  const header = page.getByText("Çaylak", { exact: false }).first();
  await expect(header).toBeVisible({ timeout: 8000 });
  await header.click({ force: true });
  await page.waitForTimeout(800);
  await expect(page.getByTestId("puzzle-card").first()).toBeVisible({ timeout: 5000 });
}

async function rnClick(page: Page, text: string) {
  await page.evaluate((t) => {
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (el.textContent === t) {
        let p: Element | null = el.parentElement;
        while (p && !p.hasAttribute("tabindex")) p = p.parentElement;
        if (p) { (p as HTMLElement).click(); return; }
      }
    }
  }, text);
  await page.waitForTimeout(400);
}

async function startPuzzle(page: Page, titleText: string) {
  await page.getByText(titleText).first().click({ force: true });
  await page.waitForTimeout(800);
  const btn = page.getByTestId("start-game-btn");
  await expect(btn).toBeVisible({ timeout: 6000 });
  await btn.click({ force: true });
  await page.waitForTimeout(1500);
}

function parseMMSS(text: string): number {
  const m = text.match(/(\d{2}):(\d{2})/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : -1;
}

test("Vakalar screen shows difficulty headers", async ({ page }) => {
  await boot(page);
  await goToVakalar(page);
  await expect(page.getByText(/standart|aktif vakalar/i).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/çaylak|dedektif/i).first()).toBeVisible({ timeout: 5000 });
});

test("Expanding Çaylak accordion starts a game with timer and grid visible", async ({ page }) => {
  await boot(page);
  await goToVakalar(page);
  await expandCaylik(page);
  await page.getByTestId("puzzle-card").first().click({ force: true });
  await page.waitForTimeout(800);
  await page.getByTestId("start-game-btn").click({ force: true });
  await page.waitForTimeout(1500);

  await expect(page.getByTestId("timer-value")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("ŞÜPHELILER").first()).toBeVisible({ timeout: 5000 });
});

test("Grid cell marks cycle: three presses produce the '?' indicator", async ({ page }) => {
  await boot(page);
  await goToVakalar(page);
  await expandCaylik(page);
  await page.getByTestId("puzzle-card").first().click({ force: true });
  await page.waitForTimeout(800);
  await page.getByTestId("start-game-btn").click({ force: true });
  await page.waitForTimeout(1500);

  await expect(page.getByText("ŞÜPHELILER").first()).toBeVisible({ timeout: 5000 });

  const qBefore = (await page.content()).match(/\?/g)?.length ?? 0;

  const firstCell = page.getByTestId("grid-cell").first();
  await expect(firstCell).toBeVisible({ timeout: 5000 });
  await page.evaluate(() => {
    const cell = document.querySelector('[data-testid="grid-cell"]') as HTMLElement | null;
    if (!cell) return;
    cell.click();
    setTimeout(() => cell.click(), 200);
    setTimeout(() => cell.click(), 400);
  });
  await page.waitForTimeout(700);

  const qAfter = (await page.content()).match(/\?/g)?.length ?? 0;
  expect(qAfter).toBeGreaterThan(qBefore);
});

test("AccusationSheet shows KİM / NEREDE / NEYLE after tapping SON ÇIKARIM", async ({ page }) => {
  await boot(page);
  await goToVakalar(page);
  await expandCaylik(page);
  await page.getByTestId("puzzle-card").first().click({ force: true });
  await page.waitForTimeout(800);
  await page.getByTestId("start-game-btn").click({ force: true });
  await page.waitForTimeout(1500);

  await expect(page.getByText("SON ÇIKARIM").first()).toBeVisible({ timeout: 8000 });
  await rnClick(page, "SON ÇIKARIM");

  await expect(page.getByText("Son Çıkarım").first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("KİM").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("NEREDE").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("NEYLE").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("Raporu Gönder").first()).toBeVisible({ timeout: 3000 });
});

// p001 solution: Rıfat Bey / Bıçak / Mutfak
test("p001: wrong accusation increments HATA and adds 30s; correct accusation shows result screen", async ({ page }) => {
  await boot(page);
  await goToVakalar(page);
  await expandCaylik(page);
  await startPuzzle(page, "Konakta Gece Yarısı Cinayeti");

  await expect(page.getByText("SON ÇIKARIM").first()).toBeVisible({ timeout: 8000 });

  // initial state: HATA = 0
  await expect(page.getByTestId("hata-count")).toHaveText("0", { timeout: 3000 });

  // capture timer before wrong guess
  const timerEl = page.getByTestId("timer-value");
  await expect(timerEl).toBeVisible({ timeout: 5000 });
  const t0 = parseMMSS((await timerEl.textContent()) ?? "");

  // wrong accusation
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

  await expect(page.getByText(/yanlış suçlama|30 saniye/i).first()).toBeVisible({ timeout: 4000 });
  await expect(page.getByTestId("hata-count")).toHaveText("1", { timeout: 3000 });

  // timer must have jumped by ≥30s
  const t1 = parseMMSS((await timerEl.textContent()) ?? "");
  expect(t0).toBeGreaterThanOrEqual(0);
  expect(t1 - t0).toBeGreaterThanOrEqual(28);

  // correct accusation
  await rnClick(page, "KİM");
  await rnClick(page, "Rıfat Bey");
  await rnClick(page, "NEREDE");
  await rnClick(page, "Mutfak");
  await rnClick(page, "NEYLE");
  await rnClick(page, "Bıçak");
  await rnClick(page, "Raporu Gönder");
  await page.waitForTimeout(1500);

  await expect(page.getByText(/vaka çözüldü/i).first()).toBeVisible({ timeout: 8000 });

  // back to puzzle list
  await expect(page.getByText("Başka Bulmaca").first()).toBeVisible({ timeout: 5000 });
  await rnClick(page, "Başka Bulmaca");
  await page.waitForTimeout(1000);
  await expect(page.getByText(/standart|aktif vakalar|çaylak/i).first()).toBeVisible({ timeout: 8000 });
});
