import React from "react";
import type { ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { Clue } from "@/data/puzzles";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

interface Props {
  clue: Clue;
  index: number;
  isRevealed: boolean;
  isBonus?: boolean;
  onRevealBonus?: () => void;
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

export default function ClueCard({ clue, index, isRevealed, isBonus, onRevealBonus }: Props) {
  const colors = useColors();
  const opacity = useSharedValue(isRevealed ? 1 : isBonus ? 0.9 : 0.4);
  const translateY = useSharedValue(isRevealed ? 0 : 4);

  React.useEffect(() => {
    opacity.value = withSpring(isRevealed ? 1 : isBonus ? 0.9 : 0.4);
    translateY.value = withSpring(isRevealed ? 0 : 4);
  }, [isRevealed, isBonus]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const meta = CLUE_META[clue.type] ?? CLUE_META.direct;

  const handleBonusReveal = () => {
    Alert.alert(
      "Ek İpucu",
      "Bu ipucunu açmak zaman sayacınıza +30 saniye ekler. Devam etmek istiyor musunuz?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Aç (+30 sn)",
          style: "destructive",
          onPress: () => onRevealBonus?.(),
        },
      ]
    );
  };

  if (isBonus && !isRevealed) {
    return (
      <Animated.View style={[styles.container, animStyle]}>
        <Pressable
          onPress={onRevealBonus ? handleBonusReveal : undefined}
          style={[
            styles.card,
            {
              backgroundColor: "#0D0D18",
              borderColor: "#D4A84344",
              borderWidth: 1,
              borderStyle: "dashed",
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: "#D4A84322" }]}>
              <MaterialIcons name="lock" size={14} color="#D4A843" />
            </View>
            <View style={[styles.bonusBadge, { backgroundColor: "#D4A84318", borderColor: "#D4A84355" }]}>
              <MaterialIcons name="star" size={10} color="#D4A843" />
              <Text style={styles.bonusBadgeText}>Ek İpucu</Text>
            </View>
            <Text style={[styles.clueNumber, { color: "#666" }]}>
              İpucu {index + 1}
            </Text>
          </View>
          <View style={styles.lockedBody}>
            <View style={styles.lockedLines}>
              <View style={[styles.lockedLine, { backgroundColor: "#1A1F2E", width: "80%" }]} />
              <View style={[styles.lockedLine, { backgroundColor: "#1A1F2E", width: "60%" }]} />
              <View style={[styles.lockedLine, { backgroundColor: "#1A1F2E", width: "70%" }]} />
            </View>
            {onRevealBonus && (
              <Pressable
                onPress={handleBonusReveal}
                style={[styles.unlockBtn, { backgroundColor: "#1A1F2E", borderColor: "#D4A84344" }]}
              >
                <MaterialIcons name="lock-open" size={14} color="#D4A843" />
                <Text style={[styles.unlockBtnText, { color: "#D4A843" }]}>Açmak için dokun</Text>
                <View style={[styles.penaltyTag, { backgroundColor: "#C8372D22", borderColor: "#C8372D44" }]}>
                  <MaterialIcons name="timer" size={10} color="#C8372D" />
                  <Text style={[styles.penaltyTagText, { color: "#C8372D" }]}>+30 sn</Text>
                </View>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

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
          {isBonus && isRevealed && (
            <View style={[styles.bonusBadge, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b44" }]}>
              <MaterialIcons name="star" size={10} color="#f59e0b" />
              <Text style={[styles.bonusBadgeText, { color: "#f59e0b" }]}>Ek İpucu</Text>
            </View>
          )}
          <Text style={[styles.clueNumber, { color: colors.mutedForeground }]}>
            İpucu {index + 1}
          </Text>
        </View>
        <Text style={[styles.clueText, { color: colors.foreground }]}>{clue.text}</Text>
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
  bonusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 3,
  },
  bonusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#D4A843",
    letterSpacing: 0.3,
  },
  clueNumber: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  clueText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
  },
  lockedBody: {
    gap: 10,
  },
  lockedLines: {
    gap: 6,
  },
  lockedLine: {
    height: 10,
    borderRadius: 5,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  unlockBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  penaltyTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 2,
    marginLeft: 4,
  },
  penaltyTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
