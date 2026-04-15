import { test } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:22971";
test("debug accusation bar click", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  const skip = page.getByText("Atla");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skip.click({ force: true });
    await page.waitForTimeout(600);
  }
  await page.goto(`${BASE}/oyun`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1500);
  const caylik = page.getByText("Çaylak", { exact: false }).first();
  if (await caylik.isVisible({ timeout: 2000 }).catch(() => false)) {
    await caylik.click({ force: true });
    await page.waitForTimeout(600);
  }
  const konakta = page.getByText("Konakta Gece Yarısı Cinayeti").first();
  if (await konakta.isVisible({ timeout: 3000 }).catch(() => false)) {
    await konakta.click({ force: true });
    await page.waitForTimeout(600);
  }
  const basla = page.getByText(/başla|oyna/i).first();
  if (await basla.isVisible({ timeout: 5000 }).catch(() => false)) {
    await basla.click({ force: true });
    await page.waitForTimeout(1500);
  }
  
  const accuseBtn = page.getByText("SON ÇIKARIM").first();
  const hasBtnText = await accuseBtn.isVisible({ timeout: 5000 }).catch(() => false);
  console.log("SON ÇIKARIM visible:", hasBtnText);
  
  if (hasBtnText) {
    const box = await accuseBtn.boundingBox();
    console.log("Button bounding box:", JSON.stringify(box));
    // Try clicking via evaluate (programmatic DOM click)
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        if ((el as HTMLElement).innerText === 'SON ÇIKARIM' || el.textContent === 'SON ÇIKARIM') {
          let parent = el.parentElement;
          // Walk up to find tabindex element or pressable
          while (parent && !parent.hasAttribute('tabindex')) {
            parent = parent.parentElement;
          }
          if (parent) {
            console.log('Clicking tabindex parent:', parent.className, parent.getAttribute('tabindex'));
            (parent as HTMLElement).click();
            break;
          }
        }
      }
    });
    await page.waitForTimeout(1000);
    const text2 = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log("After programmatic click:", text2.slice(0, 300));
    const hasModal = await page.getByText("Son Çıkarım").isVisible({ timeout: 2000 }).catch(() => false);
    console.log("Son Çıkarım modal visible:", hasModal);
  }
});
