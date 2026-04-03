import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { Puzzle } from "@/data/puzzles";

interface Props {
  puzzle: Puzzle;
  success: boolean;
  score: number;
  timeSeconds: number;
  mistakes: number;
  onPlayMore: () => void;
  onClose: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function ResultScreen({
  puzzle,
  success,
  score,
  timeSeconds,
  mistakes,
  onPlayMore,
  onClose,
}: Props) {
  const colors = useColors();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 400 });
    if (Platform.OS !== "web") {
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const solution = puzzle.solution;
  const suspect = puzzle.suspects.find((s) => s.id === solution.suspectId);
  const weapon = puzzle.weapons.find((w) => w.id === solution.weaponId);
  const location = puzzle.locations.find((l) => l.id === solution.locationId);

  return (
    <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.92)" }]}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: colors.card, borderColor: success ? colors.primary : colors.accent },
          containerStyle,
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: success ? `${colors.primary}22` : `${colors.accent}22`,
            },
          ]}
        >
          <MaterialIcons
            name={success ? "emoji-events" : "psychology-alt"}
            size={48}
            color={success ? colors.primary : colors.accent}
          />
        </View>

        <Text style={[styles.resultTitle, { color: success ? colors.primary : colors.accent }]}>
          {success ? "DAVA ÇÖZÜLDÜ!" : "DAVA KAPANDI"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {success
            ? "Harika dedektiflik çalışması!"
            : "İpuçları yetmedi, katil kaçtı."}
        </Text>

        <View style={[styles.solutionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.solutionTitle, { color: colors.mutedForeground }]}>ÇÖZÜM</Text>
          <View style={styles.solutionRow}>
            <MaterialIcons name="person" size={16} color={colors.primary} />
            <Text style={[styles.solutionText, { color: colors.foreground }]}>
              {suspect?.name ?? "-"}
            </Text>
          </View>
          <View style={styles.solutionRow}>
            <MaterialIcons name="gps-not-fixed" size={16} color={colors.primary} />
            <Text style={[styles.solutionText, { color: colors.foreground }]}>
              {weapon?.name ?? "-"}
            </Text>
          </View>
          <View style={styles.solutionRow}>
            <MaterialIcons name="location-on" size={16} color={colors.primary} />
            <Text style={[styles.solutionText, { color: colors.foreground }]}>
              {location?.name ?? "-"}
            </Text>
          </View>
        </View>

        {success && (
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{score}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>PUAN</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatTime(timeSeconds)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>SÜRE</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: mistakes > 0 ? colors.accent : colors.success }]}>
                {mistakes}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>HATA</Text>
            </View>
          </View>
        )}

        <View style={styles.buttons}>
          <Pressable
            onPress={onPlayMore}
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="play-arrow" size={20} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
              Başka Bulmaca
            </Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={[styles.btnOutline, { borderColor: colors.border }]}
          >
            <Text style={[styles.btnOutlineText, { color: colors.mutedForeground }]}>
              Ana Sayfa
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 100,
  },
  container: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  solutionBox: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  solutionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 4,
  },
  solutionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  solutionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  statItem: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 2,
  },
  buttons: {
    width: "100%",
    gap: 10,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  btnOutline: {
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
