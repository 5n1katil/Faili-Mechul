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
  PUZZLES,
  type Difficulty,
} from "@/data/puzzles";
import { getPackPuzzleById } from "@/data/packs";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import OnboardingScreen from "@/components/OnboardingScreen";
import SettingsScreen from "@/components/SettingsScreen";
import { unlockMusicFromGesture } from "@/utils/backgroundMusic";
import { setPendingNavSource } from "@/utils/pendingNavSource";
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
  const dailyCardScale = useSharedValue(1);
  const dailyCardAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: dailyCardScale.value }] }));

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showSolvedInfo, setShowSolvedInfo] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
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
    setPendingNavSource("home");
    router.navigate("/(tabs)/oyun");
    requestAnimationFrame(() => startDailyPuzzle());
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

  const recentSolves = gameHistory.filter((h) => h.completed).slice(0, 5);
  const avgScore = profile.gamesWon > 0 ? Math.round(profile.totalScore / profile.gamesWon) : 0;

  const BADGE_INFO = [
    { id: "ilk_cozum", label: "İlk Çözüm", icon: "emoji-events" as const, color: "#D4A843" },
    { id: "bes_cozum", label: "5 Vaka Çözüldü", icon: "military-tech" as const, color: "#D4A843" },
    { id: "on_cozum", label: "10 Vaka Çözüldü", icon: "workspace-premium" as const, color: "#D4A843" },
    { id: "yirmi_cozum", label: "20 Vaka Çözüldü", icon: "diamond" as const, color: "#A855F7" },
    { id: "uzman_dedektif", label: "Uzman Dedektif", icon: "verified" as const, color: "#A855F7" },
    { id: "soguk_iz", label: "3 Günlük Seri", icon: "local-fire-department" as const, color: "#FF6B35" },
    { id: "hafta_serisi", label: "7 Günlük Seri", icon: "whatshot" as const, color: "#FF6B35" },
    { id: "on_seri", label: "10 Günlük Seri", icon: "flare" as const, color: "#FF6B35" },
    { id: "hatasiz", label: "Hatasız Çözüm", icon: "stars" as const, color: "#4CAF50" },
    { id: "hizli_dedektif", label: "Hızlı Dedektif", icon: "speed" as const, color: "#2196F3" },
  ];
  const earnedBadges = BADGE_INFO.filter((b) => (profile.badges ?? []).includes(b.id));
  const unearnedBadges = BADGE_INFO.filter((b) => !(profile.badges ?? []).includes(b.id));

  return (
    <>
      <OnboardingScreen
        visible={showOnboarding}
        onDone={handleOnboardingDone}
      />
      <OnboardingScreen
        visible={showHowToPlay}
        onDone={() => setShowHowToPlay(false)}
        closeLabel="Kapat"
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
            <Image source={require("../../assets/images/icon_seri.png")} style={{ width: 72, height: 72 }} resizeMode="contain" />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Günlük Seri</Text>
            <Text style={[styles.streakCount, { color: "#FF6B35" }]}>{profile.currentStreak}</Text>
            <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>gün üst üste</Text>
            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
              Üst üste bulmaca çözdüğün gün sayısı. Her gün en az bir bulmacayı başarıyla çözersen serin artar. Bir gün atlasan sıfırlanır.
            </Text>
            <Pressable
              onPress={() => setShowStreakInfo(false)}
              style={({ pressed }) => [
                styles.modalBtn,
                { backgroundColor: pressed ? "#B8922F" : colors.primary, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>Anladım</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Çözülen Modal */}
      <Modal visible={showSolvedInfo} transparent animationType="fade" onRequestClose={() => setShowSolvedInfo(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSolvedInfo(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: `${colors.primary}60` }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Image source={require("../../assets/images/icon_cozulen.png")} style={{ width: 72, height: 72 }} resizeMode="contain" />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Çözülen Vakalar</Text>
            <Text style={[styles.streakCount, { color: colors.primary }]}>{profile.gamesWon}</Text>
            <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>vaka başarıyla çözüldü</Text>

            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            {recentSolves.length > 0 ? (
              <View style={{ width: "100%", gap: 0 }}>
                <Text style={[styles.listSectionLabel, { color: colors.mutedForeground, marginBottom: 6 }]}>Son çözülenler</Text>
                {recentSolves.map((h, i) => {
                  const puzzle = PUZZLES.find((p) => p.id === h.puzzleId);
                  const title = puzzle?.title ?? getPackPuzzleById(h.puzzleId)?.title ?? h.puzzleId;
                  const mins = Math.floor(h.timeSeconds / 60);
                  const secs = h.timeSeconds % 60;
                  return (
                    <View
                      key={`${h.puzzleId}-${h.date}-${i}`}
                      style={[styles.solveRow, { borderTopColor: colors.border }, i === 0 && { borderTopWidth: 0 }]}
                    >
                      <View style={[styles.solveRankBubble, { backgroundColor: `${colors.primary}18` }]}>
                        <Text style={[styles.solveRankText, { color: colors.primary }]}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={[styles.solveTitle, { color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {title}
                        </Text>
                        <Text style={[styles.solveMeta, { color: colors.mutedForeground }]}>
                          {h.date} · {mins}:{secs.toString().padStart(2, "0")}dk{h.wrongGuesses > 0 ? ` · ${h.wrongGuesses} hata` : ""}
                        </Text>
                      </View>
                      <Text style={[styles.solveScore, { color: colors.primary }]}>{h.score.toLocaleString("tr-TR")}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="inbox" size={32} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
                <Text style={[styles.emptyStateText, { color: colors.mutedForeground }]}>Henüz çözülmüş vaka yok</Text>
              </View>
            )}

            {earnedBadges.length > 0 && (
              <>
                <View style={[styles.modalDivider, { backgroundColor: colors.border, marginVertical: 4 }]} />
                <Text style={[styles.listSectionLabel, { color: colors.mutedForeground, marginBottom: 4 }]}>Kazanılan rozetler</Text>
                <View style={styles.badgeGrid}>
                  {earnedBadges.map((b) => (
                    <View key={b.id} style={[styles.badgeChip, { backgroundColor: `${b.color}18`, borderColor: `${b.color}40` }]}>
                      <MaterialIcons name={b.icon} size={13} color={b.color} />
                      <Text style={[styles.badgeChipText, { color: b.color }]}>{b.label}</Text>
                    </View>
                  ))}
                  {unearnedBadges.slice(0, 2).map((b) => (
                    <View key={b.id} style={[styles.badgeChip, { backgroundColor: `${colors.border}50`, borderColor: colors.border, opacity: 0.5 }]}>
                      <MaterialIcons name="lock-outline" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.badgeChipText, { color: colors.mutedForeground }]}>{b.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Pressable
              onPress={() => setShowSolvedInfo(false)}
              style={({ pressed }) => [
                styles.modalBtn,
                { backgroundColor: pressed ? "#B8922F" : colors.primary, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>Anladım</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Toplam Puan Modal */}
      <Modal visible={showScoreInfo} transparent animationType="fade" onRequestClose={() => setShowScoreInfo(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowScoreInfo(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: "#9333ea60" }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Image source={require("../../assets/images/icon_toplam_puan.png")} style={{ width: 72, height: 72 }} resizeMode="contain" />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Toplam Puan</Text>
            <Text style={[styles.scoreCount, { color: "#9333ea" }]}>
              {profile.totalScore.toLocaleString("tr-TR")}
            </Text>

            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            <View style={styles.scoreStatGrid}>
              <View style={styles.scoreStatItem}>
                <Text style={[styles.scoreStatValue, { color: colors.foreground }]}>#{myRank}</Text>
                <Text style={[styles.scoreStatLabel, { color: colors.mutedForeground }]}>Sıralama</Text>
              </View>
              <View style={[styles.scoreStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.scoreStatItem}>
                <Text style={[styles.scoreStatValue, { color: colors.foreground }]}>
                  {avgScore > 0 ? avgScore.toLocaleString("tr-TR") : "—"}
                </Text>
                <Text style={[styles.scoreStatLabel, { color: colors.mutedForeground }]}>Ort. Puan</Text>
              </View>
              <View style={[styles.scoreStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.scoreStatItem}>
                <Text style={[styles.scoreStatValue, { color: colors.foreground }]}>{profile.gamesWon}</Text>
                <Text style={[styles.scoreStatLabel, { color: colors.mutedForeground }]}>Çözülen</Text>
              </View>
            </View>

            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            {personAbove ? (
              <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>{personAbove.name}</Text>
                {"'ı geçmek için "}
                <Text style={{ color: "#9333ea", fontWeight: "700" }}>
                  {scoreDiff.toLocaleString("tr-TR")} puan
                </Text>
                {" daha kazanman gerekiyor."}
              </Text>
            ) : (
              <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
                {"Tebrikler! "}
                <Text style={{ color: "#D4A843", fontWeight: "700" }}>Liderlik tablosunun zirvesinde</Text>
                {" yer alıyorsun."}
              </Text>
            )}

            <View style={[styles.scoreTipBox, { backgroundColor: `#9333ea10`, borderColor: `#9333ea30` }]}>
              <MaterialIcons name="info-outline" size={14} color="#9333ea" style={{ marginTop: 1 }} />
              <Text style={[styles.scoreTipText, { color: colors.mutedForeground }]}>
                Puan; çözüm süresi, hata sayısı, zorluk seviyesi ve günlük seriye göre hesaplanır.
              </Text>
            </View>

            <Pressable
              onPress={() => setShowScoreInfo(false)}
              style={({ pressed }) => [
                styles.modalBtn,
                { backgroundColor: pressed ? "#7B28C8" : "#9333ea", transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>Anladım</Text>
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
        {/* Header */}
        <View style={[styles.headerRow, { paddingLeft: 16, paddingRight: 16, paddingBottom: 10 }]}>
          <View style={styles.headerBrand}>
            <View style={styles.headerLogoWrap}>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.headerLogo}
                resizeMode="cover"
              />
              <View style={styles.headerLogoGlow} />
            </View>
            <View>
              <Text style={[styles.greetingSmall, { color: "rgba(255,255,255,0.55)" }]}>
                Merhaba, {profile.name}
              </Text>
              <Text style={[styles.appTitle, { color: colors.primary }]}>FAİLİ MEÇHUL</Text>
              <Text style={[styles.appSubtitle, { color: "rgba(212,168,67,0.6)" }]}>
                Dedektif Bulmaca Oyunu
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => { unlockMusicFromGesture(); setShowHowToPlay(true); }}
              style={({ pressed }) => [styles.iconBtnImg, { opacity: pressed ? 0.6 : 1, transform: [{ scale: pressed ? 0.88 : 1 }] }]}
              hitSlop={8}
              accessibilityLabel="Nasıl Oynanır"
            >
              <Image source={require("../../assets/images/icon_nasil_oynanir.png")} style={styles.headerIconImg} resizeMode="contain" />
            </Pressable>
            <Pressable
              onPress={handleSettingsPress}
              style={({ pressed }) => [styles.iconBtnImg, { opacity: pressed ? 0.6 : 1, transform: [{ scale: pressed ? 0.88 : 1 }] }]}
              hitSlop={8}
              accessibilityLabel="Ayarlar"
            >
              <Image source={require("../../assets/images/icon_ayarlar.png")} style={styles.headerIconImg} resizeMode="contain" />
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
          <Animated.View entering={FadeInDown.delay(80).springify()} style={dailyCardAnimStyle}>
            <Pressable
              onPress={handleDailyPlay}
              onPressIn={() => { dailyCardScale.value = withSpring(0.97, { damping: 15, stiffness: 400 }); }}
              onPressOut={() => { dailyCardScale.value = withSpring(1, { damping: 12, stiffness: 280 }); }}
              style={({ pressed }) => [
                styles.dailyCard,
                {
                  backgroundColor: pressed
                    ? wonToday ? "#1F2D15" : "#252E55"
                    : wonToday ? "#192310" : "#1E2540",
                  borderColor: wonToday ? "#D4A84355" : "#D4A84388",
                },
              ]}
            >
              {/* Subtle top gradient line */}
              <View style={[styles.dailyTopLine, { backgroundColor: wonToday ? "#D4A84340" : "#D4A843" }]} />

              <View style={styles.dailyCardInner}>
                {/* Decorative pocket watch — top right */}
                <View pointerEvents="none" style={{ position: "absolute", top: -8, right: -8, width: 80, height: 80 }}>
                  <Image
                    source={require("../../assets/images/icon_gunun_vakasi.png")}
                    style={{ width: 80, height: 80, opacity: 0.28 }}
                    resizeMode="contain"
                  />
                </View>

                {/* Top row: badge + done */}
                <View style={styles.dailyTop}>
                  <View style={styles.dailyBadge}>
                    <Text style={styles.dailyBadgeText}>GÜNÜN VAKASI</Text>
                  </View>
                  {wonToday && (
                    <View style={styles.doneBadge}>
                      <MaterialIcons name="check-circle" size={12} color="#4ADE80" />
                      <Text style={styles.doneText}>Çözüldü</Text>
                    </View>
                  )}
                </View>

                {/* Puzzle title */}
                <Text
                  style={styles.dailyTitle}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {dailyPuzzle.title}
                </Text>

                {/* Countdown + difficulty */}
                <View style={[styles.countdownRow, { borderTopColor: "#D4A84322" }]}>
                  <View style={styles.countdownLeft}>
                    <MaterialIcons name="schedule" size={12} color="rgba(212,168,67,0.5)" />
                    <Text style={styles.countdownLabel}>Yeni bulmacaya:</Text>
                    <Text style={styles.countdownValue}>{countdown}</Text>
                  </View>
                  <View style={[styles.diffBadge, { backgroundColor: `${diffColor}18`, borderColor: `${diffColor}50` }]}>
                    <Text style={[styles.diffText, { color: diffColor }]}>
                      {getDifficultyLabel(dailyPuzzle.difficulty as Difficulty)}
                    </Text>
                  </View>
                </View>

                {/* CTA button */}
                <View style={[styles.playCta, wonToday ? styles.playCtaSolved : styles.playCtaActive]}>
                  <MaterialIcons
                    name={wonToday ? "replay" : "play-arrow"}
                    size={20}
                    color={wonToday ? "#D4A843" : "#0F1117"}
                  />
                  <Text style={[styles.playCtaText, { color: wonToday ? "#D4A843" : "#0F1117" }]}>
                    {wonToday ? "Tekrar Oyna" : "Oyna"}
                  </Text>
                </View>
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
              const allDone = incompleteDailyCount === 0;

              return (
                <Pressable
                  onPress={() => router.push("/(tabs)/gorevler")}
                  style={({ pressed }) => [
                    styles.missionsCard,
                    { borderColor: allDone ? "#4ADE8030" : "#60A5FA22", transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.88 : 1 },
                  ]}
                >
                  <View style={styles.missionsInner}>
                    <View style={[styles.missionsIconWrap, { backgroundColor: "transparent" }]}>
                      <Image source={require("../../assets/images/icon_gorevler.png")} style={{ width: 38, height: 38 }} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.missionsTitle}>Günlük Görevler</Text>
                      <Text style={[styles.missionsSubtitle, { color: allDone ? "#4ADE8099" : "rgba(255,255,255,0.35)" }]}>
                        {allDone ? "Tüm görevler tamamlandı!" : `${incompleteDailyCount} görev · +${totalPoints} puan`}
                      </Text>
                    </View>
                    <View style={styles.missionsRight}>
                      <View style={styles.missionsDots}>
                        {DAILY_MISSIONS.map((m) => {
                          const prog = getMissionProgress(m.id);
                          const done = isAwarded(m.id) || prog.completed;
                          return (
                            <View key={m.id} style={[styles.missionDot, { backgroundColor: done ? "#4ADE80" : "#FFFFFF18" }]} />
                          );
                        })}
                      </View>
                      <Text style={styles.missionsDotLabel}>{completedToday}/{DAILY_MISSIONS.length}</Text>
                      <MaterialIcons name="chevron-right" size={16} color="rgba(255,255,255,0.25)" />
                    </View>
                  </View>
                </Pressable>
              );
            })()}
          </Animated.View>

          {/* Stats Row */}
          <Animated.View entering={FadeInDown.delay(210).springify()}>
            <View style={styles.statsRow}>
              <Pressable
                onPress={() => setShowSolvedInfo(true)}
                style={({ pressed }) => [
                  styles.statCard,
                  {
                    backgroundColor: pressed ? "#252E55" : colors.card,
                    borderColor: `${colors.primary}50`,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                <View style={[styles.statAccent, { backgroundColor: colors.primary }]} />
                <Image source={require("../../assets/images/icon_cozulen.png")} style={styles.statIcon} resizeMode="contain" />
                <Text style={[styles.statValue, { color: colors.primary }]}>{profile.gamesWon}</Text>
                <Text style={[styles.statLabel, { color: "#FFFFFF" }]}>Çözülen</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowScoreInfo(true)}
                style={({ pressed }) => [
                  styles.statCard,
                  {
                    backgroundColor: pressed ? "#1E1830" : colors.card,
                    borderColor: "#9333ea50",
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                <View style={[styles.statAccent, { backgroundColor: "#9333ea" }]} />
                <Image source={require("../../assets/images/icon_toplam_puan.png")} style={styles.statIcon} resizeMode="contain" />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{profile.totalScore.toLocaleString("tr-TR")}</Text>
                <Text style={[styles.statLabel, { color: "#FFFFFF" }]}>Toplam Puan</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowStreakInfo(true)}
                style={({ pressed }) => [
                  styles.statCard,
                  {
                    backgroundColor: pressed ? "#221A12" : colors.card,
                    borderColor: "#FF6B3550",
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                <View style={[styles.statAccent, { backgroundColor: "#FF6B35" }]} />
                <Image source={require("../../assets/images/icon_seri.png")} style={styles.statIcon} resizeMode="contain" />
                <Text style={[styles.statValue, { color: "#FF6B35" }]}>{profile.currentStreak}</Text>
                <Text style={[styles.statLabel, { color: "#FFFFFF" }]}>Seri</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Leaderboard Card */}
          <Animated.View entering={FadeInDown.delay(270).springify()}>
            <Pressable
              onPress={() => router.push("/liderlik")}
              style={({ pressed }) => [styles.rankCard, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}
            >
              <View style={styles.rankCardAccent} />

              {/* Decorative trophy — top-left */}
              <Image
                source={require("../../assets/images/icon_liderlik.png")}
                style={styles.rankDecorIcon}
                resizeMode="contain"
              />

              <View style={styles.rankCardInner}>
                {/* Top row: badge + rank number */}
                <View style={styles.rankTopRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>Liderlik Sıralaması</Text>
                  </View>
                  <Text style={styles.rankPosition}>#{myRank}</Text>
                </View>

                {/* User row */}
                <View style={styles.rankUserRow}>
                  <View style={[styles.rankUserAvatar, { borderColor: "#D4A84366", backgroundColor: "#D4A84315" }]}>
                    <AvatarDisplay
                      avatar={profile.avatar || "detective"}
                      size={32}
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
                    <Text style={[styles.rankTotalText, { color: "#D4A843" }]}>
                      {allEntries.length} dedektif
                    </Text>
                  </View>
                </View>

                <View style={styles.rankDivider} />

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
                    <Text style={[styles.rankAheadScore, { color: "#D4A843" }]} numberOfLines={1}>
                      {scoreDiff.toLocaleString("tr-TR")} puan gerisindesin
                    </Text>
                  </View>
                ) : (
                  <View style={styles.rankLeaderRow}>
                    <Image source={require("../../assets/images/icon_liderlik.png")} style={{ width: 18, height: 18 }} resizeMode="contain" />
                    <Text style={[styles.rankLeaderText, { color: "#D4A843" }]}>Sen zirvedesin!</Text>
                  </View>
                )}
              </View>

              <View style={[styles.rankCardFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.rankCardFooterText, { color: "#FFFFFF" }]}>Tam sıralamayı gör</Text>
                <MaterialIcons name="chevron-right" size={18} color="#FFFFFF" />
              </View>
            </Pressable>
          </Animated.View>

          {/* Tips compact button */}
          <Animated.View entering={FadeInDown.delay(330).springify()}>
            <Pressable
              onPress={() => setShowTips(true)}
              style={({ pressed }) => [
                styles.tipsBtn,
                { backgroundColor: pressed ? "#252B40" : colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <View style={[styles.tipsBtnIcon, { backgroundColor: "transparent" }]}>
                <Image source={require("../../assets/images/icon_ipuclari.png")} style={{ width: 32, height: 32 }} resizeMode="contain" />
              </View>
              <Text style={[styles.tipsBtnText, { color: colors.foreground }]}>Dedektif İpuçları</Text>
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
  modalTitle: { fontFamily: "DroidSerifRegular", fontSize: 20, fontWeight: "800", letterSpacing: 0.3, marginTop: 4 },
  streakCount: { fontFamily: "DroidSerifRegular", fontSize: 64, fontWeight: "900", lineHeight: 72 },
  streakLabel: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "500", marginTop: -4 },
  modalDivider: { height: 1, width: "100%", marginVertical: 8 },
  modalDesc: { fontFamily: "DroidSerifRegular", fontSize: 13, lineHeight: 20, textAlign: "center" },
  modalBtn: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalBtnText: { fontFamily: "DroidSerifRegular", fontSize: 15, fontWeight: "700" },

  /* Çözülen / List Modal */
  listModalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
  },
  listModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 16,
  },
  listModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  listModalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  listModalTitle: { fontFamily: "DroidSerifRegular", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  listModalSub: { fontFamily: "DroidSerifRegular", fontSize: 12, fontWeight: "500", marginTop: 2 },
  listSectionLabel: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 },
  solveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  solveRankBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  solveRankText: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "700" },
  solveTitle: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "700" },
  solveMeta: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "400" },
  solveScore: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "800", flexShrink: 0 },
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyStateText: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "500" },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeChipText: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "600" },

  /* Toplam Puan Modal */
  scoreCount: { fontFamily: "DroidSerifRegular", fontSize: 42, fontWeight: "900", letterSpacing: -1, lineHeight: 50 },
  scoreStatGrid: { flexDirection: "row", width: "100%", alignItems: "center" },
  scoreStatItem: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 },
  scoreStatValue: { fontFamily: "DroidSerifRegular", fontSize: 18, fontWeight: "800" },
  scoreStatLabel: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "500" },
  scoreStatDivider: { width: 1, height: 32, opacity: 0.5 },
  scoreTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  scoreTipText: { flex: 1, fontFamily: "DroidSerifRegular", fontSize: 11, lineHeight: 16 },

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
  tipsModalTitle: { fontSize: 16, fontFamily: "UnnaBold", fontWeight: "600", letterSpacing: 0.2 },
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
  tipText: { flex: 1, fontFamily: "DroidSerifRegular", fontSize: 13, lineHeight: 19 },

  /* ─── Header ─── */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 11 },
  headerLogoWrap: { position: "relative" },
  headerLogo: { width: 50, height: 50, borderRadius: 25 },
  headerLogoGlow: {
    position: "absolute", inset: -2, borderRadius: 27,
    borderWidth: 1.5, borderColor: "#D4A84355",
  },
  greetingSmall: { fontFamily: "DroidSerifRegular", fontSize: 11, letterSpacing: 0.3, marginBottom: 1 },
  appTitle: { fontSize: 26, fontFamily: "UnnaBold", fontWeight: "700", letterSpacing: 0.6, color: "#D4A843" },
  appSubtitle: { fontFamily: "DroidSerifRegular", fontSize: 11, letterSpacing: 0.5, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnImg: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconImg: {
    width: 44,
    height: 44,
  },

  /* ─── Daily Card ─── */
  dailyCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  dailyTopLine: { height: 2 },
  dailyCardInner: { padding: 16, gap: 13 },
  dailyTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dailyBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 4,
    backgroundColor: "#D4A843",
  },
  dailyBadgeText: { fontSize: 16, fontFamily: "UnnaBold", fontWeight: "700", letterSpacing: 1.2, color: "#0F1117", textAlign: "center" },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
    backgroundColor: "#4ADE8015",
    borderWidth: 1,
    borderColor: "#4ADE8035",
  },
  doneText: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "600", color: "#4ADE80" },
  dailyTitle: {
    fontSize: 20,
    fontFamily: "UnnaBold",
    fontWeight: "700",
    lineHeight: 26,
    letterSpacing: 0.1,
    color: "#FFFFFF",
  },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 11,
  },
  countdownLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  countdownLabel: { fontFamily: "DroidSerifRegular", fontSize: 13, color: "rgba(212,168,67,0.75)" },
  countdownValue: { fontFamily: "DroidSerifRegular", fontSize: 16, fontWeight: "700", color: "#D4A843", fontVariant: ["tabular-nums"] },
  diffBadge: { borderRadius: 5, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  diffText: { fontFamily: "DroidSerifRegular", fontSize: 12, fontWeight: "700" },
  playCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 13,
  },
  playCtaActive: { backgroundColor: "#D4A843" },
  playCtaSolved: { backgroundColor: "#D4A84318", borderWidth: 1, borderColor: "#D4A84340" },
  playCtaText: { fontSize: 20, fontFamily: "UnnaBold", fontWeight: "700", letterSpacing: 0.5 },

  /* ─── Missions ─── */
  missionsCard: {
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#1E2540",
  },
  missionsInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    gap: 12,
  },
  missionsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  missionsTitle: { fontSize: 18, fontFamily: "UnnaBold", fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.1 },
  missionsSubtitle: { fontSize: 13, fontFamily: "DroidSerifRegular", marginTop: 2 },
  missionsRight: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  missionsDots: { flexDirection: "row", gap: 4, alignItems: "center" },
  missionDot: { width: 11, height: 11, borderRadius: 5.5 },
  missionsDotLabel: { fontFamily: "DroidSerifRegular", fontSize: 11, color: "rgba(255,255,255,0.35)", fontVariant: ["tabular-nums"] },

  /* ─── Stats ─── */
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 3,
    overflow: "hidden",
    backgroundColor: "#1E2540",
  },
  statAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  statIcon: { width: 36, height: 36, marginTop: 4 },
  statValue: { fontSize: 24, fontFamily: "UnnaBold", fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 14, fontFamily: "UnnaBold", fontWeight: "600", color: "rgba(255,255,255,0.85)" },

  /* ─── Rank Card ─── */
  rankCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D4A84330",
    backgroundColor: "#1E2540",
    overflow: "hidden",
  },
  rankCardAccent: { height: 2, backgroundColor: "#D4A843" },
  rankDecorIcon: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 82,
    height: 82,
    opacity: 0.22,
  },
  rankCardInner: { flexDirection: "column", paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  rankTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#D4A84312",
    borderColor: "#D4A84340",
    marginLeft: 68,
  },
  rankBadgeText: { fontSize: 17, fontFamily: "UnnaBold", color: "#D4A843", letterSpacing: 0.2 },
  rankPosition: { fontSize: 32, fontFamily: "UnnaBold", color: "#D4A843", letterSpacing: -0.5 },
  rankUserRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D4A84355",
    backgroundColor: "#D4A84310",
    alignItems: "center",
    justifyContent: "center",
  },
  rankUserInfo: { flex: 1, gap: 2 },
  rankUserName: { fontSize: 16, fontFamily: "UnnaBold", fontWeight: "700", color: "#FFFFFF" },
  rankUserMeta: { fontFamily: "DroidSerifRegular", fontSize: 13, color: "rgba(255,255,255,0.55)" },
  rankTotalBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "#D4A84340", backgroundColor: "#D4A84318" },
  rankTotalText: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "700", color: "#D4A843" },
  rankDivider: { borderTopWidth: 1, borderTopColor: "#FFFFFF0F" },
  rankAheadRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  rankAheadLabel: { fontFamily: "DroidSerifRegular", fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  rankAheadAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D4A84325",
    backgroundColor: "#D4A84310",
    alignItems: "center",
    justifyContent: "center",
  },
  rankAheadName: { fontSize: 14, fontFamily: "UnnaBold", fontWeight: "600", color: "#FFFFFF", flexShrink: 1 },
  rankAheadScore: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "700", color: "#D4A843" },
  rankLeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  rankLeaderText: { fontSize: 14, fontFamily: "UnnaBold", fontWeight: "600", color: "#D4A843" },
  rankCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingLeft: 15,
    paddingRight: 16,
    paddingBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#FFFFFF0F",
    gap: 4,
  },
  rankCardFooterText: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  /* ─── Tips Button ─── */
  tipsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D4A84320",
    backgroundColor: "#1E2540",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tipsBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#D4A84315",
    alignItems: "center",
    justifyContent: "center",
  },
  tipsBtnText: { flex: 1, fontSize: 18, fontFamily: "UnnaBold", fontWeight: "700", color: "rgba(255,255,255,0.85)" },
});
