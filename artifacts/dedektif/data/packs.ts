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
  pack_fenomen: "com.failimechul.dedektif.pack_fenomen",
  pack_mitoloji: "com.failimechul.dedektif.pack_mitoloji",
  pack_dijital: "com.failimechul.dedektif.pack_dijital",
  pack_edebi: "com.failimechul.dedektif.pack_edebi",
  pack_caylik: "com.failimechul.dedektif.pack_caylik",
  pack_dedektif: "com.failimechul.dedektif.pack_dedektif",
  pack_komiser: "com.failimechul.dedektif.pack_komiser",
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
  "⚕": "medical_services",
  "⚕️": "medical_services",
  "⚖": "balance",
  "⚖️": "balance",
  "⚓": "anchor",
  "⚡": "bolt",
  "⛪": "church",
  "✒": "create",
  "✒️": "create",
  "❄": "ac_unit",
  "❄️": "ac_unit",
  "⭐": "star",
  "★": "star",
  "☆": "star_border",
  "☁": "cloud",
  "☁️": "cloud",
  "☕": "free_breakfast",
  "🌀": "rotate_left",
  "🌅": "wb_twilight",
  "🌆": "location_city",
  "🌊": "waves",
  "🌑": "brightness_1",
  "🌨": "ac_unit",
  "🌨️": "ac_unit",
  "🌲": "park",
  "🌹": "local_florist",
  "🌺": "local_florist",
  "🌿": "spa",
  "🍳": "kitchen",
  "🍵": "emoji_food_beverage",
  "🍷": "wine_bar",
  "🍸": "local_bar",
  "🍹": "local_bar",
  "🍽": "restaurant",
  "🍽️": "restaurant",
  "🎓": "school",
  "🎖": "military_tech",
  "🎖️": "military_tech",
  "🎥": "videocam",
  "🎨": "palette",
  "🎬": "movie",
  "🎭": "theater_comedy",
  "🎵": "music_note",
  "🎼": "queue_music",
  "🏊": "pool",
  "🏊️": "pool",
  "🏔": "landscape",
  "🏔️": "landscape",
  "🏚": "home",
  "🏚️": "home",
  "🏛": "account_balance",
  "🏛️": "account_balance",
  "🏢": "business",
  "🏥": "local_hospital",
  "🏰": "castle",
  "🏺": "inventory_2",
  "👑": "stars",
  "👗": "checkroom",
  "👤": "person",
  "👦": "face",
  "👨": "person",
  "👩": "person_outline",
  "👵": "elderly_woman",
  "💂": "security",
  "💉": "vaccines",
  "💊": "medication",
  "💐": "local_florist",
  "💑": "people",
  "💠": "lens",
  "💣": "crisis_alert",
  "💥": "auto_fix_high",
  "💧": "water_drop",
  "💨": "air",
  "💰": "attach_money",
  "💶": "euro",
  "💻": "laptop",
  "💼": "work",
  "💾": "storage",
  "📁": "folder",
  "📄": "description",
  "📊": "bar_chart",
  "📋": "assignment",
  "📖": "menu_book",
  "📚": "menu_book",
  "📝": "edit_note",
  "📦": "inventory",
  "📰": "newspaper",
  "📷": "camera_alt",
  "📹": "videocam",
  "🔍": "search",
  "🔑": "key",
  "🔒": "lock",
  "🔥": "local_fire_department",
  "🔧": "build",
  "🔨": "hardware",
  "🔫": "gps_fixed",
  "🔬": "biotech",
  "🔭": "travel_explore",
  "🕯": "candlestick_chart",
  "🕯️": "candlestick_chart",
  "🕵": "manage_search",
  "🕵️": "manage_search",
  "🕵️‍♀️": "manage_search",
  "🖥": "desktop_windows",
  "🖥️": "desktop_windows",
  "🖼": "image",
  "🖼️": "image",
  "🗡": "content_cut",
  "🗡️": "content_cut",
  "🚀": "rocket_launch",
  "🚗": "directions_car",
  "🚪": "door_front",
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
  "🛥": "directions_boat",
  "🛥️": "directions_boat",
  "🤖": "smart_toy",
  "🤝": "handshake",
  "🤫": "record_voice_over",
  "🥂": "wine_bar",
  "🥃": "local_bar",
  "🦱": "person",
  "🦳": "person",
  "🧑": "person",
  "🧓": "elderly",
  "🧔": "person",
  "🧣": "style",
  "🧪": "science",
  "🧬": "biotech",
  "🧭": "explore",
  "🧫": "biotech",
  "🪜": "stairs",
  "🪝": "link",
  "🪞": "crop_portrait",
  "🪟": "window",
  "🪢": "link",
  "🪨": "terrain",
  "🫧": "air",
  "👩‍🦳": "person",
  "👩‍🦱": "person",
  "👨‍🔬": "science",
  "👨‍⚕️": "local_hospital",
  "🧑‍💼": "work",
  "👩‍💼": "badge",
  "👩‍🔬": "science",
  "👩‍⚖️": "gavel",
  "👩‍🚀": "rocket_launch",
  "👨‍🚀": "rocket_launch",
  "👩‍⚕️": "local_hospital",
  "👩‍🎓": "school",
  "🕍": "mosque",
  "🗂️": "folder_special",
  "☢️": "warning",
  "🎯": "gps_fixed",
  "🗳️": "ballot",
  "🌙": "nightlight",
  "⚗": "science",
  "⚗️": "science",
  "🗞️": "newspaper",
  "🧩": "extension",
  "🎀": "redeem",
  "🖨️": "print",
  "⛵": "sailing",
  "🩺": "medical_services",
  "🎩": "checkroom",
  "🔪": "content_cut",
  "🪔": "light_mode",
  "🌫️": "blur_on",
  "📬": "mail",
  "💀": "dangerous",
  "🏫": "domain",
  "🔐": "lock",
  "⚔️": "content_cut",
  "🪶": "edit",
  "🦚": "flutter_dash",
  "🍯": "kitchen",
  "🐍": "pest_control",
  "🌸": "nature",
  "🪘": "queue_music",
  "🏹": "sports",
  "⛺": "holiday_village",
  "⛰️": "landscape",
  "🐴": "pets",
  "👸": "face_3",
  "✨": "auto_fix_high",
  "🕌": "mosque",
  "💹": "trending_up",
  "🕶️": "wb_sunny",
  "📜": "history_edu",
  "👊": "front_hand",
  "🥤": "emoji_food_beverage",
  "💽": "album",
  "🌐": "public",
  "👩‍💻": "computer",
  "🔌": "electrical_services",
  "🔗": "link",
  "👮": "local_police",
  "📡": "satellite_alt",
  "🔩": "precision_manufacturing",
  "🏭": "factory",
  "🏠": "home",
  "🪖": "military_tech",
  "🐀": "pest_control",
  "🌳": "park",
  "💎": "diamond",
  "🫖": "coffee_maker",
  "🧶": "handyman",
  "🚂": "train",
  "🧳": "luggage",
  "🗃️": "snippet_folder",
  "✝️": "local_church",
  "🌬️": "air",
  "🕳️": "circle",
  "📎": "attachment",
  "😴": "bedtime",
  "🧵": "settings_input_composite",
  "🪣": "cleaning_services",
  "🧮": "calculate",
  "♨️": "thermostat",
  "🧤": "sports_handball",
  "💍": "diamond",
  "🪡": "fiber_manual_record",
  "✂️": "content_cut",
  "🦵": "directions_walk",
  "🖊️": "edit",
  "🌈": "wb_sunny",
  "📐": "square_foot",
  "💤": "hotel",
  "📈": "trending_up",
  "🔦": "flashlight_on",
  "🎣": "phishing",
  "💵": "attach_money",
  "🚔": "local_police",
  "🎙️": "mic",
  "📌": "push_pin",
  "🗄️": "storage",
  "🧾": "receipt",
  "📺": "tv",
  "🌍": "public",
  "🗿": "account_balance",
  "🏪": "store",
  "🛤️": "linear_scale",
  "🩻": "radiology",
  "🚶": "directions_walk",
  "😷": "masks",
  "🎛️": "tune",
  "🎤": "mic",
  "🦺": "work",
  "🔋": "battery_full",
  "💡": "lightbulb",
  "🎚️": "tune",
  "🌟": "star",
  "🚧": "construction",
  "🎪": "festival",
  "📕": "menu_book",
  "🖋️": "create",
  "🕊️": "flutter_dash",
  "🇪🇺": "public",
  "☎️": "call",
  "✊": "front_hand",
  "🚢": "directions_boat",
  "🛳️": "directions_boat",
  "🏗️": "construction",
  "⛽": "local_gas_station",
  "📗": "book",
  "🏆": "emoji_events",
  "📽️": "movie",
  "🌃": "nights_stay",
};

