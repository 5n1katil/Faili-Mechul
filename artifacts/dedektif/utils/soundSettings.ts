import AsyncStorage from "@react-native-async-storage/async-storage";

export const VOLUME_STEPS = [0, 5, 10, 20, 30, 50, 70, 90, 100] as const;
export type VolumeStep = (typeof VOLUME_STEPS)[number];

const SFX_KEY = "@dedektif_sound_enabled";
const MAIN_MUSIC_KEY = "@dedektif_main_music_volume";
const CASE_MUSIC_KEY = "@dedektif_case_music_volume";
/** Eski null→0 hatasından kalan kayıtları bir kez %50'ye taşır */
const MUSIC_MIGRATION_KEY = "@dedektif_music_vol_migration_v1";

export const DEFAULT_VOLUME: VolumeStep = 50;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

function parseVolume(raw: string | null | undefined): VolumeStep {
  if (raw === null || raw === undefined || raw === "") return DEFAULT_VOLUME;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_VOLUME;
  if (VOLUME_STEPS.includes(n as VolumeStep)) return n as VolumeStep;
  return DEFAULT_VOLUME;
}

let _sfxEnabled = true;
let _mainMusicVolume: VolumeStep = DEFAULT_VOLUME;
let _caseMusicVolume: VolumeStep = DEFAULT_VOLUME;
let _hydrated = false;

async function loadFromStorage() {
  try {
    const [sfx, main, caseVol, migrated] = await Promise.all([
      AsyncStorage.getItem(SFX_KEY),
      AsyncStorage.getItem(MAIN_MUSIC_KEY),
      AsyncStorage.getItem(CASE_MUSIC_KEY),
      AsyncStorage.getItem(MUSIC_MIGRATION_KEY),
    ]);
    _sfxEnabled = sfx !== "false";

    const needsMigration = migrated !== "1";
    const writes: Promise<void>[] = [];

    if (needsMigration) {
      // İlk kurulum veya eski bug: kayıt yok / "0" → varsayılan %50
      const mainDefault = main === null || main === "0";
      const caseDefault = caseVol === null || caseVol === "0";
      _mainMusicVolume = mainDefault ? DEFAULT_VOLUME : parseVolume(main);
      _caseMusicVolume = caseDefault ? DEFAULT_VOLUME : parseVolume(caseVol);
      if (mainDefault) writes.push(AsyncStorage.setItem(MAIN_MUSIC_KEY, String(DEFAULT_VOLUME)));
      if (caseDefault) writes.push(AsyncStorage.setItem(CASE_MUSIC_KEY, String(DEFAULT_VOLUME)));
      writes.push(AsyncStorage.setItem(MUSIC_MIGRATION_KEY, "1"));
    } else {
      _mainMusicVolume = parseVolume(main);
      _caseMusicVolume = parseVolume(caseVol);
      if (main === null) writes.push(AsyncStorage.setItem(MAIN_MUSIC_KEY, String(DEFAULT_VOLUME)));
      if (caseVol === null) writes.push(AsyncStorage.setItem(CASE_MUSIC_KEY, String(DEFAULT_VOLUME)));
    }

    if (writes.length > 0) await Promise.all(writes);
  } catch {
    _mainMusicVolume = DEFAULT_VOLUME;
    _caseMusicVolume = DEFAULT_VOLUME;
  } finally {
    _hydrated = true;
    notify();
  }
}

void loadFromStorage();

export function subscribeSoundSettings(listener: Listener): () => void {
  listeners.add(listener);
  if (_hydrated) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
  return () => listeners.delete(listener);
}

/** Storage yüklendikten sonra çözülür (müzik başlatma için) */
export function waitForSoundSettingsHydration(): Promise<void> {
  if (_hydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = subscribeSoundSettings(() => {
      unsub();
      resolve();
    });
  });
}

/** Müzik motorunu yeniden senkronize et (ayarlar açılışı, web autoplay sonrası) */
export function bumpMusicPlayback(): void {
  if (_hydrated) notify();
}

export function isSoundSettingsHydrated(): boolean {
  return _hydrated;
}

/** @deprecated Use `sfxEnabled` — kept for existing call sites */
export const soundSettings = {
  get enabled(): boolean {
    return _sfxEnabled;
  },
  set enabled(val: boolean) {
    _sfxEnabled = val;
    AsyncStorage.setItem(SFX_KEY, val ? "true" : "false").catch(() => {});
    notify();
  },
  get mainMusicVolume(): VolumeStep {
    return _mainMusicVolume;
  },
  set mainMusicVolume(val: VolumeStep) {
    _mainMusicVolume = val;
    AsyncStorage.setItem(MAIN_MUSIC_KEY, String(val)).catch(() => {});
    notify();
  },
  get caseMusicVolume(): VolumeStep {
    return _caseMusicVolume;
  },
  set caseMusicVolume(val: VolumeStep) {
    _caseMusicVolume = val;
    AsyncStorage.setItem(CASE_MUSIC_KEY, String(val)).catch(() => {});
    notify();
  },
  get sfxEnabled(): boolean {
    return _sfxEnabled;
  },
  set sfxEnabled(val: boolean) {
    this.enabled = val;
  },
  async refresh(): Promise<void> {
    await loadFromStorage();
  },
};
