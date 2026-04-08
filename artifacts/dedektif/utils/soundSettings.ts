import AsyncStorage from "@react-native-async-storage/async-storage";

const SOUND_KEY = "@dedektif_sound_enabled";

let _enabled = true;

async function loadFromStorage() {
  try {
    const val = await AsyncStorage.getItem(SOUND_KEY);
    _enabled = val !== "false";
  } catch {}
}

loadFromStorage();

export const soundSettings = {
  get enabled(): boolean {
    return _enabled;
  },
  set enabled(val: boolean) {
    _enabled = val;
    AsyncStorage.setItem(SOUND_KEY, val ? "true" : "false").catch(() => {});
  },
  async refresh(): Promise<boolean> {
    await loadFromStorage();
    return _enabled;
  },
};