function emojiToMaterialIcon(emoji: string): string {
  if (!emoji) return "help_outline";
  const mapped = EMOJI_TO_MATERIAL[emoji];
  if (mapped) return mapped;
  const firstChar = emoji[0];
  if (firstChar && EMOJI_TO_MATERIAL[firstChar]) return EMOJI_TO_MATERIAL[firstChar];
  return "help_outline";
}

function mapDifficulty(level: number): Difficulty {
  if (level === 1) return "caylik";
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
      isBonus: c.revealOrder > 4,
      mechanicType: (r.mechanicType as import("./puzzles").ClueMechanicType | undefined) ?? "text",
      deductionHint: r.deductionHint as string | undefined,
      gorselAciklama: r.gorselAciklama as string | undefined,
      sesMetni: r.sesMetni as string | undefined,
      yuzlesmeDialogu: r.yuzlesmeDialogu as import("./puzzles").ClueYuzlesmeDialog[] | undefined,
      sifre: r.sifre as import("./puzzles").ClueSifre | undefined,
      phoneVerisi: r.phoneVerisi as import("./puzzles").CluePhoneVerisi | undefined,
      anagramVerisi: r.anagramVerisi as import("./puzzles").ClueAnagramData | undefined,
      dnaVerisi: r.dnaVerisi as import("./puzzles").ClueDnaVerisi | undefined,
      timelineVerisi: r.timelineVerisi as import("./puzzles").ClueTimelineVerisi | undefined,
      parmakIziVerisi: r.parmakIziVerisi as import("./puzzles").ClueParmakIziVerisi | undefined,
      fotoVerisi: r.fotoVerisi as import("./puzzles").ClueFotoVerisi | undefined,
    };
  });

  return {
    id: `${packId}_${raw.puzzleId}`,
    title: raw.title,
    story: raw.story,
    suspects: raw.suspects.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      icon: emojiToMaterialIcon(s.icon),
    })),
    weapons: raw.weapons.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      icon: emojiToMaterialIcon(w.icon),
    })),
    locations: raw.locations.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      icon: emojiToMaterialIcon(l.icon),
    })),
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
