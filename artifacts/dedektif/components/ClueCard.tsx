import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { Clue } from "@/data/puzzles";

interface Props {
  clue: Clue;
  index: number;
  isRevealed: boolean;
  onReveal?: () => void;
}

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

  const getClueIcon = () => {
    switch (clue.type) {
      case "direct":
        return "search";
      case "indirect":
        return "lightbulb-outline";
      case "elimination":
        return "block";
    }
  };

  const getClueColor = () => {
    switch (clue.type) {
      case "direct":
        return colors.primary;
      case "indirect":
        return colors.warning;
      case "elimination":
        return colors.accent;
    }
  };

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isRevealed ? getClueColor() : colors.border,
            borderWidth: isRevealed ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: `${getClueColor()}22` }]}>
            <MaterialIcons name={getClueIcon() as any} size={14} color={getClueColor()} />
          </View>
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
    gap: 8,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  clueNumber: {
    fontSize: 12,
    fontWeight: "600",
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
