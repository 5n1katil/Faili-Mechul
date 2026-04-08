import React from "react";
import type { ComponentProps } from "react";
import { Image, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

export const PRESET_AVATARS: { key: string; icon: MaterialIconName; label: string }[] = [
  { key: "detective",  icon: "person",          label: "Dedektif"      },
  { key: "magnifier",  icon: "search",           label: "Araştırmacı"   },
  { key: "sheriff",    icon: "local-police",     label: "Komiser"       },
  { key: "spy",        icon: "visibility",       label: "Ajan"          },
  { key: "judge",      icon: "gavel",            label: "Yargıç"        },
  { key: "scientist",  icon: "science",          label: "Bilim İnsanı"  },
  { key: "journalist", icon: "edit-note",        label: "Muhabir"       },
  { key: "ghost",      icon: "blur-on",          label: "Hayalet"       },
];

interface AvatarDisplayProps {
  avatar: string;
  size: number;
  color: string;
  backgroundColor?: string;
}

export function AvatarDisplay({ avatar, size, color, backgroundColor }: AvatarDisplayProps) {
  if (avatar.startsWith("gallery:")) {
    const uri = avatar.slice("gallery:".length);
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor ?? "transparent",
        }}
        resizeMode="cover"
      />
    );
  }

  const preset = PRESET_AVATARS.find((p) => p.key === avatar);
  const iconName: MaterialIconName = preset?.icon ?? "person";

  return (
    <View
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: backgroundColor ?? "transparent",
      }}
    >
      <MaterialIcons name={iconName} size={size * 0.58} color={color} />
    </View>
  );
}
