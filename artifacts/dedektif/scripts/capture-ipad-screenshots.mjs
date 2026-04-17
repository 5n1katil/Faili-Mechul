/**
 * iPad Screenshot Capture Script
 * Captures 4 key screens at 1024x1366 px (deviceScaleFactor=2 → 2048x2732 PNG)
 * for App Store Connect iPad 13" Display requirement.
 *
 * Usage: node scripts/capture-ipad-screenshots.mjs
 */

import { chromium } from "playwright";
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "screenshots", "ipad");

const APP_URL =
  process.env.EXPO_WEB_URL ||
  `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}/`;

const VIEWPORT = { width: 1024, height: 1366 };
const DEVICE_SCALE_FACTOR = 2;

function log(msg) {
  console.log(`[capture] ${msg}`);
}

async function waitForApp(page, timeout = 15000) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById("root");
      if (!root) return false;
      const hasContent = root.children.length > 0;
      const hasText =
        root.innerText && root.innerText.trim().length > 50;
      return hasContent && hasText;
    },
    { timeout }
  );
}

async function dismissModals(page) {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("@dedektif_onboarding_done", "1");
    localStorage.setItem("@dedektif_setup_done", "1");
  });
}

/** Find the bounding rect center of all visible text nodes matching `text` */
async function findTextRect(page, text, exact = false) {
  return page.evaluate(({ text, exact }) => {
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent?.trim() || "";
      const match = exact ? t === text : t.includes(text);
      if (match) {
        const el = node.parentElement;
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            results.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
          }
        }
      }
    }
    return results;
  }, { text, exact });
}

/** Find button in entire document (including portals) */
async function findButtonRect(page, text) {
  return page.evaluate((text) => {
    const all = document.querySelectorAll("*");
    for (const el of all) {
      const t = el.textContent?.trim() || "";
      if (t.includes(text) && el.children.length <= 1) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
      }
    }
    return null;
  }, text);
}

async function main() {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  log(`App URL: ${APP_URL}`);
  log(`Output dir: ${OUT_DIR}`);
  log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height} @ ${DEVICE_SCALE_FACTOR}x → ${VIEWPORT.width * DEVICE_SCALE_FACTOR}x${VIEWPORT.height * DEVICE_SCALE_FACTOR} px`);

  const CHROMIUM_PATH =
    process.env.CHROMIUM_PATH ||
    "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium";

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    locale: "tr-TR",
    colorScheme: "dark",
  });

  const page = await context.newPage();

  try {
    // ── Screen 1: Ana Sayfa ──────────────────────────────────────────────────
    log("Navigating to Ana Sayfa...");
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await dismissModals(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApp(page);
    await page.waitForTimeout(2500);

    const ss1 = join(OUT_DIR, "01-anasayfa.png");
    await page.screenshot({ path: ss1, fullPage: false });
    log(`✓ 01-anasayfa.png saved`);

    // ── Screen 2: Vakalar (puzzle list) ─────────────────────────────────────
    log("Navigating to Vakalar (oyun route)...");
    const oyunUrl = APP_URL.replace(/\/?$/, "/oyun");
    await page.goto(oyunUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const ss2 = join(OUT_DIR, "02-vakalar.png");
    await page.screenshot({ path: ss2, fullPage: false });
    log(`✓ 02-vakalar.png saved`);

    // ── Screen 3: Oyun (actual game grid) ───────────────────────────────────
    log("Starting game for screenshot...");
    // Return to home screen
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForApp(page);
    await page.waitForTimeout(2000);

    // Find and click the "Oyna" button by bounding rect
    const oynaRects = await findTextRect(page, "Oyna", true);
    log(`Found ${oynaRects.length} Oyna button(s)`);

    if (oynaRects.length > 0) {
      const { x, y } = oynaRects[0];
      log(`Clicking Oyna at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      await page.mouse.click(x, y);
      await page.waitForURL("**/oyun**", { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // Click "Oyunu Başlat" button (in modal portal)
      const baslatRect = await findButtonRect(page, "Oyunu Başlat");
      if (baslatRect) {
        log(`Clicking Oyunu Başlat at (${baslatRect.x.toFixed(0)}, ${baslatRect.y.toFixed(0)})`);
        await page.mouse.click(baslatRect.x, baslatRect.y);
        await page.waitForTimeout(4000);
      }
    }

    const ss3 = join(OUT_DIR, "03-oyun.png");
    await page.screenshot({ path: ss3, fullPage: false });
    log(`✓ 03-oyun.png saved`);

    // ── Screen 4: Liderlik (leaderboard) ────────────────────────────────────
    log("Navigating to Liderlik...");
    const liderlikUrl = APP_URL.replace(/\/?$/, "/liderlik");
    await page.goto(liderlikUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const ss4 = join(OUT_DIR, "04-liderlik.png");
    await page.screenshot({ path: ss4, fullPage: false });
    log(`✓ 04-liderlik.png saved`);

  } finally {
    await browser.close();
  }

  // ── Verify dimensions ───────────────────────────────────────────────────────
  const { execSync } = await import("child_process");
  const pngs = ["01-anasayfa.png", "02-vakalar.png", "03-oyun.png", "04-liderlik.png"];
  log("\nDimension verification:");
  for (const fname of pngs) {
    const fpath = join(OUT_DIR, fname);
    try {
      const out = execSync(`identify -format "%wx%h" "${fpath}"`, { encoding: "utf-8" });
      log(`  ${fname}: ${out.trim()} px`);
    } catch {
      log(`  ${fname}: identify failed`);
    }
  }
  log("\nDone! Files saved to: " + OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
