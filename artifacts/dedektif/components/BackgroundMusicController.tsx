import React, { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import {
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioPlayer,
} from "expo-audio";
import { useGame } from "@/context/GameContext";
import {
  isWebGestureUnlocked,
  registerGestureMusicPlay,
  unlockMusicFromGesture,
} from "@/utils/backgroundMusic";
import {
  isSoundSettingsHydrated,
  soundSettings,
  subscribeSoundSettings,
  waitForSoundSettingsHydration,
} from "@/utils/soundSettings";

const MAIN_GAIN = 0.34;
const CASE_GAIN = 0.22;

const PLAYER_OPTS = { downloadFirst: true, updateInterval: 250 } as const;

type ActiveTrack = "main" | "case" | "none";

interface Props {
  splashReady: boolean;
}

export default function BackgroundMusicController({ splashReady }: Props) {
  const { gameState } = useGame();
  const mainPlayer = useAudioPlayer(require("../assets/sounds/main-theme.wav"), PLAYER_OPTS);
  const casePlayer = useAudioPlayer(require("../assets/sounds/case-background.wav"), PLAYER_OPTS);
  const mainStatus = useAudioPlayerStatus(mainPlayer);
  const caseStatus = useAudioPlayerStatus(casePlayer);
  const appActiveRef = useRef(true);
  const activeTrackRef = useRef<ActiveTrack>("none");
  const syncPlaybackRef = useRef<() => void>(() => {});
  /** Ayarlardan 0 yapılınca pause edilir; tekrar açılınca baştan başlat */
  const resumeFromStartRef = useRef({ main: false, case: false });

  const caseActive = !!(
    gameState?.puzzle &&
    gameState.timerActive &&
    !gameState.isComplete
  );

  const desiredTrack = (): ActiveTrack => {
    if (!splashReady || !isSoundSettingsHydrated()) return "none";
    if (caseActive) {
      return soundSettings.caseMusicVolume > 0 ? "case" : "none";
    }
    return soundSettings.mainMusicVolume > 0 ? "main" : "none";
  };

  const getVolume = useCallback((track: "main" | "case") => {
    const step =
      track === "case" ? soundSettings.caseMusicVolume : soundSettings.mainMusicVolume;
    if (step === 0) return 0;
    const gain = track === "case" ? CASE_GAIN : MAIN_GAIN;
    return (step / 100) * gain;
  }, []);

  const startOrResume = useCallback(
    async (player: AudioPlayer, volume: number, track: "main" | "case") => {
      player.loop = true;
      player.volume = volume;

      const nearEnd =
        player.duration > 0 && player.currentTime >= Math.max(0, player.duration - 0.35);
      const mustSeek = resumeFromStartRef.current[track] || !player.playing || nearEnd;

      if (mustSeek) {
        resumeFromStartRef.current[track] = false;
        try {
          await player.seekTo(0);
        } catch {
          /* ignore */
        }
      }

      if (!player.playing) {
        try {
          player.play();
        } catch {
          return false;
        }
      }
      return player.playing;
    },
    [],
  );

  const ensurePlaying = useCallback(
    async (
      player: AudioPlayer,
      volume: number,
      isLoaded: boolean,
      track: "main" | "case",
    ): Promise<boolean> => {
      if (!isLoaded) return false;

      if (volume <= 0) {
        resumeFromStartRef.current[track] = true;
        if (player.playing) player.pause();
        return false;
      }

      return startOrResume(player, volume, track);
    },
    [startOrResume],
  );

  const syncPlayback = useCallback(() => {
    const run = async () => {
      if (!isSoundSettingsHydrated() || !splashReady || !appActiveRef.current) {
        mainPlayer.pause();
        casePlayer.pause();
        resumeFromStartRef.current.main = true;
        resumeFromStartRef.current.case = true;
        activeTrackRef.current = "none";
        return;
      }

      if (Platform.OS === "web" && !isWebGestureUnlocked()) return;

      const want = desiredTrack();

      if (want === "case") {
        if (mainPlayer.playing) {
          mainPlayer.pause();
          resumeFromStartRef.current.main = true;
        }
        const ok = await ensurePlaying(
          casePlayer,
          getVolume("case"),
          caseStatus.isLoaded,
          "case",
        );
        activeTrackRef.current = ok ? "case" : "none";
        return;
      }

      if (want === "main") {
        if (casePlayer.playing) {
          casePlayer.pause();
          resumeFromStartRef.current.case = true;
        }
        const ok = await ensurePlaying(
          mainPlayer,
          getVolume("main"),
          mainStatus.isLoaded,
          "main",
        );
        activeTrackRef.current = ok ? "main" : "none";
        return;
      }

      if (mainPlayer.playing) {
        mainPlayer.pause();
        resumeFromStartRef.current.main = true;
      }
      if (casePlayer.playing) {
        casePlayer.pause();
        resumeFromStartRef.current.case = true;
      }
      activeTrackRef.current = "none";
    };

    void run();
  }, [
    splashReady,
    caseActive,
    mainPlayer,
    casePlayer,
    getVolume,
    ensurePlaying,
    mainStatus.isLoaded,
    caseStatus.isLoaded,
  ]);

  /** Web: yalnızca henüz çalmıyorsa başlat; her tıklamada seek/restart yok. */
  const unlockFromGesture = useCallback(() => {
    if (!splashReady || !appActiveRef.current || !isSoundSettingsHydrated()) return;

    const want = desiredTrack();
    if (want === "none") return;

    if (want === "case" && activeTrackRef.current === "case" && casePlayer.playing) return;
    if (want === "main" && activeTrackRef.current === "main" && mainPlayer.playing) return;

    syncPlayback();
  }, [splashReady, caseActive, casePlayer, mainPlayer, syncPlayback]);

  syncPlaybackRef.current = syncPlayback;

  useEffect(() => {
    registerGestureMusicPlay(unlockFromGesture);
    return () => registerGestureMusicPlay(null);
  }, [unlockFromGesture]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    mainPlayer.loop = true;
    casePlayer.loop = true;
  }, [mainPlayer, casePlayer]);

  useEffect(() => {
    if (!splashReady) return;
    void waitForSoundSettingsHydration().then(() => {
      if (Platform.OS !== "web") syncPlaybackRef.current();
    });
  }, [splashReady]);

  useEffect(() => {
    syncPlayback();
  }, [syncPlayback]);

  useEffect(() => {
    return subscribeSoundSettings(() => syncPlaybackRef.current());
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || !isWebGestureUnlocked()) return;
    if (!mainStatus.isLoaded && !caseStatus.isLoaded) return;
    if (activeTrackRef.current !== "none") return;
    syncPlaybackRef.current();
  }, [mainStatus.isLoaded, caseStatus.isLoaded]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      const active = next === "active";
      appActiveRef.current = active;
      if (active) {
        void setIsAudioActiveAsync(true).then(() => syncPlaybackRef.current());
      } else {
        mainPlayer.pause();
        casePlayer.pause();
        activeTrackRef.current = "none";
        void setIsAudioActiveAsync(false);
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [mainPlayer, casePlayer]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const onFirstGesture = () => unlockMusicFromGesture();
    document.addEventListener("pointerdown", onFirstGesture, { capture: true, once: true });
    document.addEventListener("keydown", onFirstGesture, { capture: true, once: true });
    return () => {
      document.removeEventListener("pointerdown", onFirstGesture, { capture: true });
      document.removeEventListener("keydown", onFirstGesture, { capture: true });
    };
  }, []);

  /** iOS: loop bazen tetiklenmiyor — parça bitince yeniden senkronize et */
  useEffect(() => {
    const onEnded = (status: { didJustFinish?: boolean }) => {
      if (status.didJustFinish) syncPlaybackRef.current();
    };
    const subMain = mainPlayer.addListener("playbackStatusUpdate", onEnded);
    const subCase = casePlayer.addListener("playbackStatusUpdate", onEnded);
    return () => {
      subMain.remove();
      subCase.remove();
    };
  }, [mainPlayer, casePlayer]);

  return null;
}
