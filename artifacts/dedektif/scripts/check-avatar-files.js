#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "data/puzzles.ts"), "utf8");
const re = /icon:\s*"([^"]+)"/g;
const icons = [];
let m;
while ((m = re.exec(src))) icons.push(m[1]);
const suspectBlockRe = /suspects:\s*\[([\s\S]*?)\]\s*,\s*weapons:/g;
const suspectIcons = [];
while ((m = suspectBlockRe.exec(src))) {
  const block = m[1];
  const ir = /icon:\s*"([^"]+)"/g;
  let im;
  while ((im = ir.exec(block))) suspectIcons.push(im[1]);
}
const uniq = [...new Set(suspectIcons)];
/** Same rules as `utils/avatarAssets.ts` `isCustomAvatarIcon` — Material names skip `public/avatars`. */
function needsPublicAvatarFile(icon) {
  const t = String(icon).trim();
  if (!t) return false;
  return (
    /^noun-/i.test(t) ||
    /\.(png|webp|svg)$/i.test(t) ||
    /-avatar\.(png|webp)$/i.test(t)
  );
}
const custom = uniq.filter(needsPublicAvatarFile);
const dir = path.join(ROOT, "public", "avatars");
const missing = [];
for (const icon of custom) {
  const hasExt = /\.(svg|png|webp)$/i.test(icon);
  const fn = hasExt ? icon : `${icon}.svg`;
  if (!fs.existsSync(path.join(dir, fn))) missing.push(fn);
}
console.log(
  `Suspect icons: ${uniq.length}, public/avatars checks: ${custom.length}, missing files: ${missing.length}`
);
if (missing.length) {
  console.log(missing.slice(0, 20).join("\n"));
  process.exit(1);
}
