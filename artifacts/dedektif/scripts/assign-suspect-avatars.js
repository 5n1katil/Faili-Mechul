#!/usr/bin/env node
/**
 * assign-suspect-avatars.js
 *
 * One-shot script — opens data/puzzles.ts AND data/puzzles_database.json and
 * rewrites every suspect's `icon` field with the most fitting SVG avatar
 * filename (relative to public/avatars/, without the .svg extension) based on
 * the suspect's `name` and `description`/`detail`.
 *
 * Only the `icon` field of suspect rows is modified — stories, clues,
 * weapons, locations and solutions are left strictly untouched.
 *
 * The avatar pool is discovered dynamically by listing public/avatars/ so
 * adding/removing SVG files automatically refreshes the heuristic without
 * any code changes here.
 *
 * Run from the dedektif/ directory:
 *   node scripts/assign-suspect-avatars.js
 *
 * WARNING: Overwrites heuristic assignments. Never run after hand-picked PNG
 * icons unless you intend to bulk-reassign. Keys in data/suspect-avatar-overrides.json
 * are always preserved.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUZZLES_PATH = path.join(ROOT, "data", "puzzles.ts");
const DATABASE_PATH = path.join(ROOT, "data", "puzzles_database.json");
const PUBLIC_AVATARS = path.join(ROOT, "public", "avatars");
const GENDER_MANIFEST_PATH = path.join(ROOT, "data", "avatar-gender.json");
const OVERRIDES_PATH = path.join(ROOT, "data", "suspect-avatar-overrides.json");

function loadSuspectAvatarOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return new Map();
  const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8"));
  const map = new Map();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_") || typeof v !== "string") continue;
    map.set(k, v);
  }
  return map;
}

const SUSPECT_AVATAR_OVERRIDES = loadSuspectAvatarOverrides();

/** Comma-separated puzzle ids — only rewrite those (e.g. 8 çaylak vakaları). */
const ONLY_PUZZLE_IDS = process.env.ONLY_PUZZLE_IDS
  ? new Set(process.env.ONLY_PUZZLE_IDS.split(",").map((s) => s.trim()).filter(Boolean))
  : null;

// ---------------------------------------------------------------------------
// Avatar pool discovery — read filenames from disk and bucket them.
// ---------------------------------------------------------------------------

const OCCUPATION_KEYS = [
  "artist", "astronaut", "bricklaying", "captain", "carpenter", "chef",
  "cowboy", "detective", "diver", "dj", "doctor", "driver", "electrician",
  "farmer", "firefighter", "gardener", "innkeeper", "judge", "mechanic",
  "mennonite", "miner", "nun", "nurse", "outlaw", "police", "preacher",
  "priest", "receptionist", "referee", "singer", "soldier", "sommelier",
  "teacher", "welder",
];

function loadPools() {
  if (!fs.existsSync(PUBLIC_AVATARS)) {
    throw new Error(`Avatar directory not found: ${PUBLIC_AVATARS}`);
  }
  if (!fs.existsSync(GENDER_MANIFEST_PATH)) {
    throw new Error(
      `Gender manifest not found: ${GENDER_MANIFEST_PATH}\n` +
        `Run scripts/render-avatar-grid.js and manually label every entry before assigning avatars.`,
    );
  }
  // Every file in public/avatars/ that we know how to render as a monochrome
  // silhouette: vector SVGs and alpha-channel raster images (PNG/WebP). The
  // pool entry preserves the file's real extension so the in-game renderer
  // can build the correct URL — historical SVG-only entries stay
  // extensionless for backward compatibility (CustomAvatar appends .svg).
  const SUPPORTED_EXT_RE = /\.(svg|png|webp)$/i;
  const all = fs
    .readdirSync(PUBLIC_AVATARS, { withFileTypes: true })
    .filter((d) => d.isFile() && SUPPORTED_EXT_RE.test(d.name))
    .map((d) => {
      // Files ending in .svg use the historical extensionless key so the
      // in-game database doesn't need a rewrite. Non-SVG raster files keep
      // their extension in the key (e.g. "noun-woman-4812161.png").
      return /\.svg$/i.test(d.name) ? d.name.replace(/\.svg$/i, "") : d.name;
    })
    .sort();

  const rawManifest = JSON.parse(fs.readFileSync(GENDER_MANIFEST_PATH, "utf-8"));
  // Normalize manifest entries — values can be either a plain string
  // ("female" | "male" | "neutral") or an object `{ gender: ... }` so future
  // metadata can attach without breaking older callers.
  const manifest = {};
  for (const [k, v] of Object.entries(rawManifest)) {
    if (k.startsWith("_")) continue; // documentation keys
    if (typeof v === "string") manifest[k] = v;
    else if (v && typeof v === "object" && typeof v.gender === "string") manifest[k] = v.gender;
  }
  // filename -> "female" | "male" | "neutral"
  const genderOf = (name) => {
    const g = manifest[name];
    if (g === "female" || g === "male" || g === "neutral") return g;
    return null;
  };

  const occ = Object.fromEntries(OCCUPATION_KEYS.map((k) => [k, []]));
  const female = [];
  const male = [];
  const neutral = [];
  const missing = [];

  for (const name of all) {
    let occMatched = false;
    for (const key of OCCUPATION_KEYS) {
      // Match `noun-<key>-<id>` exactly (so "noun-singer-1574370" matches
      // "singer" but not "noun-singerly-…" — protective even though no such
      // file currently exists).
      if (name.startsWith(`noun-${key}-`)) {
        occ[key].push(name);
        occMatched = true;
        // continue past — files belong to BOTH an occupation bucket AND a gender bucket
        break;
      }
    }

    const g = genderOf(name);
    if (g === "female") female.push(name);
    else if (g === "male") male.push(name);
    else if (g === "neutral") neutral.push(name);
    else if (!occMatched) {
      // No occupation classification AND no gender label — surface it so we
      // can keep the manifest in sync.
      missing.push(name);
    }
  }

  // Drop empty occupation buckets so we never `pick()` from an empty array.
  for (const k of OCCUPATION_KEYS) {
    if (occ[k].length === 0) delete occ[k];
  }

  if (missing.length) {
    console.warn(
      `WARNING: ${missing.length} avatar file(s) are missing gender labels in avatar-gender.json:`,
    );
    for (const n of missing) console.warn(`  - ${n}`);
  }

  return { occ, female, male, neutral, manifest, rawManifest };
}

