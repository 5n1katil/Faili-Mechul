import React from "react";
import { Image, Text, View } from "react-native";

export type AvatarCategory = "dedektif" | "hafiye" | "supheji" | "uzman" | "efsane";

export const CATEGORY_LABELS: Record<AvatarCategory, string> = {
  dedektif: "Dedektifler",
  hafiye:   "Hafiyeler",
  supheji:  "Şüpheliler",
  uzman:    "Uzmanlar",
  efsane:   "Efsaneler",
};

export interface AvatarPreset {
  key: string;
  emoji: string;
  label: string;
  category: AvatarCategory;
  bg: string;
}

export const PRESET_AVATARS: AvatarPreset[] = [
  // ── Dedektifler ────────────────────────────────
  { key: "d01", emoji: "🕵️",    label: "Dedektif",    category: "dedektif", bg: "#1A2448" },
  { key: "d02", emoji: "👮",    label: "Komiser",     category: "dedektif", bg: "#1A2448" },
  { key: "d03", emoji: "🧑‍⚖️",  label: "Yargıç",     category: "dedektif", bg: "#1A2448" },
  { key: "d04", emoji: "🫡",    label: "Albay",       category: "dedektif", bg: "#1A2448" },
  { key: "d05", emoji: "💂",    label: "Muhafız",     category: "dedektif", bg: "#1A2448" },
  { key: "d06", emoji: "🕴️",    label: "Ajan",        category: "dedektif", bg: "#1A2448" },
  { key: "d07", emoji: "🦸",    label: "Kahraman",    category: "dedektif", bg: "#1A2448" },
  { key: "d08", emoji: "🧑‍✈️",  label: "Kaptan",     category: "dedektif", bg: "#1A2448" },
  { key: "d09", emoji: "👷",    label: "Teknisyen",   category: "dedektif", bg: "#1A2448" },
  { key: "d10", emoji: "👨‍✈️",  label: "Pilot",      category: "dedektif", bg: "#1A2448" },

  // ── Hafiyeler ──────────────────────────────────
  { key: "h01", emoji: "🤵",    label: "Smokin",      category: "hafiye", bg: "#221048" },
  { key: "h02", emoji: "🥷",    label: "Ninja",       category: "hafiye", bg: "#221048" },
  { key: "h03", emoji: "😎",    label: "Soğukkanlı",  category: "hafiye", bg: "#221048" },
  { key: "h04", emoji: "🧐",    label: "Araştırmacı", category: "hafiye", bg: "#221048" },
  { key: "h05", emoji: "🤫",    label: "Sessiz",      category: "hafiye", bg: "#221048" },
  { key: "h06", emoji: "🥸",    label: "Kılık D.",    category: "hafiye", bg: "#221048" },
  { key: "h07", emoji: "🎭",    label: "Aktör",       category: "hafiye", bg: "#221048" },
  { key: "h08", emoji: "🃏",    label: "Joker",       category: "hafiye", bg: "#221048" },
  { key: "h09", emoji: "🕵️‍♀️", label: "Ajan K.",    category: "hafiye", bg: "#221048" },
  { key: "h10", emoji: "👩‍💼",  label: "Temsilci",   category: "hafiye", bg: "#221048" },

  // ── Şüpheliler ─────────────────────────────────
  { key: "s01", emoji: "🦹",    label: "Kötü Adam",   category: "supheji", bg: "#381018" },
  { key: "s02", emoji: "😈",    label: "Şeytan",      category: "supheji", bg: "#381018" },
  { key: "s03", emoji: "🥺",    label: "Masum",       category: "supheji", bg: "#381018" },
  { key: "s04", emoji: "😰",    label: "Endişeli",    category: "supheji", bg: "#381018" },
  { key: "s05", emoji: "😬",    label: "Gergin",      category: "supheji", bg: "#381018" },
  { key: "s06", emoji: "🤥",    label: "Yalancı",     category: "supheji", bg: "#381018" },
  { key: "s07", emoji: "😱",    label: "Şaşkın",      category: "supheji", bg: "#381018" },
  { key: "s08", emoji: "😤",    label: "Sinirli",     category: "supheji", bg: "#381018" },
  { key: "s09", emoji: "😼",    label: "Sinsi",       category: "supheji", bg: "#381018" },
  { key: "s10", emoji: "🦹‍♀️", label: "Kötü Kadın", category: "supheji", bg: "#381018" },

  // ── Uzmanlar ───────────────────────────────────
  { key: "u01", emoji: "👨‍🔬",  label: "Bilimci",    category: "uzman", bg: "#103020" },
  { key: "u02", emoji: "👩‍🔬",  label: "Araşt. K.",  category: "uzman", bg: "#103020" },
  { key: "u03", emoji: "🧑‍⚕️",  label: "Doktor",    category: "uzman", bg: "#103020" },
  { key: "u04", emoji: "👨‍💻",  label: "Analist",    category: "uzman", bg: "#103020" },
  { key: "u05", emoji: "👩‍💻",  label: "Hacker",     category: "uzman", bg: "#103020" },
  { key: "u06", emoji: "🧑‍🏫",  label: "Öğretmen",  category: "uzman", bg: "#103020" },
  { key: "u07", emoji: "👨‍🎨",  label: "Ressam",     category: "uzman", bg: "#103020" },
  { key: "u08", emoji: "👩‍🎨",  label: "Sanatçı",    category: "uzman", bg: "#103020" },
  { key: "u09", emoji: "🧑‍🚀",  label: "Kaşif",     category: "uzman", bg: "#103020" },
  { key: "u10", emoji: "👩‍⚖️",  label: "Hâkim",     category: "uzman", bg: "#103020" },

  // ── Efsaneler ──────────────────────────────────
  { key: "e01", emoji: "🧙",    label: "Büyücü",      category: "efsane", bg: "#102028" },
  { key: "e02", emoji: "🧙‍♀️", label: "Cadı",        category: "efsane", bg: "#102028" },
  { key: "e03", emoji: "🧛",    label: "Vampir",      category: "efsane", bg: "#102028" },
  { key: "e04", emoji: "🧛‍♀️", label: "Vampir K.",   category: "efsane", bg: "#102028" },
  { key: "e05", emoji: "👻",    label: "Hayalet",     category: "efsane", bg: "#102028" },
  { key: "e06", emoji: "💀",    label: "Kurukafa",    category: "efsane", bg: "#102028" },
  { key: "e07", emoji: "🤖",    label: "Robot",       category: "efsane", bg: "#102028" },
  { key: "e08", emoji: "🧟",    label: "Zombi",       category: "efsane", bg: "#102028" },
  { key: "e09", emoji: "🧝",    label: "Elf",         category: "efsane", bg: "#102028" },
  { key: "e10", emoji: "🧜‍♀️", label: "Deniz Kızı", category: "efsane", bg: "#102028" },
];

export function getAvatarPreset(key: string): AvatarPreset {
  return PRESET_AVATARS.find((p) => p.key === key) ?? PRESET_AVATARS[0];
}

interface AvatarDisplayProps {
  avatar: string;
  size: number;
  color?: string;
  backgroundColor?: string;
}

export function AvatarDisplay({ avatar, size }: AvatarDisplayProps) {
  if (avatar.startsWith("gallery:")) {
    const uri = avatar.slice("gallery:".length);
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        resizeMode="cover"
      />
    );
  }

  const preset = getAvatarPreset(avatar);

  return (
    <View
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: preset.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ fontSize: size * 0.56, lineHeight: size * 0.72 }}
        numberOfLines={1}
      >
        {preset.emoji}
      </Text>
    </View>
  );
}
