import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  LayoutAnimation,
  UIManager,
  type ImageSourcePropType,
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
import { isPuzzleAsset, getPuzzleAsset } from "@/utils/puzzleAssetMap";
import {
  computeCaseRank,
  computeOverallRank,
  computeScoreForRank,
} from "@/utils/leaderboardRank";
import PaketlerContent from "@/components/PaketlerContent";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import CustomAvatar from "@/components/CustomAvatar";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

const DIFF_IMAGES: Record<string, ReturnType<typeof require>> = {
  caylak: require("@/assets/images/diff_caylak.png"),
  dedektif: require("@/assets/images/diff_dedektif.png"),
  baskomiser: require("@/assets/images/diff_bas_komiser.png"),
};
const BADGE_IMAGES: Record<string, ReturnType<typeof require>> = {
  caylak: require("@/assets/images/badge_caylak.png"),
  dedektif: require("@/assets/images/badge_dedektif.png"),
  baskomiser: require("@/assets/images/badge_bas_komiser.png"),
};

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
        withTiming(1, { duration: 550, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 950, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const glowOuter = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.65 }));
  const glowInner = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.45 }));
  const scaleAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ flex: 1 }, scaleAnim]}>
      {/* Outer diffuse glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: 14,
            shadowColor: NEON_ORANGE,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 32,
            elevation: 28,
          },
          glowOuter,
        ]}
      />
      {/* Inner sharp glow with border */}
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
            shadowRadius: 10,
            elevation: 16,
          },
          glowInner,
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
          <Image source={require("@/assets/images/premium-icon.png")} style={{ width: 20, height: 20 }} resizeMode="contain" />
          <Text style={[listStyles.tabBtnText3d, { color: PREMIUM_GOLD, fontWeight: "700", fontFamily: "DroidSerifRegular", fontSize: 14, letterSpacing: 0.3 }]}>
            Premium
          </Text>
        </Pressable>
        {/* Thin separator */}
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: `${NEON_ORANGE}44`, marginHorizontal: 10 }} />
        {/* Row 2: Vakalar | Paketler sub-tab selectors */}
        <View style={{ flexDirection: "row", paddingHorizontal: 6, paddingTop: 4, paddingBottom: 5, gap: 3 }}>
          <Pressable
            onPress={() => onSubTabChange("vakalar")}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingVertical: 5,
              borderRadius: 7,
              backgroundColor: subTab === "vakalar" && active ? `${PREMIUM_GOLD}22` : "transparent",
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.91 : 1 }],
            })}
          >
            <Image source={require("@/assets/images/premium-vakalar-icon.png")} style={{ width: 16, height: 16, opacity: subTab === "vakalar" && active ? 1 : 0.45 }} resizeMode="contain" />
            <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "700", color: subTab === "vakalar" && active ? PREMIUM_GOLD : "#888AAA" }}>Vakalar</Text>
          </Pressable>
          <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: `${PREMIUM_GOLD}33`, alignSelf: "stretch", marginVertical: 2 }} />
          <Pressable
            onPress={() => onSubTabChange("paketler")}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingVertical: 5,
              borderRadius: 7,
              backgroundColor: subTab === "paketler" && active ? `${PREMIUM_GOLD}22` : "transparent",
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.91 : 1 }],
            })}
          >
            <Image source={require("@/assets/images/premium-paketler-icon.png")} style={{ width: 16, height: 16, opacity: subTab === "paketler" && active ? 1 : 0.45 }} resizeMode="contain" />
            <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "700", color: subTab === "paketler" && active ? PREMIUM_GOLD : "#888AAA" }}>Paketler</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function TabButton3D({
  label, icon, image, active, count, onPress, activeColor,
}: {
  label: string; icon: MaterialIconName; image?: ImageSourcePropType; active: boolean; count?: number;
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
                backgroundColor: "#1C2130",
                borderColor: "#FFFFFF28",
                borderBottomWidth: 1.5,
                shadowColor: "#000",
                shadowOpacity: 0.4,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              },
        ]}
      >
        {image ? (
          <Image source={image} style={{ width: 44, height: 44, opacity: active ? 1 : 0.55 }} resizeMode="contain" />
        ) : (
          <MaterialIcons name={icon} size={17} color={active ? activeColor : "#8899BB"} />
        )}
        <Text
          style={[listStyles.tabBtnText3d, { color: active ? activeColor : "#AAAACC", fontFamily: "DroidSerifRegular", fontSize: 15, fontWeight: active ? "700" : "600", textAlign: "left" }]}
          numberOfLines={2}
        >
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
        withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);
  const glowLayerStyle = useAnimatedStyle(() => ({
    opacity: 0.42 + glow.value * 0.58,
  }));
  const glowInnerStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + glow.value * 0.75,
  }));
  return (
    <Animated.View entering={entering} style={{ borderRadius: 14 }}>
      {/* Glow halo outer — wide diffuse */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: 14,
            shadowColor: color,
            shadowRadius: 32,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            elevation: 14,
          },
          glowLayerStyle,
        ]}
      />
      {/* Glow halo inner — sharp concentrated */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: color,
            shadowColor: color,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            elevation: 8,
          },
          glowInnerStyle,
        ]}
      />
      {children}
    </Animated.View>
  );
}

