import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  LayoutAnimation,
  UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import type { BestResult } from "@/context/GameContext";
import { useSounds } from "@/hooks/useSounds";
import { usePurchase } from "@/context/PurchaseContext";
import DetectiveGrid from "@/components/DetectiveGrid";
import ClueCard from "@/components/ClueCard";
import TimerDisplay from "@/components/TimerDisplay";
import AccusationSheet from "@/components/AccusationSheet";
import StickyAccuseBar from "@/components/StickyAccuseBar";
import ResultScreen from "@/components/ResultScreen";
import EntityInfoSheet from "@/components/EntityInfoSheet";
import PaywallModal from "@/components/PaywallModal";
import ScoreInfoSheet from "@/components/ScoreInfoSheet";
import PuzzleStartModal from "@/components/PuzzleStartModal";
import ExitConfirmSheet from "@/components/ExitConfirmSheet";
import {
  getDailyPuzzle,
  getDifficultyColor,
  getDifficultyLabel,
  isBonusClue,
  PUZZLES,
  type Difficulty,
  type GridMark,
} from "@/data/puzzles";
import { PACKS, getPuzzlesForPack } from "@/data/packs";
import PaketlerContent from "@/components/PaketlerContent";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import Animated, { FadeInDown } from "react-native-reanimated";

const FREE_PUZZLE_COUNT = 10;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function AccordionSection({
  title,
  count,
  badge,
  defaultExpanded = true,
  accentColor,
  icon,
  compact = false,
  premiumInfoIcon = false,
  onPremiumInfoPress,
  children,
}: {
  title: string;
  count: number;
  badge?: React.ReactNode;
  defaultExpanded?: boolean;
  accentColor?: string;
  icon?: MaterialIconName;
  compact?: boolean;
  premiumInfoIcon?: boolean;
  onPremiumInfoPress?: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const color = accentColor ?? colors.primary;
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={accordionStyles.wrapper}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          accordionStyles.header,
          compact && accordionStyles.headerCompact,
          {
            backgroundColor: compact ? `${color}0D` : colors.card,
            borderColor: compact ? `${color}33` : colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={accordionStyles.headerLeft}>
          {icon ? (
            <MaterialIcons name={icon} size={compact ? 15 : 17} color={color} />
          ) : (
            <View style={[accordionStyles.accentBar, { backgroundColor: color }]} />
          )}
          <Text style={[accordionStyles.title, compact && accordionStyles.titleCompact, { color: colors.foreground }]}>{title}</Text>
          <View style={[accordionStyles.countBadge, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
            <Text style={[accordionStyles.countText, { color }]}>{count}</Text>
          </View>
        </View>
        <View style={accordionStyles.headerRight}>
          {premiumInfoIcon && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onPremiumInfoPress?.();
              }}
              hitSlop={8}
              style={accordionStyles.premiumIconBtn}
            >
              <MaterialIcons name="workspace-premium" size={20} color="#D4A843" />
            </Pressable>
          )}
          {badge}
          <MaterialIcons
            name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={compact ? 18 : 20}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>
      {expanded && <View style={accordionStyles.body}>{children}</View>}
    </View>
  );
}

