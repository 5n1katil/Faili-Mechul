import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

interface Props {
  seconds: number;
  wrongGuesses: number;
  penaltyCount: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TimerDisplay({ seconds, wrongGuesses, penaltyCount }: Props) {
  const colors = useColors();
  const translateX = useSharedValue(0);
  const timerScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const penaltyTextOpacity = useSharedValue(0);
  const penaltyTextScale = useSharedValue(0.6);
  const prevPenaltyRef = useRef(penaltyCount);

  useEffect(() => {
    if (penaltyCount > prevPenaltyRef.current) {
      translateX.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-9, { duration: 50 }),
        withTiming(9, { duration: 50 }),
        withTiming(-5, { duration: 40 }),
        withTiming(5, { duration: 40 }),
        withTiming(0, { duration: 30 }),
      );
      timerScale.value = withSequence(
        withSpring(1.15, { damping: 7, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
      flashOpacity.value = withSequence(
        withTiming(0.35, { duration: 60 }),
        withTiming(0, { duration: 60 }),
        withTiming(0.25, { duration: 60 }),
        withTiming(0, { duration: 200 }),
      );
      penaltyTextOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 400 }),
      );
      penaltyTextScale.value = withSequence(
        withSpring(1.1, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12 }),
        withTiming(0.6, { duration: 400 }),
      );
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
    prevPenaltyRef.current = penaltyCount;
  }, [penaltyCount]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const timerItemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }],
  }));

  const penaltyTextStyle = useAnimatedStyle(() => ({
    opacity: penaltyTextOpacity.value,
    transform: [{ scale: penaltyTextScale.value }],
  }));

  const penaltyColor = wrongGuesses > 0 ? "#C8372D" : colors.mutedForeground;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
        shakeStyle,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, flashStyle]}
      />

      <View style={styles.timerSection}>
        <Animated.View style={[styles.item, timerItemStyle]}>
          <MaterialIcons name="timer" size={16} color={colors.primary} />
          <Text testID="timer-value" style={[styles.timerValue, { color: colors.foreground }]}>
            {formatTime(seconds)}
          </Text>
        </Animated.View>
        <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>SÜRE</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.rightSection}>
        <View style={styles.penaltyInner}>
          <MaterialIcons name="gavel" size={16} color={penaltyColor} />
          <Text testID="hata-count" style={[styles.wrongValue, { color: penaltyColor }]}>
            {wrongGuesses}
          </Text>
        </View>
        <Text style={[styles.penaltyLabel, { color: penaltyColor }]}>HATA</Text>
        <Animated.View style={[styles.penaltyToast, penaltyTextStyle]}>
          <MaterialIcons name="add" size={10} color="#C8372D" />
          <Text style={styles.penaltyToastText}>30 sn</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    overflow: "hidden",
  },
  timerSection: {
    alignItems: "center",
    gap: 1,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerValue: {
    fontFamily: "DroidSerifRegular",
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    minWidth: 44,
  },
  timerLabel: {
    fontFamily: "DroidSerifRegular",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 28,
  },
  rightSection: {
    alignItems: "center",
    gap: 1,
  },
  penaltyInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  wrongValue: {
    fontFamily: "DroidSerifRegular",
    fontSize: 16,
    fontWeight: "700",
  },
  penaltyLabel: {
    fontFamily: "DroidSerifRegular",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  penaltyToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C8372D22",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 1,
    position: "absolute",
    top: -18,
    right: 0,
  },
  penaltyToastText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 10,
    fontWeight: "800",
    color: "#C8372D",
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FF0000",
    borderRadius: 12,
    zIndex: 1,
  },
});
