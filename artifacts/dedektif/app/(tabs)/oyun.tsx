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
import { router } from "expo-router";
import { takePendingNavSource } from "@/utils/pendingNavSource";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import type { PlayStats } from "@/context/GameContext";
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
import { PACKS, PURCHASABLE_PACKS, getPuzzlesForPack, PACK_PRODUCT_IDS } from "@/data/packs";
import { fetchLeaderboard } from "@/utils/apiClient";
import {
  computeCaseRank,
  computeOverallRank,
  computeScoreForRank,
} from "@/utils/leaderboardRank";
import PaketlerContent from "@/components/PaketlerContent";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

const FREE_PUZZLE_COUNT = 10;
const TOTAL_PURCHASABLE_PUZZLES = PURCHASABLE_PACKS.reduce(
  (sum, p) => sum + getPuzzlesForPack(p.packId).length, 0
);
const EXTRA_FREE_PUZZLE_IDS: ReadonlySet<string> = new Set([
  "karakoyde-neon-gece",
  "konakta-gece-vakti",
  "pazar-sabahi-baskini",
  "aksam-vapurunda-gizem",
  "bagda-kanli-bicak",
  "kervansarayda-son-gece",
  "fotografcinin-son-karesi",
  "termal-otelde-olum",
  "mektup-gelmedi",
  "zeytinyagi-fabrikasinda-kabus",
  "dag-yolunda-pusu",
  "ramazan-gecesi-cinayeti",
  "karanlik-senfoni",
  "kanli-rota",
  "derinlerdeki-sir",
  "zehirli-tuval",
]);

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const _accordionExpanded = new Map<string, boolean>();

function AccordionSection({
  title,
  storeKey,
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
  storeKey?: string;
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
  const key = storeKey ?? title;
  const [expanded, setExpanded] = useState(() =>
    _accordionExpanded.has(key) ? _accordionExpanded.get(key)! : defaultExpanded
  );

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => {
      const next = !v;
      _accordionExpanded.set(key, next);
      return next;
    });
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

const INACTIVE_COLOR = "#C0C0D0";
const PREMIUM_GOLD = "#D4A843";

const NEON_ORANGE = "#FF6800";

function PremiumTabButton({
  active, onPress, subTab, onSubTabChange,
}: {
  active: boolean;
  onPress: () => void;
  subTab: "vakalar" | "paketler";
  onSubTabChange: (tab: "vakalar" | "paketler") => void;
}) {
  const pulse = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 1250, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, []);

  const glowOpacity = useAnimatedStyle(() => ({ opacity: 0.2 + pulse.value * 0.8 }));
  const scaleAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ flex: 1 }, scaleAnim]}>
      {/* Glow halo — absolute overlay, opacity only, never affects layout */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: 14,
            borderWidth: 2,
            borderColor: NEON_ORANGE,
            shadowColor: NEON_ORANGE,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 18,
            elevation: 20,
          },
          glowOpacity,
        ]}
      />
      {/* 2-row compact button */}
      <View
        style={[
          {
            flex: 1,
            borderWidth: 2,
            borderColor: `${NEON_ORANGE}77`,
            backgroundColor: active ? `${NEON_ORANGE}22` : `${NEON_ORANGE}0D`,
            borderRadius: 12,
            flexDirection: "column",
            overflow: "hidden",
          },
          active ? { borderBottomWidth: 5, borderColor: `${NEON_ORANGE}EE` } : {},
        ]}
      >
        {/* Row 1: Premium label — press activates the premium tab */}
        <Pressable
          onPressIn={() => { scale.value = withSpring(0.93, { damping: 12, stiffness: 320 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 280 }); }}
          onPress={onPress}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 7, paddingBottom: 5, paddingHorizontal: 8 }}
        >
          <MaterialIcons name="workspace-premium" size={17} color={PREMIUM_GOLD} />
          <Text style={[listStyles.tabBtnText3d, { color: PREMIUM_GOLD, fontWeight: "700", fontSize: 14, letterSpacing: 0.3 }]}>
            Premium
          </Text>
        </Pressable>
        {/* Thin separator */}
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: `${NEON_ORANGE}44`, marginHorizontal: 10 }} />
        {/* Row 2: Vakalar | Paketler sub-tab selectors */}
        <View style={{ flexDirection: "row", paddingHorizontal: 6, paddingTop: 4, paddingBottom: 5, gap: 3 }}>
          <Pressable
            onPress={() => onSubTabChange("vakalar")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingVertical: 4,
              borderRadius: 7,
              backgroundColor: subTab === "vakalar" && active ? `${PREMIUM_GOLD}22` : "transparent",
            }}
          >
            <MaterialIcons name="auto-stories" size={13} color={subTab === "vakalar" && active ? PREMIUM_GOLD : "#888AAA"} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: subTab === "vakalar" && active ? PREMIUM_GOLD : "#888AAA" }}>Vakalar</Text>
          </Pressable>
          <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: `${PREMIUM_GOLD}33`, alignSelf: "stretch", marginVertical: 2 }} />
          <Pressable
            onPress={() => onSubTabChange("paketler")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingVertical: 4,
              borderRadius: 7,
              backgroundColor: subTab === "paketler" && active ? `${PREMIUM_GOLD}22` : "transparent",
            }}
          >
            <MaterialIcons name="inventory-2" size={13} color={subTab === "paketler" && active ? PREMIUM_GOLD : "#888AAA"} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: subTab === "paketler" && active ? PREMIUM_GOLD : "#888AAA" }}>Paketler</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function TabButton3D({
  label, icon, active, count, onPress, activeColor,
}: {
  label: string; icon: MaterialIconName; active: boolean; count?: number;
  onPress: () => void; activeColor: string;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.93, { damping: 12, stiffness: 320 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 280 }); }}
        onPress={onPress}
        style={[
          listStyles.tabBtn3d,
          { flex: 1 },
          active
            ? {
                backgroundColor: `${activeColor}22`,
                borderColor: activeColor,
                borderBottomColor: activeColor,
                borderBottomWidth: 4,
                shadowColor: activeColor,
                shadowOpacity: 0.65,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 12,
              }
            : {
                backgroundColor: "#12151E",
                borderColor: "#FFFFFF12",
                borderBottomWidth: StyleSheet.hairlineWidth,
                shadowColor: "#000",
                shadowOpacity: 0.4,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              },
        ]}
      >
        <MaterialIcons name={icon} size={17} color={active ? activeColor : "#666888"} />
        <Text style={[listStyles.tabBtnText3d, { color: active ? activeColor : "#888AAA", fontSize: 15, fontWeight: active ? "700" : "600" }]}>
          {label}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={[listStyles.tabCount3d, { backgroundColor: active ? `${activeColor}30` : "#FFFFFF0E" }]}>
            <Text style={[listStyles.tabCountText3d, { color: active ? activeColor : "#666888" }]}>{count}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function PulsingGlowCard({
  color, children, entering,
}: {
  color: string;
  children: React.ReactNode;
  entering?: any;
}) {
  const glow = useSharedValue(0);
  React.useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);
  const glowLayerStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + glow.value * 0.42,
  }));
  return (
    <Animated.View entering={entering} style={{ borderRadius: 14 }}>
      {/* Glow halo — static shadow, only opacity pulses (web-safe) */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: 14,
            shadowColor: color,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            elevation: 10,
          },
          glowLayerStyle,
        ]}
      />
      {children}
    </Animated.View>
  );
}

