#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUZZLES_PATH = path.join(ROOT, "data", "puzzles.ts");
const OVERRIDES_PATH = path.join(ROOT, "data", "suspect-avatar-overrides.json");

/** Hamam vakası: noir SuspectPortrait (material placeholder icon). */
const PORTRAIT_PLACEHOLDER_ICONS = {
  "tarihi-hamamda-cinayet:s1": "woman",
  "tarihi-hamamda-cinayet:s2": "badge",
  "tarihi-hamamda-cinayet:s3": "man",
};

function loadOverrides() {
  const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8"));
  const map = new Map();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_") || typeof v !== "string") continue;
    if (v === "__portrait__") {
      map.set(k, PORTRAIT_PLACEHOLDER_ICONS[k] ?? "person");
    } else {
      map.set(k, v);
    }
  }
  return map;
}

const overrides = loadOverrides();
let src = fs.readFileSync(PUZZLES_PATH, "utf-8");

const PUZZLE_ID_RE = /^[ \t]{4}id:\s*"([^"]+)",/gm;
const anchors = [];
let pm;
while ((pm = PUZZLE_ID_RE.exec(src)) !== null) {
  anchors.push({ offset: pm.index, id: pm[1] });
}

function puzzleIdAt(offset) {
  let lo = 0;
  let hi = anchors.length - 1;
  let pick = anchors[0]?.id ?? "";
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (anchors[mid].offset <= offset) {
      pick = anchors[mid].id;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return pick;
}

const SUSPECT_RE =
  /(\{\s*id:\s*"(s\d+)"\s*,\s*name:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*description:\s*"((?:[^"\\]|\\.)*)"\s*,\s*icon:\s*")[^"]*(")/g;

let n = 0;
src = src.replace(SUSPECT_RE, (full, prefix, sid, _name, _desc, suffix, offset) => {
  const key = `${puzzleIdAt(offset)}:${sid}`;
  const icon = overrides.get(key);
  if (!icon) return full;
  n++;
  return `${prefix}${icon}${suffix}`;
});

fs.writeFileSync(PUZZLES_PATH, src, "utf-8");
console.log(`Applied ${n} suspect avatar override(s) from ${OVERRIDES_PATH}`);
