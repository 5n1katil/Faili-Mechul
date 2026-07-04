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
  av_dedektif:   require("../assets/images/player_avatars/av_dedektif.png"),
  av_gece:       require("../assets/images/player_avatars/av_gece.png"),
  av_komiser:    require("../assets/images/player_avatars/av_komiser.png"),
  av_genckadin:  require("../assets/images/player_avatars/av_genckadin.png"),
  av_fbi:        require("../assets/images/player_avatars/av_fbi.png"),
  av_sert:       require("../assets/images/player_avatars/av_sert.png"),
  av_polis:      require("../assets/images/player_avatars/av_polis.png"),
  av_memur:      require("../assets/images/player_avatars/av_memur.png"),
  av_trafik:     require("../assets/images/player_avatars/av_trafik.png"),
  av_denizci:    require("../assets/images/player_avatars/av_denizci.png"),
  av_ajan:       require("../assets/images/player_avatars/av_ajan.png"),
  av_operator:   require("../assets/images/player_avatars/av_operator.png"),
  av_muhabir:    require("../assets/images/player_avatars/av_muhabir.png"),
  av_sokak:      require("../assets/images/player_avatars/av_sokak.png"),
  av_uzman:      require("../assets/images/player_avatars/av_uzman.png"),
  av_katip:      require("../assets/images/player_avatars/av_katip.png"),
  av_pipo:       require("../assets/images/player_avatars/av_pipo.png"),
  av_golge:      require("../assets/images/player_avatars/av_golge.png"),
  av_asil:       require("../assets/images/player_avatars/av_asil.png"),
  av_hacker:     require("../assets/images/player_avatars/av_hacker.png"),
  av_sheriff:    require("../assets/images/player_avatars/av_sheriff.png"),
  av_yargi:      require("../assets/images/player_avatars/av_yargi.png"),
  av_doktor:     require("../assets/images/player_avatars/av_doktor.png"),
  av_foto:       require("../assets/images/player_avatars/av_foto.png"),
  av_adli:       require("../assets/images/player_avatars/av_adli.png"),
  av_professore: require("../assets/images/player_avatars/av_professore.png"),
  av_yonetici:   require("../assets/images/player_avatars/av_yonetici.png"),
  av_analist:    require("../assets/images/player_avatars/av_analist.png"),
  av_supheji:    require("../assets/images/player_avatars/av_supheji.png"),
  av_yazar:      require("../assets/images/player_avatars/av_yazar.png"),
  av_diva:       require("../assets/images/player_avatars/av_diva.png"),
  av_patron:     require("../assets/images/player_avatars/av_patron.png"),
  av_kedi:       require("../assets/images/player_avatars/av_kedi.png"),
  av_basin:      require("../assets/images/player_avatars/av_basin.png"),
  av_barista:    require("../assets/images/player_avatars/av_barista.png"),
  av_kasket:     require("../assets/images/player_avatars/av_kasket.png"),
  av_mor:        require("../assets/images/player_avatars/av_mor.png"),
  av_elit:       require("../assets/images/player_avatars/av_elit.png"),
  av_gorevli:    require("../assets/images/player_avatars/av_gorevli.png"),
  av_kizil:      require("../assets/images/player_avatars/av_kizil.png"),
  av_kartal:     require("../assets/images/player_avatars/av_kartal.png"),
  av_fedora:     require("../assets/images/player_avatars/av_fedora.png"),
  av_esarp:      require("../assets/images/player_avatars/av_esarp.png"),
  av_buyukanne:  require("../assets/images/player_avatars/av_buyukanne.png"),
  av_albay:      require("../assets/images/player_avatars/av_albay.png"),
  av_bogazli:    require("../assets/images/player_avatars/av_bogazli.png"),
  av_silindir:   require("../assets/images/player_avatars/av_silindir.png"),
  av_mufekkir:   require("../assets/images/player_avatars/av_mufekkir.png"),
  av_bob:        require("../assets/images/player_avatars/av_bob.png"),
  av_siyahsapka: require("../assets/images/player_avatars/av_siyahsapka.png"),
};