function FilterPill3D({
  label, icon, isSelected, onPress, color, count,
}: {
  label: string; icon: MaterialIconName; isSelected: boolean;
  onPress: () => void; color: string; count?: number;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withTiming(0.91, { duration: 70, easing: Easing.out(Easing.quad) }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }); }}
        onPress={onPress}
        style={[
          listStyles.filterPill3d,
          isSelected
            ? {
                backgroundColor: `${color}25`,
                borderColor: color,
                borderBottomColor: color,
                borderBottomWidth: 4,
                shadowColor: color,
                shadowOpacity: 0.55,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 10,
              }
            : {
                backgroundColor: `${color}10`,
                borderColor: `${color}44`,
                borderBottomColor: `${color}22`,
                borderBottomWidth: 1,
                shadowColor: color,
                shadowOpacity: 0.18,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                elevation: 4,
              },
        ]}
      >
        <MaterialIcons name={icon} size={20} color={isSelected ? color : `${color}99`} />
        {count !== undefined && count > 0 && (
          <View style={[listStyles.filterPillCount3d, {
            backgroundColor: isSelected ? color : `${color}28`,
            paddingHorizontal: 9,
            paddingVertical: 3,
            minWidth: 30,
          }]}>
            <Text style={[listStyles.filterPillCountText3d, {
              color: isSelected ? "#0F1117" : color,
              fontSize: 15,
              fontWeight: "800",
            }]}>{count}</Text>
          </View>
        )}
        <Text style={[listStyles.filterPillText3d, {
          color: isSelected ? color : `${color}88`,
          textAlign: "center",
        }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const DIFFICULTY_ORDER: Difficulty[] = ["caylak", "dedektif", "baskomiser"];

function DifficultySubGroups({
  puzzles,
  renderCard,
  keyPrefix = "",
}: {
  puzzles: (typeof PUZZLES)[number][];
  renderCard: (puzzle: (typeof PUZZLES)[number], groupIndex: number) => React.ReactNode;
  keyPrefix?: string;
}) {
  return (
    <>
      {DIFFICULTY_ORDER.map((diff) => {
        const group = puzzles.filter((p) => p.difficulty === diff);
        if (group.length === 0) return null;
        const color = getDifficultyColor(diff as Difficulty);
        const diffIcon: MaterialIconName =
          diff === "caylak" ? "sentiment-satisfied" :
          diff === "dedektif" ? "search" :
          "local-police";
        return (
          <AccordionSection
            key={diff}
            title={getDifficultyLabel(diff as Difficulty)}
            storeKey={`${keyPrefix}${diff}`}
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
  playStats,
  locked,
  showReplay,
  premiumBadge,
}: {
  puzzle: (typeof PUZZLES)[0];
  onPress: () => void;
  delay: number;
  completed: boolean;
  playStats: PlayStats | null;
  locked?: boolean;
  showReplay?: boolean;
  premiumBadge?: boolean;
}) {
  const colors = useColors();
  const diffColor = getDifficultyColor(puzzle.difficulty as Difficulty);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        testID="puzzle-card"
        onPress={onPress}
        style={({ pressed }) => [
          listStyles.puzzleCard,
          {
            backgroundColor: colors.card,
            borderColor: completed
              ? `${colors.success}55`
              : locked
              ? "#D4A84333"
              : `${diffColor}33`,
            borderLeftColor: completed ? colors.success : locked ? "#D4A843" : diffColor,
            borderLeftWidth: 3.5,
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
                <MaterialIcons name="lock" size={11} color="#D4A843" />
                <Text style={[listStyles.lockText, { color: "#D4A843" }]}>Premium</Text>
              </View>
            ) : completed ? (
              <View style={[listStyles.solvedBadge, { backgroundColor: `${colors.success}22`, borderColor: `${colors.success}55` }]}>
                <MaterialIcons name="check-circle" size={12} color={colors.success} />
                <Text style={[listStyles.solvedText, { color: colors.success }]}>Çözüldü</Text>
              </View>
            ) : (
              <View style={listStyles.puzzleCardMeta}>
                <MaterialIcons name="person" size={13} color={INACTIVE_COLOR} />
                <Text style={[listStyles.metaText, { color: INACTIVE_COLOR }]}>
                  {puzzle.suspects.length} şüpheli
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text
          style={[listStyles.puzzleTitle, { color: "#D4A843" }]}
          numberOfLines={2}
        >
          {puzzle.title}
        </Text>

        <Text style={[listStyles.puzzleStory, { color: locked ? "#8888AA" : "#A8A8C0" }]} numberOfLines={2}>
          {puzzle.story}
        </Text>

        {locked ? (
          <View style={[listStyles.playRow, { borderTopColor: colors.border }]}>
            <Text style={[listStyles.playText, { color: "#D4A843" }]}>Kilidi açmak için dokun</Text>
            <MaterialIcons name="lock-open" size={18} color="#D4A843" />
          </View>
        ) : completed && playStats ? (
          <View style={[listStyles.bestResultRow, { borderTopColor: colors.border }]}>
            <View style={listStyles.playStatsColumn}>
              <View style={listStyles.bestResultItem}>
                <MaterialIcons name="leaderboard" size={12} color={colors.primary} />
                <Text style={[listStyles.bestResultLabel, { color: colors.mutedForeground }]}>İlk Oynanış:</Text>
                <Text style={[listStyles.bestResultValue, { color: colors.primary }]}>{playStats.firstPlay.score.toLocaleString("tr-TR")} puan</Text>
                <MaterialIcons name="timer" size={12} color={colors.mutedForeground} />
                <Text style={[listStyles.bestResultValue, { color: colors.mutedForeground }]}>
                  {formatTime(playStats.firstPlay.timeSeconds)}
                </Text>
              </View>
              {playStats.latestPlay && (
                <View style={listStyles.bestResultItem}>
                  <MaterialIcons name="replay" size={12} color={colors.mutedForeground} />
                  <Text style={[listStyles.bestResultLabel, { color: colors.mutedForeground }]}>Son Oynanış:</Text>
                  <Text style={[listStyles.bestResultValue, { color: colors.mutedForeground }]}>{playStats.latestPlay.score.toLocaleString("tr-TR")} puan</Text>
                  <MaterialIcons name="timer" size={12} color={colors.mutedForeground} />
                  <Text style={[listStyles.bestResultValue, { color: colors.mutedForeground }]}>
                    {formatTime(playStats.latestPlay.timeSeconds)}
                  </Text>
                </View>
              )}
            </View>
            {showReplay && (
              <View style={listStyles.replayBtn}>
                <MaterialIcons name="replay" size={13} color={colors.primary} />
                <Text style={[listStyles.bestResultValue, { color: colors.primary }]}>Tekrar Oyna</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[listStyles.playRow, { borderTopColor: `${diffColor}44`, backgroundColor: `${diffColor}0A` }]}>
            <Text style={[listStyles.playText, { color: diffColor }]}>Oynamak için dokun</Text>
            <MaterialIcons name="chevron-right" size={20} color={diffColor} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function VakalarScreen() {
  const launchSourceRef = useRef<"home" | "gorevler" | null>(null);
  useFocusEffect(
    useCallback(() => {
      const src = takePendingNavSource();
      if (src !== null) launchSourceRef.current = src;
      return () => { launchSourceRef.current = null; };
    }, [])
  );

  const pageScale = useSharedValue(0.97);
  const pageAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pageScale.value }],
  }));
  useFocusEffect(
    useCallback(() => {
      pageScale.value = withSpring(1, { damping: 16, stiffness: 200 });
      return () => { pageScale.value = 0.97; };
    }, [pageScale])
  );

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
    playStatsForPuzzle,
    playerId,
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
  const [overallRank, setOverallRank] = useState(1);
  const [overallPlayers, setOverallPlayers] = useState(1);
  const [apiTotalScores, setApiTotalScores] = useState<number[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [listTab, setListTab] = useState<"vakalar" | "premium">("vakalar");
  const [diffFilter, setDiffFilter] = useState<Difficulty | "all" | "tamamlananlar">("all");
  const [premiumSubTab, setPremiumSubTab] = useState<"vakalar" | "paketler">("vakalar");
  const [premiumVakalarExpanded, setPremiumVakalarExpanded] = useState(false);
  const [premDiffFilter, setPremDiffFilter] = useState<Difficulty | "all" | "tamamlananlar">("all");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const homeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStateRef = useRef(gameState);
  const invalidateGameRef = useRef(invalidateGame);
  const playerIdRef = useRef(playerId);
  const listScrollRef = useRef<ScrollView>(null);
  const listScrollY = useRef<number>(0);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { invalidateGameRef.current = invalidateGame; }, [invalidateGame]);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);

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
      resultTimerRef.current = setTimeout(() => {
        setShowResult(true);
      }, 200);
    }
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
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
      if (!gameStateRef.current) {
        listScrollRef.current?.scrollTo({ y: 0, animated: false });
      }
      let cancelled = false;
      void fetchLeaderboard("totalScore", 50).then((entries) => {
        if (!cancelled) {
          const pid = playerIdRef.current;
          setApiTotalScores(
            entries
              .filter((e) => !pid || e.playerId !== pid)
              .map((e) => e.totalScore)
              .filter((s) => Number.isFinite(s))
          );
        }
      });
      return () => {
        cancelled = true;
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
      if (gameState && gameState.puzzle) {
        // Oyun yüklüyken Android geri tuşunu her zaman kendimiz yönetiyoruz.
        // React Navigation'ın sekme navigasyonuna müdahale etmesini engelliyoruz.
        if (!gameState.isComplete && gameState.timerActive) {
          // Timer aktif: çıkış onayı sor
          setShowExitConfirm(true);
        } else {
          // Timer aktif değil (başlangıç ekranı veya tamamlanmış oyun): geri dön
          setShowResult(false);
          resetCurrentGame();
          const src = launchSourceRef.current;
          if (src === "home") {
            router.navigate("/");
          } else if (src === "gorevler") {
            router.navigate("/gorevler");
          } else {
            const savedY = listScrollY.current;
            setTimeout(() => {
              listScrollRef.current?.scrollTo({ y: savedY, animated: false });
            }, 0);
          }
        }
        return true; // Geri tuşunu biz işledik, React Navigation işlemesin
      }
      // Liste görünümündeyken: kaynak sekmeye dön
      const listSrc = launchSourceRef.current;
      if (listSrc === "home") {
        router.navigate("/");
        return true;
      }
      if (listSrc === "gorevler") {
        router.navigate("/gorevler");
        return true;
      }
      return false; // Vakalar listesindeyken React Navigation varsayılan davranışa izin ver
    });
    return () => sub.remove();
  }, [gameState, resetCurrentGame]);

  const handleBackToList = () => {
    setShowResult(false);
    resetCurrentGame();
    const src = launchSourceRef.current;
    if (src === "home") {
      router.navigate("/");
    } else if (src === "gorevler") {
      router.navigate("/gorevler");
    } else {
      const savedY = listScrollY.current;
      setTimeout(() => {
        listScrollRef.current?.scrollTo({ y: savedY, animated: false });
      }, 0);
    }
  };

  const handleCancelStart = () => {
    resetCurrentGame();
    const src = launchSourceRef.current;
    if (src === "home") {
      router.navigate("/");
    } else if (src === "gorevler") {
      router.navigate("/gorevler");
    }
    // Vakalar sekmesi state-based navigasyon kullanır; router.back() çağrılmaz.
    // resetCurrentGame() gameState'i sıfırlar → bileşen otomatik liste görünümünü render eder.
  };

  const handleGoHome = () => {
    if (homeTimerRef.current) clearTimeout(homeTimerRef.current);
    // Modal'ı ve state'i önce temizle, sonra navigate et — aksi hâlde mobilde
    // Modal önce kapanmaz ve sekme geçişi görünmez.
    setShowResult(false);
    resetCurrentGame();
    router.navigate("/");
  };

  const handlePlayNext = () => {
    const currentPuzzle = gameState?.puzzle;
    const diff = currentPuzzle?.difficulty ?? "caylak";
    const currentId = currentPuzzle?.id;
    const candidates = PUZZLES.filter(
      (p) => p.difficulty === diff && p.id !== currentId
    );
    if (candidates.length === 0) {
      handleBackToList();
      return;
    }
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    setShowResult(false);
    resetCurrentGame();
    startPuzzle(next);
  };

  const handleNextPackPuzzle = (nextPuzzle: (typeof PUZZLES)[0]) => {
    // If a ranked game is in progress, invalidate it silently before moving on
    if (gameState && gameState.timerActive && !gameState.isComplete && gameState.isRanked) {
      invalidateGame();
    }
    setShowResult(false);
    startPuzzle(nextPuzzle);
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
    const estimatedScore = computeScoreForRank(
      currentTime,
      currentWrong,
      currentBonus,
      diff,
      estimatedStreak
    );

    const success = submitAnswer(suspectId, weaponId, locationId);

    if (!success) {
      play("error");
    } else {
      if (gameState.isRanked) {
        const { rank, totalPlayers: casePlayers } = computeCaseRank(
          estimatedScore,
          puzzleId,
          diff,
          leaderboard
        );
        const projectedTotal = profile.totalScore + estimatedScore;
        const { rank: overall, totalPlayers: overallPool } = computeOverallRank(
          projectedTotal,
          apiTotalScores
        );
        setFinalRank(rank);
        setTotalPlayers(casePlayers);
        setOverallRank(overall);
        setOverallPlayers(overallPool);
      } else {
        setFinalRank(0);
        setTotalPlayers(0);
        setOverallRank(0);
        setOverallPlayers(0);
      }
      setShowSheet(false);
    }
    return success;
  };

  if (!gameState || !gameState.puzzle) {
    const dailyPuzzle = getDailyPuzzle();
    const archivePuzzles = PUZZLES.filter((p) => p.id !== dailyPuzzle.id);
    const sliceFree = archivePuzzles.slice(0, FREE_PUZZLE_COUNT);
    const extraFree = archivePuzzles.filter(
      (p) => EXTRA_FREE_PUZZLE_IDS.has(p.id) && !sliceFree.includes(p)
    );
    const freePuzzles = [...sliceFree, ...extraFree];
    const freePuzzleIds = new Set(freePuzzles.map((p) => p.id));
    const archiveOnlyPackPuzzles = PACKS
      .filter((p) => !(p.packId in PACK_PRODUCT_IDS))
      .flatMap((p) => getPuzzlesForPack(p.packId));
    const premiumPuzzles = [
      ...archivePuzzles.filter((p) => !freePuzzleIds.has(p.id)),
      ...archiveOnlyPackPuzzles,
    ];
    const completedStandardPuzzles = [dailyPuzzle, ...archivePuzzles].filter(
      (p) => completedPuzzleIds.has(p.id)
    );
    const completedPackPuzzles = PACKS.flatMap((pack) =>
      getPuzzlesForPack(pack.packId).filter((p) => completedPuzzleIds.has(p.id))
    );
    const completedPuzzles = [...completedStandardPuzzles, ...completedPackPuzzles];

    const activeFree = freePuzzles.filter((p) => !completedPuzzleIds.has(p.id));
    const activePremium = premiumPuzzles.filter((p) => !completedPuzzleIds.has(p.id));

    const premiumPuzzleIdSet = new Set(premiumPuzzles.map((p) => p.id));
    const completedPremiumPuzzles = completedPuzzles.filter((p) => premiumPuzzleIdSet.has(p.id));
    const completedFreePuzzles = freePuzzles.filter((p) => completedPuzzleIds.has(p.id));
    const premFilteredActive = (premDiffFilter === "all" || premDiffFilter === "tamamlananlar")
      ? activePremium
      : activePremium.filter((p) => p.difficulty === (premDiffFilter as Difficulty));
    const availableActive = [...activeFree, ...(isPremium ? activePremium : [])];
    const filteredActive = (diffFilter === "all" || diffFilter === "tamamlananlar")
      ? activeFree
      : activeFree.filter((p) => p.difficulty === (diffFilter as Difficulty));
    const totalActiveCount = activeFree.length;

    return (
      <>
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} premiumPuzzleCount={premiumPuzzles.length} />
        <PremiumInfoModal
          visible={showPremiumInfo}
          premiumPuzzleCount={isPremium ? activePremium.length : premiumPuzzles.length}
          onBuy={() => { setShowPremiumInfo(false); setShowPaywall(true); }}
          onClose={() => setShowPremiumInfo(false)}
        />
        <View style={[gameStyles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>

          {/* ── Page Header ── */}
          <View style={[listStyles.pageHeader, { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[listStyles.pageTitle, { color: colors.foreground }]}>Vakalar</Text>
              <Text style={[listStyles.pageSubtitle, { color: colors.mutedForeground }]}>Davaları çöz · puan kazan</Text>
            </View>
            {completedPuzzles.length > 0 && (
              <Pressable
                onPress={() => { setListTab("vakalar"); setDiffFilter("tamamlananlar"); }}
                style={[listStyles.completedHeaderBadge, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}44` }]}
              >
                <MaterialIcons name="check-circle" size={13} color={colors.success} />
                <Text style={[listStyles.completedHeaderText, { color: colors.success }]}>{completedPuzzles.length} çözüldü</Text>
              </Pressable>
            )}
          </View>

          {/* ── 3D Tab Bar ── */}
          <View style={[listStyles.tabBar, { paddingTop: 4, paddingBottom: 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <View style={listStyles.tabBarInner}>
              <TabButton3D
                label="Vakalar"
                icon="folder-open"
                active={listTab === "vakalar"}
                count={totalActiveCount}
                onPress={() => setListTab("vakalar")}
                activeColor={colors.primary}
              />
              <PremiumTabButton
                active={listTab === "premium"}
                onPress={() => setListTab("premium")}
                subTab={premiumSubTab}
                onSubTabChange={(tab) => { setListTab("premium"); setPremiumSubTab(tab); }}
              />
            </View>
          </View>

          {listTab === "premium" ? (
            /* ══════════ PREMIUM TAB ══════════ */
            <View style={{ flex: 1 }}>
              {premiumSubTab === "paketler" ? (
                <Animated.View entering={FadeInDown.delay(0).springify()} style={{ flex: 1 }}>
                  <PaketlerContent embedded />
                </Animated.View>
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={[listStyles.listContent, { paddingTop: 12, paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80 }]}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Premium Vakalar header — yalnızca satın alınmamışsa göster */}
                  {!isPremium && (
                    <Animated.View entering={FadeInDown.delay(0).springify()} style={listStyles.premVakalarHeader}>
                      <MaterialIcons name="workspace-premium" size={22} color="#D4A843" />
                      <Text style={[listStyles.premVakalarTitle, { color: "#D4A843" }]}>Premium Vakalar</Text>
                      <View style={[listStyles.premVakalarCount, { backgroundColor: "#D4A84330", borderColor: "#D4A84360" }]}>
                        <Text style={[listStyles.premVakalarCountText, { color: "#D4A843" }]}>{premiumPuzzles.length} vaka</Text>
                      </View>
                    </Animated.View>
                  )}

                  {/* Buy CTA banner — only for non-premium users */}
                  {!isPremium && (
                    <Animated.View entering={FadeInDown.delay(60).springify()}>
                      <Pressable
                        onPress={() => setShowPaywall(true)}
                        style={[listStyles.premUnlockBanner, { backgroundColor: "#D4A84314", borderColor: "#D4A84355", shadowColor: "#D4A843", shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[listStyles.premAccordionTitle, { color: "#F0F0F8", fontSize: 14 }]}>
                            Vaka Arşivi — Tek Seferlik Satın Alma
                          </Text>
                          <Text style={[listStyles.premAccordionSub, { color: "#D4A84399", marginTop: 3, fontSize: 13 }]}>
                            Tüm {premiumPuzzles.length} vakayı hemen aç · ₺79,99
                          </Text>
                        </View>
                        <View style={[listStyles.premUnlockBtn, { backgroundColor: "#D4A843", width: 44, height: 44, borderRadius: 12 }]}>
                          <MaterialIcons name="lock-open" size={20} color="#0F1117" />
                        </View>
                      </Pressable>
                    </Animated.View>
                  )}

                  {/* Locked puzzle list — non-premium only */}
                  {!isPremium && premiumPuzzles.map((puzzle, i) => {
                    const isCompleted = completedPuzzleIds.has(puzzle.id);
                    const stats = isCompleted ? playStatsForPuzzle(puzzle.id) : null;
                    return (
                      <PuzzleCard
                        key={puzzle.id}
                        puzzle={puzzle}
                        onPress={() => setShowPaywall(true)}
                        delay={40 + i * 28}
                        completed={isCompleted}
                        playStats={stats}
                        locked={true}
                        showReplay={false}
                      />
                    );
                  })}

                  {/* Premium purchased: tek birleşik kart (turuncu tema + soft glow) */}
                  {isPremium && (
                    <>
                      <PulsingGlowCard color="#C8581A" entering={FadeInDown.delay(0).springify()}>
                        <View style={[listStyles.standartCard, { backgroundColor: colors.card, borderColor: "#C8581A44", elevation: 6 }]}>
                          <View style={[listStyles.standartCardAccent, { backgroundColor: "#C8581A" }]} />
                          <View style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 14, gap: 10 }}>
                            <View style={listStyles.standartCardTop}>
                              <View style={[listStyles.heroCardIcon, { backgroundColor: "#C8581A18", width: 40, height: 40 }]}>
                                <MaterialIcons name="workspace-premium" size={22} color="#C8581A" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[listStyles.standartCardTitle, { color: "#E87A3A" }]}>Premium Vakalar</Text>
                                <Text style={[listStyles.heroCardSub, { color: INACTIVE_COLOR }]}>Arşiv · erişilebilir</Text>
                              </View>
                            </View>
                            <View style={listStyles.standartStatsRow}>
                              <View style={[listStyles.standartStat, { backgroundColor: "#C8581A14", borderColor: "#C8581A30" }]}>
                                <Text style={[listStyles.standartStatNum, { color: "#E87A3A" }]}>{premiumPuzzles.length}</Text>
                                <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>Toplam</Text>
                              </View>
                              <View style={[listStyles.standartStat, { backgroundColor: "#FFFFFF08", borderColor: "#FFFFFF18" }]}>
                                <Text style={[listStyles.standartStatNum, { color: "#F0F0F8" }]}>{activePremium.length}</Text>
                                <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>AKTİF</Text>
                              </View>
                              <View style={[listStyles.standartStat, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}28` }]}>
                                <Text style={[listStyles.standartStatNum, { color: colors.success }]}>{completedPremiumPuzzles.length}</Text>
                                <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>Çözüldü</Text>
                              </View>
                            </View>
                            <View style={{ height: 1, backgroundColor: "#FFFFFF0D", marginHorizontal: -14 }} />
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              {(["caylak", "dedektif", "baskomiser"] as Difficulty[]).map((diff) => {
                                const isSelected = premDiffFilter === diff;
                                const color = getDifficultyColor(diff);
                                const icon: MaterialIconName = diff === "caylak" ? "sentiment-satisfied" : diff === "dedektif" ? "search" : "local-police";
                                const count = activePremium.filter((p) => p.difficulty === diff).length;
                                return (
                                  <FilterPill3D
                                    key={diff}
                                    label={getDifficultyLabel(diff)}
                                    icon={icon}
                                    isSelected={isSelected}
                                    onPress={() => setPremDiffFilter(isSelected ? "all" : diff)}
                                    color={color}
                                    count={count}
                                  />
                                );
                              })}
                            </View>
                          </View>
                        </View>
                      </PulsingGlowCard>

                      {/* Tamamlananlar wide pill */}
                      <Animated.View entering={FadeInDown.delay(30).springify()}>
                        <Pressable
                          onPress={() => setPremDiffFilter(premDiffFilter === "tamamlananlar" ? "all" : "tamamlananlar")}
                          style={[
                            listStyles.tamamlananlarPill,
                            premDiffFilter === "tamamlananlar"
                              ? { backgroundColor: `${colors.success}22`, borderColor: colors.success, borderBottomWidth: 3, borderBottomColor: `${colors.success}AA`, shadowColor: colors.success, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }
                              : { backgroundColor: colors.card, borderColor: colors.border },
                          ]}
                        >
                          <View style={[listStyles.tamamlananlarPillIcon, { backgroundColor: premDiffFilter === "tamamlananlar" ? `${colors.success}22` : "#FFFFFF14" }]}>
                            <MaterialIcons name="check-circle" size={16} color={premDiffFilter === "tamamlananlar" ? colors.success : "#C8CAE0"} />
                          </View>
                          <Text style={[listStyles.tamamlananlarPillText, { color: premDiffFilter === "tamamlananlar" ? colors.success : "#E2E4F0" }]}>
                            Tamamlananlar{completedPremiumPuzzles.length > 0 ? ` (${completedPremiumPuzzles.length})` : ""}
                          </Text>
                          <View style={{ flex: 1 }} />
                          <MaterialIcons
                            name={premDiffFilter === "tamamlananlar" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                            size={20}
                            color={premDiffFilter === "tamamlananlar" ? colors.success : "#C8CAE0"}
                          />
                        </Pressable>
                      </Animated.View>

                      {premDiffFilter === "tamamlananlar" ? (
                        completedPremiumPuzzles.length === 0 ? (
                          <View style={[listStyles.emptyBox, { borderColor: colors.border }]}>
                            <MaterialIcons name="folder-open" size={40} color={colors.mutedForeground} />
                            <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>Henüz Çözülen Premium Vaka Yok</Text>
                            <Text style={[listStyles.emptyText, { color: colors.mutedForeground }]}>
                              Premium vakalardan birini çözdükten sonra burada görünecek.
                            </Text>
                          </View>
                        ) : (
                          completedPremiumPuzzles.map((puzzle, i) => {
                            const stats = playStatsForPuzzle(puzzle.id);
                            return (
                              <PuzzleCard
                                key={puzzle.id}
                                puzzle={puzzle}
                                onPress={() => startPuzzle(puzzle)}
                                delay={60 + i * 30}
                                completed={true}
                                playStats={stats}
                                showReplay={true}
                              />
                            );
                          })
                        )
                      ) : (
                        <>
                          {premFilteredActive.length === 0 ? (
                            <View style={[listStyles.emptyBox, { borderColor: colors.border }]}>
                              <MaterialIcons name="check-circle-outline" size={40} color={colors.success} />
                              <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>
                                {premDiffFilter === "all" ? "Tüm Premium Vakalar Çözüldü!" : `${getDifficultyLabel(premDiffFilter as Difficulty)} premium vakası kalmadı`}
                              </Text>
                              <Text style={[listStyles.emptyText, { color: colors.mutedForeground }]}>
                                Tamamlananlar filtresine bakabilirsiniz.
                              </Text>
                            </View>
                          ) : (
                            premFilteredActive.map((puzzle, i) => (
                              <PuzzleCard
                                key={puzzle.id}
                                puzzle={puzzle}
                                onPress={() => startPuzzle(puzzle)}
                                delay={80 + i * 35}
                                completed={false}
                                playStats={null}
                                locked={false}
                              />
                            ))
                          )}
                        </>
                      )}
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          ) : (
            /* ══════════ VAKALAR TAB ══════════ */
            <ScrollView
              ref={listScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={[listStyles.listContent, { paddingTop: 12, paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80 }]}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => { listScrollY.current = e.nativeEvent.contentOffset.y; }}
            >
              {/* ── Standart Vakalar: tek birleşik kart (altın tema) ── */}
              <Animated.View entering={FadeInDown.delay(0).springify()}>
                <View style={[listStyles.standartCard, { backgroundColor: colors.card, borderColor: "#D4A84344", shadowColor: "#D4A843", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }]}>
                  <View style={[listStyles.standartCardAccent, { backgroundColor: "#D4A843" }]} />
                  <View style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 14, gap: 10 }}>
                    <View style={listStyles.standartCardTop}>
                      <View style={[listStyles.heroCardIcon, { backgroundColor: "#D4A84318", width: 40, height: 40 }]}>
                        <MaterialIcons name="folder-open" size={22} color="#D4A843" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[listStyles.standartCardTitle, { color: "#D4A843" }]}>Standart Vakalar</Text>
                        <Text style={[listStyles.heroCardSub, { color: INACTIVE_COLOR }]}>Ücretsiz · erişilebilir</Text>
                      </View>
                    </View>
                    <View style={listStyles.standartStatsRow}>
                      <View style={[listStyles.standartStat, { backgroundColor: "#D4A84314", borderColor: "#D4A84330" }]}>
                        <Text style={[listStyles.standartStatNum, { color: "#D4A843" }]}>{freePuzzles.length}</Text>
                        <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>Toplam</Text>
                      </View>
                      <View style={[listStyles.standartStat, { backgroundColor: "#FFFFFF08", borderColor: "#FFFFFF18" }]}>
                        <Text style={[listStyles.standartStatNum, { color: "#F0F0F8" }]}>{activeFree.length}</Text>
                        <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>AKTİF</Text>
                      </View>
                      <View style={[listStyles.standartStat, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}28` }]}>
                        <Text style={[listStyles.standartStatNum, { color: colors.success }]}>{completedPuzzles.filter(p => !premiumPuzzleIdSet.has(p.id)).length}</Text>
                        <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>Çözüldü</Text>
                      </View>
                    </View>
                    <View style={{ height: 1, backgroundColor: "#FFFFFF0D", marginHorizontal: -14 }} />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["caylak", "dedektif", "baskomiser"] as Difficulty[]).map((diff) => {
                        const isSelected = diffFilter === diff;
                        const color = getDifficultyColor(diff);
                        const icon: MaterialIconName = diff === "caylak" ? "sentiment-satisfied" : diff === "dedektif" ? "search" : "local-police";
                        const count = activeFree.filter((p) => p.difficulty === diff).length;
                        return (
                          <FilterPill3D
                            key={diff}
                            label={getDifficultyLabel(diff)}
                            icon={icon}
                            isSelected={isSelected}
                            onPress={() => setDiffFilter(isSelected ? "all" : diff)}
                            color={color}
                            count={count}
                          />
                        );
                      })}
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* ── Tamamlananlar wide pill ── */}
              <Animated.View entering={FadeInDown.delay(30).springify()}>
                <Pressable
                  onPress={() => setDiffFilter(diffFilter === "tamamlananlar" ? "all" : "tamamlananlar")}
                  style={[
                    listStyles.tamamlananlarPill,
                    diffFilter === "tamamlananlar"
                      ? { backgroundColor: `${colors.success}22`, borderColor: colors.success, borderBottomWidth: 3, borderBottomColor: `${colors.success}AA`, shadowColor: colors.success, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={[listStyles.tamamlananlarPillIcon, { backgroundColor: diffFilter === "tamamlananlar" ? `${colors.success}22` : "#FFFFFF14" }]}>
                    <MaterialIcons name="check-circle" size={16} color={diffFilter === "tamamlananlar" ? colors.success : "#C8CAE0"} />
                  </View>
                  <Text style={[listStyles.tamamlananlarPillText, { color: diffFilter === "tamamlananlar" ? colors.success : "#E2E4F0" }]}>
                    Tamamlananlar{completedFreePuzzles.length > 0 ? ` (${completedFreePuzzles.length})` : ""}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <MaterialIcons
                    name={diffFilter === "tamamlananlar" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={20}
                    color={diffFilter === "tamamlananlar" ? colors.success : "#C8CAE0"}
                  />
                </Pressable>
              </Animated.View>

              {diffFilter === "tamamlananlar" ? (
                /* ── Tamamlananlar list (free only) ── */
                completedFreePuzzles.length === 0 ? (
                  <View style={[listStyles.emptyBox, { borderColor: colors.border }]}>
                    <MaterialIcons name="folder-open" size={40} color={colors.mutedForeground} />
                    <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>Henüz Çözülen Vaka Yok</Text>
                    <Text style={[listStyles.emptyText, { color: colors.mutedForeground }]}>
                      Aktif vakalardan birini çözdükten sonra burada görünecek.
                    </Text>
                  </View>
                ) : (
                  completedFreePuzzles.map((puzzle, i) => {
                    const stats = playStatsForPuzzle(puzzle.id);
                    return (
                      <PuzzleCard
                        key={puzzle.id}
                        puzzle={puzzle}
                        onPress={() => startPuzzle(puzzle)}
                        delay={60 + i * 30}
                        completed={true}
                        playStats={stats}
                        showReplay={true}
                      />
                    );
                  })
                )
              ) : (
                /* ── Active puzzle list ── */
                <>
                  {filteredActive.length === 0 ? (
                    <View style={[listStyles.emptyBox, { borderColor: colors.border }]}>
                      <MaterialIcons name="check-circle-outline" size={40} color={colors.success} />
                      <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>
                        {diffFilter === "all" ? "Tüm Vakalar Çözüldü!" : `${getDifficultyLabel(diffFilter as Difficulty)} vakası kalmadı`}
                      </Text>
                      <Text style={[listStyles.emptyText, { color: colors.mutedForeground }]}>
                        Tamamlananlar filtresine bakabilirsiniz.
                      </Text>
                    </View>
                  ) : (
                    filteredActive.map((puzzle, i) => (
                      <PuzzleCard
                        key={puzzle.id}
                        puzzle={puzzle}
                        onPress={() => startPuzzle(puzzle)}
                        delay={80 + i * 35}
                        completed={false}
                        playStats={null}
                        locked={false}
                      />
                    ))
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

  // Pack navigation: detect if current puzzle belongs to a purchasable pack
  const currentPack = PURCHASABLE_PACKS.find((p) => puzzle.id.startsWith(p.packId + "_")) ?? null;
  const packPuzzles = currentPack ? getPuzzlesForPack(currentPack.packId) : [];
  const currentPuzzleIdxInPack = packPuzzles.findIndex((p) => p.id === puzzle.id);
  const nextPackPuzzle = currentPuzzleIdxInPack >= 0 && currentPuzzleIdxInPack < packPuzzles.length - 1
    ? packPuzzles[currentPuzzleIdxInPack + 1]
    : null;

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
    <Animated.View style={[gameStyles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }, pageAnimStyle]}>
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
          overallRank={overallRank}
          overallPlayers={overallPlayers}
          currentStreak={gameState.appliedStreak ?? profile.currentStreak}
          isRanked={isRanked}
          onPlayMore={handleBackToList}
          onPlayNext={handlePlayNext}
          onClose={handleGoHome}
        />
      )}

      <PuzzleStartModal
        visible={!timerActive && !gameState.isComplete}
        puzzle={puzzle}
        isRanked={isRanked}
        onStart={activateTimer}
        onCancel={handleCancelStart}
      />

      <ExitConfirmSheet
        visible={showExitConfirm}
        isRanked={isRanked}
        onContinue={() => setShowExitConfirm(false)}
        onExit={handleExitConfirmed}
      />

      <ScoreInfoSheet visible={showScoreInfo} onClose={() => setShowScoreInfo(false)} />

      {/* ── Pack navigation bar: fixed strip above game content ── */}
      {currentPack && packPuzzles.length > 1 && !showResult && (
        <View style={[gameStyles.packNavBar, { borderBottomColor: currentPack.accentColor + "33", backgroundColor: currentPack.packColor + "14" }]}>
          <MaterialIcons name="inventory-2" size={13} color={currentPack.accentColor} />
          <Text style={[gameStyles.packNavTitle, { color: currentPack.accentColor }]} numberOfLines={1}>
            {currentPack.packTitle}
          </Text>
          <Text style={[gameStyles.packNavCounter, { color: currentPack.accentColor + "AA" }]}>
            {currentPuzzleIdxInPack + 1} / {packPuzzles.length}
          </Text>
          {nextPackPuzzle && (
            <Pressable
              onPress={() => handleNextPackPuzzle(nextPackPuzzle)}
              style={[gameStyles.packNavNextBtn, { borderColor: currentPack.accentColor + "55", backgroundColor: currentPack.accentColor + "18" }]}
              hitSlop={6}
            >
              <Text style={[gameStyles.packNavNextText, { color: currentPack.accentColor }]}>Sıradaki</Text>
              <MaterialIcons name="chevron-right" size={15} color={currentPack.accentColor} />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        style={gameStyles.scroll}
        contentContainerStyle={[
          gameStyles.content,
          Platform.OS === "web" && gameStyles.contentWeb,
          {
            paddingTop: 12,
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
                  {getDifficultyLabel(puzzle.difficulty as Difficulty).toLocaleUpperCase("tr-TR")}
                </Text>
                <Text
                  style={[gameStyles.puzzleTitle, { color: colors.foreground }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
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
          <View
            style={[
              gameStyles.gridContainer,
              Platform.OS === "web" && gameStyles.gridContainerWeb,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={gameStyles.gridWrapper}>
              <DetectiveGrid
                puzzleId={puzzle.id}
                suspects={puzzle.suspects}
                weapons={puzzle.weapons}
                locations={puzzle.locations}
                gridState={gridState}
                autoCrossOwners={gameState.autoCrossOwners}
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
    </Animated.View>
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
    fontSize: 21,
    fontFamily: "PlayfairDisplay",
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  premiumHeader: {
    marginTop: 16,
  },
  premiumCtaCount: {
    backgroundColor: "#D4A84333",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  premiumCtaCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D4A843",
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
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
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
  puzzleCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 0,
    gap: 8,
    marginBottom: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
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
  puzzleTitle: { fontSize: 17, fontFamily: "PlayfairDisplay", fontWeight: "600", lineHeight: 24 },
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
    marginTop: 4,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  playText: { fontSize: 13, fontWeight: "600" },
  bestResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  playStatsColumn: {
    flex: 1,
    gap: 4,
  },
  bestResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bestResultLabel: { fontSize: 12 },
  bestResultValue: { fontSize: 12, fontWeight: "600" },
  diffFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
    overflow: "hidden",
  },
  diffFilterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  diffFilterText: {
    fontSize: 12,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
  },
  diffFilterCount: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  diffFilterCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  heroCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCardTitle: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  heroCardSub: { fontSize: 12, marginTop: 1 },
  heroCardCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  heroCardCtaText: {
    fontSize: 12,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
  },
  premBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    gap: 4,
  },
  tabBtn3d: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 7,
  },
  tabBtnText3d: {
    fontSize: 13,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  tabCount3d: {
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tabCountText3d: {
    fontSize: 12,
    fontFamily: "PlayfairDisplay",
    fontWeight: "700",
  },
  filterPill3d: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1.5,
    gap: 5,
    minHeight: 72,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.35,
    elevation: 6,
  },
  filterPillText3d: {
    fontSize: 13,
    fontFamily: "PlayfairDisplay",
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  filterPillCount3d: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  filterPillCountText3d: {
    fontSize: 11,
    fontFamily: "PlayfairDisplay",
    fontWeight: "700",
  },
  tamamlananlarPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  tamamlananlarPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tamamlananlarPillText: {
    fontSize: 14,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  tamamlananlarPillCount: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  tamamlananlarPillCountText: {
    fontSize: 12,
    fontFamily: "PlayfairDisplay",
    fontWeight: "700",
  },
  premSubFilterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  premAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  premAccordionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  premAccordionTitle: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  premAccordionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  premAccordionLockWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: "PlayfairDisplay",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  completedHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  completedHeaderText: {
    fontSize: 12,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
  },
  standartCard: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  standartCardTitle: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay",
    fontWeight: "700",
    color: "#F0F0F8",
    letterSpacing: 0.3,
  },
  standartCardAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  standartCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  standartStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  standartStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1,
    gap: 2,
  },
  standartStatNum: {
    fontSize: 17,
    fontFamily: "PlayfairDisplay",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  standartStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  premSegmentWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  premSegmentTrack: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  premSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    gap: 6,
  },
  premSegmentText: {
    fontSize: 13,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  premSegmentCount: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  premSegmentCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  premSegmentDivider: {
    width: 1,
    alignSelf: "stretch",
  },
  premUnlockBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  premUnlockBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  premIconTabRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  premPillWrap: {
    flexDirection: "row",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  premPillBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 20,
    margin: 3,
    borderWidth: 1,
    borderColor: "transparent",
  },
  premPillSep: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: 6,
  },
  premPillBtnText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlayfairDisplay",
  },
  premVakalarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  premVakalarTitle: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay",
    fontWeight: "700",
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  premVakalarCount: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    alignItems: "center",
  },
  premVakalarCountText: {
    fontSize: 13,
    fontFamily: "PlayfairDisplay",
    fontWeight: "800",
  },
});

const gameStyles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 10, gap: 16 },
  packNavBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  packNavTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  packNavCounter: {
    fontSize: 11,
    fontWeight: "600",
  },
  packNavNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  packNavNextText: {
    fontSize: 12,
    fontWeight: "700",
  },
  contentWeb: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
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
  puzzleTitle: { fontSize: 17, fontFamily: "PlayfairDisplay", fontWeight: "400", lineHeight: 25 },
  storyBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  storyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  storyLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  storyText: { fontSize: 14, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontFamily: "PlayfairDisplay", fontWeight: "400", marginBottom: 8 },
  gridContainer: { borderRadius: 14, borderWidth: 1, padding: 10, overflow: "hidden" },
  gridContainerWeb: {
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  headerCompact: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 3,
  },
  titleCompact: {
    fontSize: 14,
    fontFamily: "PlayfairDisplay",
    fontWeight: "400",
    letterSpacing: 0.1,
  },
  countBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontFamily: "PlayfairDisplay",
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
    fontFamily: "PlayfairDisplay",
    fontWeight: "400",
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
