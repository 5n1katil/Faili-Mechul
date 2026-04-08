import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import type { Puzzle, GridMark } from "@/data/puzzles";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface Props {
  puzzle: Puzzle;
  success: boolean;
  score: number;
  timeSeconds: number;
  mistakes: number;
  gridState: { [key: string]: GridMark };
  onPlayMore: () => void;
  onClose: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function markToEmoji(mark: GridMark): string {
  if (mark === "check") return "🟩";
  if (mark === "cross") return "🟥";
  if (mark === "question") return "🟨";
  return "⬛";
}

function buildShareText(
  puzzle: Puzzle,
  success: boolean,
  score: number,
  timeSeconds: number,
  mistakes: number,
  gridState: { [key: string]: GridMark }
): string {
  const lines: string[] = [];

  lines.push(`Faili Meçhul #${puzzle.dayIndex} ${success ? "✅" : "❌"}`);

  if (success) {
    lines.push(`⏱ ${formatTime(timeSeconds)} | ⭐ ${score} puan | ❌ ${mistakes} hata`);
  } else {
    lines.push("Bugün çözemedim...");
  }

  lines.push("");

  if (success) {
    const weaponRows = puzzle.weapons.map((w) => {
      const suspectCells = puzzle.suspects
        .map((s) => markToEmoji(gridState[`${w.id}_${s.id}`] ?? "none"))
        .join("");
      const locationCells = puzzle.locations
        .map((l) => markToEmoji(gridState[`${w.id}_${l.id}`] ?? "none"))
        .join("");
      return `${suspectCells}  ${locationCells}`;
    });

    const locationRows = puzzle.locations.map((loc) => {
      return puzzle.suspects
        .map((s) => markToEmoji(gridState[`${loc.id}_${s.id}`] ?? "none"))
        .join("");
    });

    for (const row of weaponRows) lines.push(row);
    lines.push("");
    for (const row of locationRows) lines.push(row);

    lines.push("");
  }

  if (success) {
    const sol = puzzle.solution;
    const suspect = puzzle.suspects.find((s) => s.id === sol.suspectId);
    const weapon = puzzle.weapons.find((w) => w.id === sol.weaponId);
    const location = puzzle.locations.find((l) => l.id === sol.locationId);
    lines.push(
      `👤 ${suspect?.name ?? "?"} | 🔪 ${weapon?.name ?? "?"} | 📍 ${location?.name ?? "?"}`
    );
  } else {
    lines.push("👤 ??? | 🔪 ??? | 📍 ???");
  }

  lines.push("");
  lines.push("failimechul.app 🕵️");

  return lines.join("\n");
}

const CONFETTI_COLORS = [
  "#D4A843",
  "#A855F7",
  "#4ade80",
  "#f87171",
  "#60a5fa",
  "#fb923c",
];

interface ParticleData {
  id: number;
  color: string;
  x: number;
  w: number;
  h: number;
  delay: number;
  driftX: number;
  rotation: number;
  duration: number;
}

function ConfettiParticle({ x, w, h, color, delay, driftX, rotation, duration }: ParticleData) {
  const { height: SCREEN_H } = Dimensions.get("window");
  const ty = useSharedValue(-20);
  const tx = useSharedValue(0);
  const rot = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 100 }));
    ty.value = withDelay(delay, withTiming(SCREEN_H + 60, { duration }));
    tx.value = withDelay(delay, withTiming(driftX, { duration }));
    rot.value = withDelay(delay, withTiming(rotation, { duration }));
    op.value = withDelay(
      delay + duration * 0.65,
      withTiming(0, { duration: duration * 0.35 })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: ty.value },
      { translateX: tx.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: op.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x,
          top: 0,
          width: w,
          height: h,
          backgroundColor: color,
          borderRadius: 2,
        },
        animStyle,
      ]}
    />
  );
}

function Confetti() {
  const { width: SCREEN_W } = Dimensions.get("window");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(id);
  }, []);

  const particles = useMemo<ParticleData[]>(() => {
    const out: ParticleData[] = [];
    for (let i = 0; i < 42; i++) {
      const duration = 1600 + Math.random() * 900;
      out.push({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: Math.random() * SCREEN_W,
        w: 5 + Math.random() * 7,
        h: 9 + Math.random() * 9,
        delay: Math.random() * 500,
        driftX: (Math.random() - 0.5) * 70,
        rotation: Math.random() * 540 - 270,
        duration,
      });
    }
    return out;
  }, []);

  if (!visible) return null;

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      {particles.map((p) => (
        <ConfettiParticle key={p.id} {...p} />
      ))}
    </View>
  );
}

