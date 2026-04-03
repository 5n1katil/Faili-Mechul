import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  seconds: number;
  mistakes: number;
  maxMistakes: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TimerDisplay({ seconds, mistakes, maxMistakes }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.item}>
        <MaterialIcons name="timer" size={18} color={colors.primary} />
        <Text style={[styles.value, { color: colors.foreground }]}>
          {formatTime(seconds)}
        </Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.item}>
        <MaterialIcons name="error-outline" size={18} color={colors.accent} />
        <View style={styles.mistakesDots}>
          {Array.from({ length: maxMistakes }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < mistakes ? colors.accent : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  divider: {
    width: 1,
    height: 24,
  },
  mistakesDots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