const POOLS = loadPools();

/** Filter a pool down to entries whose visual gender matches the suspect.
 *  `neutral` files are always accepted regardless of suspect gender.
 *  If suspect gender is unknown, the pool is returned unfiltered. */
function filterByGender(pool, gender) {
  if (!pool || pool.length === 0) return [];
  if (!gender) return pool.slice();
  return pool.filter((name) => {
    const g = POOLS.manifest[name];
    return g === gender || g === "neutral" || g === undefined;
  });
}

// ---------------------------------------------------------------------------
// Turkish text normalization (ASCII-fold so \w / \b work reliably).
// ---------------------------------------------------------------------------

function normalize(s) {
  return s
    .replace(/İ/g, "I")
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/\u0307/g, "");
}

// ---------------------------------------------------------------------------
// Turkish first-name token tables — gender hints from the suspect's name.
// All entries already pass through normalize() (ASCII-folded).
// ---------------------------------------------------------------------------

const FEMALE_TOKENS = new Set([
  "nazik", "zeynep", "elif", "eda", "arzu", "leyla", "ayse", "selma", "hicran",
  "emine", "melis", "derya", "sevgi", "begum", "canan", "nur", "gul", "zehra",
  "yasemin", "pinar", "merve", "sila", "ece", "damla", "buse", "ceren", "asli",
  "cagla", "ecem", "sude", "irem", "busra", "kubra", "rabia", "sumeyye",
  "tugce", "duygu", "fatma", "hale", "hande", "havva", "hulya", "ipek", "lale",
  "meltem", "mujde", "nazan", "neslihan", "nilufer", "ozlem", "perihan",
  "saliha", "sema", "serap", "seval", "sibel", "sirin", "sukran", "tulay",
  "ummuhan", "yeliz", "necla", "munire", "sefika", "ferda", "didem", "esra",
  "gulsah", "gozde", "burcu", "feriha", "muazzez", "nuray", "ruya", "selen",
  "sevim", "filiz", "nilgun", "nazife", "hanzade", "suna", "hayriye", "semiha",
  "esma", "aysen", "safiye", "munibe", "hatice", "zumrut", "silvana", "nevra",
  "pervin", "nermin", "hacer", "selda", "nilay", "yaprak", "munevver",
  "muhsine", "rezzan", "feyza", "feyhan",
  // Additional Turkish female given names spotted in paid packs.
  "dilek", "seda", "dilara", "cansen", "sureyya", "deniz", "nazli", "ozge",
  "berna", "tugba", "asuman", "nurcan", "sevcan", "sevda", "sevinc", "tugcen",
]);

