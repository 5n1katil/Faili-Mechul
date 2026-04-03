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
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import DetectiveGrid from "@/components/DetectiveGrid";
import ClueCard from "@/components/ClueCard";
import TimerDisplay from "@/components/TimerDisplay";
import AnswerModal from "@/components/AnswerModal";
import ResultScreen from "@/components/ResultScreen";
import EntityInfoSheet from "@/components/EntityInfoSheet";
import { getDailyPuzzle } from "@/data/puzzles";
import type { GridMark } from "@/data/puzzles";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function OyunScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    gameState,
    startDailyPuzzle,
    setGridMark,
    revealNextClue,
    submitAnswer,
    tickTimer,
    resetCurrentGame,
  } = useGame();

  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResultSuccess, setLastResultSuccess] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityInfo | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (gameState && !gameState.isComplete && !gameState.isGameOver) {
      timerRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.isComplete, gameState?.isGameOver, tickTimer]);

  useEffect(() => {
    if (gameState?.isComplete || gameState?.isGameOver) {
      setLastResultSuccess(gameState.isComplete);
      setShowResult(true);
    }
  }, [gameState?.isComplete, gameState?.isGameOver]);

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

  const { puzzle, gridState, cluesRevealed, timeElapsed, mistakes, maxMistakes } =
    gameState;

  const canRevealMore = cluesRevealed[cluesRevealed.length - 1] < puzzle.clues.length - 1;

  const handleCellPress = (key: string, nextMark: GridMark) => {
    setGridMark(key, nextMark);
  };

  const handleSubmit = (suspectId: string, weaponId: string, locationId: string) => {
    setShowAnswerModal(false);
    const success = submitAnswer(suspectId, weaponId, locationId);
    if (!success && !gameState.isGameOver) {
      // shake effect handled by state change
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showResult && (
        <ResultScreen
          puzzle={puzzle}
          success={lastResultSuccess}
          score={
            lastResultSuccess
              ? Math.max(
                  100,
                  1000 -
                    Math.floor(timeElapsed / 10) * 5 -
                    mistakes * 100 -
                    (cluesRevealed.length - 1) * 20 +
                    (puzzle.difficulty === "dedektif"
                      ? 200
                      : puzzle.difficulty === "baskomiser"
                      ? 500
                      : 0)
                )
              : 0
          }
          timeSeconds={timeElapsed}
          mistakes={mistakes}
          onPlayMore={handlePlayMore}
          onClose={handleClose}
        />
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
              seconds={timeElapsed}
              mistakes={mistakes}
              maxMistakes={maxMistakes}
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
            <View style={[styles.locationsRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.axisLabel, { color: colors.mutedForeground }]}>
                MEKANLAR →
              </Text>
            </View>
            <View style={styles.gridWrapper}>
              <DetectiveGrid
                suspects={puzzle.suspects}
                weapons={puzzle.weapons}
                locations={puzzle.locations}
                gridState={gridState}
                onCellPress={handleCellPress}
                disabled={gameState.isComplete || gameState.isGameOver}
                onHeaderPress={setSelectedEntity}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <View style={styles.cluesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>İpuçları</Text>
            {canRevealMore && !gameState.isComplete && !gameState.isGameOver && (
              <Pressable
                onPress={revealNextClue}
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
                  ? revealNextClue
                  : undefined
              }
            />
          ))}
        </Animated.View>
      </ScrollView>

      {!gameState.isComplete && !gameState.isGameOver && (
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
          <Pressable
            onPress={() => setShowAnswerModal(true)}
            style={[styles.accuseBtn, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="gavel" size={22} color={colors.primaryForeground} />
            <Text style={[styles.accuseText, { color: colors.primaryForeground }]}>
              SUÇLA
            </Text>
          </Pressable>
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
  content: { paddingHorizontal: 16, gap: 16 },
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
  gridContainer: { borderRadius: 14, borderWidth: 1, padding: 12, overflow: "hidden" },
  locationsRow: { paddingBottom: 6, marginBottom: 6, borderBottomWidth: 1 },
  axisLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  gridWrapper: { minHeight: 160 },
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
});
