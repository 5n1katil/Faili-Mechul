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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { useSounds } from "@/hooks/useSounds";
import DetectiveGrid from "@/components/DetectiveGrid";
import ClueCard from "@/components/ClueCard";
import TimerDisplay from "@/components/TimerDisplay";
import AnswerModal from "@/components/AnswerModal";
import ResultScreen from "@/components/ResultScreen";
import EntityInfoSheet from "@/components/EntityInfoSheet";
import type { GridMark } from "@/data/puzzles";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function getTimeLimit(difficulty: string): number {
  if (difficulty === "baskomiser") return 360;
  if (difficulty === "dedektif") return 480;
  return 600;
}

interface PenaltyToast {
  visible: boolean;
  message: string;
}

export default function OyunScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    gameState,
    startDailyPuzzle,
    setGridMark,
    revealNextClue,
    submitAnswer,
    recordTimeout,
    tickTimer,
    resetCurrentGame,
  } = useGame();
  const { play } = useSounds();

  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResultSuccess, setLastResultSuccess] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityInfo | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [penaltyToast, setPenaltyToast] = useState<PenaltyToast>({ visible: false, message: "" });
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
        withTiming(1, { duration: 850 }),
      ),
      -1,
      false
    );
    accuseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.82, { duration: 850 }),
        withTiming(1, { duration: 850 }),
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

  if (!gameState || !gameState.puzzle) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === "web" ? 67 : insets.top,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom,
          },
        ]}
      >
        <MaterialIcons name="search" size={56} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Bulmaca Seçilmedi
        </Text>
        <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
          Ana sayfadan bir bulmaca seçerek dedektiflik kariyerine başla.
        </Text>
        <Pressable
          onPress={() => {
            startDailyPuzzle();
          }}
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
        >
          <MaterialIcons name="play-arrow" size={20} color={colors.primaryForeground} />
          <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>
            Günlük Bulmacayı Başlat
          </Text>
        </Pressable>
      </View>
    );
  }

  const { puzzle, gridState, cluesRevealed, timeElapsed, wrongGuesses, wrongGuessPenaltySeconds, finalScore } =
    gameState;

  const timeLimit = getTimeLimit(puzzle.difficulty);
  const remainingTime = Math.max(0, timeLimit - timeElapsed - wrongGuessPenaltySeconds);
  const canRevealMore = cluesRevealed[cluesRevealed.length - 1] < puzzle.clues.length - 1;

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
    const currentWrongGuesses = gameState.wrongGuesses;
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

  const handlePlayMore = () => {
    setShowResult(false);
    resetCurrentGame();
    router.push("/");
  };

  const handleClose = () => {
    setShowResult(false);
    resetCurrentGame();
    router.push("/");
  };

  const displayScore = finalScore ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showResult && (
        <ResultScreen
          puzzle={puzzle}
          success={lastResultSuccess}
          score={displayScore}
          timeSeconds={timeElapsed}
          wrongGuesses={wrongGuesses}
          penaltySeconds={wrongGuessPenaltySeconds}
          gridState={gridState}
          onPlayMore={handlePlayMore}
          onClose={handleClose}
        />
      )}

      {penaltyToast.visible && (
        <Animated.View
          style={[
            styles.penaltyToast,
            { backgroundColor: "#C8372D", },
            toastStyle,
          ]}
          pointerEvents="none"
        >
          <MaterialIcons name="gavel" size={16} color="#fff" />
          <Text style={styles.penaltyToastText}>{penaltyToast.message}</Text>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12,
            paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <View style={styles.puzzleHeader}>
            <Text style={[styles.puzzleTitle, { color: colors.foreground }]}>
              {puzzle.title}
            </Text>
            <TimerDisplay
              seconds={remainingTime}
              wrongGuesses={wrongGuesses}
              penaltySeconds={wrongGuessPenaltySeconds}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View style={[styles.storyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.storyHeader}>
              <MaterialIcons name="auto-stories" size={16} color={colors.primary} />
              <Text style={[styles.storyLabel, { color: colors.primary }]}>OLAY</Text>
            </View>
            <Text style={[styles.storyText, { color: colors.foreground }]}>{puzzle.story}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dedektif Izgarası</Text>
          <View style={[styles.gridContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.gridWrapper}>
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
          <View style={styles.cluesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>İpuçları</Text>
            {canRevealMore && !gameState.isComplete && !timedOut && (
              <Pressable
                onPress={handleRevealClue}
                style={[styles.revealAllBtn, { borderColor: colors.border }]}
              >
                <MaterialIcons name="add" size={14} color={colors.mutedForeground} />
                <Text style={[styles.revealAllText, { color: colors.mutedForeground }]}>
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
            styles.footer,
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
              style={[styles.accuseBtn, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="gavel" size={22} color={colors.primaryForeground} />
              <Text style={[styles.accuseText, { color: colors.primaryForeground }]}>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 10, gap: 16 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  startBtnText: { fontSize: 16, fontWeight: "700" },
  puzzleHeader: { gap: 12 },
  puzzleTitle: { fontSize: 20, fontWeight: "700", lineHeight: 28 },
  storyBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  storyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  storyLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  storyText: { fontSize: 14, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  gridContainer: { borderRadius: 14, borderWidth: 1, padding: 10, overflow: "hidden" },
  gridWrapper: { minHeight: 240 },
  cluesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