const MALE_TOKENS = new Set([
  "cem", "murat", "levent", "kerem", "ahmet", "mehmet", "baris", "kahraman",
  "haldun", "riza", "orhan", "hasan", "halit", "recep", "mustafa", "yusuf",
  "emre", "burak", "onur", "tolga", "serkan", "volkan", "tuncay", "alp", "kaan",
  "eren", "arda", "batuhan", "cengiz", "cemal", "dogan", "ekrem", "engin",
  "erdal", "ercan", "erkan", "ferhat", "fikret", "gokhan", "gurkan", "hakan",
  "ibrahim", "ilhan", "ilker", "ismail", "kadir", "kemal", "metin", "mert",
  "muhsin", "necdet", "nihat", "nuri", "oguz", "okan", "omer", "osman", "polat",
  "ramazan", "ridvan", "sabri", "sami", "selim", "sezai", "suleyman", "sahin",
  "sukru", "taner", "tayfun", "turgay", "ugur", "unal", "veli", "yakup",
  "yasar", "yilmaz", "zafer", "zeki", "fatih", "ferit", "haluk", "huseyin",
  "kazim", "munir", "rustu", "talip", "tahir", "tarik", "vahap", "halil",
  "serhat", "idris", "muzaffer", "ruzgar", "bora", "altan", "cemil", "vedat",
  "adnan", "bayram", "necati", "tahsin", "cevdet", "rustem", "lutfi", "cumhur",
  "rasit", "cafer", "rifat", "husnu", "mete", "feyzi", "saban", "feridun",
  "fuat", "nevzat", "salih", "sait", "naci", "behcet", "selami", "atilla",
  "demir", "barbaros", "vehbi",
  // Additional Turkish male given names spotted in paid packs.
  "bekir", "celal", "rasim", "baris", "burhan", "cetin", "fevzi", "hayri",
  "ilyas", "kayhan", "merih", "nedim", "rahmi", "remzi", "sefer", "sinan",
  "suat", "tamer", "tunc", "umit", "yalcin", "yener",
]);

// Western / international given names that show up in paid puzzle packs.
// Kept ASCII-folded (no diacritics). Add new entries here as needed.
const WESTERN_FEMALE = new Set([
  // Anglo
  "olivia", "emma", "charlotte", "amelia", "sophia", "isabella", "ava", "mia",
  "evelyn", "luna", "harper", "camila", "gianna", "elizabeth", "eleanor",
  "ella", "abigail", "sofia", "avery", "scarlett", "emily", "aria", "penelope",
  "chloe", "layla", "mila", "nora", "hazel", "madison", "ellie", "lily",
  "nova", "isla", "grace", "violet", "aurora", "riley", "zoey", "willow",
  "emilia", "stella", "zoe", "victoria", "hannah", "addison", "leah", "lucy",
  "eliana", "ivy", "everly", "lillian", "paisley", "elena", "naomi", "maya",
  "natalie", "claire", "audrey", "brooklyn", "leilani", "savannah", "anna",
  "bella", "aaliyah", "sarah", "allison", "gabriella", "ariana", "alice",
  "athena", "skylar", "andrea", "jasmine", "natalia", "ruby", "katherine",
  "kennedy", "kinsley", "hailey", "kayla", "audrina", "raelynn", "diana",
  "iris", "esther", "june", "maeve", "dana", "amy", "priya", "rachel",
  "jade", "sofia", "sophie", "julia", "valentina", "clara", "vivian",
  "reagan", "mackenzie", "madeline", "delilah", "rylee", "josephine", "ariel",
  "melody", "lila", "lola", "sienna", "daisy", "eden", "eliza", "rose",
  "kira", "marley", "selena", "khloe", "aspen", "camille", "demi",
  "genevieve", "anastasia", "lyra", "lauren", "vanessa", "kiara", "amara",
  "zara", "amber", "olga", "tara", "nina", "tina", "wendy", "linda", "susan",
  "carol", "donna", "ruth", "sharon", "michelle", "laura", "amanda", "rebecca",
  "kim", "deborah", "kathleen", "pamela", "nancy", "shirley", "cynthia",
  // Hispanic / Latina
  "lucia", "valeria", "ximena", "regina", "fernanda", "renata", "andrea",
  "carolina", "alejandra", "veronica", "patricia", "monica", "gloria",
  // Greek
  "ariadne", "athina", "eleni", "ioanna", "maria", "katerina",
  // Slavic / Eastern European
  "ivana", "katya", "sasha", "tatiana", "irina", "natasha", "svetlana",
  "ekaterina", "ludmila", "yelena", "anya",
  // Japanese / East Asian
  "keiko", "noa", "hina", "mei", "aiko", "akiko", "yumi", "yuki",
  "sakura", "haruka", "rina", "miyu",
  // Indian / South Asian
  "priya", "rhea", "anika", "kavya", "diya", "ananya", "ishani",
  // African / Other
  "amara", "amani", "asha", "ayana", "imani", "zola", "nadia", "fatima",
  "leyla", "luna", "sara", "yara",
  // French
  "isabelle", "celine", "camille", "amelie", "manon", "violette", "heloise",
  "dolores",
  // German / Nordic
  "anika", "elsa", "freya", "ingrid", "astrid", "helga", "magda", "marta",
  // Additional spotted in puzzle packs.
  "sandra", "margaret", "lydia", "rachel", "lucia", "valeria", "isabella",
  // Mythology (used as suspect names in pack_mitoloji)
  "hera", "athena", "artemis", "aphrodite", "demeter", "hestia", "persephone",
  "isis", "sekhmet", "bastet", "hathor", "nephthys", "freya", "frigg", "sif",
  "dido",
]);

