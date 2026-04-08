import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  interpolateColor,
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
  mistakes: number;
  maxMistakes: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function MistakeDot({
  isActive,
  justActivated,
}: {
  isActive: boolean;
  justActivated: boolean;
}) {
  const colors = useColors();
  const prevActiveRef = useRef(isActive);
  const flashProgress = useSharedValue(0);
  const scaleV = useSharedValue(1);

  useEffect(() => {
    if (justActivated && !prevActiveRef.current) {
      flashProgress.value = 0;
      flashProgress.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 450 }),
      );
      scaleV.value = withSequence(
        withSpring(1.6, { damping: 7, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
    }
    prevActiveRef.current = isActive;
  }, [justActivated, isActive]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleV.value }],
    backgroundColor: isActive
      ? interpolateColor(flashProgress.value, [0, 1], [colors.accent, "#FF3333"])
      : colors.border,
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

export default function TimerDisplay({ seconds, mistakes, maxMistakes }: Props) {
  const colors = useColors();
  const translateX = useSharedValue(0);
  const timerScale = useSharedValue(1);
  const prevMistakesRef = useRef(mistakes);

  const isCritical = seconds > 0 && seconds <= 30;

  useEffect(() => {
    if (mistakes > prevMistakesRef.current) {
      translateX.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-9, { duration: 50 }),
        withTiming(9, { duration: 50 }),
        withTiming(-5, { duration: 40 }),
        withTiming(5, { duration: 40 }),
        withTiming(0, { duration: 30 }),
      );
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
    prevMistakesRef.current = mistakes;
  }, [mistakes]);

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

  const timerItemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }],
  }));

  const timerColor = isCritical ? "#FF3333" : colors.primary;
  const timerTextColor = isCritical ? "#FF3333" : colors.foreground;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: isCritical ? "#FF333355" : colors.border },
        shakeStyle,
      ]}
    >
      <Animated.View style={[styles.item, timerItemStyle]}>
        <MaterialIcons name="timer" size={18} color={timerColor} />
        <Text style={[styles.value, { color: timerTextColor }]}>
          {formatTime(seconds)}
        </Text>
      </Animated.View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.item}>
        <MaterialIcons name="error-outline" size={18} color={colors.accent} />
        <View style={styles.mistakesDots}>
          {Array.from({ length: maxMistakes }).map((_, i) => (
            <MistakeDot
              key={i}
              isActive={i < mistakes}
              justActivated={i === mistakes - 1}
            />
          ))}
        </View>
      </View>
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
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
