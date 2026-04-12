import { Platform } from "react-native";

export function getApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit;
  if (Platform.OS === "web") return "/api";
  if (__DEV__) {
    return "/api";
  }
  console.warn(
    "[apiClient] EXPO_PUBLIC_API_URL is not set. " +
      "Set this EAS build secret to point to your production API server."
  );
  return "";
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface PrivacySettings {
  showStats: boolean;
  showBadges: boolean;
  showBio: boolean;
  showAvatar: boolean;
}

export interface SyncProfilePayload {
  displayName: string;
  avatar: string;
  bio: string;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  maxStreak: number;
  avgSolveTimeSeconds: number;
  badges: string[];
  isPremium: boolean;
  privacyShowStats: boolean;
  privacyShowBadges: boolean;
  privacyShowBio: boolean;
  privacyShowAvatar: boolean;
}

export async function syncProfileToBackend(
  playerId: string,
  payload: SyncProfilePayload
): Promise<void> {
  try {
    const base = getApiBase();
    if (!base) return;
    await fetch(`${base}/profiles/${playerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
  }
}

export interface PublicProfileStats {
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  maxStreak: number;
  avgSolveTimeSeconds: number;
}

export interface PublicProfile {
  playerId: string;
  displayName: string;
  isPremium: boolean;
  updatedAt: string;
  privacy: {
    showStats: boolean;
    showBadges: boolean;
    showBio: boolean;
    showAvatar: boolean;
  };
  avatar?: string;
  bio?: string;
  stats?: PublicProfileStats;
  badges?: string[];
}

export async function fetchPublicProfile(playerId: string): Promise<PublicProfile | null> {
  try {
    const base = getApiBase();
    if (!base) return null;
    const res = await fetch(`${base}/profiles/${playerId}`);
    if (!res.ok) return null;
    return (await res.json()) as PublicProfile;
  } catch {
    return null;
  }
}

export const apiClient = {
  async getProfile(playerId: string): Promise<PublicProfile | null> {
    return fetchPublicProfile(playerId);
  },
};
