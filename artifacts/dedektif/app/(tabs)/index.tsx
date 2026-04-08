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
import {
  getDailyPuzzle,
  getDifficultyColor,
  getDifficultyLabel,
  type Difficulty,
} from "@/data/puzzles";
import Animated, { FadeInDown } from "react-native-reanimated";
import OnboardingScreen from "@/components/OnboardingScreen";
import ProfileSetupModal from "@/components/ProfileSetupModal";
import { AvatarDisplay } from "@/utils/avatarHelpers";
import { AI_DETECTIVES } from "@/data/aiDetectives";

const ONBOARDING_KEY = "@dedektif_onboarding_done";
const SETUP_KEY = "@dedektif_setup_done";

const TIPS = [
  { icon: "grid-on" as const, text: "Izgara satırlarını ve sütunlarını sistematik ele al — her işaret önemlidir." },
  { icon: "auto-stories" as const, text: "İpuçlarını dikkatle oku; her kelime çözümü işaret eder." },
  { icon: "psychology" as const, text: "Çelişkileri tespit etmek seni hızlıca çözüme götürür." },
  { icon: "gavel" as const, text: "Yanlış suçlamalar ceza süresini ikiye katlar — emin ol, sonra suçla!" },
];

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

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    gameHistory,
    startDailyPuzzle,
    profile,
    updateProfile,
  } = useGame();
  const countdown = useDailyCountdown();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [helpBtnOpen, setHelpBtnOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const dailyPuzzle = getDailyPuzzle();
  const todayStr = new Date().toISOString().split("T")[0];
  const wonToday = gameHistory.some(
    (h) => h.date === todayStr && h.completed && h.puzzleId === dailyPuzzle.id
  );

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

  const allEntries = [
    ...AI_DETECTIVES.map((d) => ({ ...d, isCurrentUser: false })),
    {
      name: profile.name,
      avatar: profile.avatar || "detective",
      totalScore: profile.totalScore,
      gamesWon: profile.gamesWon,
      maxStreak: profile.maxStreak,
      isCurrentUser: true,
    },
  ].sort((a, b) => b.totalScore - a.totalScore);

  const myRank = allEntries.findIndex((e) => e.isCurrentUser) + 1;
  const personAbove = myRank > 1 ? allEntries[myRank - 2] : null;

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

        <Animated.View entering={FadeInDown.delay(280).springify()}>
          <Pressable
            onPress={() => router.push("/liderlik")}
            style={[
              styles.rankCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.rankCardAccent, { backgroundColor: "#D4A843" }]} />
            <View style={styles.rankCardInner}>
              <View style={styles.rankCardLeft}>
                <View style={[styles.rankBadge, { backgroundColor: "#D4A84320", borderColor: "#D4A84355" }]}>
                  <MaterialIcons name="emoji-events" size={16} color="#D4A843" />
                  <Text style={[styles.rankBadgeText, { color: "#D4A843" }]}>
                    Sıralama
                  </Text>
                </View>
                <Text style={[styles.rankPosition, { color: colors.foreground }]}>
                  #{myRank}
                </Text>
                <Text style={[styles.rankSub, { color: colors.mutedForeground }]}>
                  {allEntries.length} dedektif arasında
                </Text>
              </View>
              {personAbove ? (
                <View style={styles.rankCardRight}>
                  <Text style={[styles.rankAheadLabel, { color: colors.mutedForeground }]}>
                    Önündeki
                  </Text>
                  <View style={[styles.rankAheadAvatar, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}12` }]}>
                    <AvatarDisplay
                      avatar={personAbove.avatar || "detective"}
                      size={28}
                      color={colors.mutedForeground}
                      backgroundColor="transparent"
                    />
                  </View>
                  <Text
                    style={[styles.rankAheadName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {personAbove.name}
                  </Text>
                  <Text style={[styles.rankAheadScore, { color: "#D4A843" }]}>
                    {(personAbove.totalScore - profile.totalScore).toLocaleString("tr-TR")} puan fark
                  </Text>
                </View>
              ) : (
                <View style={styles.rankCardRight}>
                  <MaterialIcons name="emoji-events" size={32} color="#D4A843" />
                  <Text style={[styles.rankLeaderText, { color: "#D4A843" }]}>
                    Sen lidersin!
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.rankCardFooter}>
              <Text style={[styles.rankCardFooterText, { color: colors.mutedForeground }]}>
                Tam sıralamayı gör
              </Text>
              <MaterialIcons name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(340).springify()}>
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.tipsHeader}>
              <MaterialIcons name="lightbulb-outline" size={16} color={colors.primary} />
              <Text style={[styles.tipsTitle, { color: colors.primary }]}>
                Dedektif İpuçları
              </Text>
            </View>
            {TIPS.map((tip, i) => (
              <View key={i} style={[styles.tipRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[styles.tipIconBox, { backgroundColor: `${colors.primary}15` }]}>
                  <MaterialIcons name={tip.icon} size={14} color={colors.primary} />
                </View>
                <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                  {tip.text}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
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

  diffBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  diffText: { fontSize: 11, fontWeight: "700" },

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

  rankCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  rankCardAccent: {
    height: 2,
    borderRadius: 0,
  },
  rankCardInner: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
  },
  rankCardLeft: {
    flex: 1,
    gap: 4,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  rankBadgeText: { fontSize: 11, fontWeight: "700" },
  rankPosition: { fontSize: 34, fontWeight: "900", lineHeight: 40 },
  rankSub: { fontSize: 11, fontWeight: "500" },
  rankCardRight: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 90,
  },
  rankAheadLabel: { fontSize: 10, fontWeight: "600" },
  rankAheadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rankAheadName: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  rankAheadScore: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  rankLeaderText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  rankCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 4,
  },
  rankCardFooterText: { fontSize: 12, fontWeight: "500" },

  tipsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  tipsTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tipIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