const WESTERN_MALE = new Set([
  // Anglo
  "liam", "noah", "william", "james", "oliver", "benjamin", "elijah", "lucas",
  "mason", "logan", "alexander", "ethan", "jacob", "michael", "daniel",
  "henry", "jackson", "sebastian", "aiden", "matthew", "samuel", "david",
  "joseph", "carter", "owen", "wyatt", "john", "jack", "luke", "jayden",
  "dylan", "grayson", "levi", "isaac", "gabriel", "julian", "mateo", "anthony",
  "jaxon", "lincoln", "joshua", "christopher", "andrew", "theodore", "caleb",
  "ryan", "asher", "nathan", "thomas", "leo", "isaiah", "charles", "josiah",
  "hudson", "christian", "hunter", "connor", "eli", "ezra", "aaron",
  "landon", "adrian", "jonathan", "nolan", "jeremiah", "easton", "elias",
  "colton", "cameron", "carson", "robert", "angel", "maverick", "nicholas",
  "dominic", "jaxson", "greyson", "adam", "ian", "austin", "santiago",
  "jordan", "cooper", "brayden", "roman", "evan", "ezekiel", "xavier",
  "jose", "jace", "jameson", "leonardo", "bryson", "axel", "everett",
  "parker", "kayden", "miles", "sawyer", "jason", "declan", "weston",
  "micah", "ayden", "wesley", "luca", "vincent", "damian", "zachary",
  "silas", "gavin", "chase", "kai", "emmett", "harrison", "tyler", "tom",
  "ray", "rex", "viktor", "victor", "marcus", "derek", "brett", "jake",
  "brandon", "marco", "pavel", "felix", "carlos", "diego", "miguel", "jose",
  "manuel", "luis", "javier", "alejandro", "pablo", "antonio", "fernando",
  "raul", "ricardo", "george", "richard", "stephen", "kenneth", "kevin",
  "brian", "edward", "ronald", "timothy", "jason", "jeffrey", "frank",
  "scott", "eric", "gregory", "raymond", "patrick", "jack", "dennis",
  "jerry", "tyler", "aaron", "bruce", "willie", "albert", "wayne", "ralph",
  "roy", "eugene", "louis", "philip", "bobby", "johnny",
  // Greek
  "nikos", "yorgo", "kostas", "dimitri", "stavros", "andreas", "vasili",
  "vasil", "alexandros", "petros",
  // Slavic
  "ivan", "boris", "viktor", "dmitri", "vladimir", "yuri", "sergei", "anton",
  "alexei", "nikolai", "mikhail", "pavel", "sergey", "aleksei",
  // Italian / Iberian
  "matteo", "lorenzo", "francesco", "giovanni", "alessandro", "ricardo",
  // German / Nordic
  "klaus", "hans", "kurt", "ludwig", "wolfgang", "stefan",
  // Japanese
  "haruto", "yuki", "ren", "takeshi", "akira", "kenji", "hiroshi",
  // Indian
  "arjun", "rohan", "vikram", "rahul", "aarav", "vivaan", "raj",
  // African / Other
  "kwame", "kofi", "tunde", "olu", "amari", "akeem", "samir",
  // Additional spotted in puzzle packs (last names also work if used as
  // the only name token).
  "bradford", "vogel", "pembrooke", "pemberton", "pembridge", "rothwick",
  "archie", "walter", "ellis", "aldric", "danny", "haruki", "sendo",
  "konstantinos", "marlowe", "gerald", "klein", "whitmore", "cornelius",
  "hammond", "emile", "magnus", "leopold", "rasim", "franz", "herr",
  "zhao", "chen", "tanaka", "sorokin", "torres", "fischer", "stone",
  "vale", "silva", "crane", "cross", "mercer", "walsh", "mori",
  // Mythology (used as suspect names in pack_mitoloji)
  "zeus", "poseidon", "hades", "apollo", "ares", "hermes", "dionysus",
  "hephaestus", "ra", "anubis", "horus", "thoth", "osiris", "khonsu",
  "odin", "thor", "loki", "tyr", "baldr", "freyr", "heimdall",
  "turnus", "aeneas",
]);

// Optional, hand-curated overrides for edge-case suspect names whose gender
// neither the Turkish nor the Western dictionary can resolve. Lookup key is
// the ASCII-folded full suspect name (lowercased, multi-space-collapsed).
const SUSPECT_GENDER_OVERRIDES_PATH = path.join(
  ROOT,
  "data",
  "suspect-gender-overrides.json",
);
const SUSPECT_GENDER_OVERRIDES = fs.existsSync(SUSPECT_GENDER_OVERRIDES_PATH)
  ? JSON.parse(fs.readFileSync(SUSPECT_GENDER_OVERRIDES_PATH, "utf-8"))
  : {};

