import Constants from "expo-constants";
import { Platform } from "react-native";

/** `public/avatars` altındaki özel silüet dosyası mı? */
export function isCustomAvatarIcon(icon: string | undefined): boolean {
  if (!icon?.trim()) return false;
  const t = icon.trim();
  return (
    /^noun-/i.test(t) ||
    /\.(png|webp|svg)$/i.test(t) ||
    /-avatar\.(png|webp)$/i.test(t)
  );
}

function getAvatarOrigin(): string {
  if (Platform.OS === "web") return "";
  const extra = Constants.expoConfig?.extra as { router?: { origin?: string } } | undefined;
  const origin =
    extra?.router?.origin ??
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri?.replace(/^exp:\/\//, "https://") ??
    "https://faili-mechul.vercel.app";
  return String(origin).replace(/\/$/, "");
}

/** Web: `/avatars/...` — Native: tam URL (public/ yalnızca web sunucusunda). */
export function resolveAvatarUri(icon: string): string {
  const hasExt = /\.(svg|png|webp|jpg|jpeg|gif)$/i.test(icon);
  const fileName = hasExt ? icon : `${icon}.svg`;
  const path = `/avatars/${fileName}`;
  const base = getAvatarOrigin();
  return base ? `${base}${path}` : path;
}
