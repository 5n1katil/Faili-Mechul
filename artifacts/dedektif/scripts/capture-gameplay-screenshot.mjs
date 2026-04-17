/**
 * Find Oyna button bounding box, then click at those exact coordinates.
 * Uses Playwright's force:true to bypass overlay interception.
 */
import { chromium } from "playwright";
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "screenshots", "ipad");

const BASE = `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`;
const CHROMIUM_PATH =
  "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium";

const VIEWPORT = { width: 1024, height: 1366 };
const DSF = 2;

const log = (m) => console.log(`[grid] ${m}`);

async function waitForApp(page, timeout = 15000) {
  await page.waitForFunction(() => {
    const root = document.getElementById("root");
    return root && (root.innerText?.trim().length || 0) > 50;
  }, { timeout });
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DSF,
    locale: "tr-TR",
    colorScheme: "dark",
  });

  const page = await context.newPage();

  try {
    // ── Load home with onboarding bypassed ──
    log("Loading home...");
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("@dedektif_onboarding_done", "1");
      localStorage.setItem("@dedektif_setup_done", "1");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApp(page);
    await page.waitForTimeout(2500);

    // ── Capture home screenshot to find Oyna position ──
    await page.screenshot({ path: join(OUT_DIR, "debug-home.png") });

    // ── Find all text nodes with "Oyna" and their bounding rects ──
    const oynaInfo = await page.evaluate(() => {
      const results = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent?.trim() === "Oyna") {
          const el = node.parentElement;
          if (el) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            results.push({
              text: node.textContent.trim(),
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              visible: rect.width > 0 && rect.height > 0,
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity,
              pointerEvents: style.pointerEvents,
              tagName: el.tagName,
              className: el.className?.slice(0, 100),
            });
          }
        }
      }
      return results;
    });

    log("Oyna elements found: " + oynaInfo.length);
    oynaInfo.forEach((info, i) => {
      log(`  [${i}] rect=(${info.rect.x.toFixed(0)},${info.rect.y.toFixed(0)},${info.rect.width.toFixed(0)}x${info.rect.height.toFixed(0)}) visible=${info.visible} display=${info.display} vis=${info.visibility}`);
    });

    // ── Click the FIRST visible Oyna button by coordinate ──
    const visibleOyna = oynaInfo.find(o => o.visible && o.rect.width > 0);
    if (visibleOyna) {
      const cx = visibleOyna.rect.x + visibleOyna.rect.width / 2;
      const cy = visibleOyna.rect.y + visibleOyna.rect.height / 2;
      log(`Clicking Oyna at (${cx.toFixed(0)}, ${cy.toFixed(0)}) ...`);
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(3000);

      await page.waitForURL("**/oyun**", { timeout: 6000 }).catch(() => {});
      log("URL after click: " + page.url());

      const t1 = await page.evaluate(() => document.body.innerText.slice(0, 400));
      log("Content: " + t1.replace(/\n+/g, " | ").slice(0, 250));
      await page.screenshot({ path: join(OUT_DIR, "debug-after-oyna-click.png") });

      // Always try to click Oyunu Başlat (it appears in a Modal portal)
      log("Looking for Oyunu Başlat button in entire document...");
      const baslat = await page.evaluate(() => {
        // Search ALL elements in the document (including portals)
        const all = document.querySelectorAll("*");
        for (const el of all) {
          if (el.textContent?.trim() === "Oyunu Başlat" || el.textContent?.trim() === "▶ Oyunu Başlat") {
            if (el.children.length === 0) { // leaf text element
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
              }
            }
          }
        }
        // Fallback: find by partial text
        for (const el of all) {
          const txt = el.textContent?.trim() || "";
          if (txt.includes("Oyunu Başlat") && el.children.length <= 1) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
        }
        return null;
      });

      if (baslat) {
        log(`Clicking Oyunu Başlat at (${baslat.x.toFixed(0)}, ${baslat.y.toFixed(0)})`);
        await page.mouse.click(baslat.x, baslat.y);
        await page.waitForTimeout(4000);
      } else {
        log("Oyunu Başlat not found in DOM. Trying coordinate y=640...");
        // From screenshot: button appears at ~y=640 in 1024x1366 viewport
        await page.mouse.click(512, 640);
        await page.waitForTimeout(4000);
      }
    } else {
      log("No visible Oyna button found on home screen.");
    }

    const finalText = await page.evaluate(() => document.body.innerText.slice(0, 600));
    const gameOn = ["OLAY", "ŞÜPHELİLER", "SÜRE", "HATA"].some(k => finalText.includes(k));
    log("Game on: " + gameOn);
    log("Final: " + finalText.replace(/\n+/g, " | ").slice(0, 300));

    const out = join(OUT_DIR, "03-oyun.png");
    await page.screenshot({ path: out, fullPage: false });
    log("✓ 03-oyun.png saved");

    const { execSync } = await import("child_process");
    const dims = execSync(`identify -format "%wx%h" "${out}"`, { encoding: "utf-8" });
    log(`Dimensions: ${dims}`);

  } finally {
    await browser.close();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
