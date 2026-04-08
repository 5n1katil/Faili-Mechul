import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import type { BestResult } from "@/context/GameContext";
import {
  getDailyPuzzle,
  getDifficultyColor,
  getDifficultyLabel,
  PUZZLES,
  type Difficulty,
} from "@/data/puzzles";
import Animated, { FadeInDown } from "react-native-reanimated";
import OnboardingScreen from "@/components/OnboardingScreen";
import PaywallModal from "@/components/PaywallModal";
import ProfileSetupModal from "@/components/ProfileSetupModal";
import { usePurchase } from "@/context/PurchaseContext";

const ONBOARDING_KEY = "@dedektif_onboarding_done";
const SETUP_KEY = "@dedektif_setup_done";
const FREE_PUZZLE_COUNT = 10;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function PuzzleCard({
  puzzle,
  onPress,
  delay,
  completed,
  bestResult,
  locked,
}: {
  puzzle: (typeof PUZZLES)[0];
  onPress: () => void;
  delay: number;
  completed: boolean;
  bestResult: BestResult | null;
  locked?: boolean;
}) {
  const colors = useColors();
  const diffColor = getDifficultyColor(puzzle.difficulty as Difficulty);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.puzzleCard,
          {
            backgroundColor: colors.card,
            borderColor: completed
              ? `${colors.success}55`
              : locked
              ? "#D4A84322"
              : colors.border,
            opacity: pressed ? 0.78 : 1,
          },
          completed && !locked && { backgroundColor: `${colors.success}08` },
          locked && { borderStyle: "dashed" as const },
        ]}
      >
        <View style={styles.puzzleCardTop}>
          <View
            style={[
              styles.diffBadge,
              {
                backgroundColor: `${diffColor}22`,
                borderColor: `${diffColor}66`,
              },
            ]}
          >
            <Text style={[styles.diffText, { color: diffColor }]}>
              {getDifficultyLabel(puzzle.difficulty as Difficulty)}
            </Text>
          </View>
          <View style={styles.puzzleCardRight}>
            {locked ? (
              <View
                style={[
                  styles.lockBadge,
                  { backgroundColor: "#D4A84322", borderColor: "#D4A84366" },
                ]}
              >
                <Text style={[styles.lockText, { color: "#D4A843" }]}>Premium</Text>
              </View>
            ) : completed ? (
              <View
                style={[
                  styles.solvedBadge,
                  {
                    backgroundColor: `${colors.success}22`,
                    borderColor: `${colors.success}55`,
                  },
                ]}
              >
                <MaterialIcons name="check-circle" size={12} color={colors.success} />
                <Text style={[styles.solvedText, { color: colors.success }]}>
                  Çözüldü
                </Text>
              </View>
            ) : (
              <View style={styles.puzzleCardMeta}>
                <MaterialIcons name="person" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {puzzle.suspects.length} şüpheli
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text
          style={[
            styles.puzzleTitle,
            { color: locked ? colors.mutedForeground : colors.foreground },
          ]}
          numberOfLines={2}
        >
          {puzzle.title}
        </Text>

        {!locked && (
          <Text
            style={[styles.puzzleStory, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {puzzle.story}
          </Text>
        )}

        {locked ? (
          <View style={[styles.playRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.playText, { color: "#D4A843" }]}>
              Kilidi açmak için dokun
            </Text>
            <MaterialIcons name="lock-open" size={18} color="#D4A843" />
          </View>
        ) : completed && bestResult ? (
          <View style={[styles.bestResultRow, { borderTopColor: colors.border }]}>
            <View style={styles.bestResultItem}>
              <MaterialIcons name="emoji-events" size={13} color={colors.primary} />
              <Text style={[styles.bestResultLabel, { color: colors.mutedForeground }]}>
                En İyi:
              </Text>
              <Text style={[styles.bestResultValue, { color: colors.primary }]}>
                {bestResult.score} puan
              </Text>
            </View>
            <View style={styles.bestResultItem}>
              <MaterialIcons name="timer" size={13} color={colors.mutedForeground} />
              <Text style={[styles.bestResultValue, { color: colors.mutedForeground }]}>
                {formatTime(bestResult.timeSeconds)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.playRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.playText, { color: colors.primary }]}>
              Oynamak için dokun
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function useDailyCountdown() {
  const getSecondsUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  };

  const [secondsLeft, setSecondsLeft] = useState(getSecondsUntilMidnight);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft(getSecondsUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionAccentBar} />
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    gameHistory,
    startDailyPuzzle,
    startPuzzle,
    completedPuzzleIds,
    bestScoreForPuzzle,
    profile,
    updateProfile,
  } = useGame();
  const { isPremium } = usePurchase();
  const countdown = useDailyCountdown();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [helpBtnOpen, setHelpBtnOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const dailyPuzzle = getDailyPuzzle();
  const todayStr = new Date().toISOString().split("T")[0];
  const wonToday = gameHistory.some(
    (h) => h.date === todayStr && h.completed && h.puzzleId === dailyPuzzle.id
  );

  const archivePuzzles = PUZZLES.filter((p) => p.id !== dailyPuzzle.id);
  const freePuzzles = archivePuzzles.slice(0, FREE_PUZZLE_COUNT);
  const premiumPuzzles = archivePuzzles.slice(FREE_PUZZLE_COUNT);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (!val) setShowOnboarding(true);
      else AsyncStorage.getItem(SETUP_KEY).then((s) => { if (!s) setShowSetup(true); });
    });
  }, []);

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
    setHelpBtnOpen(false);
    const s = await AsyncStorage.getItem(SETUP_KEY);
    if (!s) setShowSetup(true);
  };

  const handleSetupDone = async (name: string, avatar: string) => {
    await AsyncStorage.setItem(SETUP_KEY, "1");
    updateProfile(name, avatar);
    setShowSetup(false);
  };

  const handleHelpPress = () => {
    setHelpBtnOpen(true);
    setShowOnboarding(true);
  };

  const handleDailyPlay = () => {
    startDailyPuzzle();
    router.push("/oyun");
  };

  const handlePuzzlePlay = (puzzle: (typeof PUZZLES)[0]) => {
    startPuzzle(puzzle);
    router.push("/oyun");
  };

  const premiumLockedCount = isPremium ? 0 : premiumPuzzles.length;

  return (
    <>
      <OnboardingScreen
        visible={showOnboarding}
        onDone={handleOnboardingDone}
        closeLabel={helpBtnOpen ? "Kapat" : undefined}
      />
      <ProfileSetupModal
        visible={showSetup}
        onDone={handleSetupDone}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === "web" ? 67 + 20 : insets.top + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <View style={styles.headerRow}>
            <View style={styles.headerBrand}>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={[styles.greetingSmall, { color: colors.mutedForeground }]}>
                  Merhaba, {profile.name}
                </Text>
                <Text style={[styles.appTitle, { color: colors.primary }]}>
                  FAİLİ MEÇHUL
                </Text>
                <View style={[styles.titleUnderline, { backgroundColor: colors.primary }]} />
                <Text style={[styles.appSubtitle, { color: colors.mutedForeground }]}>
                  Dedektif Bulmaca Oyunu
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Pressable onPress={handleHelpPress} style={styles.helpBtn} hitSlop={8}>
                <MaterialIcons name="help-outline" size={22} color={colors.mutedForeground} />
              </Pressable>
              <View
                style={[
                  styles.streakBadge,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <MaterialIcons name="local-fire-department" size={20} color="#FF6B35" />
                <Text style={[styles.streakText, { color: colors.foreground }]}>
                  {profile.currentStreak}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable
            onPress={handleDailyPlay}
            style={[
              styles.dailyCard,
              {
                backgroundColor: colors.card,
                borderColor: wonToday ? `${colors.primary}88` : colors.primary,
              },
              wonToday && { backgroundColor: `${colors.primary}08` },
            ]}
          >
            <View style={[styles.dailyGoldBar, { backgroundColor: colors.primary }]} />
            <View style={styles.dailyCardInner}>
              <View style={styles.dailyTop}>
                <View
                  style={[styles.dailyBadge, { backgroundColor: colors.primary }]}
                >
                  <MaterialIcons name="today" size={12} color={colors.primaryForeground} />
                  <Text
                    style={[styles.dailyBadgeText, { color: colors.primaryForeground }]}
                  >
                    GÜNÜN BULMACASI
                  </Text>
                </View>
                {wonToday && (
                  <View
                    style={[
                      styles.doneBadge,
                      {
                        backgroundColor: `${colors.primary}22`,
                        borderColor: `${colors.primary}66`,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <MaterialIcons name="check-circle" size={14} color={colors.primary} />
                    <Text style={[styles.doneText, { color: colors.primary }]}>
                      Tamamlandı
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.dailyTitle, { color: colors.foreground }]}>
                {dailyPuzzle.title}
              </Text>
              <Text
                style={[styles.dailyStory, { color: colors.mutedForeground }]}
                numberOfLines={3}
              >
                {dailyPuzzle.story}
              </Text>

              <View style={[styles.countdownRow, { borderTopColor: colors.border }]}>
                <View style={styles.countdownLeft}>
                  <MaterialIcons name="schedule" size={13} color={colors.mutedForeground} />
                  <Text
                    style={[styles.countdownLabel, { color: colors.mutedForeground }]}
                  >
                    Yeni bulmacaya:
                  </Text>
                  <Text
                    style={[styles.countdownValue, { color: colors.primary }]}
                  >
                    {countdown}
                  </Text>
                </View>
                <View
                  style={[
                    styles.diffBadge,
                    {
                      backgroundColor: `${getDifficultyColor(dailyPuzzle.difficulty as Difficulty)}22`,
                      borderColor: `${getDifficultyColor(dailyPuzzle.difficulty as Difficulty)}66`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.diffText,
                      {
                        color: getDifficultyColor(dailyPuzzle.difficulty as Difficulty),
                      },
                    ]}
                  >
                    {getDifficultyLabel(dailyPuzzle.difficulty as Difficulty)}
                  </Text>
                </View>
              </View>

              <View style={[styles.dailyFooter, { borderTopColor: colors.border }]}>
                <View style={styles.playNowBtn}>
                  <Text style={[styles.playNowText, { color: colors.primary }]}>
                    {wonToday ? "Tekrar Oyna" : "Oyna"}
                  </Text>
                  <MaterialIcons
                    name="play-circle-filled"
                    size={22}
                    color={colors.primary}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.statAccent, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {profile.gamesWon}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Çözülen
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.statAccent, { backgroundColor: "#9333ea" }]} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {profile.totalScore}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Toplam Puan
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.statAccent, { backgroundColor: "#FF6B35" }]} />
              <Text style={[styles.statValue, { color: "#FF6B35" }]}>
                {profile.currentStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Seri
              </Text>
            </View>
          </View>
        </Animated.View>

        <SectionHeader title="Başlangıç Seviyesi Vakalar" />

        {freePuzzles.map((puzzle, i) => {
          const isCompleted = completedPuzzleIds.has(puzzle.id);
          return (
            <PuzzleCard
              key={puzzle.id}
              puzzle={puzzle}
              onPress={() => handlePuzzlePlay(puzzle)}
              delay={300 + i * 50}
              completed={isCompleted}
              bestResult={isCompleted ? bestScoreForPuzzle(puzzle.id) : null}
              locked={false}
            />
          );
        })}

        <SectionHeader
          title="Premium Vaka Arşivi"
          right={
            !isPremium ? (
              <Pressable
                onPress={() => setShowPaywall(true)}
                style={[
                  styles.premiumChip,
                  { backgroundColor: "#D4A84318", borderColor: "#D4A84355" },
                ]}
              >
                <MaterialIcons name="lock" size={12} color="#D4A843" />
                <Text style={[styles.premiumChipText, { color: "#D4A843" }]}>
                  {premiumLockedCount} kilitli vaka
                </Text>
              </Pressable>
            ) : null
          }
        />

        {!isPremium && (
          <Pressable
            onPress={() => setShowPaywall(true)}
            style={[
              styles.premiumBanner,
              { backgroundColor: "#D4A84310", borderColor: "#D4A84340" },
            ]}
          >
            <MaterialIcons name="workspace-premium" size={20} color="#D4A843" />
            <View style={styles.premiumBannerText}>
              <Text style={[styles.premiumBannerTitle, { color: "#D4A843" }]}>
                Premium Vaka Arşivi'ni Aç
              </Text>
              <Text style={[styles.premiumBannerSub, { color: "#D4A84399" }]}>
                {premiumLockedCount} ek vaka · Tek seferlik satın al
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#D4A843" />
          </Pressable>
        )}

        {premiumPuzzles.map((puzzle, i) => {
          const isCompleted = completedPuzzleIds.has(puzzle.id);
          const isLocked = !isPremium;
          return (
            <PuzzleCard
              key={puzzle.id}
              puzzle={puzzle}
              onPress={() => {
                if (isLocked) {
                  setShowPaywall(true);
                } else {
                  handlePuzzlePlay(puzzle);
                }
              }}
              delay={300 + (freePuzzles.length + i) * 40}
              completed={isCompleted && !isLocked}
              bestResult={
                isCompleted && !isLocked ? bestScoreForPuzzle(puzzle.id) : null
              }
              locked={isLocked}
            />
          );
        })}
      </ScrollView>
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  greetingSmall: { fontSize: 13, fontWeight: "500", marginBottom: 2 },
  appTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3,
  },
  titleUnderline: {
    height: 2,
    width: 40,
    borderRadius: 1,
    marginTop: 3,
    marginBottom: 3,
  },
  appSubtitle: { fontSize: 12, fontWeight: "500" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  helpBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 6,
  },
  streakText: { fontSize: 18, fontWeight: "700" },

  dailyCard: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    flexDirection: "row",
  },
  dailyGoldBar: {
    width: 4,
    borderRadius: 0,
  },
  dailyCardInner: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  dailyTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  dailyBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  dailyBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  doneText: { fontSize: 11, fontWeight: "600" },
  dailyTitle: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
  dailyStory: { fontSize: 13, lineHeight: 20 },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  countdownLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  countdownLabel: { fontSize: 11, fontWeight: "500" },
  countdownValue: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  dailyFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
  },
  playNowBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  playNowText: { fontSize: 15, fontWeight: "700" },

  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
    overflow: "hidden",
  },
  statAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 0,
  },
  statValue: { fontSize: 22, fontWeight: "700", marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: "500" },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionAccentBar: {
    width: 3,
    height: 18,
    backgroundColor: "#D4A843",
    borderRadius: 2,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#E8E8E8",
    letterSpacing: 1,
  },
  premiumChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  premiumChipText: { fontSize: 11, fontWeight: "700" },

  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 2,
  },
  premiumBannerText: { flex: 1 },
  premiumBannerTitle: { fontSize: 14, fontWeight: "700" },
  premiumBannerSub: { fontSize: 12, marginTop: 1 },

  puzzleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 4,
    overflow: "hidden",
  },
  lockedOverlay: {
    position: "absolute",
    top: 10,
    right: 14,
    zIndex: 2,
  },
  lockIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  puzzleCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  puzzleCardRight: { flexDirection: "row", alignItems: "center" },
  puzzleCardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  diffBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  diffText: { fontSize: 11, fontWeight: "700" },
  puzzleTitle: { fontSize: 15, fontWeight: "700", lineHeight: 22 },
  puzzleStory: { fontSize: 12, lineHeight: 18 },
  solvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    gap: 4,
  },
  solvedText: { fontSize: 11, fontWeight: "700" },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    gap: 4,
  },
  lockText: { fontSize: 11, fontWeight: "700" },
  playRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  playText: { fontSize: 13, fontWeight: "600" },
  bestResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  bestResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bestResultLabel: { fontSize: 12 },
  bestResultValue: { fontSize: 12, fontWeight: "600" },
});