function inferGender(name, desc) {
  const nLow = normalize(name);
  const dLow = normalize(desc);

  // Tier 0: hand-curated override (highest priority).
  const overrideKey = nLow.replace(/\s+/g, " ").trim();
  const overrideVal = SUSPECT_GENDER_OVERRIDES[overrideKey];
  if (overrideVal === "female" || overrideVal === "male" || overrideVal === "neutral")
    return overrideVal;

  // Tier 1: honorific / role suffixes in the name (Turkish + international).
  if (
    /\bhanim\w*|\bbayan\w*|\bteyze\w*|\bnine\w*|\babla\w*|\bhatun\w*|\bkadin\w*|\bablacik\w*/
      .test(nLow) ||
    /\b(lady|mme|mrs|miss|madam|madame|fraulein|frau|seniora|seniorita|donna)\b/
      .test(nLow)
  )
    return "female";
  if (
    /\b(bey|beyefendi|amca|dede|baba|albay|binbasi|yuzbasi|yarbay|albaylik|efendi|delikanli|usta|aga|cirak)\b/
      .test(nLow) ||
    /\b(herr|sir|mr|monsieur|signor|don|hr|senor)\b/.test(nLow)
  )
    return "male";

  // Tier 2: token-level matches against Turkish + Western given-name sets.
  for (const t of nLow.split(/[^a-z]+/)) {
    if (!t) continue;
    if (FEMALE_TOKENS.has(t) || WESTERN_FEMALE.has(t)) return "female";
    if (MALE_TOKENS.has(t) || WESTERN_MALE.has(t)) return "male";
  }

  // Tier 3: description-level Turkish gender cues.
  if (/\bkadin\w*|\bhanim\w*|\bbayan\w*|\bteyze\w*|\bnine\w*|\babla\w*/.test(dLow)) return "female";
  if (/\badam\w*|\berkek\w*|\bdelikanli\w*|\boglan\w*|\boglu\b/.test(dLow)) return "male";

  // Tier 4: English description cues (paid packs sometimes use them).
  if (/\b(woman|female|lady|girl|mother|sister|aunt|widow|she\b|her\b)/.test(dLow)) return "female";
  if (/\b(man\b|male|gentleman|boy|father|brother|uncle|widower|he\b|his\b)/.test(dLow)) return "male";

  return null;
}

// ---------------------------------------------------------------------------
// Profession / trait detection — ordered by specificity.
// All patterns are matched against ASCII-folded text.
// ---------------------------------------------------------------------------

const PROFESSION_RULES = [
  { re: /\b(astronot|uzay)\w*/, key: "astronaut" },
  { re: /\b(detektif|dedektif|mufettis)\w*/, key: "detective" },
  { re: /\b(emekli\s+(albay|asker|binbasi|yuzbasi|polis)|\balbay\b|\basker\b|binbasi|yuzbasi|komutan)\w*/, key: "soldier" },
  { re: /\b(polis|komiser|emniyet|bekci|koruma)\w*|\bguvenlik\s+(gorevlisi|sefi|amiri|personeli|takimi)\w*/, key: "police" },
  { re: /\b(itfai|itfaiyeci|yangin\s+sondurme)\w*/, key: "firefighter" },
  { re: /\b(hakim|yargic|savci|avukat|hukukcu)\w*/, key: "judge" },
  { re: /\b(papaz|rahip|peder)\w*/, key: "priest" },
  { re: /\brahibe\w*/, key: "nun" },
  { re: /\b(vaiz|imam|hoca\s+efendi)\w*/, key: "preacher" },
  { re: /\b(amish|mennonite)\w*/, key: "mennonite" },
  // Note: `doktor(?!a)` so that academic "doktora" (PhD) doesn't get misrouted to the doctor avatar.
  { re: /\b(doktor(?!a)|hekim|cerrah|operator|pratisyen|veteriner|psikiyatr|psikolog)\w*/, key: "doctor" },
  { re: /\b(hemsire|saglikci)\w*/, key: "nurse" },
  { re: /\b(asci|sef\b|pastaci|firinci|lokantaci|mutfak\s+sefi)\w*/, key: "chef" },
  { re: /\b(somelye|somelier|sarap\s+ustadi|sarap\s+uzmani|barmen|bartender)\w*/, key: "sommelier" },
  { re: /\b(ogretmen|profesor|akademisyen|asistan|ogretim\s+uyesi|prof\.?)\w*|\bhoca\b/, key: "teacher" },
  { re: /\b(ressam|sanatci|heykeltiras|kurator|galerici|restorator)\w*/, key: "artist" },
  { re: /\b(sarkici|opera|tenor|soprano|vokal|santoz|sahne\s+sanatcisi)\w*/, key: "singer" },
  { re: /\bdj\b|\b(disk\s*jokey)\w*/, key: "dj" },
  { re: /\b(sofor|surucu|taksici|kamyoncu|otobus\s+soforu|arabaci|nakliyeci|kurye|kargo)\w*|\bnakliye\b/, key: "driver" },
  { re: /\b(dalgic|dalis)\w*/, key: "diver" },
  { re: /\b(kaptan|reis|denizci|gemici|yatci|seyir\s+subayi|balikci)\w*/, key: "captain" },
  { re: /\b(tamirci|teknisyen|oto\s+tamir|tamir\s+ustasi|makinist|muhendis)\w*/, key: "mechanic" },
  { re: /\belektrikci\w*/, key: "electrician" },
  { re: /\b(kaynakci|kaynak\s+ustasi)\w*/, key: "welder" },
  { re: /\b(marangoz|dogramaci)\w*/, key: "carpenter" },
  { re: /\b(insaat|duvar\s+ustasi|tuglaci|muteahhit|santiye|liman\s+iscisi|orman\s+iscisi|isci\s+basi)\w*/, key: "bricklayer" },
  { re: /\b(ciftci|coban)\w*/, key: "farmer" },
  { re: /\b(bahcivan|bahceci|peyzaj)\w*/, key: "gardener" },
  { re: /\b(madenci|maden\s+iscisi)\w*/, key: "miner" },
  { re: /\b(otel\s+sahibi|han\s+sahibi|hanci|kervansaray|otelci|pansiyoncu)\w*/, key: "innkeeper" },
  { re: /\b(resepsiyon|resepsiyonist|otel\s+resepsiyonu|kasiyer)\w*/, key: "receptionist" },
  { re: /\b(kovboy|silahsor)\w*/, key: "cowboy" },
  { re: /\b(haydut|kanun\s+kacagi|eskiya|haracci)\w*/, key: "outlaw" },
  { re: /\bhakem\w*/, key: "referee" },
];

