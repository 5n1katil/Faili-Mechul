import type { Puzzle, Difficulty, Clue } from "./puzzles";
import DB from "./puzzles_database.json";

export interface PackDefinition {
  packId: string;
  packTitle: string;
  packSubtitle: string;
  packIcon: string;
  packColor: string;
  accentColor: string;
  price: number;
  currency: string;
  description: string;
  puzzleIds: string[];
}

export const PACK_PRODUCT_IDS: Record<string, string> = {
  pack_001: "com.failimechul.dedektif.pack_001",
  pack_002: "com.failimechul.dedektif.pack_002",
  pack_003: "com.failimechul.dedektif.pack_003",
  pack_004: "com.failimechul.dedektif.pack_004",
  pack_005: "com.failimechul.dedektif.pack_005",
  pack_fenomen:  "com.failimechul.dedektif.pack_fenomen",
  pack_mitoloji: "com.failimechul.dedektif.pack_mitoloji",
  pack_dijital:  "com.failimechul.dedektif.pack_dijital",
  pack_edebi:    "com.failimechul.dedektif.pack_edebi",
  pack_vaka_arsivi: "com.failimechul.dedektif.pack_vaka_arsivi",
};

const EMOJI_TO_MATERIAL: Record<string, string> = {
  "⏱": "timer",
  "⏱️": "timer",
  "☠": "dangerous",
  "☠️": "dangerous",
  "⚙": "settings",
  "⚙️": "settings",
  "✍": "draw",
  "✍️": "draw",
  "✦": "star",
  "✦️": "star",
  "⚕": "medical-services",
  "⚕️": "medical-services",
  "⚖": "balance",
  "⚖️": "balance",
  "⚓": "anchor",
  "⚡": "bolt",
  "⛪": "church",
  "✒": "create",
  "✒️": "create",
  "❄": "ac-unit",
  "❄️": "ac-unit",
  "⭐": "star",
  "★": "star",
  "☆": "star-border",
  "☁": "cloud",
  "☁️": "cloud",
  "☕": "free-breakfast",
  "🌀": "rotate-left",
  "🌅": "wb-twilight",
  "🌆": "location-city",
  "🌊": "waves",
  "🌑": "brightness-1",
  "🌨": "ac-unit",
  "🌨️": "ac-unit",
  "🌲": "park",
  "🌹": "local-florist",
  "🌺": "local-florist",
  "🌿": "spa",
  "🍳": "kitchen",
  "🍵": "emoji-food-beverage",
  "🍷": "wine-bar",
  "🍸": "local-bar",
  "🍹": "local-bar",
  "🍽": "restaurant",
  "🍽️": "restaurant",
  "🎓": "school",
  "🎖": "military-tech",
  "🎖️": "military-tech",
  "🎥": "videocam",
  "🎨": "palette",
  "🎟": "event-seat",
  "🎟️": "event-seat",
  "🎬": "movie",
  "🎭": "theater-comedy",
  "🎵": "music-note",
  "🎼": "queue-music",
  "🏊": "pool",
  "🏊️": "pool",
  "🏔": "landscape",
  "🏔️": "landscape",
  "🏚": "home",
  "🏚️": "home",
  "🏛": "account-balance",
  "🏛️": "account-balance",
  "🏢": "business",
  "🏥": "local-hospital",
  "🏰": "castle",
  "🏺": "inventory-2",
  "🏮": "light",
  "👑": "stars",
  "👗": "checkroom",
  "👤": "person",
  "👦": "face",
  "👨": "person",
  "👩": "person-outline",
  "👵": "elderly-woman",
  "💂": "security",
  "💉": "vaccines",
  "💊": "medication",
  "💐": "local-florist",
  "💑": "people",
  "💠": "lens",
  "💣": "crisis-alert",
  "💥": "auto-fix-high",
  "💧": "water-drop",
  "💨": "air",
  "💰": "attach-money",
  "💶": "euro",
  "💻": "laptop",
  "💼": "work",
  "💾": "storage",
  "📁": "folder",
  "📄": "description",
  "📊": "bar-chart",
  "📋": "assignment",
  "📖": "menu-book",
  "📚": "menu-book",
  "📝": "edit-note",
  "📑": "description",
  "📦": "inventory",
  "📮": "markunread-mailbox",
  "📰": "newspaper",
  "📏": "straighten",
  "📷": "camera-alt",
  "📹": "videocam",
  "📻": "radio",
  "🔍": "search",
  "🔑": "key",
  "🔒": "lock",
  "🔥": "local-fire-department",
  "🔧": "build",
  "🔨": "hardware",
  "⛏": "construction",
  "⛏️": "construction",
  "🔫": "gps-fixed",
  "🔬": "biotech",
  "🔭": "travel-explore",
  "🕯": "candlestick-chart",
  "🕯️": "candlestick-chart",
  "🕵": "manage-search",
  "🕵️": "manage-search",
  "🕵️‍♀️": "manage-search",
  "🖥": "desktop-windows",
  "🖥️": "desktop-windows",
  "🖼": "image",
  "🖼️": "image",
  "🗜": "plumbing",
  "🗜️": "plumbing",
  "🗡": "content-cut",
  "🗡️": "content-cut",
  "🚀": "rocket-launch",
  "🚃": "tram",
  "🚇": "directions-subway",
  "🚩": "flag",
  "🚗": "directions-car",
  "🚪": "door-front",
  "🚿": "shower",
  "🛋": "weekend",
  "🛋️": "weekend",
  "🛏": "hotel",
  "🛏️": "hotel",
  "🛗": "elevator",
  "🛡": "shield",
  "🛡️": "shield",
  "🛣": "route",
  "🛣️": "route",
  "🛶": "kayaking",
  "🛥": "directions-boat",
  "🛥️": "directions-boat",
  "🤖": "smart-toy",
  "🤝": "handshake",
  "🤫": "record-voice-over",
  "🥂": "wine-bar",
  "🥃": "local-bar",
  "🦱": "person",
  "🦳": "person",
  "🧑": "person",
  "🧓": "elderly",
  "🧔": "person",
  "🧠": "psychology",
  "🧣": "style",
  "🧪": "science",
  "🧬": "biotech",
  "🧊": "ac-unit",
  "🧭": "explore",
  "🧰": "home-repair-service",
  "🧫": "biotech",
  "🪜": "stairs",
  "🪝": "link",
  "🪞": "crop-portrait",
  "🪟": "window",
  "🪢": "link",
  "🪤": "fence",
  "🪨": "terrain",
  "🫧": "air",
  "👩‍🦳": "person",
  "👩‍🦱": "person",
  "👨‍🔬": "science",
  "👨‍⚕️": "local-hospital",
  "🧑‍💼": "work",
  "👩‍💼": "badge",
  "👩‍🔬": "science",
  "👩‍⚖️": "gavel",
  "👩‍🚀": "rocket-launch",
  "👨‍🚀": "rocket-launch",
  "👩‍⚕️": "local-hospital",
  "👩‍🎓": "school",
  "🕍": "mosque",
  "🗂": "folder-special",
  "🗂️": "folder-special",
  "☢️": "warning",
  "🎯": "gps-fixed",
  "🗳️": "ballot",
  "🌙": "nightlight",
  "⚗": "science",
  "⚗️": "science",
  "🗞️": "newspaper",
  "🧩": "extension",
  "🎀": "redeem",
  "🖨️": "print",
  "⛵": "sailing",
  "🩺": "medical-services",
  "🎩": "checkroom",
  "🔪": "content-cut",
  "🪔": "light-mode",
  "🌫": "blur-on",
  "🌫️": "blur-on",
  "🐪": "pets",
  "⚱": "science",
  "⚱️": "science",
  "🧱": "view-module",
  "☄": "flare",
  "☄️": "flare",
  "🪓": "carpenter",
  "🛢": "oil-barrel",
  "🛢️": "oil-barrel",
  "🧨": "celebration",
  "♨": "hot-tub",
  "📬": "mail",
  "💀": "dangerous",
  "🏫": "domain",
  "🔐": "lock",
  "⚔️": "content-cut",
  "🪶": "edit",
  "🦚": "flutter-dash",
  "🍯": "kitchen",
  "🐍": "pest-control",
  "🌸": "nature",
  "🪘": "queue-music",
  "🏹": "sports",
  "⛺": "holiday-village",
  "⛰️": "landscape",
  "🐴": "pets",
  "👸": "face-3",
  "✨": "auto-fix-high",
  "🕌": "mosque",
  "💹": "trending-up",
  "🕶️": "wb-sunny",
  "📜": "history-edu",
  "👊": "front-hand",
  "🥤": "emoji-food-beverage",
  "💽": "album",
  "🌐": "public",
  "👩‍💻": "computer",
  "🔌": "electrical-services",
  "🔗": "link",
  "👮": "local-police",
  "📡": "satellite-alt",
  "🔩": "precision-manufacturing",
  "🏭": "factory",
  "🏠": "home",
  "🪖": "military-tech",
  "🐀": "pest-control",
  "🌳": "park",
  "💎": "diamond",
  "🫖": "coffee-maker",
  "🧶": "handyman",
  "🚂": "train",
  "🧳": "luggage",
  "🗃️": "snippet-folder",
  "✝️": "church",
  "🌬️": "air",
  "🕳️": "circle",
  "📎": "attachment",
  "😴": "bedtime",
  "🧵": "settings-input-composite",
  "🪣": "cleaning-services",
  "🧮": "calculate",
  "♨️": "thermostat",
  "🧤": "sports-handball",
  "👔": "checkroom",
  "💍": "diamond",
  "🪡": "fiber-manual-record",
  "✂️": "content-cut",
  "🦵": "directions-walk",
  "🖊️": "edit",
  "🌈": "wb-sunny",
  "📐": "square-foot",
  "💤": "hotel",
  "📈": "trending-up",
  "🔦": "flashlight-on",
  "🎣": "phishing",
  "💵": "attach-money",
  "🚔": "local-police",
  "🎙️": "mic",
  "📌": "push-pin",
  "🗄️": "storage",
  "🧾": "receipt",
  "📺": "tv",
  "🌍": "public",
  "🗿": "account-balance",
  "🏪": "store",
  "🛤️": "linear-scale",
  "🩻": "medical-services",
  "🚶": "directions-walk",
  "😷": "masks",
  "🎛️": "tune",
  "🎤": "mic",
  "🦺": "work",
  "🔋": "battery-full",
  "💡": "lightbulb",
  "🎚️": "tune",
  "🌟": "star",
  "🚧": "construction",
  "🎪": "festival",
  "📕": "menu-book",
  "🖋️": "create",
  "🕊️": "flutter-dash",
  "🇪🇺": "public",
  "☎️": "call",
  "✊": "front-hand",
  "🚢": "directions-boat",
  "🛳️": "directions-boat",
  "🏗️": "construction",
  "⛽": "local-gas-station",
  "📗": "book",
  "🏆": "emoji-events",
  "📽️": "movie",
  "🌃": "nights-stay",
  // Eklemeler — Task #130 (eksik emoji haritaları)
  "🗝️": "key",
  "🗝": "key",
  "🧐": "visibility",
  "🎞️": "movie",
  "🎞": "movie",
  "💋": "favorite",
  "📢": "campaign",
  "⌛": "hourglass-empty",
  "🏙️": "location-city",
  "🏙": "location-city",
  "🩹": "healing",
  "🏡": "home",
  "🧺": "shopping-basket",
  "🎻": "music-note",
  "🦯": "accessible",
  "💃": "directions-run",
  "🍾": "wine-bar",
  "🔲": "crop-square",
  "🌪️": "tornado",
  "🌪": "tornado",
  "🦁": "pets",
  "☀️": "wb-sunny",
  "☀": "wb-sunny",
  "🏜️": "landscape",
  "🏜": "landscape",
  "🔮": "auto-awesome",
  "🕸️": "pest-control",
  "🕸": "pest-control",
  "📸": "photo-camera",
  "🎮": "sports-esports",
  "👾": "videogame-asset",
  "🎹": "piano",
  "✉️": "mail",
  "✉": "mail",
  "🥊": "sports-mma",
  "🤵": "person",
  "🔎": "search",

};

