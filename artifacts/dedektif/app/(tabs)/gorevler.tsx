import React, { useCallback, useRef, type ComponentProps } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { setPendingNavSource } from "@/utils/pendingNavSource";

type MatIconName = ComponentProps<typeof MaterialIcons>["name"];

import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { useMission } from "@/context/MissionContext";
import {
  DAILY_MISSIONS,
  WEEKLY_MISSIONS,
  ACHIEVEMENT_MISSIONS,
  getTierLabel,
  getTierColor,
  type Mission,
  type MissionTier,
} from "@/data/missions";
import { PUZZLES, type Puzzle, type Difficulty } from "@/data/puzzles";

const DIFF_MAP: Record<string, Difficulty> = {
  caylak: "caylak",
  dedektif: "dedektif",
  baskomiser: "baskomiser",
};

function getMissionTargetPuzzle(
  mission: Mission,
  completedPuzzleIds: Set<string>
): Puzzle {
  let candidates = [...PUZZLES];

  if (
    mission.requirement.type === "solve_difficulty" &&
    mission.requirement.difficulty
  ) {
    const targetDiff = DIFF_MAP[mission.requirement.difficulty] ?? "caylak";
    const filtered = PUZZLES.filter((p) => p.difficulty === targetDiff);
    if (filtered.length > 0) candidates = filtered;
  }

  const uncompleted = candidates.filter((p) => !completedPuzzleIds.has(p.id));
  return uncompleted[0] ?? candidates[0];
}

function formatPoints(pts: number): string {
  if (pts >= 1000) {
    return pts % 1000 === 0
      ? `${pts / 1000}K`
      : `${(pts / 1000).toFixed(1)}K`;
  }
  return String(pts);
}

