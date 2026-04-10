import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import type { Puzzle, GridMark } from "@/data/puzzles";
import ScoreInfoSheet from "@/components/ScoreInfoSheet";


interface Props {
  puzzle: Puzzle;
  success: boolean;
  score: number;
  timeSeconds: number;
  wrongGuesses: number;
  bonusCluesRevealedCount: number;
  gridState: { [key: string]: GridMark };
  finalRank: number;
  totalPlayers: number;
  currentStreak: number;
  isRanked: boolean;
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
  wrongGuesses: number,
  bonusCluesRevealedCount: number,
  gridState: { [key: string]: GridMark }
): string {
  const lines: string[] = [];
  lines.push(`Faili Meçhul #${puzzle.dayIndex} ${success ? "✅" : "❌"}`);
  if (success) {
    const bonusStr = bonusCluesRevealedCount > 0 ? ` | 🔓 ${bonusCluesRevealedCount} ek ipucu` : "";
    lines.push(`⏱ ${formatTime(timeSeconds)} | ⭐ ${score} puan | ❌ ${wrongGuesses} hata${bonusStr}`);
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
    const locationRows = puzzle.locations.map((loc) =>
      puzzle.suspects
        .map((s) => markToEmoji(gridState[`${loc.id}_${s.id}`] ?? "none"))
        .join("")
    );
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
    lines.push(`👤 ${suspect?.name ?? "?"} | 🔪 ${weapon?.name ?? "?"} | 📍 ${location?.name ?? "?"}`);
  } else {
    lines.push("👤 ??? | 🔪 ??? | 📍 ???");
  }
  lines.push("");
  lines.push("failimechul.app 🕵️");
  return lines.join("\n");
}

const CONFETTI_COLORS = ["#D4A843", "#A855F7", "#4ade80", "#f87171", "#60a5fa", "#fb923c"];

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
    op.value = withDelay(delay + duration * 0.65, withTiming(0, { duration: duration * 0.35 }));
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
      style={[{ position: "absolute", left: x, top: 0, width: w, height: h, backgroundColor: color, borderRadius: 2 }, animStyle]}
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
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} {...p} />
      ))}
    </View>
  );
}

function AnimatedScore({ score }: { score: number }) {
  const colors = useColors();
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 1200;
    let raf: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <Text style={[styles.statValue, { color: colors.primary }]}>
      {displayed.toLocaleString("tr-TR")}
    </Text>
  );
}

