import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
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
import SettingsScreen from "@/components/SettingsScreen";
import { unlockMusicFromGesture } from "@/utils/backgroundMusic";
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
  { icon: "grid-4x4" as const, text: "Bazen olmayanları eleyerek de cevaba ulaşabilirsin — mümkün olduğunca dedektif ızgarasını doldurmaya çalış." },
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
  const scrollRef = useRef<import("react-native").ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showTips, setShowTips] = useState(false);

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
    if (!s) {
      setTimeout(() => setShowSetup(true), 400);
    }
  };

  const handleSetupDone = async (name: string, avatar: string) => {
    await AsyncStorage.setItem(SETUP_KEY, "1");
    updateProfile({ name, avatar });
    setShowSetup(false);
  };

  const handleSettingsPress = () => {
    unlockMusicFromGesture();
    setShowSettings(true);
  };

  const handleDailyPlay = () => {
    unlockMusicFromGesture();
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

  const diffColor = getDifficultyColor(dailyPuzzle.difficulty as Difficulty);

  return (
    <>
      <OnboardingScreen
        visible={showOnboarding}
        onDone={handleOnboardingDone}
      />
      <SettingsScreen visible={showSettings} onClose={() => setShowSettings(false)} />
      <ProfileSetupModal
        visible={showSetup}
        onDone={handleSetupDone}
      />

      {/* Streak Modal */}
      <Modal visible={showStreakInfo} transparent animationType="fade" onRequestClose={() => setShowStreakInfo(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowStreakInfo(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: "#FF6B3560" }]}
            onPress={(e) => e.stopPropagation()}
          >
            <MaterialIcons name="local-fire-department" size={52} color="#FF6B35" />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Günlük Seri</Text>
            <Text style={[styles.streakCount, { color: "#FF6B35" }]}>{profile.currentStreak}</Text>
            <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>gün üst üste</Text>
            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
              Üst üste bulmaca çözdüğün gün sayısı. Her gün en az bir bulmacayı başarıyla çözersen serin artar. Bir gün atlasan sıfırlanır.
            </Text>
            <Pressable
              onPress={() => setShowStreakInfo(false)}
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>Anladım</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tips Modal */}
      <Modal visible={showTips} transparent animationType="slide" onRequestClose={() => setShowTips(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTips(false)}>
          <Pressable
            style={[styles.tipsModalCard, { backgroundColor: colors.card, borderColor: `${colors.primary}40` }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.tipsModalHandle} />
            <View style={styles.tipsModalHeader}>
              <View style={[styles.tipsModalIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <MaterialIcons name="lightbulb" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.tipsModalTitle, { color: colors.foreground }]}>Dedektif İpuçları</Text>
            </View>
            {TIPS.map((tip, i) => (
              <View
                key={i}
                style={[
                  styles.tipRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={[styles.tipIconBox, { backgroundColor: `${colors.primary}15` }]}>
                  <MaterialIcons name={tip.icon} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.tipText, { color: colors.foreground }]}>{tip.text}</Text>
              </View>
            ))}
            <Pressable
              onPress={() => setShowTips(false)}
              style={[styles.modalBtn, { backgroundColor: `${colors.primary}18`, marginTop: 4 }]}
            >
              <Text style={[styles.modalBtnText, { color: colors.primary }]}>Kapat</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        {/* Header — unchanged */}
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
              <Text style={[styles.appTitle, { color: colors.primary }]}>FAİLİ MEÇHUL</Text>
              <View style={[styles.titleUnderline, { backgroundColor: colors.primary }]} />
              <Text style={[styles.appSubtitle, { color: colors.mutedForeground }]}>
                Dedektif Bulmaca Oyunu
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={handleSettingsPress} style={styles.helpBtn} hitSlop={8} accessibilityLabel="Ayarlar">
              <MaterialIcons name="help-outline" size={22} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={() => setShowStreakInfo(true)}
              style={[styles.streakBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <MaterialIcons name="local-fire-department" size={20} color="#FF6B35" />
              <Text style={[styles.streakText, { color: colors.foreground }]}>{profile.currentStreak}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.content,
            { paddingTop: 10, paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Daily Puzzle Card */}
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Pressable
              onPress={handleDailyPlay}
              style={[
                styles.dailyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: wonToday ? `${colors.primary}70` : colors.primary,
                },
                wonToday && { backgroundColor: `${colors.primary}06` },
              ]}
            >
              {/* Gold side bar */}
              <View style={[styles.dailyGoldBar, { backgroundColor: colors.primary }]} />

              <View style={styles.dailyCardInner}>
                {/* Top row: badge + done */}
                <View style={styles.dailyTop}>
                  <View style={[styles.dailyBadge, { backgroundColor: colors.primary }]}>
                    <MaterialIcons name="today" size={11} color={colors.primaryForeground} />
                    <Text style={[styles.dailyBadgeText, { color: colors.primaryForeground }]}>
                      GÜNÜN BULMACASI
                    </Text>
                  </View>
                  {wonToday && (
                    <View style={[styles.doneBadge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}55`, borderWidth: 1 }]}>
                      <MaterialIcons name="check-circle" size={13} color={colors.primary} />
                      <Text style={[styles.doneText, { color: colors.primary }]}>Tamamlandı</Text>
                    </View>
                  )}
                </View>

                {/* Puzzle title — larger, no story text */}
                <Text style={[styles.dailyTitle, { color: colors.foreground }]}>
                  {dailyPuzzle.title}
                </Text>

                {/* Countdown + difficulty */}
                <View style={[styles.countdownRow, { borderTopColor: colors.border }]}>
                  <View style={styles.countdownLeft}>
                    <MaterialIcons name="schedule" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.countdownLabel, { color: colors.mutedForeground }]}>
                      Yeni bulmacaya:
                    </Text>
                    <Text style={[styles.countdownValue, { color: colors.primary }]}>
                      {countdown}
                    </Text>
                  </View>
                  <View style={[styles.diffBadge, { backgroundColor: `${diffColor}20`, borderColor: `${diffColor}55` }]}>
                    <Text style={[styles.diffText, { color: diffColor }]}>
                      {getDifficultyLabel(dailyPuzzle.difficulty as Difficulty)}
                    </Text>
                  </View>
                </View>

                {/* Prominent CTA button */}
                <View style={[styles.playCta, { backgroundColor: wonToday ? `${colors.primary}22` : colors.primary }]}>
                  <MaterialIcons
                    name={wonToday ? "replay" : "play-arrow"}
                    size={22}
                    color={wonToday ? colors.primary : colors.primaryForeground}
                  />
                  <Text style={[styles.playCtaText, { color: wonToday ? colors.primary : colors.primaryForeground }]}>
                    {wonToday ? "Tekrar Oyna" : "Oyna"}
                  </Text>
                </View>
              </View>

              {/* Decorative background icon */}
              <View style={[styles.dailyDecorIcon, { pointerEvents: "none" }]}>
                <MaterialIcons name="person-search" size={96} color={colors.primary} style={{ opacity: 0.06 }} />
              </View>
            </Pressable>
          </Animated.View>

          {/* Daily Missions */}
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            {(() => {
              const incompleteDailyCount = DAILY_MISSIONS.filter((m) => !isAwarded(m.id)).length;
              const completedToday = DAILY_MISSIONS.filter((m) => getMissionProgress(m.id).completed).length;
              const totalPoints = DAILY_MISSIONS
                .filter((m) => !isAwarded(m.id))
                .reduce((sum, m) => sum + m.reward.points, 0);

              return (
                <Pressable
                  onPress={() => router.push("/(tabs)/gorevler")}
                  style={[styles.missionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.missionsAccent, { backgroundColor: "#60A5FA" }]} />
                  <View style={styles.missionsInner}>
                    <View style={styles.missionsLeft}>
                      <View style={[styles.missionsIconWrap, { backgroundColor: "#60A5FA1A" }]}>
                        <MaterialIcons name="assignment" size={22} color="#60A5FA" />
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
                      <View style={styles.missionsDots}>
                        {DAILY_MISSIONS.map((m, i) => {
                          const prog = getMissionProgress(m.id);
                          const done = isAwarded(m.id) || prog.completed;
                          return (
                            <View
                              key={m.id}
                              style={[styles.missionDot, { backgroundColor: done ? "#4CAF50" : colors.border }]}
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

          {/* Stats Row */}
          <Animated.View entering={FadeInDown.delay(210).springify()}>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statAccent, { backgroundColor: colors.primary }]} />
                <MaterialIcons name="check-circle-outline" size={18} color={colors.primary} style={{ marginTop: 6 }} />
                <Text style={[styles.statValue, { color: colors.primary }]}>{profile.gamesWon}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Çözülen</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statAccent, { backgroundColor: "#9333ea" }]} />
                <MaterialIcons name="stars" size={18} color="#9333ea" style={{ marginTop: 6 }} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{profile.totalScore.toLocaleString("tr-TR")}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Toplam Puan</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statAccent, { backgroundColor: "#FF6B35" }]} />
                <MaterialIcons name="local-fire-department" size={18} color="#FF6B35" style={{ marginTop: 6 }} />
                <Text style={[styles.statValue, { color: "#FF6B35" }]}>{profile.currentStreak}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Seri</Text>
              </View>
            </View>
          </Animated.View>

          {/* Leaderboard Card */}
          <Animated.View entering={FadeInDown.delay(270).springify()}>
            <Pressable
              onPress={() => router.push("/liderlik")}
              style={[styles.rankCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.rankCardAccent, { backgroundColor: "#D4A843" }]} />
              <View style={styles.rankCardInner}>
                <View style={styles.rankTopRow}>
                  <View style={[styles.rankBadge, { backgroundColor: "#D4A84320", borderColor: "#D4A84355" }]}>
                    <MaterialIcons name="emoji-events" size={14} color="#D4A843" />
                    <Text style={[styles.rankBadgeText, { color: "#D4A843" }]}>Liderlik Sıralaması</Text>
                  </View>
                  <Text style={[styles.rankPosition, { color: "#D4A843" }]}>#{myRank}</Text>
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
                    <Text style={[styles.rankAheadLabel, { color: colors.mutedForeground }]}>Önündeki:</Text>
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
                    <Text style={[styles.rankLeaderText, { color: "#D4A843" }]}>Sen zirvedesin!</Text>
                  </View>
                )}
              </View>

              <View style={[styles.rankCardFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.rankCardFooterText, { color: colors.mutedForeground }]}>Tam sıralamayı gör</Text>
                <MaterialIcons name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
          </Animated.View>

          {/* Tips compact button */}
          <Animated.View entering={FadeInDown.delay(330).springify()}>
            <Pressable
              onPress={() => setShowTips(true)}
              style={[styles.tipsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.tipsBtnIcon, { backgroundColor: `${colors.primary}18` }]}>
                <MaterialIcons name="lightbulb-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.tipsBtnText, { color: colors.mutedForeground }]}>Dedektif İpuçları</Text>
              <MaterialIcons name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },

  /* ─── Modals ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", letterSpacing: 0.3, marginTop: 4 },
  streakCount: { fontSize: 64, fontWeight: "900", lineHeight: 72 },
  streakLabel: { fontSize: 13, fontWeight: "500", marginTop: -4 },
  modalDivider: { height: 1, width: "100%", marginVertical: 8 },
  modalDesc: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  modalBtn: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalBtnText: { fontSize: 15, fontWeight: "700" },

  /* Tips Modal */
  tipsModalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    gap: 0,
  },
  tipsModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 16,
  },
  tipsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  tipsModalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tipsModalTitle: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
  },
  tipIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },

  /* ─── Header ─── */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 52, height: 52, borderRadius: 26 },
  greetingSmall: { fontSize: 13, fontWeight: "500", marginBottom: 2 },
  appTitle: { fontSize: 22, fontWeight: "900", letterSpacing: 3 },
  titleUnderline: { height: 2, width: 40, borderRadius: 1, marginTop: 3, marginBottom: 3 },
  appSubtitle: { fontSize: 12, fontWeight: "500" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  helpBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
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

  /* ─── Daily Card ─── */
  dailyCard: {
    borderRadius: 18,
    borderWidth: 2,
    overflow: "hidden",
    flexDirection: "row",
  },
  dailyGoldBar: { width: 5 },
  dailyCardInner: { flex: 1, padding: 16, gap: 12 },
  dailyTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  dailyBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  dailyBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  doneText: { fontSize: 11, fontWeight: "600" },
  dailyTitle: { fontSize: 20, fontWeight: "900", lineHeight: 26, letterSpacing: 0.2 },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  countdownLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  countdownLabel: { fontSize: 11, fontWeight: "500" },
  countdownValue: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  diffBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  diffText: { fontSize: 11, fontWeight: "700" },
  playCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  playCtaText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },
  dailyDecorIcon: {
    position: "absolute",
    right: -8,
    top: "50%",
    marginTop: -48,
    pointerEvents: "none",
  },

  /* ─── Missions ─── */
  missionsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  missionsAccent: { width: 4, alignSelf: "stretch" },
  missionsInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
    gap: 10,
  },
  missionsLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  missionsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  missionsTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
  missionsSubtitle: { fontSize: 11, marginTop: 2 },
  missionsRight: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  missionsDots: { flexDirection: "row", gap: 4, alignItems: "center" },
  missionDot: { width: 8, height: 8, borderRadius: 4 },
  missionsDotLabel: { fontSize: 11, fontVariant: ["tabular-nums"] },

  /* ─── Stats ─── */
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 3,
    overflow: "hidden",
  },
  statAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  statValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "500" },

  /* ─── Rank Card ─── */
  rankCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  rankCardAccent: { height: 3 },
  rankCardInner: { flexDirection: "column", padding: 15, gap: 11 },
  rankTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  rankBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  rankPosition: { fontSize: 32, fontWeight: "900", letterSpacing: -0.5 },
  rankUserRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rankUserInfo: { flex: 1, gap: 2 },
  rankUserName: { fontSize: 14, fontWeight: "700" },
  rankUserMeta: { fontSize: 11, fontWeight: "500" },
  rankTotalBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  rankTotalText: { fontSize: 10, fontWeight: "600" },
  rankDivider: { borderTopWidth: 1 },
  rankAheadRow: { flexDirection: "row", alignItems: "center", gap: 7 },
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
  rankLeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  rankLeaderText: { fontSize: 14, fontWeight: "700" },
  rankCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 15,
    paddingBottom: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    gap: 4,
  },
  rankCardFooterText: { fontSize: 12, fontWeight: "500" },

  /* ─── Tips Button ─── */
  tipsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  tipsBtnIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tipsBtnText: { flex: 1, fontSize: 13, fontWeight: "600" },
});