// "bricklayer" key in the heuristic maps to occupation key "bricklaying"
// in the filename set — normalize it before lookup.
const OCC_KEY_ALIAS = { bricklayer: "bricklaying" };

// ---------------------------------------------------------------------------
// Age / appearance flags.
// ---------------------------------------------------------------------------

function isElderly(text) {
  if (/\b(cocuk|bebek|genc|stajyer|ogrenci|delikanli|liseli|universite|atik|fevri|hirsli|kiz\b|oglan|cirak)\w*/.test(text)) {
    if (!/\b(yasli|emekli|ihtiyar|nine|dede|teyze|amca)\w*/.test(text)) return false;
  }
  return /\b(yasli|emekli|ihtiyar|nine|dede|yillanmis|kidemli|teyze|amca|tonton|en\s+yasli|kaslari\s+catik\s+yasli)\w*/.test(text);
}

function isYoung(text) {
  return /\b(genc|stajyer|ogrenci|delikanli|liseli|atik|toy|cirak)\w*/.test(text) &&
    !/\b(yasli|emekli|en\s+yasli)\w*/.test(text);
}

function isChild(text) {
  return /\b(cocuk|bebek|kucuk\s+cocuk|minik)\w*/.test(text);
}

function isHipster(text) {
  return /\b(hipster|alternatif|tasarimci|grafik|sanat\s+yonetmeni|modaci|punk|rocker|metalci|gotik|dovme)\w*/.test(text);
}

function isTrendy(text) {
  return /\b(sik\b|moda|trend|capkin|zuppe|jet\s+sosyete|sosyete)\w*/.test(text);
}

// ---------------------------------------------------------------------------
// Deterministic pick (so reruns produce identical assignments).
// ---------------------------------------------------------------------------

function fnv1a(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function pick(arr, seed) {
  if (!arr || arr.length === 0) return null;
  return arr[fnv1a(seed) % arr.length];
}

function pickFromPools(seed, ...pools) {
  const flat = pools.flatMap((p) => p ?? []);
  return pick(flat, seed);
}

/**
 * pickUnusedFrom(pool, used, seed)
 *
 * Deterministically pick an element from `pool` that is not already in `used`.
 * Starts at fnv1a(seed) mod pool.length and advances linearly, so the choice
 * is reproducible across runs while still avoiding collisions inside a single
 * puzzle. Returns null when the pool is fully exhausted so the caller can
 * fall through to a wider pool.
 */
function pickUnusedFrom(pool, used, seed) {
  if (!pool || pool.length === 0) return null;
  const start = fnv1a(seed) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const cand = pool[(start + i) % pool.length];
    if (!used.has(cand)) return cand;
  }
  return null;
}

