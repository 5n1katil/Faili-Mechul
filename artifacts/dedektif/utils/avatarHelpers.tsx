import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

export type AvatarCategory = "dedektif" | "gorevli" | "ajan" | "uzman";

export const CATEGORY_LABELS: Record<AvatarCategory, string> = {
  dedektif: "Dedektifler",
  gorevli:  "Görevliler",
  ajan:     "Ajanlar",
  uzman:    "Uzmanlar",
};

export interface AvatarPreset {
  key: string;
  label: string;
  category: AvatarCategory;
  image: ImageSourcePropType;
  emoji?: string;
  bg?: string;
}

export const PLAYER_AVATAR_IMAGES: Record<string, ImageSourcePropType> = {
  av_dedektif:  require("../assets/images/player_avatars/av_dedektif.png"),
  av_gece:      require("../assets/images/player_avatars/av_gece.png"),
  av_komiser:   require("../assets/images/player_avatars/av_komiser.png"),
  av_genckadin: require("../assets/images/player_avatars/av_genckadin.png"),
  av_fbi:       require("../assets/images/player_avatars/av_fbi.png"),
  av_sert:      require("../assets/images/player_avatars/av_sert.png"),
  av_polis:     require("../assets/images/player_avatars/av_polis.png"),
  av_memur:     require("../assets/images/player_avatars/av_memur.png"),
  av_trafik:    require("../assets/images/player_avatars/av_trafik.png"),
  av_denizci:   require("../assets/images/player_avatars/av_denizci.png"),
  av_ajan:      require("../assets/images/player_avatars/av_ajan.png"),
  av_operator:  require("../assets/images/player_avatars/av_operator.png"),
  av_muhabir:   require("../assets/images/player_avatars/av_muhabir.png"),
  av_sokak:     require("../assets/images/player_avatars/av_sokak.png"),
  av_uzman:     require("../assets/images/player_avatars/av_uzman.png"),
  av_katip:     require("../assets/images/player_avatars/av_katip.png"),
  av_pipo:      require("../assets/images/player_avatars/av_pipo.png"),
  av_golge:     require("../assets/images/player_avatars/av_golge.png"),
  av_asil:      require("../assets/images/player_avatars/av_asil.png"),
};

export const PRESET_AVATARS: AvatarPreset[] = [
  // ── Dedektifler ────────────────────────────────────
  { key: "av_dedektif",  label: "Dedektif",      category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_dedektif },
  { key: "av_gece",      label: "Gece Dedektifi", category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_gece },
  { key: "av_komiser",   label: "Komiser",        category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_komiser },
  { key: "av_genckadin", label: "Genç Dedektif",  category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_genckadin },
  { key: "av_fbi",       label: "FBI Ajanı",      category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_fbi },
  { key: "av_sert",      label: "Sert Adam",      category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_sert },

  // ── Görevliler ─────────────────────────────────────
  { key: "av_polis",     label: "Polis Memuru",   category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_polis },
  { key: "av_memur",     label: "Memur",          category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_memur },
  { key: "av_trafik",    label: "Trafik Polisi",  category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_trafik },
  { key: "av_denizci",   label: "Denizci",        category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_denizci },

  // ── Ajanlar ────────────────────────────────────────
  { key: "av_ajan",      label: "Gizli Ajan",     category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_ajan },
  { key: "av_operator",  label: "Operatör",       category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_operator },
  { key: "av_muhabir",   label: "Muhabir",        category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_muhabir },
  { key: "av_sokak",     label: "Sokak Ajan",     category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_sokak },

  // ── Uzmanlar ───────────────────────────────────────
  { key: "av_uzman",     label: "Uzman",          category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_uzman },
  { key: "av_katip",     label: "Kâtip",          category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_katip },
  { key: "av_pipo",      label: "Komisyon Üyesi", category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_pipo },
  { key: "av_golge",     label: "Gölge",          category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_golge },
  { key: "av_asil",      label: "Asil Hanım",     category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_asil },
];

export function getAvatarPreset(key: string): AvatarPreset {
  return PRESET_AVATARS.find((p) => p.key === key) ?? PRESET_AVATARS[0];
}

function isPlayerAvatar(key: string): boolean {
  return key.startsWith("av_");
}

interface AvatarDisplayProps {
  avatar: string;
  size: number;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
}

export function AvatarDisplay({ avatar, size, borderRadius }: AvatarDisplayProps) {
  const [galleryFailed, setGalleryFailed] = useState(false);
  const radius = borderRadius ?? size / 2;

  useEffect(() => {
    setGalleryFailed(false);
  }, [avatar]);

  if (avatar.startsWith("gallery:") && !galleryFailed) {
    const uri = avatar.slice("gallery:".length);
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
        onError={() => setGalleryFailed(true)}
      />
    );
  }

  if (isPlayerAvatar(avatar) || avatar.startsWith("av_")) {
    const preset = getAvatarPreset(avatar);
    return (
      <Image
        source={preset.image}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
      />
    );
  }

  const preset = getAvatarPreset(avatar.startsWith("gallery:") ? "" : avatar);

  if (preset.image) {
    return (
      <Image
        source={preset.image}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: preset.bg ?? "#1A2448",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ fontSize: size * 0.56, lineHeight: size * 0.72 }}
        numberOfLines={1}
      >
        {preset.emoji ?? "🕵️"}
      </Text>
    </View>
  );
}
