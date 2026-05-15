import type { Suspect } from "@/data/puzzles";
import type { SuspectPortraitKey } from "@/components/SuspectPortrait";

type Gender = "male" | "female";

/** Kesin eşleşmeler — metin çıkarımı yanılsa da doğru silüet */
const PORTRAIT_OVERRIDES: Record<string, SuspectPortraitKey> = {
  "tarihi-hamamda-cinayet-s1": "noir-f-bun-glasses",
  "tarihi-hamamda-cinayet-s2": "noir-m-suit-receding",
  "tarihi-hamamda-cinayet-s3": "noir-m-worker-towel",
};

const FEMALE_TITLES =
  /\b(hanım|hanımefendi|bayan|teyze|nine|kadın)\b/i;
const MALE_TITLES = /\b(bey|beyefendi|usta)\b/i;

const FEMALE_NAME_TOKENS = new Set([
  "nazik", "zeynep", "elif", "eda", "arzu", "leyla", "ayşe", "ayse", "selma", "hicran",
  "emine", "melis", "derya", "sevgi", "begüm", "canan", "nur", "gül", "zehra", "yasemin",
  "pınar", "pinar", "merve", "sıla", "sila", "ece", "damla", "buse", "ceren", "aslı", "asli",
  "çağla", "cagla", "ecem", "sude", "irem", "büşra", "busra", "kübra", "kubra", "rabia",
  "sümeyye", "sumeyye", "tuğçe", "tugce",
]);

const MALE_NAME_TOKENS = new Set([
  "cem", "murat", "levent", "kerem", "ahmet", "mehmet", "barış", "baris", "kahraman",
  "haldun", "rıza", "riza", "orhan", "hasan", "halit", "recep", "mustafa", "yusuf", "emre",
  "burak", "onur", "tolga", "serkan", "volkan", "tuncay", "alp", "kaan", "eren", "arda", "batuhan",
]);

const FEMALE_DESC_HINTS =
  /\b(bir kadın|titiz bir kadın|genç bir kadın|kadın olan|hanımın|hanımı|kızı|hanımefendi)\b/i;
const MALE_DESC_HINTS =
  /\b(bir adam|erkek olan|beyin|beyi|oğlan|genci erkek)\b/i;

type Rule = {
  re: RegExp;
  male: SuspectPortraitKey[];
  female: SuspectPortraitKey[];
  any: SuspectPortraitKey[];
};

const TRAIT_RULES: Rule[] = [
  { re: /\bkaptan|gemi|yatçı|denizci|seyir\b/i, male: ["noir-m-captain-cap", "noir-m-sailor"], female: ["noir-f-office"], any: [] },
  { re: /\bkasiyer|organizatör|muhasebe|hesap|kasa|resepsiyon|girişten\b/i, male: ["noir-m-office-tie"], female: ["noir-f-bun-glasses"], any: [] },
  { re: /\bşef|aşçı|mutfak|yemek\b/i, male: ["noir-m-chef"], female: ["noir-f-chef"], any: [] },
  { re: /\bgüvenlik|polis|bekçi|koruma\b/i, male: ["noir-m-police", "noir-m-security-cap"], female: ["noir-f-police"], any: [] },
  { re: /\bdoktor|hemşire|sağlık|tıp\b/i, male: ["noir-m-lab-coat"], female: ["noir-f-lab-coat"], any: [] },
  { re: /\bprof|asistan|üniversite|öğrenci|akademi|laboratuvar|bilim\b/i, male: ["noir-m-lab-coat", "noir-m-student"], female: ["noir-f-lab-coat", "noir-f-student"], any: [] },
  { re: /\bressam|sanat|galeri|küratör\b/i, male: ["noir-m-artist-beret"], female: ["noir-f-artist-hair"], any: [] },
  { re: /\binşaat|müteahhit|şantiye|nakliyeci\b/i, male: ["noir-m-hard-hat"], female: ["noir-f-hard-hat"], any: [] },
  { re: /\bav|tüfek|asker|albay|emekli albay\b/i, male: ["noir-m-security-cap"], female: ["noir-f-police"], any: [] },
  { re: /\bkaslı|iri yarı|güçlü|vücut|ağırlık|kuvvetli\b/i, male: ["noir-m-athletic", "noir-m-worker-towel"], female: ["noir-f-athletic"], any: [] },
  { re: /\bhamam|kese|masaj|spa\b/i, male: ["noir-m-worker-towel"], female: ["noir-f-athletic"], any: [] },
  { re: /\bmüdür|yönetici|direktör\b/i, male: ["noir-m-suit-receding", "noir-m-office-tie"], female: ["noir-f-office"], any: [] },
  { re: /\bsekreter\b/i, male: ["noir-m-office-tie"], female: ["noir-f-office", "noir-f-bun-glasses"], any: [] },
  { re: /\bkuyumcu|bakırcı|esnaf\b/i, male: ["noir-m-office-tie"], female: ["noir-f-bun-glasses"], any: [] },
  { re: /\bsakallı|sakal\b/i, male: ["noir-m-beard-full"], female: [], any: [] },
  { re: /\bdedektif\b/i, male: ["noir-m-office-tie"], female: ["noir-f-office"], any: [] },
  { re: /\bseçim|belediye|siyaset|aday\b/i, male: ["noir-m-suit-receding"], female: ["noir-f-office"], any: [] },
];