/** Same as pickUnusedFrom but accepts multiple pools concatenated in order. */
function pickUnusedFromMany(used, seed, ...pools) {
  for (const p of pools) {
    const picked = pickUnusedFrom(p, used, seed);
    if (picked) return picked;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main resolver: pick one filename per suspect, respecting per-puzzle
// uniqueness AND visual gender of the avatar file. `used` is a Set<string> of
// icons already assigned within the current puzzle; this function will avoid
// reusing any of them by walking pools in a fallback chain (most specific
// -> most generic), filtering each tier to the suspect's gender.
// ---------------------------------------------------------------------------

// Stats counters populated as we resolve icons. Reset before each rewrite
// pass so the script can report what happened.
const STATS = {
  professionFallbacks: 0, // profession bucket had no gender-matching entry left
  genderExhaustions: 0, // gender-specific pool fully consumed inside a puzzle
  unknownGender: 0, // suspect's gender could not be inferred from name/desc
};

function chooseIconForPuzzle(puzzleId, suspectId, name, desc, used) {
  const text = `${normalize(name)} ${normalize(desc)}`;
  let gender = inferGender(name, desc);
  if (gender === null) STATS.unknownGender++;

  const seed = `${puzzleId}-${suspectId}`;
  const hipster = isHipster(text);
  const trendy = isTrendy(text);

  // Explicit neutral override (e.g. AI/handle suspects like ARES-3, GhostKey):
  // skip profession bucket entirely and pull from the neutral pool, then male,
  // then female as last resort.
  if (gender === "neutral") {
    const picked = pickUnusedFromMany(
      used,
      seed,
      POOLS.neutral,
      POOLS.male,
      POOLS.female,
    );
    if (picked) return picked;
  }

  // Tier 1: profession bucket, filtered to suspect's gender.
  for (const rule of PROFESSION_RULES) {
    if (rule.re.test(text)) {
      const occKey = OCC_KEY_ALIAS[rule.key] ?? rule.key;
      const bucket = POOLS.occ[occKey];
      if (bucket && bucket.length > 0) {
        const filtered = filterByGender(bucket, gender);
        const picked = pickUnusedFrom(filtered, used, seed);
        if (picked) return picked;
        // Bucket exists but no gender-matching entry available (either all
        // wrong gender or all already used). Fall through to gender pool.
        STATS.professionFallbacks++;
      }
      break;
    }
  }

  // Tier 2: gender-specific generic pool (always cinsiyet-uyumlu).
  if (gender === "female") {
    const picked = pickUnusedFromMany(
      used,
      seed,
      POOLS.female,
      POOLS.neutral,
    );
    if (picked) return picked;
    STATS.genderExhaustions++;
    console.warn(
      `  ! female pool exhausted in ${puzzleId} for "${name}" -> using opposite-gender fallback`,
    );
  } else if (gender === "male") {
    // Hipster/trendy male: prefer punk-styled (which is in male pool already
    // because all three punk files are labelled "male" in the manifest).
    if (hipster || trendy) {
      // No special punk priority needed — male pool already contains them.
    }
    const picked = pickUnusedFromMany(
      used,
      seed,
      POOLS.male,
      POOLS.neutral,
    );
    if (picked) return picked;
    STATS.genderExhaustions++;
    console.warn(
      `  ! male pool exhausted in ${puzzleId} for "${name}" -> using opposite-gender fallback`,
    );
  } else {
    // Unknown gender: any pool is acceptable. Prefer neutral, fall back to
    // the larger male pool, then female.
    const picked = pickUnusedFromMany(
      used,
      seed,
      POOLS.neutral,
      POOLS.male,
      POOLS.female,
    );
    if (picked) return picked;
  }

  // Absolute last resort: any pool with unused entries (may break gender
  // matching). Only reached when every gender pool is exhausted inside the
  // same puzzle, which is practically impossible.
  const everything = [
    ...(POOLS.female ?? []),
    ...(POOLS.male ?? []),
    ...(POOLS.neutral ?? []),
  ];
  const anyPick = pickUnusedFrom(everything, used, seed);
  if (anyPick) return anyPick;

  return pick(everything, seed);
}

// ---------------------------------------------------------------------------
// Walk puzzles.ts and rewrite only the suspect `icon` field.
// Single-line and multi-line object literal forms are both supported.
// ---------------------------------------------------------------------------

function rewritePuzzlesTs() {
  const src = fs.readFileSync(PUZZLES_PATH, "utf-8");

  // Index puzzle ids by source offset so each suspect can be attributed to
  // its enclosing puzzle.
  const PUZZLE_ID_RE = /^[ \t]{4}id:\s*"([^"]+)",/gm;
  const anchors = [];
  let pm;
  while ((pm = PUZZLE_ID_RE.exec(src)) !== null) {
    anchors.push({ offset: pm.index, id: pm[1] });
  }
  function puzzleIdAt(offset) {
    let lo = 0;
    let hi = anchors.length - 1;
    let pick = "p000";
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (anchors[mid].offset <= offset) {
        pick = anchors[mid].id;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return pick;
  }

  // Matches single-line and multi-line suspect object literals. Escaped
  // quotes inside `description` are supported.
  const SUSPECT_RE =
    /(\{\s*id:\s*"(s\d+)"\s*,\s*name:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*description:\s*"((?:[^"\\]|\\.)*)"\s*,\s*icon:\s*")[^"]*(")/g;

  // Per-puzzle Set<string> of icons already assigned. String.replace() invokes
  // its callback in left-to-right (offset) order, so as long as we key by
  // puzzleId and reset per puzzle the uniqueness invariant holds.
  const usedByPuzzle = new Map();
  let updated = 0;
  let unchanged = 0;
  const seenPuzzles = new Set();

  let preserved = 0;
  const out = src.replace(SUSPECT_RE, (full, prefix, sid, name, desc, suffix, offset) => {
    const puzzleId = puzzleIdAt(offset);
    if (ONLY_PUZZLE_IDS && !ONLY_PUZZLE_IDS.has(puzzleId)) {
      unchanged++;
      return full;
    }
    const overrideKey = `${puzzleId}:${sid}`;
    const locked = SUSPECT_AVATAR_OVERRIDES.get(overrideKey);
    if (locked) {
      preserved++;
      if (!usedByPuzzle.has(puzzleId)) usedByPuzzle.set(puzzleId, new Set());
      usedByPuzzle.get(puzzleId).add(locked);
      const current = full.match(/icon:\s*"([^"]*)"/);
      if (current && current[1] === locked) {
        unchanged++;
        return full;
      }
      updated++;
      return `${prefix}${locked}${suffix}`;
    }
    if (!usedByPuzzle.has(puzzleId)) usedByPuzzle.set(puzzleId, new Set());
    const used = usedByPuzzle.get(puzzleId);
    const newIcon = chooseIconForPuzzle(puzzleId, sid, name, desc, used);
    if (!newIcon) {
      unchanged++;
      return full;
    }
    used.add(newIcon);
    updated++;
    seenPuzzles.add(puzzleId);
    return `${prefix}${newIcon}${suffix}`;
  });

  fs.writeFileSync(PUZZLES_PATH, out, "utf-8");

  console.log(`puzzles.ts — suspect icons rewritten: ${updated}`);
  console.log(`puzzles.ts — puzzles touched: ${seenPuzzles.size}`);
  if (preserved > 0) console.log(`puzzles.ts — override keys applied/skipped: ${preserved}`);
  if (unchanged > 0) console.log(`puzzles.ts — unresolved: ${unchanged}`);
}