function emojiToMaterialIcon(emoji: string): string {
  if (!emoji) return "help-outline";
  const mapped = EMOJI_TO_MATERIAL[emoji];
  if (mapped) return mapped;
  const firstChar = emoji[0];
  if (firstChar && EMOJI_TO_MATERIAL[firstChar]) return EMOJI_TO_MATERIAL[firstChar];
  return "help-outline";
}

function mapDifficulty(level: number): Difficulty {
  if (level === 1) return "caylak";
  if (level <= 3) return "dedektif";
  return "baskomiser";
}

function mapClueType(type: string): Clue["type"] {
  switch (type) {
    case "kanit": return "evidence";
    case "tanik": return "witness";
    case "adli": return "forensic";
    case "eleme": return "elimination";
    case "dogrudan": return "direct";
    case "sifreli": return "indirect";
    case "parmak_izi": return "evidence";
    case "ses_kaydi": return "witness";
    default: return "indirect";
  }
}

type RawPuzzle = typeof DB.packs[number]["puzzles"][number];

export function adaptPackPuzzle(raw: RawPuzzle, packId: string): Puzzle {
  const clues: Clue[] = raw.clues.map((c) => {
    const r = c as Record<string, unknown>;
    return {
      id: c.id,
      text: c.text,
      type: mapClueType(c.type),
      isBonus: typeof (c as Record<string, unknown>).isBonus === "boolean" ? (c as Record<string, unknown>).isBonus as boolean : c.revealOrder > 4,
      mechanicType: (r.mechanicType as import("./puzzles").ClueMechanicType | undefined) ?? "text",
      deductionHint: r.deductionHint as string | undefined,
      gorselAciklama: r.gorselAciklama as string | undefined,
      sesMetni: r.sesMetni as string | undefined,
      audioUrl: r.audioUrl as string | undefined,
      audioAssetId: r.audioAssetId as string | undefined,
      audioPlanned: r.audioPlanned as boolean | undefined,
      audioFileName: r.audioFileName as string | undefined,
      audioPuzzle: r.audioPuzzle as import("./puzzles").Clue["audioPuzzle"],
      yuzlesmeDialogu: r.yuzlesmeDialogu as import("./puzzles").ClueYuzlesmeDialog[] | undefined,
      sifre: r.sifre as import("./puzzles").ClueSifre | undefined,
      phoneVerisi: r.phoneVerisi as import("./puzzles").CluePhoneVerisi | undefined,
      anagramVerisi: r.anagramVerisi as import("./puzzles").ClueAnagramData | undefined,
      dnaVerisi: r.dnaVerisi as import("./puzzles").ClueDnaVerisi | undefined,
      timelineVerisi: r.timelineVerisi as import("./puzzles").ClueTimelineVerisi | undefined,
      parmakIziVerisi: r.parmakIziVerisi as import("./puzzles").ClueParmakIziVerisi | undefined,
      fotoVerisi: r.fotoVerisi as import("./puzzles").ClueFotoVerisi | undefined,
      profilSenteziVerisi: r.profilSenteziVerisi as import("./puzzles").ClueProfilSenteziVerisi | undefined,
    };
  });

  return {
    id: `${packId}_${raw.puzzleId}`,
    title: raw.title,
    story: raw.story,
    suspects: raw.suspects.map((s) => {
      const sr = s as Record<string, unknown>;
      const base = {
        id: s.id,
        name: s.name,
        description: s.description,
        ...(sr.detail && typeof sr.detail === "string" ? { detail: sr.detail } : {}),
        // Suspect icons in puzzles_database.json are now SVG avatar ids
        // (rewritten by scripts/assign-suspect-avatars.js) — pass through to
        // CustomAvatar verbatim instead of remapping through MaterialIcons.
        icon: s.icon,
      };
      const parmakIziDeseni = sr.parmakIziDeseni as string | undefined;
      return parmakIziDeseni ? { ...base, parmakIziDeseni } : base;
    }),
    weapons: raw.weapons.map((w) => {
      const wr = w as Record<string, unknown>;
      return {
        id: w.id,
        name: w.name,
        description: w.description,
        ...(wr.detail && typeof wr.detail === "string" ? { detail: wr.detail } : {}),
        icon: emojiToMaterialIcon(w.icon),
      };
    }),
    locations: raw.locations.map((l) => {
      const lr = l as Record<string, unknown>;
      return {
        id: l.id,
        name: l.name,
        description: l.description,
        ...(lr.detail && typeof lr.detail === "string" ? { detail: lr.detail } : {}),
        icon: emojiToMaterialIcon(l.icon),
      };
    }),
    clues,
    solution: {
      suspectId: raw.solution.suspectId,
      weaponId: raw.solution.weaponId,
      locationId: raw.solution.locationId,
    },
    difficulty: mapDifficulty(raw.difficulty),
    dayIndex: -1,
    solvabilityMeta: {
      freeEliminations: [],
      bonusEliminations: [],
    },
  };
}