const MALE_FALLBACK: SuspectPortraitKey[] = [
  "noir-generic-m",
  "noir-m-office-tie",
  "noir-m-hoodie",
  "noir-m-student",
  "noir-m-athletic",
  "noir-m-beard-full",
  "noir-m-lab-coat",
  "noir-m-sailor",
  "noir-m-hard-hat",
  "noir-m-security-cap",
  "noir-m-chef",
  "noir-m-artist-beret",
  "noir-m-captain-cap",
  "noir-m-police",
  "noir-m-elder-cane",
  "noir-m-worker-towel",
  "noir-m-suit-receding",
];

const FEMALE_FALLBACK: SuspectPortraitKey[] = [
  "noir-generic-f",
  "noir-f-office",
  "noir-f-ponytail",
  "noir-f-student",
  "noir-f-athletic",
  "noir-f-lab-coat",
  "noir-f-chef",
  "noir-f-artist-hair",
  "noir-f-hard-hat",
  "noir-f-police",
  "noir-f-elder-shawl",
  "noir-f-bun-glasses",
];

function tokenizeName(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-zğüşıöç0-9]+/i)
    .filter(Boolean);
}

function inferGenderStrict(s: Suspect): Gender | undefined {
  const name = s.name;
  const desc = s.description;
  const nLow = name.toLowerCase();

  if (FEMALE_TITLES.test(name) || /\biş kadını\b/i.test(nLow) || /\bsekreter bayan\b/i.test(nLow)) {
    return "female";
  }
  if (MALE_TITLES.test(name) || /\balbay\b/i.test(nLow)) return "male";

  for (const t of tokenizeName(name)) {
    if (FEMALE_NAME_TOKENS.has(t)) return "female";
  }
  for (const t of tokenizeName(name)) {
    if (MALE_NAME_TOKENS.has(t)) return "male";
  }

  if (FEMALE_DESC_HINTS.test(desc)) return "female";
  if (MALE_DESC_HINTS.test(desc)) return "male";

  const icon = s.icon.trim().replace(/_/g, "-");
  if (icon === "woman" || icon === "elderly-woman" || icon === "elderly_woman") return "female";
  if (icon === "man") return "male";

  return undefined;
}

function inferElderly(s: Suspect): boolean {
  const t = `${s.name} ${s.description}`.toLowerCase();
  if (/\bgenç\b|\bstajyer\b|\böğrenci\b|\bögrenci\b|\byeni geldi\b|\batik\b/i.test(t)) {
    if (!/\byaşlı\b|\bemekli\b|\ben yaşlı\b/i.test(t)) return false;
  }
  if (/\b(emekli albay|emekli doktor|en yaşlı|yaşlı misafir|yaşlı\b|emekli\b|albay\b)\b/i.test(t)) return true;
  const icon = s.icon.trim().replace(/_/g, "-");
  if (icon === "elderly" || icon === "elderly-woman" || icon === "elderly_woman") return true;
  return false;
}

function buildGenderMap(suspectsSorted: Suspect[]): Map<string, Gender> {
  const genders = new Map<string, Gender>();
  const unknownIds: string[] = [];
  for (const s of suspectsSorted) {
    const g = inferGenderStrict(s);
    if (g) genders.set(s.id, g);
    else unknownIds.push(s.id);
  }
  let flip = 0;
  for (const id of unknownIds) {
    genders.set(id, flip % 2 === 0 ? "male" : "female");
    flip++;
  }
  return genders;
}

function candidatesForSuspect(s: Suspect, gender: Gender): SuspectPortraitKey[] {
  const text = `${s.name} ${s.description}`;
  const out: SuspectPortraitKey[] = [];
  const push = (keys: SuspectPortraitKey[]) => {
    for (const k of keys) {
      if (!out.includes(k)) out.push(k);
    }
  };

  for (const rule of TRAIT_RULES) {
    if (rule.re.test(text)) {
      if (gender === "female") push(rule.female);
      else push(rule.male);
      push(rule.any);
    }
  }

  if (inferElderly(s)) {
    if (gender === "female") push(["noir-f-elder-shawl"]);
    else push(["noir-m-elder-cane", "noir-m-suit-receding"]);
  }

  return out;
}

function shuffleForPuzzle(seed: string, arr: SuspectPortraitKey[]): SuspectPortraitKey[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildSuspectPortraitMap(
  puzzleId: string,
  suspects: Suspect[],
): Record<string, SuspectPortraitKey> {
  const sorted = [...suspects].sort((a, b) => a.id.localeCompare(b.id));
  const genderOf = buildGenderMap(sorted);
  const used = new Set<SuspectPortraitKey>();
  const result: Record<string, SuspectPortraitKey> = {};

  for (const s of sorted) {
    const key = `${puzzleId}-${s.id}`;
    const override = PORTRAIT_OVERRIDES[key];
    if (override && !used.has(override)) {
      used.add(override);
      result[s.id] = override;
      continue;
    }

    const gender = genderOf.get(s.id)!;
    const ranked = candidatesForSuspect(s, gender);
    let chosen: SuspectPortraitKey | undefined;
    for (const c of ranked) {
      if (!used.has(c)) {
        chosen = c;
        break;
      }
    }

    if (!chosen) {
      const pool = shuffleForPuzzle(`${puzzleId}-${s.id}`, gender === "female" ? FEMALE_FALLBACK : MALE_FALLBACK);
      chosen = pool.find((k) => !used.has(k));
    }

    if (!chosen) {
      const pool = gender === "female" ? FEMALE_FALLBACK : MALE_FALLBACK;
      chosen = pool.find((k) => !used.has(k)) ?? (gender === "female" ? "noir-generic-f" : "noir-generic-m");
    }

    used.add(chosen);
    result[s.id] = chosen;
  }

  return result;
}