// ---------------------------------------------------------------------------
// Rewrite suspect icons inside puzzles_database.json (paid puzzle packs).
// ---------------------------------------------------------------------------

function rewriteDatabaseJson() {
  if (!fs.existsSync(DATABASE_PATH)) {
    console.log("puzzles_database.json not found, skipping.");
    return;
  }
  const raw = fs.readFileSync(DATABASE_PATH, "utf-8");
  const db = JSON.parse(raw);

  let updated = 0;
  let unchanged = 0;
  let puzzlesTouched = 0;

  for (const pack of db.packs ?? []) {
    for (const puzzle of pack.puzzles ?? []) {
      // Per-puzzle Set so suspects inside one puzzle never share an icon.
      const used = new Set();
      let dirty = false;
      for (const s of puzzle.suspects ?? []) {
        const desc = [s.description, s.detail].filter(Boolean).join(" ");
        const newIcon = chooseIconForPuzzle(
          `${pack.packId}-${puzzle.puzzleId}`,
          s.id,
          s.name ?? "",
          desc,
          used,
        );
        if (!newIcon) {
          unchanged++;
          continue;
        }
        used.add(newIcon);
        if (s.icon !== newIcon) {
          s.icon = newIcon;
          dirty = true;
          updated++;
        }
      }
      if (dirty) puzzlesTouched++;
    }
  }

  const trailing = raw.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2) + trailing, "utf-8");

  console.log(`puzzles_database.json — suspect icons rewritten: ${updated}`);
  console.log(`puzzles_database.json — puzzles touched: ${puzzlesTouched}`);
  if (unchanged > 0) console.log(`puzzles_database.json — unresolved: ${unchanged}`);
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

function summarizePools() {
  const occCounts = Object.entries(POOLS.occ)
    .map(([k, v]) => {
      const f = v.filter((n) => POOLS.manifest[n] === "female").length;
      const m = v.filter((n) => POOLS.manifest[n] === "male").length;
      return `${k}=${v.length}(f${f}/m${m})`;
    })
    .join(", ");
  console.log(
    `Avatar pools by visual gender — female:${POOLS.female.length} male:${POOLS.male.length} neutral:${POOLS.neutral.length}`,
  );
  console.log(`Occupation buckets — ${occCounts}`);
}

summarizePools();
rewritePuzzlesTs();
if (!ONLY_PUZZLE_IDS) rewriteDatabaseJson();
else console.log("ONLY_PUZZLE_IDS set — puzzles_database.json skipped.");

if (
  STATS.professionFallbacks ||
  STATS.genderExhaustions ||
  STATS.unknownGender
) {
  console.log("");
  console.log("Fallback events:");
  if (STATS.professionFallbacks) {
    console.log(
      `  - profession bucket had no gender-matching entry ${STATS.professionFallbacks}x (fell back to generic gender pool).`,
    );
  }
  if (STATS.genderExhaustions) {
    console.log(
      `  - gender-specific pool exhausted ${STATS.genderExhaustions}x within a single puzzle.`,
    );
  }
  if (STATS.unknownGender) {
    console.log(
      `  - suspect gender could not be inferred ${STATS.unknownGender}x (used neutral pool).`,
    );
  }
}
