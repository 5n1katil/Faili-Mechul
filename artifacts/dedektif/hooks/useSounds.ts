import { useCallback, useRef } from "react";
import { useAudioPlayer } from "expo-audio";
import { soundSettings } from "@/utils/soundSettings";

export type SoundName = "tap" | "check" | "cross" | "error" | "success" | "clue";

export function useSounds() {
  const tap = useAudioPlayer(require("../assets/sounds/tap.wav"));
  const check = useAudioPlayer(require("../assets/sounds/check.wav"));
  const cross = useAudioPlayer(require("../assets/sounds/cross.wav"));
  const error = useAudioPlayer(require("../assets/sounds/error.wav"));
  const success = useAudioPlayer(require("../assets/sounds/success.wav"));
  const clue = useAudioPlayer(require("../assets/sounds/clue.wav"));

  const playersRef = useRef({ tap, check, cross, error, success, clue });
  playersRef.current = { tap, check, cross, error, success, clue };

  const play = useCallback((name: SoundName) => {
    if (!soundSettings.enabled) return;
    const player = playersRef.current[name];
    player.seekTo(0).then(() => player.play()).catch(() => {});
  }, []);

  return { play };
}