function ScoreBreakdownCard({
  timeSeconds,
  wrongGuesses,
  bonusCluesRevealedCount,
  difficulty,
  currentStreak,
  finalScore,
  onShowInfo,
}: {
  timeSeconds: number;
  wrongGuesses: number;
  bonusCluesRevealedCount: number;
  difficulty: string;
  currentStreak: number;
  finalScore: number;
  onShowInfo: () => void;
}) {
  const colors = useColors();
  const timePenalty = timeSeconds * 5;
  const wrongPenalty = wrongGuesses * 150;
  const bonusPenalty = bonusCluesRevealedCount * 150;
  let difficultyBonus = 0;
  if (difficulty === "dedektif") difficultyBonus = 2000;
  if (difficulty === "baskomiser") difficultyBonus = 5000;
  const streakBonus = Math.min(currentStreak * 50, 500);

  const rows = [
    { label: "Baz Puan", value: "+10.000", color: colors.primary, icon: "stars" as const },
    { label: `Süre (${formatTime(timeSeconds)} × 5)`, value: `-${timePenalty.toLocaleString("tr-TR")}`, color: "#C8372D", icon: "timer" as const },
    ...(wrongGuesses > 0
      ? [{ label: `Yanlış (${wrongGuesses} × 150)`, value: `-${wrongPenalty.toLocaleString("tr-TR")}`, color: "#C8372D", icon: "gavel" as const }]
      : []),
    ...(bonusCluesRevealedCount > 0
      ? [{ label: `Ek İpucu (${bonusCluesRevealedCount} × 150)`, value: `-${bonusPenalty.toLocaleString("tr-TR")}`, color: "#f97316", icon: "lock-open" as const }]
      : []),
    ...(difficultyBonus > 0
      ? [{ label: "Zorluk Bonusu", value: `+${difficultyBonus.toLocaleString("tr-TR")}`, color: "#4ade80", icon: "upgrade" as const }]
      : []),
    ...(streakBonus > 0
      ? [{ label: `Seri Bonusu (${currentStreak} gün × 50)`, value: `+${streakBonus.toLocaleString("tr-TR")}`, color: "#FF6B35", icon: "local-fire-department" as const }]
      : []),
  ];

  return (
    <View style={[styles.breakdownCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.breakdownHeader}>
        <Text style={[styles.breakdownTitle, { color: colors.mutedForeground }]}>PUAN DETAYI</Text>
        <Pressable onPress={onShowInfo} hitSlop={10} style={[styles.infoBtn, { borderColor: `${colors.mutedForeground}44` }]}>
          <MaterialIcons name="help-outline" size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>
      {rows.map((row, i) => (
        <View key={i} style={styles.breakdownRow}>
          <MaterialIcons name={row.icon} size={13} color={row.color} />
          <Text style={[styles.breakdownLabel, { color: colors.foreground }]}>{row.label}</Text>
          <Text style={[styles.breakdownValue, { color: row.color }]}>{row.value}</Text>
        </View>
      ))}
      <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
      <View style={styles.breakdownRow}>
        <MaterialIcons name="emoji-events" size={14} color={colors.primary} />
        <Text style={[styles.breakdownLabel, { color: colors.primary, fontWeight: "700" }]}>Toplam</Text>
        <Text style={[styles.breakdownValue, { color: colors.primary, fontWeight: "800" }]}>{finalScore.toLocaleString("tr-TR")}</Text>
      </View>
    </View>
  );
}

function RankCard({
  finalRank,
  totalPlayers,
}: {
  finalRank: number;
  totalPlayers: number;
}) {
  const colors = useColors();
  const rankLabel =
    finalRank === 1 ? "🥇 Birinci!" : finalRank === 2 ? "🥈 İkinci" : finalRank === 3 ? "🥉 Üçüncü" : `#${finalRank}`;
  const isTop3 = finalRank <= 3;

  return (
    <View style={[styles.rankCard, { backgroundColor: colors.background, borderColor: isTop3 ? colors.primary : colors.border }]}>
      <MaterialIcons name="leaderboard" size={14} color={isTop3 ? colors.primary : colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rankLabel, { color: isTop3 ? colors.primary : colors.foreground }]}>
          {rankLabel}
        </Text>
        <Text style={[styles.rankSub, { color: colors.mutedForeground }]}>
          {totalPlayers} oyuncu arasında
        </Text>
      </View>
    </View>
  );
}

