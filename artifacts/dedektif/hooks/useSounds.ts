import { useCallback, useRef } from "react";
import { useAudioPlayer } from "expo-audio";
import { soundSettings } from "@/utils/soundSettings";

export type SoundName = "tap" | "check" | "cross" | "error" | "success" | "clue" | "victory";

export function useSounds() {
  const tap = useAudioPlayer(require("../assets/sounds/tap.wav"));
  const check = useAudioPlayer(require("../assets/sounds/check.wav"));
  const cross = useAudioPlayer(require("../assets/sounds/cross.wav"));
  const error = useAudioPlayer(require("../assets/sounds/error.wav"));
  const success = useAudioPlayer(require("../assets/sounds/success.wav"));
  const clue = useAudioPlayer(require("../assets/sounds/clue.wav"));
  const victory = useAudioPlayer(require("../assets/sounds/victory.wav"));

  const playersRef = useRef({ tap, check, cross, error, success, clue, victory });
  playersRef.current = { tap, check, cross, error, success, clue, victory };

  const play = useCallback((name: SoundName) => {
    if (!soundSettings.enabled) return;
    const player = playersRef.current[name];
    player.seekTo(0).then(() => player.play()).catch(() => {});
  }, []);

  const playVictorySequence = useCallback(() => {
    if (!soundSettings.enabled) return;

    const { clue: clueP, victory: victoryP, tap: tapP } = playersRef.current;

    clueP.seekTo(0).then(() => clueP.play()).catch(() => {});

    setTimeout(() => {
      victoryP.seekTo(0).then(() => victoryP.play()).catch(() => {});
    }, 250);

    [900, 1050, 1200].forEach((delay) => {
      setTimeout(() => {
        tapP.seekTo(0).then(() => tapP.play()).catch(() => {});
      }, delay);
    });
  }, []);

  return { play, playVictorySequence };
}
