import React, { type ComponentProps } from "react";
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
import { useRouter } from "expo-router";

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
  caylak: "caylik",
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
    const targetDiff = DIFF_MAP[mission.requirement.difficulty] ?? "caylik";
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
  return (
    <View style={styles.progressTrack}>
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
      style={({ pressed }) => [{ opacity: pressed && !awarded ? 0.75 : 1 }]}
    >
      <View
        style={[
          styles.missionCard,
          {
            backgroundColor: colors.card,
            borderColor: awarded
              ? `${colors.success}44`
              : claimable
              ? colors.primary
              : colors.border,
            opacity: awarded ? 0.65 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.missionAccent,
            { backgroundColor: claimable ? colors.primary : tierColor },
          ]}
        />
        <View style={styles.missionInner}>
          <View style={styles.missionHeader}>
            <View
              style={[
                styles.missionIconWrap,
                {
                  backgroundColor: claimable
                    ? `${colors.primary}22`
                    : `${tierColor}22`,
                },
              ]}
            >
              {awarded ? (
                <MaterialIcons name="check-circle" size={22} color={colors.success} />
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
                      ? colors.success
                      : claimable
                      ? colors.primary
                      : colors.foreground,
                  },
                ]}
              >
                {mission.title}
                {awarded && (
                  <Text style={[styles.completedTag, { color: colors.success }]}> ✓</Text>
                )}
              </Text>
              <Text
                style={[styles.missionDesc, { color: colors.mutedForeground }]}
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
                    backgroundColor: `${colors.primary}18`,
                    borderColor: `${colors.primary}44`,
                  },
                ]}
              >
                <MaterialIcons name="bolt" size={14} color={colors.primary} />
                <Text style={[styles.rewardText, { color: colors.primary }]}>
                  +{formatPoints(mission.reward.points)}
                </Text>
                {mission.reward.badge && (
                  <MaterialIcons
                    name="workspace-premium"
                    size={13}
                    color={colors.primary}
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
              color={awarded ? colors.success : claimable ? colors.primary : tierColor}
            />
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              {progress.current}/{progress.target}
            </Text>
          </View>
          {inProgress && (
            <View style={styles.playChipRow}>
              <View
                style={[
                  styles.playChip,
                  {
                    borderColor: `${colors.mutedForeground}40`,
                    backgroundColor: `${colors.mutedForeground}0A`,
                  },
                ]}
              >
                <MaterialIcons
                  name="play-arrow"
                  size={14}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.playChipText, { color: colors.mutedForeground }]}>
                  Oyna
                </Text>
              </View>
            </View>
          )}
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
      <MaterialIcons name={icon} size={22} color={colors.primary} />
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
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
      style={[styles.collectAllBtn, animStyle, { opacity: hasClaimable ? 1 : 0.45 }]}
    >
      <View
        style={[
          styles.collectAllInner,
          { backgroundColor: hasClaimable ? colors.primary : colors.card },
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

export default function GorevlerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { claimableCount, dailyTimeLeft, weeklyTimeLeft } = useMission();
  const { startPuzzle, completedPuzzleIds } = useGame();
  const router = useRouter();

  const handleMissionPlay = (mission: Mission) => {
    const puzzle = getMissionTargetPuzzle(mission, completedPuzzleIds);
    startPuzzle(puzzle);
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(0).springify()}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              Görevler
            </Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
              Görevleri tamamla, bonus puan kazan
            </Text>
          </View>
          {claimableCount > 0 && (
            <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.newBadgeText}>{claimableCount} bekliyor</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(30).springify()}>
        <CollectAllButton />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <View style={[styles.section, { borderColor: colors.border }]}>
          <View style={styles.sectionTopRow}>
            <SectionHeader
              title="Günlük Görevler"
              icon="today"
              subtitle="Her gün sıfırlanır"
            />
            <View style={styles.countdownChip}>
              <MaterialIcons name="schedule" size={13} color={colors.mutedForeground} />
              <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
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
            <Text style={[styles.emptyState, { color: colors.mutedForeground }]}>
              Bugün için görev bulunmuyor.
            </Text>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()}>
        <View style={[styles.section, { borderColor: colors.border }]}>
          <View style={styles.sectionTopRow}>
            <SectionHeader
              title="Haftalık Görevler"
              icon="date-range"
              subtitle="Her Pazartesi sıfırlanır"
            />
            <View style={styles.countdownChip}>
              <MaterialIcons name="schedule" size={13} color={colors.mutedForeground} />
              <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
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
            <Text style={[styles.emptyState, { color: colors.mutedForeground }]}>
              Bu hafta için görev bulunmuyor.
            </Text>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).springify()}>
        <View style={[styles.section, { borderColor: colors.border }]}>
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
            <Text style={[styles.emptyState, { color: colors.mutedForeground }]}>
              Henüz başarım bulunmuyor.
            </Text>
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 18,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  newBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  newBadgeText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
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
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  countdownChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
    flexShrink: 0,
  },
  countdownText: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  tierSection: {
    gap: 10,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  tierDot: {
    width: 9,
    height: 9,
    borderRadius: 4,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
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
    padding: 14,
    gap: 10,
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
    gap: 3,
  },
  missionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  completedTag: {
    fontSize: 15,
    fontWeight: "700",
  },
  missionDesc: {
    fontSize: 13,
    lineHeight: 20,
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
    height: 6,
    backgroundColor: "#2A2F4244",
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
    alignItems: "flex-end",
  },
  playChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  playChipText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
