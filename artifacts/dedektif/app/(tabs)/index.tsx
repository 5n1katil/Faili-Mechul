import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
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
import { useMission } from "@/context/MissionContext";
import { DAILY_MISSIONS } from "@/data/missions";

const ONBOARDING_KEY = "@dedektif_onboarding_done";
const SETUP_KEY = "@dedektif_setup_done";

const TIPS = [
  { icon: "grid-on" as const, text: "Vakaya başlarken önce hikayeyi oku, ardından ızgaradaki şüphelileri, silahları ve mekanları tek tek incele — hepsini tanımadan çözüme ulaşamazsın." },
  { icon: "auto-stories" as const, text: "İpuçlarını dikkatle oku; detaylar çözüme giden yolda sana yardımcı olacak." },
  { icon: "grid-4x4" as const, text: "Bazen olmayanları eleyerek de cevaba ulaşabilirsin — mümkün olduğunda dedektif ızgarasını doldurmaya çalış." },
  { icon: "psychology" as const, text: "Çelişkileri tespit etmek seni hızlıca çözüme götürür." },
  { icon: "gavel" as const, text: "Her yanlış suçlama +30 saniye ve 500 puan kaybettirir — emin olmadan suçlama!" },
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
  const { getMissionProgress, isAwarded } = useMission();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [helpBtnOpen, setHelpBtnOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);

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
    const [, s] = await Promise.all([
      AsyncStorage.setItem(ONBOARDING_KEY, "1"),
      AsyncStorage.getItem(SETUP_KEY),
    ]);
    setShowOnboarding(false);
    setHelpBtnOpen(false);
    if (!s) {
      setTimeout(() => setShowSetup(true), 400);
    }
  };

  const handleSetupDone = async (name: string, avatar: string) => {
    await AsyncStorage.setItem(SETUP_KEY, "1");
    updateProfile({ name, avatar });
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
  const scoreDiff = personAbove ? personAbove.totalScore - profile.totalScore : 0;

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

      <Modal visible={showStreakInfo} transparent animationType="fade" onRequestClose={() => setShowStreakInfo(false)}>
        <Pressable
          style={styles.streakModalOverlay}
          onPress={() => setShowStreakInfo(false)}
        >
          <Pressable
            style={[styles.streakModalCard, { backgroundColor: colors.card, borderColor: "#FF6B3560" }]}
            onPress={(e) => e.stopPropagation()}
          >
            <MaterialIcons name="local-fire-department" size={52} color="#FF6B35" />
            <Text style={[styles.streakModalTitle, { color: colors.foreground }]}>
              Günlük Seri
            </Text>
            <Text style={[styles.streakModalCount, { color: "#FF6B35" }]}>
              {profile.currentStreak}
            </Text>
            <Text style={[styles.streakModalLabel, { color: colors.mutedForeground }]}>
              gün üst üste
            </Text>
            <View style={[styles.streakModalDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.streakModalDesc, { color: colors.mutedForeground }]}>
              Üst üste bulmaca çözdüğün gün sayısı. Her gün en az bir bulmacayı başarıyla çözersen serin artar. Bir gün atlasan sıfırlanır.
            </Text>
            <Pressable
              onPress={() => setShowStreakInfo(false)}
              style={[styles.streakModalBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.streakModalBtnText, { color: colors.primaryForeground }]}>
                Anladım
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={[styles.headerRow, { paddingHorizontal: 16, paddingBottom: 8 }]}>
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
            <Pressable
              onPress={() => setShowStreakInfo(true)}
              style={[
                styles.streakBadge,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <MaterialIcons name="local-fire-department" size={20} color="#FF6B35" />
              <Text style={[styles.streakText, { color: colors.foreground }]}>
                {profile.currentStreak}
              </Text>
            </Pressable>
          </View>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: 8,
              paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
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

        <Animated.View entering={FadeInDown.delay(160).springify()}>
          {(() => {
            const incompleteDailyCount = DAILY_MISSIONS.filter(
              (m) => !isAwarded(m.id)
            ).length;
            const completedToday = DAILY_MISSIONS.filter(
              (m) => {
                const prog = getMissionProgress(m.id);
                return prog.completed;
              }
            ).length;
            const totalPoints = DAILY_MISSIONS
              .filter((m) => !isAwarded(m.id))
              .reduce((sum, m) => sum + m.reward.points, 0);

            return (
              <Pressable
                onPress={() => router.push("/(tabs)/gorevler")}
                style={[
                  styles.missionsCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.missionsAccent, { backgroundColor: "#60A5FA" }]} />
                <View style={styles.missionsInner}>
                  <View style={styles.missionsLeft}>
                    <View style={[styles.missionsIconWrap, { backgroundColor: "#60A5FA22" }]}>
                      <MaterialIcons name="assignment" size={20} color="#60A5FA" />
                    </View>
                    <View>
                      <Text style={[styles.missionsTitle, { color: colors.foreground }]}>
                        Günlük Görevler
                      </Text>
                      <Text style={[styles.missionsSubtitle, { color: colors.mutedForeground }]}>
                        {incompleteDailyCount > 0
                          ? `${incompleteDailyCount} görev bekliyor · +${totalPoints} puan`
                          : "Tüm görevler tamamlandı!"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.missionsRight}>
                    <View style={[
                      styles.missionsDots,
                      { borderColor: colors.border },
                    ]}>
                      {DAILY_MISSIONS.map((m, i) => {
                        const prog = getMissionProgress(m.id);
                        const done = isAwarded(m.id) || prog.completed;
                        return (
                          <View
                            key={m.id}
                            style={[
                              styles.missionDot,
                              {
                                backgroundColor: done
                                  ? "#4CAF50"
                                  : colors.border,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                    <Text style={[styles.missionsDotLabel, { color: colors.mutedForeground }]}>
                      {completedToday}/{DAILY_MISSIONS.length}
                    </Text>
                    <MaterialIcons name="chevron-right" size={18} color={colors.mutedForeground} />
                  </View>
                </View>
              </Pressable>
            );
          })()}
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

              <View style={styles.rankTopRow}>
                <View style={[styles.rankBadge, { backgroundColor: "#D4A84320", borderColor: "#D4A84355" }]}>
                  <MaterialIcons name="emoji-events" size={14} color="#D4A843" />
                  <Text style={[styles.rankBadgeText, { color: "#D4A843" }]}>
                    Liderlik Sıralaması
                  </Text>
                </View>
                <Text style={[styles.rankPosition, { color: "#D4A843" }]}>
                  #{myRank}
                </Text>
              </View>

              <View style={styles.rankUserRow}>
                <View style={[styles.rankUserAvatar, { borderColor: "#D4A84366", backgroundColor: "#D4A84315" }]}>
                  <AvatarDisplay
                    avatar={profile.avatar || "detective"}
                    size={30}
                    color={colors.primary}
                    backgroundColor="transparent"
                  />
                </View>
                <View style={styles.rankUserInfo}>
                  <Text style={[styles.rankUserName, { color: colors.foreground }]} numberOfLines={1}>
                    {profile.name}
                  </Text>
                  <Text style={[styles.rankUserMeta, { color: colors.mutedForeground }]}>
                    {profile.totalScore.toLocaleString("tr-TR")} puan · {profile.gamesWon} vaka
                  </Text>
                </View>
                <View style={[styles.rankTotalBadge, { backgroundColor: "#D4A84314", borderColor: "#D4A84330" }]}>
                  <Text style={[styles.rankTotalText, { color: colors.mutedForeground }]}>
                    {allEntries.length} dedektif
                  </Text>
                </View>
              </View>

              <View style={[styles.rankDivider, { borderTopColor: colors.border }]} />

              {personAbove ? (
                <View style={styles.rankAheadRow}>
                  <Text style={[styles.rankAheadLabel, { color: colors.mutedForeground }]}>
                    Önündeki:
                  </Text>
                  <View style={[styles.rankAheadAvatar, { borderColor: `${colors.primary}30`, backgroundColor: `${colors.primary}10` }]}>
                    <AvatarDisplay
                      avatar={personAbove.avatar || "detective"}
                      size={22}
                      color={colors.mutedForeground}
                      backgroundColor="transparent"
                    />
                  </View>
                  <Text style={[styles.rankAheadName, { color: colors.foreground }]} numberOfLines={1}>
                    {personAbove.name}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.rankAheadScore, { color: "#D4A843" }]}>
                    {scoreDiff.toLocaleString("tr-TR")} puan geride
                  </Text>
                </View>
              ) : (
                <View style={styles.rankLeaderRow}>
                  <MaterialIcons name="emoji-events" size={16} color="#D4A843" />
                  <Text style={[styles.rankLeaderText, { color: "#D4A843" }]}>
                    Sen zirvedesin!
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.rankCardFooter, { borderTopColor: colors.border }]}>
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
                  <MaterialIcons name={tip.icon} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.tipText, { color: colors.foreground }]}>
                  {tip.text}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },

  missionsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  missionsAccent: {
    width: 3,
    alignSelf: "stretch",
  },
  missionsInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    gap: 10,
  },
  missionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  missionsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  missionsTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  missionsSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  missionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  missionsDots: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  missionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  missionsDotLabel: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },

  streakModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  streakModalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  streakModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  streakModalCount: {
    fontSize: 64,
    fontWeight: "900",
    lineHeight: 72,
  },
  streakModalLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: -4,
  },
  streakModalDivider: {
    height: 1,
    width: "100%",
    marginVertical: 8,
  },
  streakModalDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  streakModalBtn: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  streakModalBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },

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
  },
  rankCardInner: {
    flexDirection: "column",
    padding: 14,
    gap: 10,
  },
  rankTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  rankBadgeText: { fontSize: 11, fontWeight: "700" },
  rankPosition: { fontSize: 30, fontWeight: "900", letterSpacing: -0.5 },
  rankUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rankUserInfo: {
    flex: 1,
    gap: 2,
  },
  rankUserName: { fontSize: 14, fontWeight: "700" },
  rankUserMeta: { fontSize: 11, fontWeight: "500" },
  rankTotalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  rankTotalText: { fontSize: 10, fontWeight: "600" },
  rankDivider: {
    borderTopWidth: 1,
  },
  rankAheadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  rankAheadLabel: { fontSize: 11, fontWeight: "600" },
  rankAheadAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankAheadName: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  rankAheadScore: { fontSize: 12, fontWeight: "700" },
  rankLeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rankLeaderText: { fontSize: 14, fontWeight: "700" },
  rankCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
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
  tipsTitle: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tipIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