function ProgressBar({
  current,
  target,
  color,
}: {
  current: number;
  target: number;
  color: string;
}) {
  const ratio = Math.min(current / target, 1);
  const fillWidth: DimensionValue = `${Math.round(ratio * 100)}%`;
  const colors = useColors();
  return (
    <View style={[styles.progressTrack, { backgroundColor: `${colors.border}88` }]}>
      <View
        style={[
          styles.progressFill,
          { width: fillWidth, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ClaimButton({
  onPress,
  points,
}: {
  onPress: () => void;
  points: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.claimBtn, animStyle]}
      onPressIn={() => { scale.value = withSpring(0.88, { damping: 10 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 10 }); }}
      onPress={onPress}
    >
      <MaterialIcons name="bolt" size={14} color="#000" />
      <Text style={styles.claimBtnText}>TOPLA</Text>
      <Text style={styles.claimBtnPoints}>+{formatPoints(points)}</Text>
    </AnimatedPressable>
  );
}

function MissionCard({
  mission,
  onPlay,
}: {
  mission: Mission;
  onPlay?: () => void;
}) {
  const colors = useColors();
  const { getMissionProgress, isAwarded, isClaimable, claimMission } = useMission();
  const progress = getMissionProgress(mission.id);
  const awarded = isAwarded(mission.id);
  const claimable = isClaimable(mission.id);
  const inProgress = !awarded && !claimable;
  const tierColor = getTierColor(mission.tier);

  const handlePress = () => {
    if (awarded) return;
    if (claimable) {
      claimMission(mission.id);
    } else {
      onPlay?.();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={awarded}
      style={({ pressed }) => [{ opacity: pressed && !awarded ? 0.75 : 1 }]}
    >
      <View
        style={[
          styles.missionCard,
          {
            backgroundColor: awarded ? "#0A0D12" : colors.card,
            borderColor: awarded
              ? "#D4A84388"
              : claimable
              ? `${colors.primary}88`
              : colors.border,
            borderWidth: awarded ? 1.5 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.missionAccent,
            { backgroundColor: awarded ? "#D4A843" : claimable ? colors.primary : tierColor },
          ]}
        />
        <View style={styles.missionInner}>
          <View style={{ opacity: awarded ? 0.52 : 1 }}>
            <View style={styles.missionHeader}>
              <View
                style={[
                  styles.missionIconWrap,
                  {
                    backgroundColor: awarded
                      ? "#D4A84322"
                      : claimable
                      ? `${colors.primary}22`
                      : `${tierColor}22`,
                  },
                ]}
              >
                {awarded ? (
                  <MaterialIcons name="check-circle" size={22} color="#D4A843" />
                ) : claimable ? (
                  <MaterialIcons name="bolt" size={22} color={colors.primary} />
                ) : (
                  <MaterialIcons
                    name={mission.icon as MatIconName}
                    size={22}
                    color={tierColor}
                  />
                )}
              </View>
              <View style={styles.missionTextBlock}>
                <Text
                  style={[
                    styles.missionTitle,
                    {
                      color: awarded
                        ? "#D4A843"
                        : claimable
                        ? colors.primary
                        : colors.foreground,
                    },
                  ]}
                >
                  {mission.title}
                  {awarded && (
                    <Text style={[styles.completedTag, { color: "#D4A843" }]}> ✓</Text>
                  )}
                </Text>
                <Text
                  style={[styles.missionDesc, { color: colors.secondaryForeground }]}
                  numberOfLines={2}
                >
                  {mission.description}
                </Text>
              </View>
              {claimable ? (
                <ClaimButton
                  onPress={() => claimMission(mission.id)}
                  points={mission.reward.points}
                />
              ) : (
                <View
                  style={[
                    styles.rewardBadge,
                    {
                      backgroundColor: awarded ? "#D4A84318" : `${colors.primary}18`,
                      borderColor: awarded ? "#D4A84355" : `${colors.primary}44`,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="bolt"
                    size={14}
                    color={awarded ? "#D4A843" : colors.primary}
                  />
                  <Text
                    style={[
                      styles.rewardText,
                      { color: awarded ? "#D4A843" : colors.primary },
                    ]}
                  >
                    +{formatPoints(mission.reward.points)}
                  </Text>
                  {mission.reward.badge && (
                    <MaterialIcons
                      name="workspace-premium"
                      size={13}
                      color={awarded ? "#D4A843" : colors.primary}
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </View>
              )}
            </View>
            <View style={styles.progressRow}>
              <ProgressBar
                current={progress.current}
                target={progress.target}
                color={awarded ? "#D4A843" : claimable ? colors.primary : tierColor}
              />
              <Text style={[styles.progressLabel, { color: colors.secondaryForeground }]}>
                {progress.current}/{progress.target}
              </Text>
            </View>
          </View>
          {awarded ? (
            <View
              style={[
                styles.completedBanner,
                {
                  backgroundColor: "#D4A84318",
                  borderColor: "#D4A84360",
                },
              ]}
            >
              <MaterialIcons name="check-circle" size={15} color="#D4A843" />
              <Text style={[styles.completedBannerText, { color: "#D4A843" }]}>
                TAMAMLANDI
              </Text>
              <MaterialIcons
                name="verified"
                size={14}
                color="#D4A843AA"
              />
            </View>
          ) : inProgress ? (
            <View style={styles.playChipRow}>
              <View
                style={[
                  styles.playChip,
                  {
                    borderColor: `${tierColor}88`,
                    backgroundColor: `${tierColor}20`,
                  },
                ]}
              >
                <MaterialIcons
                  name="play-circle-filled"
                  size={16}
                  color={tierColor}
                />
                <Text style={[styles.playChipText, { color: tierColor }]}>
                  Oyna
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={`${tierColor}99`}
                />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function TierSection({
  tier,
  missions,
  onPlayMission,
}: {
  tier: MissionTier;
  missions: Mission[];
  onPlayMission: (mission: Mission) => void;
}) {
  const colors = useColors();
  const tierColor = getTierColor(tier);
  return (
    <View style={styles.tierSection}>
      <View style={styles.tierHeader}>
        <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
        <Text style={[styles.tierLabel, { color: tierColor }]}>
          {getTierLabel(tier)}
        </Text>
        <View style={[styles.tierLine, { backgroundColor: `${tierColor}30` }]} />
      </View>
      {missions.map((m) => (
        <MissionCard key={m.id} mission={m} onPlay={() => onPlayMission(m)} />
      ))}
    </View>
  );
}

function SectionHeader({
  title,
  icon,
  subtitle,
}: {
  title: string;
  icon: MatIconName;
  subtitle?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={[styles.sectionIconWrap, { backgroundColor: `${colors.primary}18` }]}>
        <MaterialIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryForeground }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

function CollectAllButton() {
  const colors = useColors();
  const { claimableCount, claimablePoints, claimAll } = useMission();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const hasClaimable = claimableCount > 0;

  return (
    <AnimatedPressable
      onPressIn={() => {
        if (!hasClaimable) return;
        scale.value = withSpring(0.96, { damping: 12 });
      }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
      onPress={hasClaimable ? claimAll : undefined}
      style={[styles.collectAllBtn, animStyle, { opacity: hasClaimable ? 1 : 0.4 }]}
    >
      <View
        style={[
          styles.collectAllInner,
          {
            backgroundColor: hasClaimable ? colors.primary : colors.card,
            borderColor: hasClaimable ? colors.primary : colors.border,
          },
        ]}
      >
        <MaterialIcons
          name="bolt"
          size={18}
          color={hasClaimable ? "#000" : colors.mutedForeground}
        />
        <Text
          style={[
            styles.collectAllText,
            { color: hasClaimable ? "#000" : colors.mutedForeground },
          ]}
        >
          {hasClaimable
            ? `Tümünü Topla  ·  +${formatPoints(claimablePoints)} puan`
            : "Toplanacak görev yok"}
        </Text>
        {hasClaimable && (
          <View style={styles.collectAllBadge}>
            <Text style={styles.collectAllBadgeText}>{claimableCount}</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

function StatsCard({ totalAwardedPoints, totalScore }: { totalAwardedPoints: number; totalScore: number }) {
  const colors = useColors();
  return (
    <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.statItem}>
        <MaterialIcons name="military-tech" size={18} color={colors.primary} />
        <Text style={[styles.statValue, { color: colors.foreground }]}>
          {formatPoints(totalAwardedPoints)}
        </Text>
        <Text style={[styles.statLabel, { color: colors.secondaryForeground }]}>
          Görev Puanı
        </Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <View style={styles.statItem}>
        <MaterialIcons name="leaderboard" size={18} color="#60A5FA" />
        <Text style={[styles.statValue, { color: colors.foreground }]}>
          {formatPoints(totalScore)}
        </Text>
        <Text style={[styles.statLabel, { color: colors.secondaryForeground }]}>
          Toplam Puanım
        </Text>
      </View>
    </View>
  );
}

export default function GorevlerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { claimableCount, dailyTimeLeft, weeklyTimeLeft, totalAwardedPoints } = useMission();
  const { startPuzzle, completedPuzzleIds, profile } = useGame();
  const router = useRouter();
  const scrollRef = useRef<import("react-native").ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const handleMissionPlay = (mission: Mission) => {
    const puzzle = getMissionTargetPuzzle(mission, completedPuzzleIds);
    startPuzzle(puzzle);
    setPendingNavSource("gorevler");
    router.push("/oyun");
  };

  const dailyByTier = {
    caylak: DAILY_MISSIONS.filter((m) => m.tier === "caylak"),
    dedektif: DAILY_MISSIONS.filter((m) => m.tier === "dedektif"),
    baskomiser: DAILY_MISSIONS.filter((m) => m.tier === "baskomiser"),
  };

  const weeklyByTier = {
    caylak: WEEKLY_MISSIONS.filter((m) => m.tier === "caylak"),
    dedektif: WEEKLY_MISSIONS.filter((m) => m.tier === "dedektif"),
    baskomiser: WEEKLY_MISSIONS.filter((m) => m.tier === "baskomiser"),
  };

  const achByTier = {
    caylak: ACHIEVEMENT_MISSIONS.filter((m) => m.tier === "caylak"),
    dedektif: ACHIEVEMENT_MISSIONS.filter((m) => m.tier === "dedektif"),
    baskomiser: ACHIEVEMENT_MISSIONS.filter((m) => m.tier === "baskomiser"),
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <View style={[styles.pageHeader, { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }]}>
        <View style={styles.pageTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              Görevler
            </Text>
            <Text style={[styles.pageSubtitle, { color: colors.secondaryForeground }]}>
              Görevleri tamamla, bonus puan kazan
            </Text>
          </View>
          {claimableCount > 0 && (
            <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="bolt" size={13} color="#000" />
              <Text style={styles.newBadgeText}>{claimableCount} bekliyor</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.stickyStatsWrap}>
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <StatsCard
            totalAwardedPoints={totalAwardedPoints}
            totalScore={profile.totalScore}
          />
        </Animated.View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
      <Animated.View entering={FadeInDown.delay(30).springify()}>
        <CollectAllButton />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTopRow}>
            <SectionHeader
              title="Günlük Görevler"
              icon="today"
              subtitle="Her gün sıfırlanır"
            />
            <View style={[styles.countdownChip, { backgroundColor: `${colors.border}88` }]}>
              <MaterialIcons name="schedule" size={12} color={colors.secondaryForeground} />
              <Text style={[styles.countdownText, { color: colors.secondaryForeground }]}>
                {dailyTimeLeft}
              </Text>
            </View>
          </View>
          {(["caylak", "dedektif", "baskomiser"] as MissionTier[]).map(
            (tier) =>
              dailyByTier[tier].length > 0 && (
                <TierSection
                  key={tier}
                  tier={tier}
                  missions={dailyByTier[tier]}
                  onPlayMission={handleMissionPlay}
                />
              )
          )}
          {DAILY_MISSIONS.length === 0 && (
            <Text style={[styles.emptyState, { color: colors.secondaryForeground }]}>
              Bugün için görev bulunmuyor.
            </Text>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()}>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTopRow}>
            <SectionHeader
              title="Haftalık Görevler"
              icon="date-range"
              subtitle="Her Pazartesi sıfırlanır"
            />
            <View style={[styles.countdownChip, { backgroundColor: `${colors.border}88` }]}>
              <MaterialIcons name="schedule" size={12} color={colors.secondaryForeground} />
              <Text style={[styles.countdownText, { color: colors.secondaryForeground }]}>
                {weeklyTimeLeft}
              </Text>
            </View>
          </View>
          {(["caylak", "dedektif", "baskomiser"] as MissionTier[]).map(
            (tier) =>
              weeklyByTier[tier].length > 0 && (
                <TierSection
                  key={tier}
                  tier={tier}
                  missions={weeklyByTier[tier]}
                  onPlayMission={handleMissionPlay}
                />
              )
          )}
          {WEEKLY_MISSIONS.length === 0 && (
            <Text style={[styles.emptyState, { color: colors.secondaryForeground }]}>
              Bu hafta için görev bulunmuyor.
            </Text>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).springify()}>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionHeader
            title="Başarımlar"
            icon="emoji-events"
            subtitle="Kalıcı görevler · tek seferlik"
          />
          {(["caylak", "dedektif", "baskomiser"] as MissionTier[]).map(
            (tier) =>
              achByTier[tier].length > 0 && (
                <TierSection
                  key={tier}
                  tier={tier}
                  missions={achByTier[tier]}
                  onPlayMission={handleMissionPlay}
                />
              )
          )}
          {ACHIEVEMENT_MISSIONS.length === 0 && (
            <Text style={[styles.emptyState, { color: colors.secondaryForeground }]}>
              Henüz başarım bulunmuyor.
            </Text>
          )}
        </View>
      </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 4,
  },
  pageHeader: {
    borderBottomWidth: 0,
  },
  stickyStatsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: "PlayfairDisplay",
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  newBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 0,
  },
  newBadgeText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
  },
  statsCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    marginHorizontal: 8,
    alignSelf: "stretch",
  },
  collectAllBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  collectAllInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  collectAllText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  collectAllBadge: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  collectAllBadgeText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  sectionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  countdownChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  countdownText: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  tierSection: {
    gap: 8,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tierLine: {
    flex: 1,
    height: 1,
  },
  missionCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  missionAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  missionInner: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  missionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  missionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  missionTextBlock: {
    flex: 1,
    gap: 4,
  },
  missionTitle: {
    fontSize: 15,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
  },
  completedTag: {
    fontSize: 15,
    fontFamily: "PlayfairDisplay",
    fontWeight: "600",
  },
  missionDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  rewardText: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    minWidth: 36,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  claimBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D4A843",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 11,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  claimBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  claimBtnPoints: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
    fontStyle: "italic",
  },
  playChipRow: {
    marginTop: 2,
  },
  playChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
  },
  playChipText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    flex: 1,
    textAlign: "center",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 2,
  },
  completedBannerText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    flex: 1,
    textAlign: "center",
  },
});
