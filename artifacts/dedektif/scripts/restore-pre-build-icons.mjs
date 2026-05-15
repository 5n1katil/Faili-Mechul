#!/usr/bin/env node
/**
 * Restore suspect icons to pre-assign / pre-build state:
 * - Match puzzles by title against git HEAD (a00dfe8) baseline icons
 * - Apply hand-curated PNG overrides from suspect-avatar-overrides.json
 * - Keep current slug ids, stories, clues untouched
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(ROOT, "../..");
const PUZZLES_PATH = path.join(ROOT, "data/puzzles.ts");
const OVERRIDES_PATH = path.join(ROOT, "data/suspect-avatar-overrides.json");
const BASELINE_COMMIT = "a00dfe8";

const PORTRAIT_PLACEHOLDER_ICONS = {
  "tarihi-hamamda-cinayet:s1": "woman",
  "tarihi-hamamda-cinayet:s2": "badge",
  "tarihi-hamamda-cinayet:s3": "man",
};

/** Extra title-specific icons from curated commits (before assign-suspect). */
const TITLE_ICON_OVERRIDES = {
  "Karaköy'de Neon Gece": {
    s1: "queue_music",
    s2: "payments",
    s3: "local_police",
  },
  "Konakta Gece Vakti": {
    s1: "store",
    s2: "woman",
    s3: "military_tech",
  },
  "Pazar Sabahı Baskını": {
    s1: "elderly",
    s2: "person",
    s3: "local_shipping",
  },
};

function parseSuspects(block) {
  const suspects = [];
  const re =
    /\{\s*id:\s*"(s\d+)"\s*,\s*name:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*description:\s*"((?:[^"\\]|\\.)*)"\s*,\s*icon:\s*"([^"]*)"\s*\}/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    suspects.push({ id: m[1], name: m[2], icon: m[4] });
  }
  return suspects;
}

function parsePuzzles(src) {
  const puzzles = [];
  const re =
    /id:\s*"([^"]+)"\s*,\s*\n\s*title:\s*"([^"]+)"\s*,\s*\n\s*difficulty:\s*"([^"]+)"[\s\S]*?suspects:\s*\[([\s\S]*?)\]\s*,\s*\n\s*weapons:/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    puzzles.push({
      id: m[1],
      title: m[2],
      difficulty: m[3],
      suspects: parseSuspects(m[4]),
    });
  }
  return puzzles;
}

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

const baselineSrc = execSync(`git show ${BASELINE_COMMIT}:artifacts/dedektif/data/puzzles.ts`, {
  cwd: REPO,
  encoding: "utf-8",
});
const baselineByTitle = new Map();
for (const p of parsePuzzles(baselineSrc)) {
  baselineByTitle.set(p.title, p);
}

const iconOverrides = loadOverrides();
let src = fs.readFileSync(PUZZLES_PATH, "utf-8");
let restored = 0;
let pngApplied = 0;

src = src.replace(
  /(id:\s*"([^"]+)"\s*,\s*\n\s*title:\s*"([^"]+)"\s*,[\s\S]*?suspects:\s*\[)([\s\S]*?)(\]\s*,\s*\n\s*weapons:)/g,
  (_full, prefix, slug, title, suspectBlock, suffix) => {
    const baseline = baselineByTitle.get(title);
    const titleIcons = TITLE_ICON_OVERRIDES[title];
    if (!baseline && !titleIcons) return _full;

    const newBlock = suspectBlock.replace(
      /(\{\s*id:\s*"(s\d+)"\s*,\s*name:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*description:\s*"((?:[^"\\]|\\.)*)"\s*,\s*icon:\s*")[^"]*(")/g,
      (line, pfx, sid, name, desc, sfx) => {
        const key = `${slug}:${sid}`;
        const locked = iconOverrides.get(key);
        if (locked) {
          pngApplied++;
          return `${pfx}${locked}${sfx}`;
        }
        const fromTitle = titleIcons?.[sid];
        if (fromTitle) {
          restored++;
          return `${pfx}${fromTitle}${sfx}`;
        }
        const baseSus = baseline?.suspects.find((s) => s.id === sid);
        if (baseSus) {
          restored++;
          return `${pfx}${baseSus.icon}${sfx}`;
        }
        return line;
      },
    );
    return `${prefix}${newBlock}${suffix}`;
  },
);

fs.writeFileSync(PUZZLES_PATH, src, "utf-8");
console.log(`Baseline icons restored: ${restored} suspect fields`);
console.log(`PNG / locked overrides applied: ${pngApplied}`);
