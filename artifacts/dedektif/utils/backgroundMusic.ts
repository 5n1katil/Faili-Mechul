import { Platform } from "react-native";

/**
 * Web: play() kullanıcı etkileşimiyle aynı call stack'te çağrılmalı.
 * unlockMusicFromGesture yalnızca henüz çalmıyorsa başlatır; çalıyorsa dokunmaz.
 */
type GesturePlayFn = () => void;

let gesturePlayFn: GesturePlayFn | null = null;
let webGestureUnlocked = Platform.OS !== "web";

export function registerGestureMusicPlay(fn: GesturePlayFn | null) {
  gesturePlayFn = fn;
}

export function isWebGestureUnlocked(): boolean {
  return Platform.OS !== "web" || webGestureUnlocked;
}

/** İlk kullanıcı etkileşimi: kilidi aç + gerekirse başlat (çalıyorsa yeniden başlatma). */
export function unlockMusicFromGesture() {
  if (Platform.OS === "web") webGestureUnlocked = true;
  gesturePlayFn?.();
}

/** @deprecated unlockMusicFromGesture kullan */
export function playMusicFromUserGesture() {
  unlockMusicFromGesture();
}
