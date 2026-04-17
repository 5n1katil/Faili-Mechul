/**
 * iPad Screenshot Capture Script
 * Captures 4 key screens at 1024x1366 px (deviceScaleFactor=2 → 2048x2732 PNG)
 * for App Store Connect iPad 13" Display requirement.
 *
 * Usage: REPLIT_EXPO_DEV_DOMAIN=<domain> node scripts/capture-ipad-screenshots.mjs
 */

import { chromium } from "playwright";
import { mkdirSync, existsSync, readdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "screenshots", "ipad");

const APP_URL =
  process.env.EXPO_WEB_URL ||
  `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}/`;

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium";

const VIEWPORT = { width: 1024, height: 1366 };
const DEVICE_SCALE_FACTOR = 2;

const DEFAULT_PROFILE = JSON.stringify({
  name: "Dedektif",
  avatar: "",
  bio: "",
  totalScore: 0,
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
});

function log(msg) {
  console.log(`[capture] ${msg}`);
}

async function waitForApp(page, timeout = 15000) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById("root");
      if (!root) return false;
      return root.children.length > 0 && (root.innerText?.trim().length || 0) > 50;
    },
    { timeout }
  );
}

/** Find the center of all visible text nodes matching `text` */
async function findTextCenter(page, text, exact = false) {
  return page.evaluate(({ text, exact }) => {
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent?.trim() || "";
      if (exact ? t === text : t.includes(text)) {
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

/** Find a button/element with given text in the entire document (including portals) */
async function findElementCenter(page, text) {
  return page.evaluate((text) => {
    for (const el of document.querySelectorAll("*")) {
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
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // Keep only the 4 canonical PNGs; remove debug/temp files
  const KEEP = new Set(["01-anasayfa.png", "02-vakalar.png", "03-oyun.png", "04-tamamlananlar.png"]);
  for (const f of readdirSync(OUT_DIR)) {
    if (!KEEP.has(f)) {
      unlinkSync(join(OUT_DIR, f));
      log(`Removed temp file: ${f}`);
    }
  }

  log(`App URL: ${APP_URL}`);
  log(`Output: ${OUT_DIR}`);
  log(`Size: ${VIEWPORT.width * DEVICE_SCALE_FACTOR}×${VIEWPORT.height * DEVICE_SCALE_FACTOR} px`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  // Inject localStorage values BEFORE any page opens
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    locale: "tr-TR",
    colorScheme: "dark",
  });

  await context.addInitScript(({ profile }) => {
    localStorage.setItem("@dedektif_onboarding_done", "1");
    localStorage.setItem("@dedektif_setup_done", "1");
    localStorage.setItem("@dedektif_profile", profile);
  }, { profile: DEFAULT_PROFILE });

  const page = await context.newPage();

  try {
    // ── Screen 1: Ana Sayfa ──────────────────────────────────────────────────
    log("Screen 1: Ana Sayfa...");
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForApp(page);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: join(OUT_DIR, "01-anasayfa.png"), fullPage: false });
    log("✓ 01-anasayfa.png saved");

    // ── Screen 2: Vakalar (puzzle list — Standart tab) ───────────────────────
    log("Screen 2: Vakalar (Standart)...");
    const oyunUrl = APP_URL.replace(/\/?$/, "/oyun");
    await page.goto(oyunUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForApp(page);
    await page.waitForTimeout(2000);

    // Ensure "Standart" tab is active (it should be by default)
    await page.screenshot({ path: join(OUT_DIR, "02-vakalar.png"), fullPage: false });
    log("✓ 02-vakalar.png saved");

    // ── Screen 3: Oyun (actual game grid) ───────────────────────────────────
    log("Screen 3: Oyun (game grid)...");
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForApp(page);
    await page.waitForTimeout(2000);

    // Click the daily puzzle "Oyna" button by coordinate
    const oynaRects = await findTextCenter(page, "Oyna", true);
    log(`  Oyna buttons found: ${oynaRects.length}`);

    if (oynaRects.length > 0) {
      const { x, y } = oynaRects[0];
      log(`  Clicking Oyna at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      await page.mouse.click(x, y);
      await page.waitForURL("**/oyun**", { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(2500);

      // Wait longer for pre-start modal to fully render
      await page.waitForTimeout(1500);

      // Click "Oyunu Başlat" in the pre-start modal (rendered in React portal)
      // Search ALL elements in document (portals are outside #root)
      const baslatCenter = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll("*"));
        // Find the leaf text node for "Oyunu Başlat" or "▶ Oyunu Başlat"
        for (const el of all) {
          const t = el.textContent?.trim() || "";
          if ((t === "Oyunu Başlat" || t.endsWith("Oyunu Başlat")) && el.children.length === 0) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            }
          }
        }
        // Fallback: find the golden button by checking background color or the ▶ prefix
        for (const el of all) {
          const t = el.textContent?.trim() || "";
          if (t.includes("Oyunu Başlat") && el.children.length <= 2) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 0) {
              return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            }
          }
        }
        return null;
      });

      if (baslatCenter) {
        log(`  Clicking Oyunu Başlat at (${baslatCenter.x.toFixed(0)}, ${baslatCenter.y.toFixed(0)})`);
        await page.mouse.click(baslatCenter.x, baslatCenter.y);
        await page.waitForTimeout(5000);
      } else {
        log("  Oyunu Başlat not found in DOM — capturing pre-start modal instead");
      }
    } else {
      log("  No Oyna button found — navigating to /oyun directly");
      await page.goto(oyunUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await waitForApp(page);
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: join(OUT_DIR, "03-oyun.png"), fullPage: false });
    log("✓ 03-oyun.png saved");

    // ── Screen 4: Paketler (IAP packs — fallback for Tamamlananlar) ──────────
    log("Screen 4: Paketler tab (tamamlananlar fallback)...");
    await page.goto(oyunUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForApp(page);
    await page.waitForTimeout(2000);

    // First try to click "Bitti" (completed) tab; fall back to "Paketler" tab
    const bittiCenter = await findTextCenter(page, "Bitti", true);
    const paketlerCenter = await findTextCenter(page, "Paketler", true);

    if (bittiCenter.length > 0) {
      log("  Clicking Bitti tab...");
      await page.mouse.click(bittiCenter[0].x, bittiCenter[0].y);
      await page.waitForTimeout(1500);
      const pageText = await page.evaluate(() => document.body.innerText);
      if (pageText.includes("tamamladınız") || pageText.includes("Tamamlanan") || pageText.length > 200) {
        log("  Bitti tab content loaded");
      } else if (paketlerCenter.length > 0) {
        log("  Bitti tab empty — switching to Paketler tab");
        await page.mouse.click(paketlerCenter[0].x, paketlerCenter[0].y);
        await page.waitForTimeout(1500);
      }
    } else if (paketlerCenter.length > 0) {
      log("  Clicking Paketler tab...");
      await page.mouse.click(paketlerCenter[0].x, paketlerCenter[0].y);
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: join(OUT_DIR, "04-tamamlananlar.png"), fullPage: false });
    log("✓ 04-tamamlananlar.png saved");

  } finally {
    await browser.close();
  }

  // ── Verify dimensions ───────────────────────────────────────────────────────
  const { execSync } = await import("child_process");
  const pngs = ["01-anasayfa.png", "02-vakalar.png", "03-oyun.png", "04-tamamlananlar.png"];
  log("\nDimension verification:");
  for (const fname of pngs) {
    const fpath = join(OUT_DIR, fname);
    try {
      const dims = execSync(`identify -format "%wx%h" "${fpath}"`, { encoding: "utf-8" });
      log(`  ${fname}: ${dims.trim()} px ✓`);
    } catch {
      log(`  ${fname}: identify failed`);
    }
  }
  log(`\nDone! Files: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