function PremiumInfoModal({
  visible,
  premiumPuzzleCount,
  onBuy,
  onClose,
}: {
  visible: boolean;
  premiumPuzzleCount: number;
  onBuy: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={premiumInfoStyles.overlay} onPress={onClose}>
        <Pressable style={premiumInfoStyles.card} onPress={() => {}}>
          <View style={premiumInfoStyles.iconRow}>
            <View style={premiumInfoStyles.iconCircle}>
              <MaterialIcons name="workspace-premium" size={36} color="#D4A843" />
            </View>
          </View>
          <Text style={premiumInfoStyles.title}>Premium Vaka Arşivi</Text>
          <Text style={premiumInfoStyles.subtitle}>
            Zorluğa göre gruplandırılmış {premiumPuzzleCount} özel vaka
          </Text>
          <View style={premiumInfoStyles.featureList}>
            <View style={premiumInfoStyles.featureRow}>
              <MaterialIcons name="search" size={16} color="#6B7280" />
              <Text style={premiumInfoStyles.featureText}>Çaylak — Giriş seviyesi vakalar</Text>
            </View>
            <View style={premiumInfoStyles.featureRow}>
              <MaterialIcons name="psychology" size={16} color="#6B7280" />
              <Text style={premiumInfoStyles.featureText}>Dedektif — Orta zorluk vakalar</Text>
            </View>
            <View style={premiumInfoStyles.featureRow}>
              <MaterialIcons name="local-police" size={16} color="#6B7280" />
              <Text style={premiumInfoStyles.featureText}>Baş Komiser — Uzman seviye vakalar</Text>
            </View>
            <View style={premiumInfoStyles.featureRow}>
              <MaterialIcons name="bolt" size={16} color="#D4A843" />
              <Text style={premiumInfoStyles.featureText}>İnteraktif ipuçları ve mini oyunlar</Text>
            </View>
            <View style={premiumInfoStyles.featureRow}>
              <MaterialIcons name="all-inclusive" size={16} color="#D4A843" />
              <Text style={premiumInfoStyles.featureText}>Tek seferlik satın al, sonsuza dek oyna</Text>
            </View>
          </View>
          <View style={premiumInfoStyles.btnRow}>
            <Pressable style={premiumInfoStyles.buyBtn} onPress={onBuy}>
              <MaterialIcons name="lock-open" size={16} color="#0F1117" />
              <Text style={premiumInfoStyles.buyBtnText}>Satın Al</Text>
            </Pressable>
            <Pressable style={premiumInfoStyles.closeBtn} onPress={onClose}>
              <Text style={premiumInfoStyles.closeBtnText}>Kapat</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const DIFFICULTY_ORDER: Difficulty[] = ["caylik", "dedektif", "baskomiser"];

function DifficultySubGroups({
  puzzles,
  renderCard,
}: {
  puzzles: (typeof PUZZLES)[number][];
  renderCard: (puzzle: (typeof PUZZLES)[number], groupIndex: number) => React.ReactNode;
}) {
  return (
    <>
      {DIFFICULTY_ORDER.map((diff) => {
        const group = puzzles.filter((p) => p.difficulty === diff);
        if (group.length === 0) return null;
        const color = getDifficultyColor(diff as Difficulty);
        const diffIcon: MaterialIconName =
          diff === "caylik" ? "sentiment-satisfied" :
          diff === "dedektif" ? "search" :
          "local-police";
        return (
          <AccordionSection
            key={diff}
            title={getDifficultyLabel(diff as Difficulty)}
            count={group.length}
            accentColor={color}
            icon={diffIcon}
            compact
            defaultExpanded={false}
          >
            {group.map((puzzle, i) => renderCard(puzzle, i))}
          </AccordionSection>
        );
      })}
    </>
  );
}

function PuzzleCard({
  puzzle,
  onPress,
  delay,
  completed,
  bestResult,
  locked,
  showReplay,
}: {
  puzzle: (typeof PUZZLES)[0];
  onPress: () => void;
  delay: number;
  completed: boolean;
  bestResult: BestResult | null;
  locked?: boolean;
  showReplay?: boolean;
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
              <MaterialIcons name="timer" size={13} color={colors.mutedForeground} />
              <Text style={[listStyles.bestResultValue, { color: colors.mutedForeground }]}>
                {formatTime(bestResult.timeSeconds)}
              </Text>
            </View>
            {showReplay && (
              <View style={listStyles.bestResultItem}>
                <MaterialIcons name="replay" size={13} color={colors.primary} />
                <Text style={[listStyles.bestResultValue, { color: colors.primary }]}>Tekrar Oyna</Text>
              </View>
            )}
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
    solveMechanic,
    submitAnswer,
    tickTimer,
    resetCurrentGame,
    startPuzzle,
    activateTimer,
    invalidateGame,
    completedPuzzleIds,
    bestScoreForPuzzle,
  } = useGame();
  const { isPremium } = usePurchase();
  const { play, playVictorySequence } = useSounds();

  const [showResult, setShowResult] = useState(false);
  const [lastResultSuccess, setLastResultSuccess] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityInfo | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPremiumInfo, setShowPremiumInfo] = useState(false);

  const [accuseSuspect, setAccuseSuspect] = useState<string | null>(null);
  const [accuWeapon, setAccuWeapon] = useState<string | null>(null);
  const [accuLocation, setAccuLocation] = useState<string | null>(null);
  const [finalRank, setFinalRank] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(1);
  const [showSheet, setShowSheet] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [listTab, setListTab] = useState<"standart" | "paketler" | "tamamlananlar">("standart");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef(gameState);
  const invalidateGameRef = useRef(invalidateGame);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { invalidateGameRef.current = invalidateGame; }, [invalidateGame]);

  useEffect(() => {
    if (gameState && gameState.timerActive && !gameState.isComplete) {
      timerRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.timerActive, gameState?.isComplete, tickTimer]);

  useEffect(() => {
    if (gameState?.isComplete) {
      playVictorySequence();
      setLastResultSuccess(true);
      setShowResult(true);
    }
  }, [gameState?.isComplete, playVictorySequence]);

  useEffect(() => {
    setShowResult(false);
    setAccuseSuspect(null);
    setAccuWeapon(null);
    setAccuLocation(null);
    setShowSheet(false);
    setShowScoreInfo(false);
    setShowExitConfirm(false);
  }, [gameState?.puzzle?.id]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        const gs = gameStateRef.current;
        const inv = invalidateGameRef.current;
        if (gs && gs.timerActive && !gs.isComplete && gs.isRanked) {
          inv();
        }
      };
    }, [])
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (gameState && !gameState.isComplete && gameState.timerActive) {
        setShowExitConfirm(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [gameState]);

  const handleBackToList = () => {
    setShowResult(false);
    resetCurrentGame();
  };

  const handleBackPress = () => {
    if (gameState && !gameState.isComplete && gameState.timerActive) {
      setShowExitConfirm(true);
    } else {
      handleBackToList();
    }
  };

  const handleExitConfirmed = () => {
    setShowExitConfirm(false);
    invalidateGame();
    handleBackToList();
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

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const estimatedStreak =
      profile.lastPlayedDate === today
        ? profile.currentStreak
        : profile.lastPlayedDate === yesterday
        ? profile.currentStreak + 1
        : 1;
    const rawScore = 10000 - currentTime * 5 - currentWrong * 150 - currentBonus * 150;
    const diffBonus = diff === "baskomiser" ? 5000 : diff === "dedektif" ? 2000 : 0;
    const streakBonus = Math.min(estimatedStreak * 50, 500);
    const estimatedScore = Math.max(100, rawScore) + diffBonus + streakBonus;

    const samePuzzleScores = leaderboard
      .filter((e) => e.puzzleId === puzzleId)
      .map((e) => e.score);

    const success = submitAnswer(suspectId, weaponId, locationId);

    if (!success) {
      play("error");
    } else {
      if (gameState.isRanked) {
        const allScores = [...samePuzzleScores, estimatedScore].sort((a, b) => b - a);
        const rank = allScores.indexOf(estimatedScore) + 1;
        setFinalRank(Math.max(1, rank));
        setTotalPlayers(allScores.length);
      } else {
        setFinalRank(0);
        setTotalPlayers(0);
      }
      setShowSheet(false);
    }
    return success;
  };

  if (!gameState || !gameState.puzzle) {
    const dailyPuzzle = getDailyPuzzle();
    const archivePuzzles = PUZZLES.filter((p) => p.id !== dailyPuzzle.id);
    const freePuzzles = archivePuzzles.slice(0, FREE_PUZZLE_COUNT);
    const premiumPuzzles = archivePuzzles.slice(FREE_PUZZLE_COUNT);
    const premiumLockedCount = isPremium ? 0 : premiumPuzzles.length;

    const completedStandardPuzzles = [dailyPuzzle, ...archivePuzzles].filter(
      (p) => completedPuzzleIds.has(p.id)
    );
    const completedPackPuzzles = PACKS.flatMap((pack) =>
      getPuzzlesForPack(pack.packId).filter((p) => completedPuzzleIds.has(p.id))
    );
    const completedPuzzles = [...completedStandardPuzzles, ...completedPackPuzzles];

    const activeFree = freePuzzles.filter((p) => !completedPuzzleIds.has(p.id));
    const activePremium = premiumPuzzles.filter((p) => !completedPuzzleIds.has(p.id));

    const standartCount = activeFree.length + (isPremium ? activePremium.length : 0);

    return (
      <>
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
        <PremiumInfoModal
          visible={showPremiumInfo}
          premiumPuzzleCount={premiumPuzzles.length}
          onBuy={() => { setShowPremiumInfo(false); setShowPaywall(true); }}
          onClose={() => setShowPremiumInfo(false)}
        />
        <View style={[gameStyles.container, { backgroundColor: colors.background }]}>
          <View
            style={[
              listStyles.tabBar,
              {
                paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12,
                backgroundColor: colors.background,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={listStyles.tabBarInner}>
              <Pressable
                onPress={() => setListTab("standart")}
                style={[
                  listStyles.tabBtn,
                  listTab === "standart"
                    ? { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    listStyles.tabBtnText,
                    { color: listTab === "standart" ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  Standart
                </Text>
                {standartCount > 0 && (
                  <View style={[listStyles.tabCount, { backgroundColor: `${colors.primary}33` }]}>
                    <Text style={[listStyles.tabCountText, { color: colors.primary }]}>
                      {standartCount}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => setListTab("paketler")}
                style={[
                  listStyles.tabBtn,
                  listTab === "paketler"
                    ? { backgroundColor: "#D4A84320", borderColor: "#D4A843" }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <MaterialIcons
                  name="workspace-premium"
                  size={14}
                  color={listTab === "paketler" ? "#D4A843" : colors.mutedForeground}
                />
                <Text
                  style={[
                    listStyles.tabBtnText,
                    { color: listTab === "paketler" ? "#D4A843" : colors.mutedForeground },
                  ]}
                >
                  Paketler
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setListTab("tamamlananlar")}
                style={[
                  listStyles.tabBtn,
                  listTab === "tamamlananlar"
                    ? { backgroundColor: `${colors.success}20`, borderColor: colors.success }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    listStyles.tabBtnText,
                    { color: listTab === "tamamlananlar" ? colors.success : colors.mutedForeground },
                  ]}
                >
                  Bitti
                </Text>
                {completedPuzzles.length > 0 && (
                  <View style={[listStyles.tabCount, { backgroundColor: `${colors.success}33` }]}>
                    <Text style={[listStyles.tabCountText, { color: colors.success }]}>
                      {completedPuzzles.length}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {listTab === "paketler" ? (
            <PaketlerContent embedded />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[
                listStyles.listContent,
                {
                  paddingTop: 8,
                  paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {listTab === "standart" ? (
                <>
                  <Animated.View entering={FadeInDown.delay(0).springify()}>
                    <View style={listStyles.listHeader}>
                      <MaterialIcons name="folder-open" size={24} color={colors.primary} />
                      <Text style={[listStyles.listHeaderText, { color: colors.primary }]}>Aktif Vakalar</Text>
                    </View>
                  </Animated.View>

                  {activeFree.length === 0 && isPremium && activePremium.length === 0 ? (
                    <View style={[listStyles.emptyBox, { borderColor: colors.border }]}>
                      <MaterialIcons name="check-circle-outline" size={40} color={colors.success} />
                      <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>
                        Tüm Vakalar Çözüldü!
                      </Text>
                      <Text style={[listStyles.emptyText, { color: colors.mutedForeground }]}>
                        Tamamlananlar sekmesinden tekrar oynayabilirsiniz.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <AccordionSection
                        title="Başlangıç Seviyesi Vakalar"
                        count={activeFree.length}
                      >
                        <DifficultySubGroups
                          puzzles={activeFree}
                          renderCard={(puzzle, i) => (
                            <PuzzleCard
                              key={puzzle.id}
                              puzzle={puzzle}
                              onPress={() => startPuzzle(puzzle)}
                              delay={100 + i * 50}
                              completed={false}
                              bestResult={null}
                              locked={false}
                            />
                          )}
                        />
                      </AccordionSection>

                      <AccordionSection
                        title="Premium Vaka Arşivi"
                        count={isPremium ? activePremium.length : premiumPuzzles.length}
                        premiumInfoIcon
                        onPremiumInfoPress={() => setShowPremiumInfo(true)}
                        badge={
                          !isPremium ? (
                            <Pressable
                              onPress={() => setShowPaywall(true)}
                              style={[listStyles.premiumChip, { backgroundColor: "#D4A84318", borderColor: "#D4A84355" }]}
                            >
                              <MaterialIcons name="lock" size={12} color="#D4A843" />
                              <Text style={[listStyles.premiumChipText, { color: "#D4A843" }]}>
                                {premiumLockedCount} kilitli
                              </Text>
                            </Pressable>
                          ) : undefined
                        }
                      >
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
                        <DifficultySubGroups
                          puzzles={activePremium}
                          renderCard={(puzzle, i) => {
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
                                delay={100 + (activeFree.length + i) * 40}
                                completed={false}
                                bestResult={null}
                                locked={isLocked}
                              />
                            );
                          }}
                        />
                      </AccordionSection>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Animated.View entering={FadeInDown.delay(0).springify()}>
                    <View style={listStyles.listHeader}>
                      <MaterialIcons name="check-circle" size={24} color={colors.success} />
                      <Text style={[listStyles.listHeaderText, { color: colors.success }]}>Tamamlananlar</Text>
                    </View>
                  </Animated.View>

                  {completedPuzzles.length === 0 ? (
                    <View style={[listStyles.emptyBox, { borderColor: colors.border }]}>
                      <MaterialIcons name="folder-open" size={40} color={colors.mutedForeground} />
                      <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>
                        Henüz Çözülmüş Vaka Yok
                      </Text>
                      <Text style={[listStyles.emptyText, { color: colors.mutedForeground }]}>
                        Aktif vakalardan birini çözdükten sonra burada görünecek.
                      </Text>
                    </View>
                  ) : (
                    <DifficultySubGroups
                      puzzles={completedPuzzles}
                      renderCard={(puzzle, i) => {
                        const best = bestScoreForPuzzle(puzzle.id);
                        return (
                          <PuzzleCard
                            key={puzzle.id}
                            puzzle={puzzle}
                            onPress={() => startPuzzle(puzzle)}
                            delay={100 + i * 40}
                            completed={true}
                            bestResult={best}
                            showReplay={true}
                          />
                        );
                      }}
                    />
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>
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
    timerActive,
    isRanked,
    solvedMechanics,
  } = gameState;

  const bonusCluesRevealedCount = cluesRevealed.filter((idx) => isBonusClue(puzzle, idx)).length;
  const penaltyCount = wrongGuesses + bonusCluesRevealedCount;
  const displayScore = finalScore ?? 0;

  const suspectName = accuseSuspect
    ? puzzle.suspects.find((s) => s.id === accuseSuspect)?.name ?? null
    : null;
  const weaponName = accuWeapon
    ? puzzle.weapons.find((w) => w.id === accuWeapon)?.name ?? null
    : null;
  const locationName = accuLocation
    ? puzzle.locations.find((l) => l.id === accuLocation)?.name ?? null
    : null;

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
          currentStreak={gameState.appliedStreak ?? profile.currentStreak}
          isRanked={isRanked}
          onPlayMore={handleBackToList}
          onClose={handleBackToList}
        />
      )}

      <PuzzleStartModal
        visible={!timerActive && !gameState.isComplete}
        puzzle={puzzle}
        isRanked={isRanked}
        onStart={activateTimer}
        onCancel={handleBackToList}
      />

      <ExitConfirmSheet
        visible={showExitConfirm}
        isRanked={isRanked}
        onContinue={() => setShowExitConfirm(false)}
        onExit={handleExitConfirmed}
      />

      <ScoreInfoSheet visible={showScoreInfo} onClose={() => setShowScoreInfo(false)} />

      <ScrollView
        style={gameStyles.scroll}
        contentContainerStyle={[
          gameStyles.content,
          {
            paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12,
            paddingBottom: Platform.OS === "web" ? 34 + 148 : insets.bottom + 148,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <View style={gameStyles.puzzleHeader}>
            <View style={gameStyles.puzzleHeaderLeft}>
              <Pressable onPress={handleBackPress} style={gameStyles.backBtn} hitSlop={8}>
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
            <View style={gameStyles.timerRow}>
              {!isRanked && (
                <View style={[gameStyles.practiceBadge, { backgroundColor: "#6B728020", borderColor: "#6B728044" }]}>
                  <MaterialIcons name="fitness-center" size={11} color={colors.mutedForeground} />
                  <Text style={[gameStyles.practiceBadgeText, { color: colors.mutedForeground }]}>Antrenman</Text>
                </View>
              )}
              <TimerDisplay
                seconds={timeElapsed}
                wrongGuesses={wrongGuesses}
                penaltyCount={penaltyCount}
              />
              <Pressable
                onPress={() => setShowScoreInfo(true)}
                hitSlop={10}
                style={[gameStyles.scoreInfoBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
              >
                <MaterialIcons name="help-outline" size={16} color={colors.primary} />
              </Pressable>
            </View>
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
                isSolved={solvedMechanics.includes(clue.id)}
                onRevealBonus={
                  isBonus && !isRevealed && !gameState.isComplete
                    ? () => handleRevealBonusClue(i)
                    : undefined
                }
                onSolveMechanic={() => solveMechanic(clue.id)}
              />
            );
          })}
        </Animated.View>
      </ScrollView>

      {!gameState.isComplete && (
        <Animated.View
          entering={FadeInDown.delay(320).springify()}
          style={[
            gameStyles.stickyBarWrapper,
            {
              paddingBottom: Platform.OS === "web" ? 34 + 64 : insets.bottom + 64,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <StickyAccuseBar
            selectedSuspect={accuseSuspect}
            selectedWeapon={accuWeapon}
            selectedLocation={accuLocation}
            suspectName={suspectName}
            weaponName={weaponName}
            locationName={locationName}
            onOpen={() => setShowSheet(true)}
          />
        </Animated.View>
      )}

      <AccusationSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        puzzle={puzzle}
        selectedSuspect={accuseSuspect}
        selectedWeapon={accuWeapon}
        selectedLocation={accuLocation}
        onSelectSuspect={setAccuseSuspect}
        onSelectWeapon={setAccuWeapon}
        onSelectLocation={setAccuLocation}
        onSubmit={handleSubmit}
        disabled={gameState.isComplete}
      />

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
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tabBarInner: {
    flexDirection: "row",
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 7,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabCount: {
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyBox: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 32,
    gap: 12,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
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
  stickyBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
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
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  practiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  practiceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  scoreInfoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

const accordionStyles = StyleSheet.create({
  wrapper: {
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  accentBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerCompact: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 3,
  },
  titleCompact: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  countBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  body: {
    gap: 0,
    marginBottom: 8,
  },
  premiumIconBtn: {
    padding: 2,
  },
});

const premiumInfoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0F111799",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1A1F2E",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#D4A84333",
    gap: 12,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D4A84318",
    borderWidth: 1,
    borderColor: "#D4A84344",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#D4A843",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#D4A84399",
    textAlign: "center",
    lineHeight: 19,
  },
  featureList: {
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    color: "#aaa",
    lineHeight: 19,
    flex: 1,
  },
  btnRow: {
    flexDirection: "column",
    gap: 8,
    marginTop: 4,
  },
  buyBtn: {
    backgroundColor: "#D4A843",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buyBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1117",
    letterSpacing: 0.3,
  },
  closeBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
});