function AnimatedScore({ score }: { score: number }) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const derivedScore = useDerivedValue(() =>
    Math.round(score * progress.value)
  );

  const animatedProps = useAnimatedProps(() => {
    const val = `${derivedScore.value}`;
    return { value: val, defaultValue: val };
  });

  return (
    <AnimatedTextInput
      animatedProps={animatedProps}
      editable={false}
      style={[styles.statValue, { color: colors.primary }]}
    />
  );
}

export default function ResultScreen({
  puzzle,
  success,
  score,
  timeSeconds,
  mistakes,
  gridState,
  onPlayMore,
  onClose,
}: Props) {
  const colors = useColors();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 350 });
    iconScale.value = withDelay(
      200,
      withSequence(
        withSpring(1.25, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 10 })
      )
    );
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

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const solution = puzzle.solution;
  const suspect = puzzle.suspects.find((s) => s.id === solution.suspectId);
  const weapon = puzzle.weapons.find((w) => w.id === solution.weaponId);
  const location = puzzle.locations.find((l) => l.id === solution.locationId);

  const handleShare = async () => {
    const text = buildShareText(puzzle, success, score, timeSeconds, mistakes, gridState);
    if (Platform.OS !== "web") {
      try {
        await Share.share({ message: text });
      } catch {
        // fallback to clipboard if Share fails
        await Clipboard.setStringAsync(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } else {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.92)" }]}>
      {success && <Confetti />}
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: success ? colors.primary : colors.accent,
          },
          containerStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.iconCircle,
            {
              backgroundColor: success
                ? `${colors.primary}22`
                : `${colors.accent}22`,
            },
            iconStyle,
          ]}
        >
          <MaterialIcons
            name={success ? "emoji-events" : "psychology-alt"}
            size={48}
            color={success ? colors.primary : colors.accent}
          />
        </Animated.View>

        <Text
          style={[
            styles.resultTitle,
            { color: success ? colors.primary : colors.accent },
          ]}
        >
          {success ? "DAVA ÇÖZÜLDÜ!" : "DAVA KAPANDI"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {success
            ? "Harika dedektiflik çalışması!"
            : "İpuçları yetmedi, katil kaçtı."}
        </Text>

        <View
          style={[
            styles.solutionBox,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.solutionTitle, { color: colors.mutedForeground }]}
          >
            ÇÖZÜM
          </Text>
          <View style={styles.solutionRow}>
            <MaterialIcons name="person" size={16} color={colors.primary} />
            <Text style={[styles.solutionText, { color: colors.foreground }]}>
              {suspect?.name ?? "-"}
            </Text>
          </View>
          <View style={styles.solutionRow}>
            <MaterialIcons
              name="gps-not-fixed"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.solutionText, { color: colors.foreground }]}>
              {weapon?.name ?? "-"}
            </Text>
          </View>
          <View style={styles.solutionRow}>
            <MaterialIcons
              name="location-on"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.solutionText, { color: colors.foreground }]}>
              {location?.name ?? "-"}
            </Text>
          </View>
        </View>

        {success && (
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <AnimatedScore score={score} />
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                PUAN
              </Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatTime(timeSeconds)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                SÜRE
              </Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      mistakes > 0 ? colors.accent : colors.success,
                  },
                ]}
              >
                {mistakes}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                HATA
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttons}>
          <Pressable
            onPress={handleShare}
            style={[
              styles.shareBtn,
              {
                backgroundColor: copied ? `${colors.success}22` : `${colors.primary}18`,
                borderColor: copied ? colors.success : colors.primary,
              },
            ]}
          >
            <MaterialIcons
              name={copied ? "check" : "share"}
              size={18}
              color={copied ? colors.success : colors.primary}
            />
            <Text style={[styles.shareBtnText, { color: copied ? colors.success : colors.primary }]}>
              {copied ? "Panoya Kopyalandı!" : "Sonucu Paylaş"}
            </Text>
          </Pressable>

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
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
    width: "100%",
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "700",
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
