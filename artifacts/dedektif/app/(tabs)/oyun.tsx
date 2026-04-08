import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import type { BestResult } from "@/context/GameContext";
import { useSounds } from "@/hooks/useSounds";
import { usePurchase } from "@/context/PurchaseContext";
import DetectiveGrid from "@/components/DetectiveGrid";
import ClueCard from "@/components/ClueCard";
import TimerDisplay from "@/components/TimerDisplay";
import AnswerModal from "@/components/AnswerModal";
import ResultScreen from "@/components/ResultScreen";
import EntityInfoSheet from "@/components/EntityInfoSheet";
import PaywallModal from "@/components/PaywallModal";
import {
  getDailyPuzzle,
  getDifficultyColor,
  getDifficultyLabel,
  PUZZLES,
  type Difficulty,
  type GridMark,
} from "@/data/puzzles";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const FREE_PUZZLE_COUNT = 10;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={listStyles.sectionHeaderRow}>
      <View style={listStyles.sectionHeaderLeft}>
        <View style={listStyles.sectionAccentBar} />
        <Text style={listStyles.sectionHeaderText}>{title}</Text>
      </View>
      {right}
    </View>
  );
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
          listStyles.puzzleCard,
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
        <View style={listStyles.puzzleCardTop}>
          <View
            style={[
              listStyles.diffBadge,
              {
                backgroundColor: `${diffColor}22`,
                borderColor: `${diffColor}66`,
              },
            ]}
          >
            <Text style={[listStyles.diffText, { color: diffColor }]}>
              {getDifficultyLabel(puzzle.difficulty as Difficulty)}
            </Text>
          </View>
          <View style={listStyles.puzzleCardRight}>
            {locked ? (
              <View
                style={[
                  listStyles.lockBadge,
                  { backgroundColor: "#D4A84322", borderColor: "#D4A84366" },
                ]}
              >
                <Text style={[listStyles.lockText, { color: "#D4A843" }]}>Premium</Text>
              </View>
            ) : completed ? (
              <View
                style={[
                  listStyles.solvedBadge,
                  {
                    backgroundColor: `${colors.success}22`,
                    borderColor: `${colors.success}55`,
                  },
                ]}
              >
                <MaterialIcons name="check-circle" size={12} color={colors.success} />
                <Text style={[listStyles.solvedText, { color: colors.success }]}>
                  Çözüldü
                </Text>
              </View>
            ) : (
              <View style={listStyles.puzzleCardMeta}>
                <MaterialIcons name="person" size={13} color={colors.mutedForeground} />
                <Text style={[listStyles.metaText, { color: colors.mutedForeground }]}>
                  {puzzle.suspects.length} şüpheli
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text
          style={[
            listStyles.puzzleTitle,
            { color: locked ? colors.mutedForeground : colors.foreground },
          ]}
          numberOfLines={2}
        >
          {puzzle.title}
        </Text>

        {!locked && (
          <Text
            style={[listStyles.puzzleStory, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {puzzle.story}
          </Text>
        )}

        {locked ? (
          <View style={[listStyles.playRow, { borderTopColor: colors.border }]}>
            <Text style={[listStyles.playText, { color: "#D4A843" }]}>
              Kilidi açmak için dokun
            </Text>
            <MaterialIcons name="lock-open" size={18} color="#D4A843" />
          </View>
        ) : completed && bestResult ? (
          <View style={[listStyles.bestResultRow, { borderTopColor: colors.border }]}>
            <View style={listStyles.bestResultItem}>
              <MaterialIcons name="emoji-events" size={13} color={colors.primary} />
              <Text style={[listStyles.bestResultLabel, { color: colors.mutedForeground }]}>
                En İyi:
              </Text>
              <Text style={[listStyles.bestResultValue, { color: colors.primary }]}>
                {bestResult.score} puan
              </Text>
            </View>
            <View style={listStyles.bestResultItem}>
              <MaterialIcons name="timer" size={13} color={colors.mutedForeground} />
              <Text style={[listStyles.bestResultValue, { color: colors.mutedForeground }]}>
                {formatTime(bestResult.timeSeconds)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[listStyles.playRow, { borderTopColor: colors.border }]}>
            <Text style={[listStyles.playText, { color: colors.primary }]}>
              Oynamak için dokun
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function getTimeLimit(difficulty: string): number {
  if (difficulty === "baskomiser") return 360;
  if (difficulty === "dedektif") return 480;
  return 600;
}

interface PenaltyToast {
  visible: boolean;
  message: string;
}

export default function VakalarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    gameState,
    setGridMark,
    revealNextClue,
    submitAnswer,
    recordTimeout,
    tickTimer,
    resetCurrentGame,
    startPuzzle,
    completedPuzzleIds,
    bestScoreForPuzzle,
  } = useGame();
  const { isPremium } = usePurchase();
  const { play } = useSounds();

  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResultSuccess, setLastResultSuccess] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityInfo | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [penaltyToast, setPenaltyToast] = useState<PenaltyToast>({
    visible: false,
    message: "",
  });
  const [showPaywall, setShowPaywall] = useState(false);

  const timedOutRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accusePulse = useSharedValue(1);
  const accuseOpacity = useSharedValue(1);
  const toastOpacity = useSharedValue(0);

  const accusePulseStyle = useAnimatedStyle(() => ({
    transform: Platform.OS === "web" ? [] : [{ scale: accusePulse.value }],
    opacity: accuseOpacity.value,
  }));

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
  }));

  useEffect(() => {
    accusePulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 850 }),
        withTiming(1, { duration: 850 })
      ),
      -1,
      false
    );
    accuseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.82, { duration: 850 }),
        withTiming(1, { duration: 850 })
      ),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    if (gameState && !gameState.isComplete && !timedOut) {
      timerRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.isComplete, timedOut, tickTimer]);

  useEffect(() => {
    if (gameState?.isComplete) {
      play("success");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setLastResultSuccess(true);
      setShowResult(true);
    }
  }, [gameState?.isComplete, play]);

  useEffect(() => {
    timedOutRef.current = false;
    setTimedOut(false);
    setShowResult(false);
  }, [gameState?.puzzle?.id]);

  const timeElapsedNow = gameState?.timeElapsed ?? 0;
  const puzzleDifficulty = gameState?.puzzle?.difficulty ?? "caylik";
  const timeLimitNow = getTimeLimit(puzzleDifficulty);

  useEffect(() => {
    if (
      gameState?.puzzle &&
      !gameState.isComplete &&
      !timedOutRef.current &&
      timeElapsedNow >= timeLimitNow
    ) {
      timedOutRef.current = true;
      recordTimeout();
      setTimedOut(true);
      setLastResultSuccess(false);
      setShowResult(true);
    }
  }, [timeElapsedNow, gameState?.isComplete, gameState?.puzzle?.id]);

  const showPenaltyToast = (penaltySeconds: number) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const nextWrong = (gameState?.wrongGuesses ?? 0) + 1;
    setPenaltyToast({
      visible: true,
      message: `Yanlış tahmin! +${penaltySeconds}s ceza (${nextWrong}. hata)`,
    });
    toastOpacity.value = withTiming(1, { duration: 200 });
    toastTimerRef.current = setTimeout(() => {
      toastOpacity.value = withTiming(0, { duration: 400 });
      setTimeout(() => setPenaltyToast({ visible: false, message: "" }), 420);
    }, 2200);
  };

  const handleBackToList = () => {
    setShowResult(false);
    resetCurrentGame();
  };

  const handleCellPress = (key: string, nextMark: GridMark) => {
    setGridMark(key, nextMark);
    if (nextMark === "check") play("check");
    else if (nextMark === "cross") play("cross");
    else play("tap");
  };

  const handleRevealClue = () => {
    play("clue");
    revealNextClue();
  };

  const handleSubmit = (suspectId: string, weaponId: string, locationId: string) => {
    setShowAnswerModal(false);
    const currentWrongGuesses = gameState!.wrongGuesses;
    const success = submitAnswer(suspectId, weaponId, locationId);
    if (!success) {
      play("error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      const nextWrong = currentWrongGuesses + 1;
      const penaltySeconds = 30 * Math.pow(2, nextWrong - 1);
      showPenaltyToast(penaltySeconds);
    }
  };

  if (!gameState || !gameState.puzzle) {
    const dailyPuzzle = getDailyPuzzle();
    const archivePuzzles = PUZZLES.filter((p) => p.id !== dailyPuzzle.id);
    const freePuzzles = archivePuzzles.slice(0, FREE_PUZZLE_COUNT);
    const premiumPuzzles = archivePuzzles.slice(FREE_PUZZLE_COUNT);
    const premiumLockedCount = isPremium ? 0 : premiumPuzzles.length;

    return (
      <>
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
        <ScrollView
          style={[gameStyles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={[
            listStyles.listContent,
            {
              paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
              paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(0).springify()}>
            <View style={listStyles.listHeader}>
              <MaterialIcons name="folder-open" size={24} color={colors.primary} />
              <Text style={[listStyles.listHeaderText, { color: colors.primary }]}>
                Vaka Listesi
              </Text>
            </View>
          </Animated.View>

          <SectionHeader title="Başlangıç Seviyesi Vakalar" />

          {freePuzzles.map((puzzle, i) => {
            const isCompleted = completedPuzzleIds.has(puzzle.id);
            return (
              <PuzzleCard
                key={puzzle.id}
                puzzle={puzzle}
                onPress={() => startPuzzle(puzzle)}
                delay={100 + i * 50}
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
                    listStyles.premiumChip,
                    { backgroundColor: "#D4A84318", borderColor: "#D4A84355" },
                  ]}
                >
                  <MaterialIcons name="lock" size={12} color="#D4A843" />
                  <Text style={[listStyles.premiumChipText, { color: "#D4A843" }]}>
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
                listStyles.premiumBanner,
                { backgroundColor: "#D4A84310", borderColor: "#D4A84340" },
              ]}
            >
              <MaterialIcons name="workspace-premium" size={20} color="#D4A843" />
              <View style={listStyles.premiumBannerText}>
                <Text style={[listStyles.premiumBannerTitle, { color: "#D4A843" }]}>
                  Premium Vaka Arşivi'ni Aç
                </Text>
                <Text style={[listStyles.premiumBannerSub, { color: "#D4A84399" }]}>
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
                    startPuzzle(puzzle);
                  }
                }}
                delay={100 + (freePuzzles.length + i) * 40}
                completed={isCompleted && !isLocked}
                bestResult={
                  isCompleted && !isLocked ? bestScoreForPuzzle(puzzle.id) : null
                }
                locked={isLocked}
              />
            );
          })}
        </ScrollView>
      </>
    );
  }

  const {
    puzzle,
    gridState,
    cluesRevealed,
    timeElapsed,
    wrongGuesses,
    wrongGuessPenaltySeconds,
    finalScore,
  } = gameState;

  const timeLimit = getTimeLimit(puzzle.difficulty);
  const remainingTime = Math.max(0, timeLimit - timeElapsed - wrongGuessPenaltySeconds);
  const canRevealMore =
    cluesRevealed[cluesRevealed.length - 1] < puzzle.clues.length - 1;
  const displayScore = finalScore ?? 0;

  return (
    <View style={[gameStyles.container, { backgroundColor: colors.background }]}>
      {showResult && (
        <ResultScreen
          puzzle={puzzle}
          success={lastResultSuccess}
          score={displayScore}
          timeSeconds={timeElapsed}
          wrongGuesses={wrongGuesses}
          penaltySeconds={wrongGuessPenaltySeconds}
          gridState={gridState}
          onPlayMore={handleBackToList}
          onClose={handleBackToList}
        />
      )}

      {penaltyToast.visible && (
        <Animated.View
          style={[
            gameStyles.penaltyToast,
            { backgroundColor: "#C8372D" },
            toastStyle,
          ]}
          pointerEvents="none"
        >
          <MaterialIcons name="gavel" size={16} color="#fff" />
          <Text style={gameStyles.penaltyToastText}>{penaltyToast.message}</Text>
        </Animated.View>
      )}

      <ScrollView
        style={gameStyles.scroll}
        contentContainerStyle={[
          gameStyles.content,
          {
            paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12,
            paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <View style={gameStyles.puzzleHeader}>
            <View style={gameStyles.puzzleHeaderLeft}>
              <Pressable
                onPress={handleBackToList}
                style={gameStyles.backBtn}
                hitSlop={8}
              >
                <MaterialIcons name="arrow-back" size={20} color={colors.mutedForeground} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[gameStyles.caseNumber, { color: colors.mutedForeground }]}>
                  VAKA #{puzzle.dayIndex.toString().padStart(3, "0")}
                </Text>
                <Text style={[gameStyles.puzzleTitle, { color: colors.foreground }]}>
                  {puzzle.title}
                </Text>
              </View>
            </View>
            <TimerDisplay
              seconds={remainingTime}
              wrongGuesses={wrongGuesses}
              penaltySeconds={wrongGuessPenaltySeconds}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View
            style={[
              gameStyles.storyBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={gameStyles.storyHeader}>
              <MaterialIcons name="auto-stories" size={16} color={colors.primary} />
              <Text style={[gameStyles.storyLabel, { color: colors.primary }]}>OLAY</Text>
            </View>
            <Text style={[gameStyles.storyText, { color: colors.foreground }]}>
              {puzzle.story}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Text style={[gameStyles.sectionTitle, { color: colors.foreground }]}>
            Dedektif Izgarası
          </Text>
          <View
            style={[
              gameStyles.gridContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={gameStyles.gridWrapper}>
              <DetectiveGrid
                suspects={puzzle.suspects}
                weapons={puzzle.weapons}
                locations={puzzle.locations}
                gridState={gridState}
                onCellPress={handleCellPress}
                disabled={gameState.isComplete || timedOut}
                onHeaderPress={setSelectedEntity}
                isComplete={gameState.isComplete}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <View style={gameStyles.cluesHeader}>
            <Text style={[gameStyles.sectionTitle, { color: colors.foreground }]}>
              İpuçları
            </Text>
            {canRevealMore && !gameState.isComplete && !timedOut && (
              <Pressable
                onPress={handleRevealClue}
                style={[gameStyles.revealAllBtn, { borderColor: colors.border }]}
              >
                <MaterialIcons name="add" size={14} color={colors.mutedForeground} />
                <Text style={[gameStyles.revealAllText, { color: colors.mutedForeground }]}>
                  Sonraki
                </Text>
              </Pressable>
            )}
          </View>
          {puzzle.clues.map((clue, i) => (
            <ClueCard
              key={clue.id}
              clue={clue}
              index={i}
              isRevealed={cluesRevealed.includes(i)}
              onReveal={
                i === (cluesRevealed[cluesRevealed.length - 1] ?? 0) + 1
                  ? handleRevealClue
                  : undefined
              }
            />
          ))}
        </Animated.View>
      </ScrollView>

      {!gameState.isComplete && !timedOut && (
        <View
          style={[
            gameStyles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom,
            },
          ]}
        >
          <Animated.View style={accusePulseStyle}>
            <Pressable
              testID="accuse-button"
              onPress={() => setShowAnswerModal(true)}
              style={[gameStyles.accuseBtn, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="gavel" size={22} color={colors.primaryForeground} />
              <Text style={[gameStyles.accuseText, { color: colors.primaryForeground }]}>
                SUÇLA
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {showAnswerModal && (
        <AnswerModal
          visible={showAnswerModal}
          puzzle={puzzle}
          onSubmit={handleSubmit}
          onClose={() => setShowAnswerModal(false)}
        />
      )}

      <EntityInfoSheet
        visible={selectedEntity !== null}
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
      />
    </View>
  );
}

const listStyles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, gap: 12 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  listHeaderText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
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

const gameStyles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 10, gap: 16 },
  puzzleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  puzzleHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    marginTop: 2,
  },
  caseNumber: { fontSize: 10, fontWeight: "700", letterSpacing: 2, marginBottom: 2 },
  puzzleTitle: { fontSize: 18, fontWeight: "700", lineHeight: 26 },
  storyBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  storyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  storyLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  storyText: { fontSize: 14, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  gridContainer: { borderRadius: 14, borderWidth: 1, padding: 10, overflow: "hidden" },
  gridWrapper: { minHeight: 240 },
  cluesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  revealAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  revealAllText: { fontSize: 12, fontWeight: "600" },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  accuseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  accuseText: { fontSize: 18, fontWeight: "700", letterSpacing: 2 },
  penaltyToast: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    zIndex: 200,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  penaltyToastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
});
