import React from "react";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { Clue } from "@/data/puzzles";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

interface Props {
  clue: Clue;
  index: number;
  isRevealed: boolean;
  onReveal?: () => void;
}

const CLUE_META: Record<
  Clue["type"],
  {
    icon: MaterialIconName;
    color: string;
    label: string;
    cardTint: string;
    borderStyle: "solid" | "dashed" | "dotted";
  }
> = {
  direct: {
    icon: "search",
    color: "#D4A843",
    label: "Doğrudan",
    cardTint: "#D4A84308",
    borderStyle: "solid",
  },
  indirect: {
    icon: "lightbulb-outline",
    color: "#f59e0b",
    label: "Dolaylı",
    cardTint: "#f59e0b08",
    borderStyle: "solid",
  },
  elimination: {
    icon: "block",
    color: "#C8372D",
    label: "Eleme",
    cardTint: "#C8372D0D",
    borderStyle: "solid",
  },
  evidence: {
    icon: "fingerprint",
    color: "#9333ea",
    label: "Kanıt",
    cardTint: "#9333ea14",
    borderStyle: "dashed",
  },
  witness: {
    icon: "record-voice-over",
    color: "#3b82f6",
    label: "Tanık",
    cardTint: "#3b82f610",
    borderStyle: "solid",
  },
  forensic: {
    icon: "biotech",
    color: "#14b8a6",
    label: "Adli",
    cardTint: "#14b8a610",
    borderStyle: "dotted",
  },
};

export default function ClueCard({ clue, index, isRevealed, onReveal }: Props) {
  const colors = useColors();
  const opacity = useSharedValue(isRevealed ? 1 : 0.4);
  const translateY = useSharedValue(isRevealed ? 0 : 4);

  React.useEffect(() => {
    opacity.value = withSpring(isRevealed ? 1 : 0.4);
    translateY.value = withSpring(isRevealed ? 0 : 4);
  }, [isRevealed]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const meta = CLUE_META[clue.type] ?? CLUE_META.direct;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isRevealed ? meta.cardTint : colors.card,
            borderColor: isRevealed ? meta.color : colors.border,
            borderWidth: isRevealed ? 1.5 : 1,
            borderStyle: isRevealed ? meta.borderStyle : "solid",
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: `${meta.color}22` }]}>
            <MaterialIcons name={meta.icon} size={14} color={meta.color} />
          </View>
          <Text style={[styles.clueLabel, { color: meta.color }]}>
            {meta.label}
          </Text>
          <Text style={[styles.clueNumber, { color: colors.mutedForeground }]}>
            İpucu {index + 1}
          </Text>
          {!isRevealed && onReveal && (
            <Pressable onPress={onReveal} style={[styles.revealBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.revealText, { color: colors.primaryForeground }]}>
                Göster
              </Text>
            </Pressable>
          )}
        </View>
        {isRevealed ? (
          <Text style={[styles.clueText, { color: colors.foreground }]}>{clue.text}</Text>
        ) : (
          <View style={[styles.hiddenClue, { backgroundColor: colors.muted }]}>
            <Text style={[styles.hiddenText, { color: colors.mutedForeground }]}>
              Bir sonraki ipucunu açmak için dokunun
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  card: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  clueLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  clueNumber: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  revealBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  revealText: {
    fontSize: 11,
    fontWeight: "700",
  },
  clueText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
  },
  hiddenClue: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  hiddenText: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