function FilterPill3D({
  label, icon, img, isSelected, onPress, color, count,
}: {
  label: string; icon?: MaterialIconName; img?: ImageSourcePropType; isSelected: boolean;
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
        {img ? (
          <View style={listStyles.filterPillImgWrap}>
            <Image source={img} style={listStyles.filterPillImg} />
            <View style={[listStyles.filterPillLabel, { backgroundColor: isSelected ? `${color}EE` : `${color}AA` }]}>
              <Text style={[listStyles.filterPillLabelText, { color: isSelected ? "#0F1117" : "#FFFFFF" }]}>{label}</Text>
            </View>
            {count !== undefined && count > 0 && (
              <View style={[listStyles.filterPillImgCount, {
                backgroundColor: isSelected ? color : `${color}DD`,
              }]}>
                <Text style={[listStyles.filterPillImgCountText, {
                  color: isSelected ? "#0F1117" : "#FFFFFF",
                }]}>{count}</Text>
              </View>
            )}
          </View>
        ) : icon ? (
          <>
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
                  fontFamily: "DroidSerifRegular",
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
          </>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function CozulenlerButton({ onPress, count }: { onPress: () => void; count: number }) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.87, { damping: 11, stiffness: 420 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 9, stiffness: 300 }); }}
        onPress={onPress}
        hitSlop={4}
        style={[listStyles.cozulenlerBtn, { backgroundColor: `${colors.success}1C`, borderColor: `${colors.success}55`, borderBottomColor: `${colors.success}88` }]}
      >
        <MaterialIcons name="check-circle" size={13} color={colors.success} />
        <Text style={[listStyles.cozulenlerBtnText, { color: colors.success }]}>
          Çözülenler{count > 0 ? ` ${count}` : ""}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function CompletedCaseDetailCard({
  puzzle,
  playStats,
  onReplay,
}: {
  puzzle: { id: string; title: string; story: string; difficulty: string };
  playStats: import("@/context/GameContext").PlayStats | null;
  onReplay: () => void;
}) {
  const colors = useColors();
  const diffColor = getDifficultyColor(puzzle.difficulty as Difficulty);
  const diffLabel: Record<string, string> = { caylak: "Çaylak", dedektif: "Dedektif", baskomiser: "Başkomiser" };
  const firstPlay = playStats?.firstPlay;
  const latestPlay = playStats?.latestPlay;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <View style={[listStyles.ccdCard, { backgroundColor: colors.card, borderColor: `${colors.primary}30` }]}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <View style={[listStyles.ccdDiffBadge, { backgroundColor: `${diffColor}18`, borderColor: `${diffColor}44` }]}>
              <Text style={[listStyles.ccdDiffText, { color: diffColor }]}>{diffLabel[puzzle.difficulty] ?? puzzle.difficulty}</Text>
            </View>
            <View style={[listStyles.ccdSolvedBadge, { backgroundColor: `${colors.success}14`, borderColor: `${colors.success}44` }]}>
              <MaterialIcons name="check-circle" size={11} color={colors.success} />
              <Text style={[listStyles.ccdSolvedText, { color: colors.success }]}>Çözüldü</Text>
            </View>
          </View>
          <Text style={[listStyles.ccdTitle, { color: colors.foreground }]} numberOfLines={2}>{puzzle.title}</Text>
          <Text style={[listStyles.ccdStory, { color: colors.mutedForeground }]} numberOfLines={3}>{puzzle.story}</Text>
        </View>
        {firstPlay && (
          <View style={[listStyles.ccdStatsRow, { borderTopColor: `${colors.border}80` }]}>
            <View style={listStyles.ccdStatGroup}>
              <Text style={[listStyles.ccdStatLabel, { color: colors.mutedForeground }]}>İlk Oynanış</Text>
              <View style={listStyles.ccdStatItems}>
                <View style={listStyles.ccdStatItem}>
                  <MaterialIcons name="star" size={12} color={colors.primary} />
                  <Text style={[listStyles.ccdStatVal, { color: colors.foreground }]}>{firstPlay.score}</Text>
                </View>
                <View style={listStyles.ccdStatItem}>
                  <MaterialIcons name="timer" size={12} color="#6B7FA8" />
                  <Text style={[listStyles.ccdStatVal, { color: colors.foreground }]}>{fmt(firstPlay.timeSeconds)}</Text>
                </View>
              </View>
            </View>
            {latestPlay && latestPlay.score !== firstPlay.score && (
              <View style={[listStyles.ccdStatGroup, { borderLeftWidth: 1, borderLeftColor: `${colors.border}60`, paddingLeft: 12 }]}>
                <Text style={[listStyles.ccdStatLabel, { color: colors.mutedForeground }]}>Son Oynanış</Text>
                <View style={listStyles.ccdStatItems}>
                  <View style={listStyles.ccdStatItem}>
                    <MaterialIcons name="star" size={12} color={colors.primary} />
                    <Text style={[listStyles.ccdStatVal, { color: colors.primary }]}>{latestPlay.score}</Text>
                  </View>
                  <View style={listStyles.ccdStatItem}>
                    <MaterialIcons name="timer" size={12} color="#6B7FA8" />
                    <Text style={[listStyles.ccdStatVal, { color: colors.foreground }]}>{fmt(latestPlay.timeSeconds)}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
        <Pressable
          onPress={onReplay}
          style={({ pressed }) => [
            listStyles.ccdReplayBtn,
            { backgroundColor: pressed ? "#B8922F" : colors.primary, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <MaterialIcons name="refresh" size={14} color="#0F1117" />
          <Text style={[listStyles.ccdReplayText, { color: "#0F1117" }]}>Tekrar Oyna</Text>
        </Pressable>
      </View>
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
  noEnter,
}: {
  puzzle: (typeof PUZZLES)[0];
  onPress: () => void;
  delay: number;
  completed: boolean;
  playStats: PlayStats | null;
  locked?: boolean;
  showReplay?: boolean;
  premiumBadge?: boolean;
  noEnter?: boolean;
}) {
  const colors = useColors();
  const diffColor = getDifficultyColor(puzzle.difficulty as Difficulty);
  const pressScale = useSharedValue(1);
  const pressY = useSharedValue(0);
  const pressShadow = useSharedValue(4);

  const animatePress = (down: boolean) => {
    pressScale.value = withTiming(down ? 0.985 : 1, {
      duration: down ? 90 : 140,
      easing: Easing.out(Easing.cubic),
    });
    pressY.value = withTiming(down ? 2 : 0, {
      duration: down ? 90 : 140,
      easing: Easing.out(Easing.cubic),
    });
    pressShadow.value = withTiming(down ? 1 : 4, {
      duration: down ? 90 : 140,
      easing: Easing.out(Easing.cubic),
    });
  };

  const pressStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value },
      { translateY: pressY.value },
    ],
    shadowColor: "#000",
    shadowRadius: 4 + (pressShadow.value / 4) * 4,
    shadowOffset: { width: 0, height: pressShadow.value },
    shadowOpacity: 0.1 + (pressShadow.value / 4) * 0.18,
    elevation: 2 + (pressShadow.value / 4) * 3,
  }));

  return (
    <Animated.View
      entering={noEnter ? undefined : FadeInDown.delay(delay).duration(320)}
      style={pressStyle}
    >
      <Pressable
        testID="puzzle-card"
        onPress={onPress}
        onPressIn={() => animatePress(true)}
        onPressOut={() => animatePress(false)}
        style={({ pressed }) => [
          listStyles.puzzleCard,
          {
            backgroundColor: pressed
              ? locked ? "#1E1A28" : completed ? `${colors.success}14` : `${diffColor}18`
              : completed && !locked ? `${colors.success}08` : colors.card,
            borderColor: completed
              ? `${colors.success}55`
              : locked
              ? "#D4A84333"
              : `${diffColor}33`,
            borderLeftColor: completed ? colors.success : locked ? "#D4A843" : diffColor,
            borderLeftWidth: 3.5,
            shadowColor: "#000",
            shadowRadius: pressed ? 4 : 8,
          },
          locked && { borderStyle: "dashed" as const },
        ]}
      >
        <View style={listStyles.puzzleCardTop}>
          <View
            style={[
              listStyles.diffBadge,
              { backgroundColor: `${diffColor}18`, borderColor: `${diffColor}55`, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 2 },
            ]}
          >
            <Image
              source={BADGE_IMAGES[puzzle.difficulty] ?? BADGE_IMAGES.caylak}
              style={{ width: 26, height: 26, marginVertical: -4 }}
              resizeMode="contain"
            />
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
              <View style={listStyles.suspectAvatarRow}>
                {puzzle.suspects.map((s, i) => {
                  const paAsset = isPuzzleAsset(s.icon) ? getPuzzleAsset(s.icon) : null;
                  return (
                    <View
                      key={s.id}
                      style={[
                        listStyles.suspectAvatarCircle,
                        i > 0 && { marginLeft: -12 },
                      ]}
                    >
                      {paAsset ? (
                        <Image source={paAsset} style={{ width: 26, height: 26, borderRadius: 13 }} resizeMode="cover" />
                      ) : (
                        <CustomAvatar icon={s.icon} size={26} color="#A855F7" />
                      )}
                    </View>
                  );
                })}
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
          <View style={[listStyles.playRow, { borderTopColor: `${diffColor}55`, backgroundColor: `${diffColor}16` }]}>
            <Text style={[listStyles.playText, { color: diffColor, fontWeight: "700" }]}>Oynamak için dokun</Text>
            <MaterialIcons name="chevron-right" size={22} color={diffColor} />
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
  const { isPremium, isPackPurchased } = usePurchase();
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
  const [diffFilter, setDiffFilter] = useState<Difficulty | "all">("all");
  const [premiumSubTab, setPremiumSubTab] = useState<"vakalar" | "paketler">("vakalar");
  const [premiumVakalarExpanded, setPremiumVakalarExpanded] = useState(false);
  const [premDiffFilter, setPremDiffFilter] = useState<Difficulty | "all">("all");
  const [showCozulenlerFree, setShowCozulenlerFree] = useState(false);
  const [showCozulenlerPrem, setShowCozulenlerPrem] = useState(false);
  const [showCozulenlerPaket, setShowCozulenlerPaket] = useState(false);

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
        if (gs && gs.timerActive && !gs.isComplete) {
          if (gs.isRanked) {
            inv();
          } else {
            setShowExitConfirm(true);
          }
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
          const src = launchSourceRef.current;
          setShowResult(false); // önce modalı kapat, sonra navigate
          if (src === "home") {
            router.navigate("/");
            InteractionManager.runAfterInteractions(() => { resetCurrentGame(); });
          } else if (src === "gorevler") {
            router.navigate("/gorevler");
            InteractionManager.runAfterInteractions(() => { resetCurrentGame(); });
          } else {
            resetCurrentGame();
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
    const src = launchSourceRef.current;
    setShowResult(false); // modalı navigate'den önce kapat — animasyon sırasında re-render olmaz
    if (src === "home") {
      router.navigate("/");
      InteractionManager.runAfterInteractions(() => { resetCurrentGame(); });
    } else if (src === "gorevler") {
      router.navigate("/gorevler");
      InteractionManager.runAfterInteractions(() => { resetCurrentGame(); });
    } else {
      // Vakalar sekmesinde kal — sadece state sıfırla ve scroll pozisyonunu geri yükle.
      resetCurrentGame();
      const savedY = listScrollY.current;
      setTimeout(() => {
        listScrollRef.current?.scrollTo({ y: savedY, animated: false });
      }, 0);
    }
  };

  const handleCancelStart = () => {
    const src = launchSourceRef.current;
    if (src === "home") {
      router.navigate("/");
      // State'i animasyon bittikten sonra sıfırla — aksi hâlde tab geçişi sırasında
      // liste görünümü kısa süreliğine yanıp söner (takılma hissi verir).
      InteractionManager.runAfterInteractions(() => { resetCurrentGame(); });
    } else if (src === "gorevler") {
      router.navigate("/gorevler");
      InteractionManager.runAfterInteractions(() => { resetCurrentGame(); });
    } else {
      // Vakalar sekmesindeyken: navigasyon yok, sadece state sıfırla (liste görünümüne dön).
      resetCurrentGame();
    }
  };

  const handleGoHome = () => {
    if (homeTimerRef.current) clearTimeout(homeTimerRef.current);
    setShowResult(false); // modalı navigate'den önce kapat — geçiş animasyonu temiz kalır
    router.navigate("/");
    InteractionManager.runAfterInteractions(() => { resetCurrentGame(); });
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
    const accessiblePacks = PACKS.filter((pack) => isPremium || isPackPurchased(pack.packId));
    const allPackPuzzles = accessiblePacks.flatMap((pack) => getPuzzlesForPack(pack.packId));
    const activePackPuzzles = allPackPuzzles.filter((p) => !completedPuzzleIds.has(p.id));
    const allPurchasablePackPuzzles = PURCHASABLE_PACKS.flatMap((pack) => getPuzzlesForPack(pack.packId));
    const purchasedPackPuzzles = PURCHASABLE_PACKS
      .filter((pack) => isPackPurchased(pack.packId))
      .flatMap((pack) => getPuzzlesForPack(pack.packId));

    const activeFree = freePuzzles.filter((p) => !completedPuzzleIds.has(p.id));
    const activePremium = premiumPuzzles.filter((p) => !completedPuzzleIds.has(p.id));

    const premiumPuzzleIdSet = new Set(premiumPuzzles.map((p) => p.id));
    const completedPremiumPuzzles = completedPuzzles.filter((p) => premiumPuzzleIdSet.has(p.id));
    const completedFreePuzzles = freePuzzles.filter((p) => completedPuzzleIds.has(p.id));
    const premFilteredActive = premDiffFilter === "all"
      ? activePremium
      : activePremium.filter((p) => p.difficulty === (premDiffFilter as Difficulty));
    const availableActive = [...activeFree, ...(isPremium ? activePremium : [])];
    const filteredActive = diffFilter === "all"
      ? activeFree
      : activeFree.filter((p) => p.difficulty === (diffFilter as Difficulty));
    const totalActiveCount = activeFree.length;

    return (
      <>
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} premiumPuzzleCount={premiumPuzzles.length} />
        {/* ── Çözülenler Modal (Standart) ── */}
        <Modal
          visible={showCozulenlerFree}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCozulenlerFree(false)}
        >
          <View style={[listStyles.cozulenlerModal, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
            <View style={[listStyles.cozulenlerModalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialIcons name="check-circle" size={20} color={colors.success} />
                <Text style={[listStyles.cozulenlerModalTitle, { color: colors.foreground }]}>Çözülenler</Text>
              </View>
              <Pressable onPress={() => setShowCozulenlerFree(false)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 32, gap: 10 }} showsVerticalScrollIndicator={false}>
              {completedFreePuzzles.length === 0 ? (
                <View style={[listStyles.emptyBox, { borderColor: colors.border, marginTop: 24 }]}>
                  <MaterialIcons name="folder-open" size={40} color={colors.mutedForeground} />
                  <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>Henüz Çözülen Vaka Yok</Text>
                </View>
              ) : (
                completedFreePuzzles.map((puzzle) => {
                  const stats = playStatsForPuzzle(puzzle.id);
                  return (
                    <CompletedCaseDetailCard
                      key={puzzle.id}
                      puzzle={puzzle}
                      playStats={stats}
                      onReplay={() => { setShowCozulenlerFree(false); startPuzzle(puzzle); }}
                    />
                  );
                })
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* ── Çözülenler Modal (Premium) ── */}
        <Modal
          visible={showCozulenlerPrem}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCozulenlerPrem(false)}
        >
          <View style={[listStyles.cozulenlerModal, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
            <View style={[listStyles.cozulenlerModalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialIcons name="check-circle" size={20} color={colors.success} />
                <Text style={[listStyles.cozulenlerModalTitle, { color: colors.foreground }]}>Premium Çözülenler</Text>
              </View>
              <Pressable onPress={() => setShowCozulenlerPrem(false)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 32, gap: 10 }} showsVerticalScrollIndicator={false}>
              {completedPremiumPuzzles.length === 0 ? (
                <View style={[listStyles.emptyBox, { borderColor: colors.border, marginTop: 24 }]}>
                  <MaterialIcons name="folder-open" size={40} color={colors.mutedForeground} />
                  <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>Henüz Çözülen Premium Vaka Yok</Text>
                </View>
              ) : (
                completedPremiumPuzzles.map((puzzle) => {
                  const stats = playStatsForPuzzle(puzzle.id);
                  return (
                    <CompletedCaseDetailCard
                      key={puzzle.id}
                      puzzle={puzzle}
                      playStats={stats}
                      onReplay={() => { setShowCozulenlerPrem(false); startPuzzle(puzzle); }}
                    />
                  );
                })
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* ── Çözülenler Modal (Paketler) ── */}
        <Modal
          visible={showCozulenlerPaket}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCozulenlerPaket(false)}
        >
          <View style={[listStyles.cozulenlerModal, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
            <View style={[listStyles.cozulenlerModalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialIcons name="check-circle" size={20} color={colors.success} />
                <Text style={[listStyles.cozulenlerModalTitle, { color: colors.foreground }]}>Paket Çözülenler</Text>
              </View>
              <Pressable onPress={() => setShowCozulenlerPaket(false)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 32, gap: 10 }} showsVerticalScrollIndicator={false}>
              {completedPackPuzzles.length === 0 ? (
                <View style={[listStyles.emptyBox, { borderColor: colors.border, marginTop: 24 }]}>
                  <MaterialIcons name="folder-open" size={40} color={colors.mutedForeground} />
                  <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>Henüz Çözülen Paket Vakası Yok</Text>
                </View>
              ) : (
                completedPackPuzzles.map((puzzle) => {
                  const stats = playStatsForPuzzle(puzzle.id);
                  return (
                    <CompletedCaseDetailCard
                      key={puzzle.id}
                      puzzle={puzzle}
                      playStats={stats}
                      onReplay={() => { setShowCozulenlerPaket(false); startPuzzle(puzzle); }}
                    />
                  );
                })
              )}
            </ScrollView>
          </View>
        </Modal>

        <PremiumInfoModal
          visible={showPremiumInfo}
          premiumPuzzleCount={isPremium ? activePremium.length : premiumPuzzles.length}
          onBuy={() => { setShowPremiumInfo(false); setShowPaywall(true); }}
          onClose={() => setShowPremiumInfo(false)}
        />
        <View style={[gameStyles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Image
              source={require("@/assets/images/intro_bg.png")}
              style={[StyleSheet.absoluteFillObject, { opacity: 0.13 }]}
              resizeMode="cover"
            />
          </View>

          {/* ── Page Header ── */}
          <View style={[listStyles.pageHeader, { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[listStyles.pageTitle, { color: colors.foreground }]}>Vakalar</Text>
              <Text style={[listStyles.pageSubtitle, { color: colors.mutedForeground }]}>Davaları çöz · puan kazan</Text>
            </View>
          </View>

          {/* ── 3D Tab Bar ── */}
          <View style={[listStyles.tabBar, { paddingTop: 4, paddingBottom: 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <View style={listStyles.tabBarInner}>
              <View style={{ flex: 0.9 }}>
                <TabButton3D
                  label={"Standart\nVakalar"}
                  icon="folder-open"
                  image={require("@/assets/images/vakalar-icon.png")}
                  active={listTab === "vakalar"}
                  onPress={() => setListTab("vakalar")}
                  activeColor={colors.primary}
                />
              </View>
              <View style={{ flex: 1.1 }}>
                <PremiumTabButton
                  active={listTab === "premium"}
                  onPress={() => setListTab("premium")}
                  subTab={premiumSubTab}
                  onSubTabChange={(tab) => { setListTab("premium"); setPremiumSubTab(tab); }}
                />
              </View>
            </View>
          </View>

          <Animated.View key={listTab} style={{ flex: 1 }} entering={FadeIn.duration(170)}>
          {listTab === "premium" ? (
            /* ══════════ PREMIUM TAB ══════════ */
            <View style={{ flex: 1 }}>
              {premiumSubTab === "paketler" ? (
                <Animated.View entering={FadeInDown.delay(0).springify()} style={{ flex: 1 }}>
                  <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
                    <View style={[listStyles.standartCard, { backgroundColor: colors.card, borderColor: "#A855F744", shadowColor: "#A855F7", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }]}>
                      <View style={[listStyles.standartCardAccent, { backgroundColor: "#A855F7" }]} />
                      <View style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 14, gap: 10 }}>
                        <View style={listStyles.standartCardTop}>
                          <View style={[listStyles.heroCardIcon, { backgroundColor: "#A855F718", borderColor: "#A855F740", borderWidth: 1, width: 58, height: 58 }]}>
                            <Image source={require("@/assets/images/premium-paketler-icon.png")} style={{ width: 48, height: 48 }} resizeMode="contain" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[listStyles.standartCardTitle, { color: "#A855F7" }]}>Premium Paketler</Text>
                            <Text style={[listStyles.heroCardSub, { color: INACTIVE_COLOR }]}>Paketler · erişilebilir</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#A855F722", borderColor: "#A855F760", borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <MaterialIcons name="auto-awesome" size={11} color="#C084FC" />
                            <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 12, fontWeight: "700", color: "#C084FC" }}>{PURCHASABLE_PACKS.length} Paket</Text>
                          </View>
                        </View>
                        <View style={[listStyles.unifiedStatsRow, { backgroundColor: "#A855F709", borderColor: "#A855F732" }]}>
                          <View style={listStyles.unifiedStatItem}>
                            <Text style={[listStyles.standartStatNum, { color: "#C084FC" }]}>{allPurchasablePackPuzzles.length}</Text>
                            <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>TOPLAM</Text>
                          </View>
                          <View style={[listStyles.unifiedStatDivider, { backgroundColor: "#A855F728" }]} />
                          <View style={listStyles.unifiedStatItem}>
                            <Text style={[listStyles.standartStatNum, { color: "#F0F0F8" }]}>{purchasedPackPuzzles.length}</Text>
                            <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>AKTİF</Text>
                          </View>
                          <View style={[listStyles.unifiedStatDivider, { backgroundColor: "#A855F728" }]} />
                          <Pressable
                            onPress={() => completedPackPuzzles.length > 0 && setShowCozulenlerPaket(true)}
                            style={({ pressed }) => [
                              listStyles.unifiedStatItem,
                              completedPackPuzzles.length > 0 && pressed && { backgroundColor: `${colors.success}18`, borderRadius: 8 },
                            ]}
                          >
                            <Text style={[listStyles.standartStatNum, { color: colors.success }]}>{completedPackPuzzles.length}</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                              <Text style={[listStyles.standartStatLabel, { color: completedPackPuzzles.length > 0 ? colors.success : INACTIVE_COLOR }]}>ÇÖZÜLDÜ</Text>
                              {completedPackPuzzles.length > 0 && <MaterialIcons name="chevron-right" size={10} color={colors.success} />}
                            </View>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
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
                      <Image source={require("@/assets/images/premium-vakalar-icon.png")} style={{ width: 30, height: 30 }} resizeMode="contain" />
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
                          <Text style={[listStyles.premAccordionTitle, { color: "#F0F0F8", fontFamily: "DroidSerifRegular", fontSize: 14 }]}>
                            Vaka Arşivi — Tek Seferlik Satın Alma
                          </Text>
                          <Text style={[listStyles.premAccordionSub, { color: "#D4A84399", marginTop: 3, fontFamily: "DroidSerifRegular", fontSize: 13 }]}>
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
                              <View style={[listStyles.heroCardIcon, { backgroundColor: "#C8581A18", borderColor: "#C8581A40", borderWidth: 1, width: 58, height: 58 }]}>
                                <Image source={require("@/assets/images/premium-vakalar-icon.png")} style={{ width: 48, height: 48 }} resizeMode="contain" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[listStyles.standartCardTitle, { color: "#E87A3A" }]}>Premium Vakalar</Text>
                                <Text style={[listStyles.heroCardSub, { color: INACTIVE_COLOR }]}>Arşiv · erişilebilir</Text>
                              </View>
                            </View>
                            <View style={[listStyles.unifiedStatsRow, { backgroundColor: "#C8581A09", borderColor: "#C8581A32" }]}>
                              <View style={listStyles.unifiedStatItem}>
                                <Text style={[listStyles.standartStatNum, { color: "#E87A3A" }]}>{premiumPuzzles.length}</Text>
                                <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>TOPLAM</Text>
                              </View>
                              <View style={[listStyles.unifiedStatDivider, { backgroundColor: "#C8581A28" }]} />
                              <View style={listStyles.unifiedStatItem}>
                                <Text style={[listStyles.standartStatNum, { color: "#F0F0F8" }]}>{activePremium.length}</Text>
                                <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>AKTİF</Text>
                              </View>
                              <View style={[listStyles.unifiedStatDivider, { backgroundColor: "#C8581A28" }]} />
                              <Pressable
                                onPress={() => completedPremiumPuzzles.length > 0 && setShowCozulenlerPrem(true)}
                                style={({ pressed }) => [
                                  listStyles.unifiedStatItem,
                                  completedPremiumPuzzles.length > 0 && pressed && { backgroundColor: `${colors.success}18`, borderRadius: 8 },
                                ]}
                              >
                                <Text style={[listStyles.standartStatNum, { color: colors.success }]}>{completedPremiumPuzzles.length}</Text>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                                  <Text style={[listStyles.standartStatLabel, { color: completedPremiumPuzzles.length > 0 ? colors.success : INACTIVE_COLOR }]}>ÇÖZÜLDÜ</Text>
                                  {completedPremiumPuzzles.length > 0 && <MaterialIcons name="chevron-right" size={10} color={colors.success} />}
                                </View>
                              </Pressable>
                            </View>
                            <View style={{ height: 1, backgroundColor: "#FFFFFF0D", marginHorizontal: -14 }} />
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              {(["caylak", "dedektif", "baskomiser"] as Difficulty[]).map((diff) => {
                                const isSelected = premDiffFilter === diff;
                                const color = getDifficultyColor(diff);
                                const img = diff === "caylak"
                                  ? require("@/assets/images/diff_caylak.png")
                                  : diff === "dedektif"
                                  ? require("@/assets/images/diff_dedektif.png")
                                  : require("@/assets/images/diff_bas_komiser.png");
                                const count = activePremium.filter((p) => p.difficulty === diff).length;
                                return (
                                  <FilterPill3D
                                    key={diff}
                                    label={getDifficultyLabel(diff)}
                                    img={img}
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

                      {premFilteredActive.length === 0 ? (
                        <View style={[listStyles.emptyBox, { borderColor: colors.border }]}>
                          <MaterialIcons name="check-circle-outline" size={40} color={colors.success} />
                          <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>
                            {premDiffFilter === "all" ? "Tüm Premium Vakalar Çözüldü!" : `${getDifficultyLabel(premDiffFilter as Difficulty)} premium vakası kalmadı`}
                          </Text>
                          <Text style={[listStyles.emptyText, { color: colors.mutedForeground }]}>
                            Çözülenler butonuna bakabilirsiniz.
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
                      <View style={[listStyles.heroCardIcon, { backgroundColor: "#D4A84318", borderColor: "#D4A84340", borderWidth: 1, width: 58, height: 58 }]}>
                        <Image source={require("@/assets/images/vakalar-icon.png")} style={{ width: 48, height: 48 }} resizeMode="contain" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[listStyles.standartCardTitle, { color: "#D4A843" }]}>Standart Vakalar</Text>
                        <Text style={[listStyles.heroCardSub, { color: INACTIVE_COLOR }]}>Ücretsiz · erişilebilir</Text>
                      </View>
                    </View>
                    <View style={[listStyles.unifiedStatsRow, { backgroundColor: "#D4A84309", borderColor: "#D4A84332" }]}>
                      <View style={listStyles.unifiedStatItem}>
                        <Text style={[listStyles.standartStatNum, { color: "#D4A843" }]}>{freePuzzles.length}</Text>
                        <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>TOPLAM</Text>
                      </View>
                      <View style={[listStyles.unifiedStatDivider, { backgroundColor: "#D4A84328" }]} />
                      <View style={listStyles.unifiedStatItem}>
                        <Text style={[listStyles.standartStatNum, { color: "#F0F0F8" }]}>{activeFree.length}</Text>
                        <Text style={[listStyles.standartStatLabel, { color: INACTIVE_COLOR }]}>AKTİF</Text>
                      </View>
                      <View style={[listStyles.unifiedStatDivider, { backgroundColor: "#D4A84328" }]} />
                      <Pressable
                        onPress={() => completedFreePuzzles.length > 0 && setShowCozulenlerFree(true)}
                        style={({ pressed }) => [
                          listStyles.unifiedStatItem,
                          completedFreePuzzles.length > 0 && pressed && { backgroundColor: `${colors.success}18`, borderRadius: 8 },
                        ]}
                      >
                        <Text style={[listStyles.standartStatNum, { color: colors.success }]}>{completedFreePuzzles.length}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <Text style={[listStyles.standartStatLabel, { color: completedFreePuzzles.length > 0 ? colors.success : INACTIVE_COLOR }]}>ÇÖZÜLDÜ</Text>
                          {completedFreePuzzles.length > 0 && <MaterialIcons name="chevron-right" size={10} color={colors.success} />}
                        </View>
                      </Pressable>
                    </View>
                    <View style={{ height: 1, backgroundColor: "#FFFFFF0D", marginHorizontal: -14 }} />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["caylak", "dedektif", "baskomiser"] as Difficulty[]).map((diff) => {
                        const isSelected = diffFilter === diff;
                        const color = getDifficultyColor(diff);
                        const img = diff === "caylak"
                          ? require("@/assets/images/diff_caylak.png")
                          : diff === "dedektif"
                          ? require("@/assets/images/diff_dedektif.png")
                          : require("@/assets/images/diff_bas_komiser.png");
                        const count = activeFree.filter((p) => p.difficulty === diff).length;
                        return (
                          <FilterPill3D
                            key={diff}
                            label={getDifficultyLabel(diff)}
                            img={img}
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

              {filteredActive.length === 0 ? (
                <View style={[listStyles.emptyBox, { borderColor: colors.border }]}>
                  <MaterialIcons name="check-circle-outline" size={40} color={colors.success} />
                  <Text style={[listStyles.emptyTitle, { color: colors.foreground }]}>
                    {diffFilter === "all" ? "Tüm Vakalar Çözüldü!" : `${getDifficultyLabel(diffFilter as Difficulty)} vakası kalmadı`}
                  </Text>
                  <Text style={[listStyles.emptyText, { color: colors.mutedForeground }]}>
                    Çözülenler butonuna bakabilirsiniz.
                  </Text>
                </View>
              ) : (
                <Animated.View key={diffFilter} entering={FadeIn.duration(220)}>
                {filteredActive.map((puzzle) => (
                  <PuzzleCard
                    key={puzzle.id}
                    puzzle={puzzle}
                    onPress={() => startPuzzle(puzzle)}
                    delay={0}
                    completed={false}
                    playStats={null}
                    locked={false}
                    noEnter
                  />
                ))}
              </Animated.View>
              )}
            </ScrollView>
          )}
          </Animated.View>
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
  const prevPackPuzzle = currentPuzzleIdxInPack > 0
    ? packPuzzles[currentPuzzleIdxInPack - 1]
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
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Image
          source={require("@/assets/images/intro_bg.png")}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.13 }]}
          resizeMode="cover"
        />
      </View>
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
          {prevPackPuzzle && (
            <Pressable
              onPress={() => handleNextPackPuzzle(prevPackPuzzle)}
              style={[gameStyles.packNavNextBtn, { borderColor: currentPack.accentColor + "55", backgroundColor: currentPack.accentColor + "18" }]}
              hitSlop={6}
            >
              <MaterialIcons name="chevron-left" size={15} color={currentPack.accentColor} />
              <Text style={[gameStyles.packNavNextText, { color: currentPack.accentColor }]}>Önceki</Text>
            </Pressable>
          )}
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
            <View style={gameStyles.puzzleHeaderTop}>
              <View style={gameStyles.puzzleHeaderLeft}>
                <Pressable onPress={handleBackPress} style={gameStyles.backBtn} hitSlop={8}>
                  <MaterialIcons name="arrow-back" size={20} color={colors.mutedForeground} />
                </Pressable>
                <View style={[gameStyles.difficultyBadge, {
                  backgroundColor: `${getDifficultyColor(puzzle.difficulty as Difficulty)}18`,
                  borderColor: `${getDifficultyColor(puzzle.difficulty as Difficulty)}55`,
                  flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 2,
                }]}>
                  <Image
                    source={BADGE_IMAGES[puzzle.difficulty] ?? BADGE_IMAGES.caylak}
                    style={{ width: 24, height: 24, marginVertical: -4 }}
                    resizeMode="contain"
                  />
                  <Text style={[gameStyles.caseNumber, { color: getDifficultyColor(puzzle.difficulty as Difficulty) }]}>
                    {getDifficultyLabel(puzzle.difficulty as Difficulty).toLocaleUpperCase("tr-TR")}
                  </Text>
                </View>
              </View>
              <View style={gameStyles.statBarCard}>
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
                <View style={gameStyles.statBarDivider} />
                <Pressable
                  onPress={() => setShowScoreInfo(true)}
                  hitSlop={10}
                  style={gameStyles.scoreInfoBtn}
                >
                  <MaterialIcons name="help-outline" size={17} color="#D4A843" />
                </Pressable>
              </View>
            </View>
            <Text
              style={[gameStyles.puzzleTitle, { color: colors.foreground }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {puzzle.title}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View style={[gameStyles.storyBox, { backgroundColor: "#1E2540", borderColor: "#D4A84330" }]}>
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
              { backgroundColor: "#1E2540", borderColor: "#D4A84330" },
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
    fontFamily: "UnnaBold",
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
    fontFamily: "DroidSerifRegular",
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
    alignItems: "stretch",
    minHeight: 70,
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
    fontFamily: "UnnaBold",
    fontWeight: "600",
  },
  tabCount: {
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tabCountText: {
    fontFamily: "DroidSerifRegular",
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
    fontFamily: "DroidSerifRegular",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "DroidSerifRegular",
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
  },
  puzzleCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  puzzleCardRight: { flexDirection: "row", alignItems: "center" },
  puzzleCardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "DroidSerifRegular", fontSize: 12 },
  suspectAvatarRow: { flexDirection: "row", alignItems: "center" },
  suspectAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1A1F2E",
    borderWidth: 2,
    borderColor: "#A855F7AA",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  diffBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  diffText: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "700" },
  puzzleTitle: { fontSize: 20, fontFamily: "UnnaBold", fontWeight: "700", lineHeight: 28 },
  puzzleStory: { fontFamily: "DroidSerifRegular", fontSize: 13, lineHeight: 20 },
  solvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    gap: 4,
  },
  solvedText: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "700" },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    gap: 4,
  },
  lockText: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "700" },
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
  playText: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "600" },
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
  bestResultLabel: { fontFamily: "DroidSerifRegular", fontSize: 12 },
  bestResultValue: { fontFamily: "DroidSerifRegular", fontSize: 12, fontWeight: "600" },
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
    fontFamily: "UnnaBold",
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
    fontFamily: "DroidSerifRegular",
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
    fontFamily: "UnnaBold",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  heroCardSub: { fontFamily: "DroidSerifRegular", fontSize: 12, marginTop: 1 },
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
    fontFamily: "UnnaBold",
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
    justifyContent: "flex-start",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 7,
  },
  tabBtnText3d: {
    fontSize: 13,
    fontFamily: "UnnaBold",
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
    fontFamily: "UnnaBold",
    fontWeight: "700",
  },
  filterPill3d: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius: 13,
    borderWidth: 1.5,
    gap: 0,
    minHeight: 58,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.35,
    elevation: 6,
  },
  filterPillLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 3,
    alignItems: "center",
  },
  filterPillLabelText: {
    fontFamily: "UnnaBold",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  filterPillImgWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  filterPillImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  filterPillImgCount: {
    position: "absolute",
    bottom: 4,
    right: 4,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  filterPillImgCountText: {
    fontFamily: "UnnaBold",
    fontSize: 13,
    fontWeight: "800",
  },
  filterPillText3d: {
    fontSize: 13,
    fontFamily: "UnnaBold",
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
    fontFamily: "UnnaBold",
    fontWeight: "700",
  },
  cozulenlerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
  },
  cozulenlerBtnText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  cozulenlerModal: {
    flex: 1,
  },
  cozulenlerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  cozulenlerModalTitle: {
    fontSize: 18,
    fontFamily: "UnnaBold",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  ccdCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  ccdDiffBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ccdDiffText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  ccdSolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ccdSolvedText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 11,
    fontWeight: "700",
  },
  ccdTitle: {
    fontFamily: "UnnaBold",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 2,
  },
  ccdStory: {
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    lineHeight: 19,
  },
  ccdStatsRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ccdStatGroup: {
    flex: 1,
    gap: 4,
  },
  ccdStatLabel: {
    fontFamily: "DroidSerifRegular",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  ccdStatItems: {
    flexDirection: "row",
    gap: 10,
  },
  ccdStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ccdStatVal: {
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    fontWeight: "600",
  },
  ccdReplayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
    paddingVertical: 9,
  },
  ccdReplayText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
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
    fontFamily: "UnnaBold",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  premAccordionSub: {
    fontFamily: "DroidSerifRegular",
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
    fontFamily: "UnnaBold",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontFamily: "DroidSerifRegular",
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
    fontFamily: "UnnaBold",
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
    fontFamily: "UnnaBold",
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
  unifiedStatsRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
  },
  unifiedStatItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 4,
    gap: 3,
  },
  unifiedStatDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  standartStatNum: {
    fontSize: 17,
    fontFamily: "UnnaBold",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  standartStatLabel: {
    fontFamily: "DroidSerifRegular",
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
    fontFamily: "UnnaBold",
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
    fontFamily: "DroidSerifRegular",
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
    fontFamily: "UnnaBold",
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
    fontFamily: "UnnaBold",
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
    fontFamily: "UnnaBold",
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
    fontFamily: "UnnaBold",
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
    fontFamily: "DroidSerifRegular",
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
    flexDirection: "column",
    gap: 6,
  },
  puzzleHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  puzzleHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  difficultyBadge: {
    backgroundColor: "#D4A84318",
    borderColor: "#D4A84355",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  caseNumber: { fontFamily: "DroidSerifRegular", fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  puzzleTitle: { fontSize: 26, fontFamily: "UnnaBold", fontWeight: "700", lineHeight: 34 },
  storyBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  storyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  storyLabel: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  storyText: { fontFamily: "DroidSerifRegular", fontSize: 14, lineHeight: 22 },
  sectionTitle: { fontSize: 21, fontFamily: "UnnaBold", fontWeight: "700", marginBottom: 10, letterSpacing: 0.2 },
  gridContainer: { borderRadius: 14, borderWidth: 1, padding: 10, overflow: "hidden" },
  gridContainerWeb: {
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  gridWrapper: { minHeight: 240 },
  statBarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1E2540",
    borderColor: "#D4A84344",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  statBarDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#D4A84333",
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
    fontFamily: "DroidSerifRegular",
    fontSize: 10,
    fontWeight: "700",
  },
  scoreInfoBtn: {
    width: 30,
    height: 30,
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
    fontFamily: "UnnaBold",
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
    fontFamily: "UnnaBold",
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
    fontFamily: "UnnaBold",
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
    fontFamily: "UnnaBold",
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
    fontFamily: "DroidSerifRegular",
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
    fontFamily: "DroidSerifRegular",
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
    fontFamily: "DroidSerifRegular",
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
});