export const PRESET_AVATARS: AvatarPreset[] = [
  // ── Dedektifler ────────────────────────────────────
  { key: "av_dedektif",  label: "Dedektif",       category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_dedektif },
  { key: "av_gece",      label: "Gece Dedektifi", category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_gece },
  { key: "av_komiser",   label: "Komiser",        category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_komiser },
  { key: "av_genckadin", label: "Genç Dedektif",  category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_genckadin },
  { key: "av_fbi",       label: "FBI Ajanı",      category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_fbi },
  { key: "av_sert",      label: "Sert Adam",      category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_sert },
  { key: "av_sheriff",   label: "Şerif",          category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_sheriff },
  { key: "av_foto",      label: "Fotoğrafçı",     category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_foto },
  { key: "av_basin",     label: "Basın",          category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_basin },
  { key: "av_kasket",    label: "Hafiye",         category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_kasket },
  { key: "av_mufekkir",  label: "Müfettiş",       category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_mufekkir },
  { key: "av_silindir",  label: "Silindirli Bay",  category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_silindir },
  { key: "av_fedora",    label: "Karanlık",        category: "dedektif", image: PLAYER_AVATAR_IMAGES.av_fedora },

  // ── Görevliler ─────────────────────────────────────
  { key: "av_polis",     label: "Polis Memuru",   category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_polis },
  { key: "av_memur",     label: "Memur",          category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_memur },
  { key: "av_trafik",    label: "Trafik Polisi",  category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_trafik },
  { key: "av_denizci",   label: "Denizci",        category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_denizci },
  { key: "av_yargi",     label: "Yargıç",         category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_yargi },
  { key: "av_gorevli",   label: "Baş Görevli",    category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_gorevli },
  { key: "av_patron",    label: "Patron",         category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_patron },
  { key: "av_yonetici",  label: "Yönetici",       category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_yonetici },
  { key: "av_barista",   label: "Barmen",         category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_barista },
  { key: "av_albay",    label: "Albay",          category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_albay },
  { key: "av_bogazli",  label: "Güvenlik",       category: "gorevli",  image: PLAYER_AVATAR_IMAGES.av_bogazli },

  // ── Ajanlar ────────────────────────────────────────
  { key: "av_ajan",      label: "Gizli Ajan",     category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_ajan },
  { key: "av_operator",  label: "Operatör",       category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_operator },
  { key: "av_muhabir",   label: "Muhabir",        category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_muhabir },
  { key: "av_sokak",     label: "Sokak Ajan",     category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_sokak },
  { key: "av_hacker",    label: "Hacker",         category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_hacker },
  { key: "av_kedi",      label: "Kedi Kadın",     category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_kedi },
  { key: "av_mor",       label: "Gece Ajan",      category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_mor },
  { key: "av_elit",      label: "Elit Ajan",      category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_elit },
  { key: "av_supheji",   label: "Şüpheli",        category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_supheji },
  { key: "av_analist",   label: "Analist",        category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_analist },
  { key: "av_kizil",    label: "Kızıl Adam",     category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_kizil },
  { key: "av_kartal",   label: "Kartal",         category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_kartal },
  { key: "av_bob",      label: "Bob Saç",        category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_bob },
  { key: "av_siyahsapka", label: "Siyah Şapka",  category: "ajan",     image: PLAYER_AVATAR_IMAGES.av_siyahsapka },

  // ── Uzmanlar ───────────────────────────────────────
  { key: "av_uzman",     label: "Uzman",          category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_uzman },
  { key: "av_katip",     label: "Kâtip",          category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_katip },
  { key: "av_pipo",      label: "Komisyon Üyesi", category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_pipo },
  { key: "av_golge",     label: "Gölge",          category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_golge },
  { key: "av_asil",      label: "Asil Hanım",     category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_asil },
  { key: "av_doktor",    label: "Doktor",         category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_doktor },
  { key: "av_adli",      label: "Adli Tıp",       category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_adli },
  { key: "av_professore",label: "Profesör",       category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_professore },
  { key: "av_yazar",     label: "Yazar",          category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_yazar },
  { key: "av_diva",      label: "Diva",           category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_diva },
  { key: "av_esarp",     label: "Atkılı Uzman",   category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_esarp },
  { key: "av_buyukanne", label: "Büyük Hanım",    category: "uzman",    image: PLAYER_AVATAR_IMAGES.av_buyukanne },
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
