#!/usr/bin/env node
/**
 * render-avatar-grid.js
 *
 * One-shot utility: lists every SVG in public/avatars/, opens an HTML page
 * that renders them in a numbered grid using the same CSS mask + currentColor
 * technique the in-game `CustomAvatar` component uses, and screenshots the
 * page with Playwright. The resulting PNGs are reviewed by the dev to label
 * each filename as male / female / neutral and produce avatar-gender.json.
 *
 * Output:
 *   - artifacts/dedektif/scripts/_avatar-grid-1.png
 *   - artifacts/dedektif/scripts/_avatar-grid-2.png  (if > 128 icons)
 *   - artifacts/dedektif/scripts/_avatar-grid-index.json  (cell index -> filename map)
 *
 * Usage:
 *   node scripts/render-avatar-grid.js
 */

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_AVATARS = path.join(ROOT, "public", "avatars");
const OUT_DIR = __dirname;

// Spin up a minimal static-file server rooted at artifacts/dedektif/ so the
// generated HTML can refer to /avatars/<name>.svg and Chromium can fetch them
// (file:// origins block subresource loads by default).
function startStaticServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const relPath = urlPath === "/" ? "/index.html" : urlPath;
        const filePath = path.join(rootDir, relPath);
        if (!filePath.startsWith(rootDir)) {
          res.statusCode = 403;
          res.end("forbidden");
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const ct =
          ext === ".svg" ? "image/svg+xml" :
          ext === ".html" ? "text/html; charset=utf-8" :
          ext === ".json" ? "application/json" :
          "application/octet-stream";
        res.setHeader("Content-Type", ct);
        fs.createReadStream(filePath).pipe(res);
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

const COLUMNS = 6;
const PAGE_ROWS = 8; // 6 * 8 = 48 cells per screenshot
const CELL_SIZE = 180; // px (icon area) — large enough to clearly see hair/silhouette gender hints
const LABEL_H = 34; // px below icon for the number + filename suffix
const PADDING = 10;

async function main() {
  if (!fs.existsSync(PUBLIC_AVATARS)) {
    console.error(`Avatar dir not found: ${PUBLIC_AVATARS}`);
    process.exit(1);
  }
  // Pick up every renderable avatar in public/avatars/: vector SVGs plus
  // alpha-channel raster files. SVGs are normalised to extensionless keys for
  // backward compatibility; raster files keep their extension so the in-game
  // database can reference them directly (e.g. "noun-woman-4812161.png").
  const SUPPORTED_EXT_RE = /\.(svg|png|webp)$/i;
  const files = fs
    .readdirSync(PUBLIC_AVATARS, { withFileTypes: true })
    .filter((d) => d.isFile() && SUPPORTED_EXT_RE.test(d.name))
    .map((d) => (/\.svg$/i.test(d.name) ? d.name.replace(/\.svg$/i, "") : d.name))
    .sort();

  console.log(`Found ${files.length} SVG files.`);

  // Save filename index (cell number is 1-based, matches what we label in HTML).
  const indexPath = path.join(OUT_DIR, "_avatar-grid-index.json");
  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2), "utf-8");
  console.log(`Wrote index: ${indexPath}`);

  // Serve artifacts/dedektif/ over http so the grid HTML can reference
  // /avatars/<name>.svg as a regular subresource.
  const { server, port } = await startStaticServer(ROOT);
  console.log(`Static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();

  const pageSize = COLUMNS * PAGE_ROWS;
  const pages = Math.ceil(files.length / pageSize);
  console.log(`Splitting into ${pages} page(s) of up to ${pageSize} cells each.`);

  // Place generated HTML under the served root so it loads via http.
  const HTML_DIR = path.join(ROOT, "_grid_tmp");
  fs.mkdirSync(HTML_DIR, { recursive: true });

  for (let p = 0; p < pages; p++) {
    const slice = files.slice(p * pageSize, (p + 1) * pageSize);
    const html = renderHtml(slice, p * pageSize);
    const htmlName = `grid-page-${p + 1}.html`;
    fs.writeFileSync(path.join(HTML_DIR, htmlName), html, "utf-8");

    const url = `http://127.0.0.1:${port}/_grid_tmp/${htmlName}`;
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(500);

    const totalW = COLUMNS * (CELL_SIZE + PADDING * 2);
    const rowCount = Math.ceil(slice.length / COLUMNS);
    const totalH = rowCount * (CELL_SIZE + LABEL_H + PADDING * 2) + 40;
    await page.setViewportSize({ width: totalW + 20, height: totalH });

    const outPath = path.join(OUT_DIR, `_avatar-grid-${p + 1}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Wrote screenshot: ${outPath}  (${slice.length} cells, indices ${p * pageSize + 1}..${p * pageSize + slice.length})`);
  }

  await browser.close();
  server.close();
  // Clean up temporary HTML files.
  fs.rmSync(HTML_DIR, { recursive: true, force: true });
}

function renderHtml(slice, baseIndex) {
  const cellsHtml = slice
    .map((name, i) => {
      const cellNum = baseIndex + i + 1; // 1-based
      const fileBasename = name; // already extensionless
      // We mirror the in-game CSS mask technique so the visual matches what
      // the running app would render. HTML is served from /_grid_tmp/ and
      // avatars from /public/avatars/, both under artifacts/dedektif/.
      // Extensionless keys get a `.svg` suffix; raster keys (already include
      // the extension) pass through as-is.
      const fileUrl = /\.(svg|png|webp)$/i.test(fileBasename)
        ? `/public/avatars/${fileBasename}`
        : `/public/avatars/${fileBasename}.svg`;
      const styles = [
        `width:${CELL_SIZE}px`,
        `height:${CELL_SIZE}px`,
        "background-color:#D4A843",
        `-webkit-mask:url(${fileUrl}) center/contain no-repeat`,
        `mask:url(${fileUrl}) center/contain no-repeat`,
      ].join(";");
      return `
        <div class="cell">
          <div class="num">${cellNum}</div>
          <div class="icon" style="${styles}"></div>
          <div class="lbl">${fileBasename.replace(/^noun-/, "")}</div>
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  body { margin: 0; padding: 10px; background: #0F1117; font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
  .grid {
    display: grid;
    grid-template-columns: repeat(${COLUMNS}, 1fr);
    gap: ${PADDING}px;
  }
  .cell {
    position: relative;
    background: #1a1d29;
    border: 1px solid #2a2d3a;
    border-radius: 8px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .num {
    position: absolute;
    top: 4px;
    left: 6px;
    color: #fff;
    font-size: 22px;
    font-weight: 900;
    background: #D4A84388;
    padding: 2px 8px;
    border-radius: 5px;
  }
  .icon { margin-top: 18px; }
  .lbl {
    margin-top: 6px;
    color: #9aa0aa;
    font-size: 13px;
    font-family: ui-monospace, Consolas, monospace;
    text-align: center;
    word-break: break-all;
    line-height: 1.15;
  }
</style></head>
<body>
  <div class="grid">${cellsHtml}</div>
</body></html>`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
