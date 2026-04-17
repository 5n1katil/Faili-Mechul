/**
 * iPad Screenshot Capture Script — App Store Connect
 * Viewport 1024x1366 + deviceScaleFactor 2 → 2048x2732 PNG
 *
 * Usage: REPLIT_EXPO_DEV_DOMAIN=<domain> node scripts/capture-ipad-screenshots.mjs
 */

import { chromium } from "playwright";
import { mkdirSync, existsSync, readdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "screenshots", "ipad");

const APP_URL =
  process.env.EXPO_WEB_URL ||
  `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}/`;

const VIEWPORT = { width: 1024, height: 1366 };
const DSF = 2;

const PROFILE_JSON = JSON.stringify({
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

const log = (m) => console.log(`[capture] ${m}`);

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    return execSync("which chromium || which chromium-browser", { encoding: "utf-8" }).trim();
  } catch {
    // fallback to known Nix store path
    return execSync("ls /nix/store/*/bin/chromium 2>/dev/null | head -1", { encoding: "utf-8" }).trim();
  }
}

async function waitForApp(page) {
  await page.waitForFunction(() => {
    const root = document.getElementById("root");
    return root && root.children.length > 0 && (root.innerText?.trim().length || 0) > 50;
  }, { timeout: 15000 });
}

/** Return center coords of visible text nodes matching `text` */
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
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0)
            results.push({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
        }
      }
    }
    return results;
  }, { text, exact });
}

/** Find center of a button by leaf-text search across entire document (incl. portals) */
async function findButtonCenter(page, text) {
  return page.evaluate((text) => {
    for (const el of document.querySelectorAll("*")) {
      const t = el.textContent?.trim() || "";
      if ((t === text || t.endsWith(text)) && el.children.length === 0) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0)
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
    }
    return null;
  }, text);
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // Keep only the 4 canonical ASC PNGs
  const KEEP = new Set(["01-anasayfa.png", "02-vakalar.png", "03-oyun.png", "04-tamamlananlar.png"]);
  for (const f of readdirSync(OUT_DIR)) {
    if (!KEEP.has(f)) { unlinkSync(join(OUT_DIR, f)); log(`Removed: ${f}`); }
  }

  const chromiumPath = findChromium();
  log(`Chromium: ${chromiumPath}`);
  log(`Output:   ${OUT_DIR}  (${VIEWPORT.width * DSF}×${VIEWPORT.height * DSF} px)`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: chromiumPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF, locale: "tr-TR", colorScheme: "dark" });

  // Inject localStorage before every page load
  await context.addInitScript(({ profile }) => {
    localStorage.setItem("@dedektif_onboarding_done", "1");
    localStorage.setItem("@dedektif_setup_done", "1");
    localStorage.setItem("@dedektif_profile", profile);
  }, { profile: PROFILE_JSON });

  const page = await context.newPage();
  const oyunUrl = APP_URL.replace(/\/?$/, "/oyun");

  try {
    // 1. Ana Sayfa
    log("1/4 Ana Sayfa…");
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForApp(page);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(OUT_DIR, "01-anasayfa.png"), fullPage: false });
    log("✓ 01-anasayfa.png");

    // 2. Vakalar (Standart tab)
    log("2/4 Vakalar…");
    await page.goto(oyunUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForApp(page);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(OUT_DIR, "02-vakalar.png"), fullPage: false });
    log("✓ 02-vakalar.png");

    // 3. Oyun — active game grid
    log("3/4 Oyun…");
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const oynaRects = await findTextCenter(page, "Oyna", true);
    if (oynaRects.length > 0) {
      await page.mouse.click(oynaRects[0].x, oynaRects[0].y);
      await page.waitForURL("**/oyun**", { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(4000);

      const btn = await findButtonCenter(page, "Oyunu Başlat");
      if (btn) {
        await page.mouse.click(btn.x, btn.y);
        await page.waitForTimeout(5000);
      }
    }
    await page.screenshot({ path: join(OUT_DIR, "03-oyun.png"), fullPage: false });
    log("✓ 03-oyun.png");

    // 4. Tamamlananlar (Bitti tab)
    log("4/4 Tamamlananlar…");
    await page.goto(oyunUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const bittiCenters = await findTextCenter(page, "Bitti", true);
    if (bittiCenters.length > 0) {
      await page.mouse.click(bittiCenters[0].x, bittiCenters[0].y);
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: join(OUT_DIR, "04-tamamlananlar.png"), fullPage: false });
    log("✓ 04-tamamlananlar.png");

  } finally {
    await browser.close();
  }

  log("\nDimensions:");
  for (const f of ["01-anasayfa.png", "02-vakalar.png", "03-oyun.png", "04-tamamlananlar.png"]) {
    const d = execSync(`identify -format "%wx%h" "${join(OUT_DIR, f)}"`, { encoding: "utf-8" });
    log(`  ${f}: ${d.trim()} px`);
  }
  log(`\nDone → ${OUT_DIR}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