export const PACKS: PackDefinition[] = DB.packs.map((pack) => ({
  packId: pack.packId,
  packTitle: pack.packTitle,
  packSubtitle: pack.packSubtitle,
  packIcon: pack.packIcon,
  packColor: pack.packColor,
  accentColor: pack.accentColor,
  price: pack.price,
  currency: pack.currency,
  description: pack.description,
  puzzleIds: pack.puzzles.map((p) => `${pack.packId}_${p.puzzleId}`),
}));

export const PURCHASABLE_PACKS: PackDefinition[] = PACKS.filter(
  (p) => p.packId in PACK_PRODUCT_IDS
);

const RAW_PUZZLE_MAP = new Map<string, RawPuzzle>();
const PACK_PUZZLE_MAP = new Map<string, RawPuzzle[]>();

for (const pack of DB.packs) {
  const list: RawPuzzle[] = [];
  for (const p of pack.puzzles) {
    RAW_PUZZLE_MAP.set(`${pack.packId}_${p.puzzleId}`, p);
    list.push(p);
  }
  PACK_PUZZLE_MAP.set(pack.packId, list);
}

export function getPuzzlesForPack(packId: string): Puzzle[] {
  const raws = PACK_PUZZLE_MAP.get(packId) ?? [];
  return raws.map((r) => adaptPackPuzzle(r, packId));
}

export function getPackPuzzleById(fullId: string): Puzzle | undefined {
  const raw = RAW_PUZZLE_MAP.get(fullId);
  if (!raw) return undefined;
  const packId = fullId.split("_").slice(0, 2).join("_");
  return adaptPackPuzzle(raw, packId);
}

export function getDifficultyStars(difficulty: number): string {
  const stars = "★".repeat(difficulty) + "☆".repeat(5 - difficulty);
  return stars;
}

export function getDifficultyLabel(difficulty: number): string {
  switch (difficulty) {
    case 1: return "Çaylak";
    case 2: return "Polis Memuru";
    case 3: return "Dedektif";
    case 4: return "Başkomiser";
    case 5: return "Efsane Komiser";
    default: return "Bilinmiyor";
  }
}

export function getRawPuzzlesForPack(packId: string): RawPuzzle[] {
  return PACK_PUZZLE_MAP.get(packId) ?? [];
}