export default function ResultScreen({
  puzzle,
  success,
  score,
  timeSeconds,
  wrongGuesses,
  bonusCluesRevealedCount,
  gridState,
  finalRank,
  totalPlayers,
  currentStreak,
  isRanked,
  onPlayMore,
  onClose,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const [copied, setCopied] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

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

    if (success && isRanked && Platform.OS !== "web") {
      void (async () => {
        try {
          const [alreadyRequested, rawCount] = await Promise.all([
            AsyncStorage.getItem("review_requested_v1"),
            AsyncStorage.getItem("ranked_completions_v1"),
          ]);
          if (alreadyRequested) return;

          const count = (parseInt(rawCount ?? "0", 10) || 0) + 1;
          await AsyncStorage.setItem("ranked_completions_v1", String(count));

          const shouldAsk =
            count === 3 || (wrongGuesses === 0 && count >= 2);
          if (!shouldAsk) return;

          const available = await StoreReview.isAvailableAsync();
          if (!available) return;

          await AsyncStorage.setItem("review_requested_v1", "1");
          await StoreReview.requestReview();
        } catch {
        }
      })();
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
    const text = buildShareText(puzzle, success, score, timeSeconds, wrongGuesses, bonusCluesRevealedCount, gridState);
    if (Platform.OS !== "web") {
      try {
        await Share.share({ message: text });
      } catch {
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
      <ScoreInfoSheet visible={showScoreInfo} onClose={() => setShowScoreInfo(false)} />
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: colors.card, borderColor: success ? colors.primary : colors.accent },
          containerStyle,
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + 49 + insets.bottom }]}
        >
          <Animated.View
            style={[
              styles.iconCircle,
              { backgroundColor: success ? `${colors.primary}22` : `${colors.accent}22` },
              iconStyle,
            ]}
          >
            <MaterialIcons
              name={success ? "emoji-events" : "psychology-alt"}
              size={48}
              color={success ? colors.primary : colors.accent}
            />
          </Animated.View>

          <Text style={[styles.resultTitle, { color: success ? colors.primary : colors.accent }]}>
            {success ? "VAKA ÇÖZÜLDÜ!" : "VAKA KAPATILDI"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {success ? "Harika dedektiflik çalışması!" : "Bir dahaki sefere daha dikkatli!"}
          </Text>
          {!isRanked && (
            <View style={[styles.practiceNote, { backgroundColor: "#6B728018", borderColor: "#6B728044" }]}>
              <MaterialIcons name="fitness-center" size={14} color={colors.mutedForeground} />
              <Text style={[styles.practiceNoteText, { color: colors.mutedForeground }]}>
                Antrenman modu — Bu oynayış liderlik tablosunu etkilemedi
              </Text>
            </View>
          )}

          <View style={[styles.solutionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.solutionTitle, { color: colors.mutedForeground }]}>ÇÖZÜM</Text>
            <View style={styles.solutionRow}>
              <MaterialIcons name="person" size={16} color={colors.primary} />
              <Text style={[styles.solutionText, { color: colors.foreground }]}>{suspect?.name ?? "-"}</Text>
            </View>
            <View style={styles.solutionRow}>
              <MaterialIcons name="gps-not-fixed" size={16} color={colors.primary} />
              <Text style={[styles.solutionText, { color: colors.foreground }]}>{weapon?.name ?? "-"}</Text>
            </View>
            <View style={styles.solutionRow}>
              <MaterialIcons name="location-on" size={16} color={colors.primary} />
              <Text style={[styles.solutionText, { color: colors.foreground }]}>{location?.name ?? "-"}</Text>
            </View>
          </View>

          {success && (
            <View style={styles.statsRow}>
              <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                <AnimatedScore score={score} />
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>PUAN</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{formatTime(timeSeconds)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>SÜRE</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.statValue, { color: wrongGuesses > 0 ? colors.accent : colors.success }]}>
                  {wrongGuesses}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>YANLIŞ</Text>
              </View>
            </View>
          )}

          {success && (
            <ScoreBreakdownCard
              timeSeconds={timeSeconds}
              wrongGuesses={wrongGuesses}
              bonusCluesRevealedCount={bonusCluesRevealedCount}
              difficulty={puzzle.difficulty}
              currentStreak={currentStreak}
              finalScore={score}
              onShowInfo={() => setShowScoreInfo(true)}
            />
          )}

          {success && isRanked && totalPlayers > 0 && (
            <RankCard finalRank={finalRank} totalPlayers={totalPlayers} />
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
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Başka Bulmaca</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[styles.btnOutline, { borderColor: colors.border }]}
            >
              <Text style={[styles.btnOutlineText, { color: colors.mutedForeground }]}>Ana Sayfa</Text>
            </Pressable>
          </View>
        </ScrollView>
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
    maxHeight: "94%",
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  solutionBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
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
    fontSize: 14,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statItem: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  breakdownCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  infoBtn: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 2,
  },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  rankLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  rankSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  buttons: {
    gap: 10,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "700",
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
    fontSize: 15,
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
  practiceNote: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 7,
    alignSelf: "stretch",
  },
  practiceNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
});
