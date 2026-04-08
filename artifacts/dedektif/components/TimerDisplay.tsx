import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

interface Props {
  seconds: number;
  wrongGuesses: number;
  penaltySeconds: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function penaltyForGuess(n: number): number {
  return 30 * Math.pow(2, n - 1);
}

export default function TimerDisplay({ seconds, wrongGuesses, penaltySeconds }: Props) {
  const colors = useColors();
  const translateX = useSharedValue(0);
  const timerScale = useSharedValue(1);
  const penaltyScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const prevWrongRef = useRef(wrongGuesses);

  const isCritical = seconds > 0 && seconds <= 60;

  useEffect(() => {
    if (wrongGuesses > prevWrongRef.current) {
      translateX.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-9, { duration: 50 }),
        withTiming(9, { duration: 50 }),
        withTiming(-5, { duration: 40 }),
        withTiming(5, { duration: 40 }),
        withTiming(0, { duration: 30 }),
      );
      penaltyScale.value = withSequence(
        withSpring(1.4, { damping: 7, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 60 }),
        withTiming(0.7, { duration: 60 }),
        withTiming(0, { duration: 180 }),
      );
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
    prevWrongRef.current = wrongGuesses;
  }, [wrongGuesses]);

  useEffect(() => {
    if (isCritical) {
      timerScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 480 }),
          withTiming(1, { duration: 480 }),
        ),
        -1,
        false,
      );
    } else {
      timerScale.value = withTiming(1, { duration: 200 });
    }
  }, [isCritical]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const timerItemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }],
  }));

  const penaltyItemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: penaltyScale.value }],
  }));

  const timerColor = isCritical ? "#FF3333" : colors.primary;
  const timerTextColor = isCritical ? "#FF3333" : colors.foreground;

  const penaltyBadges = Array.from({ length: wrongGuesses }, (_, i) => ({
    n: i + 1,
    secs: penaltyForGuess(i + 1),
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: isCritical ? "#FF333355" : colors.border },
        shakeStyle,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, flashStyle]}
      />
      <Animated.View style={[styles.item, timerItemStyle]}>
        <MaterialIcons name="timer" size={18} color={timerColor} />
        <Text style={[styles.value, { color: timerTextColor }]}>
          {formatTime(seconds)}
        </Text>
      </Animated.View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Animated.View style={[styles.penaltySection, penaltyItemStyle]}>
        {penaltyBadges.length === 0 ? (
          <View style={styles.item}>
            <MaterialIcons name="gavel" size={16} color={colors.mutedForeground} />
            <Text style={[styles.wrongValue, { color: colors.mutedForeground }]}>0</Text>
          </View>
        ) : (
          penaltyBadges.map((badge) => (
            <View
              key={badge.n}
              style={[styles.badge, { backgroundColor: "#f9731622" }]}
            >
              <Text style={styles.badgeEmoji}>⚡</Text>
              <Text style={styles.badgeLabel}>×{badge.n}</Text>
              <Text style={styles.badgeSecs}>+{badge.secs}s</Text>
            </View>
          ))
        )}
      </Animated.View>
    </Animated.View>
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
    gap: 12,
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
  wrongValue: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  penaltySection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f97316",
  },
  badgeSecs: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f9731699",
  },
  divider: {
    width: 1,
    height: 24,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FF0000",
    borderRadius: 10,
    zIndex: 1,
  },
});
