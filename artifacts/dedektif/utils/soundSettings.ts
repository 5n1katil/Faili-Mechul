import AsyncStorage from "@react-native-async-storage/async-storage";

const SOUND_KEY = "@dedektif_sound_enabled";

let _enabled = true;

AsyncStorage.getItem(SOUND_KEY).then((val) => {
  _enabled = val !== "false";
}).catch(() => {});

export const soundSettings = {
  get enabled(): boolean {
    return _enabled;
  },
  set enabled(val: boolean) {
    _enabled = val;
    AsyncStorage.setItem(SOUND_KEY, val ? "true" : "false").catch(() => {});
  },
};
