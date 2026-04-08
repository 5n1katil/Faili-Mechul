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
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import type { BestResult } from "@/context/GameContext";
import { useSounds } from "@/hooks/useSounds";
import { usePurchase } from "@/context/PurchaseContext";
import DetectiveGrid from "@/components/DetectiveGrid";
import ClueCard from "@/components/ClueCard";
import TimerDisplay from "@/components/TimerDisplay";
import AccusationPanel from "@/components/AccusationPanel";
import ResultScreen from "@/components/ResultScreen";
import EntityInfoSheet from "@/components/EntityInfoSheet";
import PaywallModal from "@/components/PaywallModal";
import {
  getDailyPuzzle,
  getDifficultyColor,
  getDifficultyLabel,
  isBonusClue,
  PUZZLES,
  type Difficulty,
  type GridMark,
} from "@/data/puzzles";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import Animated, { FadeInDown } from "react-native-reanimated";

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
              { backgroundColor: `${diffColor}22`, borderColor: `${diffColor}66` },
            ]}
          >
            <Text style={[listStyles.diffText, { color: diffColor }]}>
              {getDifficultyLabel(puzzle.difficulty as Difficulty)}
            </Text>
          </View>
          <View style={listStyles.puzzleCardRight}>
            {locked ? (
              <View style={[listStyles.lockBadge, { backgroundColor: "#D4A84322", borderColor: "#D4A84366" }]}>
                <Text style={[listStyles.lockText, { color: "#D4A843" }]}>Premium</Text>
              </View>
            ) : completed ? (
              <View style={[listStyles.solvedBadge, { backgroundColor: `${colors.success}22`, borderColor: `${colors.success}55` }]}>
                <MaterialIcons name="check-circle" size={12} color={colors.success} />
                <Text style={[listStyles.solvedText, { color: colors.success }]}>Çözüldü</Text>
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
          style={[listStyles.puzzleTitle, { color: locked ? colors.mutedForeground : colors.foreground }]}
          numberOfLines={2}
        >
          {puzzle.title}
        </Text>

        {!locked && (
          <Text style={[listStyles.puzzleStory, { color: colors.mutedForeground }]} numberOfLines={2}>
            {puzzle.story}
          </Text>
        )}

        {locked ? (
          <View style={[listStyles.playRow, { borderTopColor: colors.border }]}>
            <Text style={[listStyles.playText, { color: "#D4A843" }]}>Kilidi açmak için dokun</Text>
            <MaterialIcons name="lock-open" size={18} color="#D4A843" />
          </View>
        ) : completed && bestResult ? (
          <View style={[listStyles.bestResultRow, { borderTopColor: colors.border }]}>
            <View style={listStyles.bestResultItem}>
              <MaterialIcons name="emoji-events" size={13} color={colors.primary} />
              <Text style={[listStyles.bestResultLabel, { color: colors.mutedForeground }]}>En İyi:</Text>
              <Text style={[listStyles.bestResultValue, { color: colors.primary }]}>{bestResult.score} puan</Text>
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
            <Text style={[listStyles.playText, { color: colors.primary }]}>Oynamak için dokun</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function VakalarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    gameState,
    leaderboard,
    profile,
    setGridMark,
    revealBonusClue,
    submitAnswer,
    tickTimer,
    resetCurrentGame,
    startPuzzle,
    completedPuzzleIds,
    bestScoreForPuzzle,
  } = useGame();
  const { isPremium } = usePurchase();
  const { play } = useSounds();

  const [showResult, setShowResult] = useState(false);
  const [lastResultSuccess, setLastResultSuccess] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityInfo | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const [accuseSuspect, setAccuseSuspect] = useState<string | null>(null);
  const [accuWeapon, setAccuWeapon] = useState<string | null>(null);
  const [accuLocation, setAccuLocation] = useState<string | null>(null);
  const [finalRank, setFinalRank] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (gameState && !gameState.isComplete) {
      timerRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.isComplete, tickTimer]);

  useEffect(() => {
    if (gameState?.isComplete) {
      play("success");
      setLastResultSuccess(true);
      setShowResult(true);
    }
  }, [gameState?.isComplete, play]);

  useEffect(() => {
    setShowResult(false);
    setAccuseSuspect(null);
    setAccuWeapon(null);
    setAccuLocation(null);
  }, [gameState?.puzzle?.id]);

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

  const handleRevealBonusClue = (index: number) => {
    play("clue");
    revealBonusClue(index);
  };

  const handleSubmit = (suspectId: string, weaponId: string, locationId: string): boolean => {
    if (!gameState?.puzzle) return false;
    const puzzleId = gameState.puzzle.id;
    const diff = gameState.puzzle.difficulty;
    const currentTime = gameState.timeElapsed;
    const currentWrong = gameState.wrongGuesses;
    const currentBonus = gameState.cluesRevealed.filter((idx) => isBonusClue(gameState.puzzle!, idx)).length;

    const rawScore = 10000 - currentTime * 5 - currentWrong * 150 - currentBonus * 150;
    const diffBonus = diff === "baskomiser" ? 5000 : diff === "dedektif" ? 2000 : 0;
    const estimatedScore = Math.max(100, rawScore) + diffBonus;

    const samePuzzleScores = leaderboard
      .filter((e) => e.puzzleId === puzzleId)
      .map((e) => e.score);

    const success = submitAnswer(suspectId, weaponId, locationId);

    if (!success) {
      play("error");
    } else {
      const allScores = [...samePuzzleScores, estimatedScore].sort((a, b) => b - a);
      const rank = allScores.indexOf(estimatedScore) + 1;
      setFinalRank(Math.max(1, rank));
      setTotalPlayers(allScores.length);
    }
    return success;
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
              <Text style={[listStyles.listHeaderText, { color: colors.primary }]}>Vaka Listesi</Text>
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
                  style={[listStyles.premiumChip, { backgroundColor: "#D4A84318", borderColor: "#D4A84355" }]}
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
              style={[listStyles.premiumBanner, { backgroundColor: "#D4A84310", borderColor: "#D4A84340" }]}
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
                bestResult={isCompleted && !isLocked ? bestScoreForPuzzle(puzzle.id) : null}
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
    finalScore,
  } = gameState;

  const bonusCluesRevealedCount = cluesRevealed.filter((idx) => isBonusClue(puzzle, idx)).length;
  const penaltyCount = wrongGuesses + bonusCluesRevealedCount;
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
          bonusCluesRevealedCount={bonusCluesRevealedCount}
          gridState={gridState}
          finalRank={finalRank}
          totalPlayers={totalPlayers}
          onPlayMore={handleBackToList}
          onClose={handleBackToList}
        />
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
              <Pressable onPress={handleBackToList} style={gameStyles.backBtn} hitSlop={8}>
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
              seconds={timeElapsed}
              wrongGuesses={wrongGuesses}
              penaltyCount={penaltyCount}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View style={[gameStyles.storyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={gameStyles.storyHeader}>
              <MaterialIcons name="auto-stories" size={16} color={colors.primary} />
              <Text style={[gameStyles.storyLabel, { color: colors.primary }]}>OLAY</Text>
            </View>
            <Text style={[gameStyles.storyText, { color: colors.foreground }]}>{puzzle.story}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Text style={[gameStyles.sectionTitle, { color: colors.foreground }]}>Dedektif Izgarası</Text>
          <View style={[gameStyles.gridContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={gameStyles.gridWrapper}>
              <DetectiveGrid
                suspects={puzzle.suspects}
                weapons={puzzle.weapons}
                locations={puzzle.locations}
                gridState={gridState}
                onCellPress={handleCellPress}
                disabled={gameState.isComplete}
                onHeaderPress={setSelectedEntity}
                isComplete={gameState.isComplete}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <Text style={[gameStyles.sectionTitle, { color: colors.foreground }]}>İpuçları</Text>
          {puzzle.clues.map((clue, i) => {
            const isBonus = isBonusClue(puzzle, i);
            const isRevealed = cluesRevealed.includes(i);
            return (
              <ClueCard
                key={clue.id}
                clue={clue}
                index={i}
                isRevealed={isRevealed}
                isBonus={isBonus}
                onRevealBonus={
                  isBonus && !isRevealed && !gameState.isComplete
                    ? () => handleRevealBonusClue(i)
                    : undefined
                }
              />
            );
          })}
        </Animated.View>

        {!gameState.isComplete && (
          <Animated.View entering={FadeInDown.delay(320).springify()}>
            <AccusationPanel
              puzzle={puzzle}
              selectedSuspect={accuseSuspect}
              selectedWeapon={accuWeapon}
              selectedLocation={accuLocation}
              onSelectSuspect={setAccuseSuspect}
              onSelectWeapon={setAccuWeapon}
              onSelectLocation={setAccuLocation}
              onSubmit={handleSubmit}
            />
          </Animated.View>
        )}
      </ScrollView>

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
});
