import { useCallback, useRef } from "react";
import { useAudioPlayer } from "expo-audio";
import { soundSettings } from "@/utils/soundSettings";

export type SoundName = "tap" | "check" | "cross" | "error" | "success" | "clue" | "victory";

const DEBOUNCE_MS = 50;

const ZERO_TIMESTAMPS: Record<SoundName, number> = {
  tap: 0, check: 0, cross: 0, error: 0, success: 0, clue: 0, victory: 0,
};

const FALSE_FLAGS: Record<SoundName, boolean> = {
  tap: false, check: false, cross: false, error: false, success: false, clue: false, victory: false,
};

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

  const lastPlayRef = useRef<Record<SoundName, number>>({ ...ZERO_TIMESTAMPS });
  const inFlightRef = useRef<Record<SoundName, boolean>>({ ...FALSE_FLAGS });

  const play = useCallback((name: SoundName) => {
    if (!soundSettings.enabled) return;
    if (inFlightRef.current[name]) return;
    const now = Date.now();
    if (now - lastPlayRef.current[name] < DEBOUNCE_MS) return;
    lastPlayRef.current[name] = now;
    inFlightRef.current[name] = true;
    const player = playersRef.current[name];
    player.seekTo(0).then(() => {
      inFlightRef.current[name] = false;
      player.play();
    }).catch(() => {
      inFlightRef.current[name] = false;
    });
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
