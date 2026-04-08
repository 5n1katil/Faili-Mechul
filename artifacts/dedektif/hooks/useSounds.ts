import { useCallback, useEffect, useRef } from "react";
import { useAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SOUND_KEY = "@dedektif_sound_enabled";

export type SoundName = "tap" | "check" | "cross" | "error" | "success" | "clue";

export function useSounds() {
  const enabledRef = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(SOUND_KEY).then((val) => {
      enabledRef.current = val !== "false";
    });
  }, []);

  const tap = useAudioPlayer(require("../assets/sounds/tap.wav"));
  const check = useAudioPlayer(require("../assets/sounds/check.wav"));
  const cross = useAudioPlayer(require("../assets/sounds/cross.wav"));
  const error = useAudioPlayer(require("../assets/sounds/error.wav"));
  const success = useAudioPlayer(require("../assets/sounds/success.wav"));
  const clue = useAudioPlayer(require("../assets/sounds/clue.wav"));

  const playersRef = useRef({ tap, check, cross, error, success, clue });
  playersRef.current = { tap, check, cross, error, success, clue };

  const play = useCallback((name: SoundName) => {
    if (!enabledRef.current) return;
    const player = playersRef.current[name];
    player.seekTo(0).then(() => player.play()).catch(() => {});
  }, []);

  return { play };
}
