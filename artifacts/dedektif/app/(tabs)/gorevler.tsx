import React, { useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
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
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${ratio * 100}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  const colors = useColors();
  const { getMissionProgress, isAwarded } = useMission();
  const progress = getMissionProgress(mission.id);
  const awarded = isAwarded(mission.id);
  const tierColor = getTierColor(mission.tier);
  const dimmed = awarded;

  return (
    <View
      style={[
        styles.missionCard,
        {
          backgroundColor: colors.card,
          borderColor: awarded
            ? `${colors.success}44`
            : `${colors.border}`,
          opacity: dimmed ? 0.65 : 1,
        },
      ]}
    >
      <View style={[styles.missionAccent, { backgroundColor: tierColor }]} />
      <View style={styles.missionInner}>
        <View style={styles.missionHeader}>
          <View
            style={[
              styles.missionIconWrap,
              { backgroundColor: `${tierColor}22` },
            ]}
          >
            {awarded ? (
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
            ) : (
              <MaterialIcons
                name={mission.icon as any}
                size={20}
                color={tierColor}
              />
            )}
          </View>
          <View style={styles.missionTextBlock}>
            <Text
              style={[
                styles.missionTitle,
                { color: awarded ? colors.success : colors.foreground },
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
          <View
            style={[
              styles.rewardBadge,
              { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}44` },
            ]}
          >
            <MaterialIcons name="bolt" size={11} color={colors.primary} />
            <Text style={[styles.rewardText, { color: colors.primary }]}>
              +{mission.reward.points >= 1000
                ? `${(mission.reward.points / 1000).toFixed(mission.reward.points % 1000 === 0 ? 0 : 1)}K`
                : mission.reward.points}
            </Text>
            {mission.reward.badge && (
              <MaterialIcons name="workspace-premium" size={11} color={colors.primary} style={{ marginLeft: 2 }} />
            )}
          </View>
        </View>
        <View style={styles.progressRow}>
          <ProgressBar
            current={progress.current}
            target={progress.target}
            color={awarded ? colors.success : tierColor}
          />
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            {progress.current}/{progress.target}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TierSection({
  tier,
  missions,
}: {
  tier: MissionTier;
  missions: Mission[];
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
        <MissionCard key={m.id} mission={m} />
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
  icon: string;
  subtitle?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeaderRow}>
      <MaterialIcons name={icon as any} size={20} color={colors.primary} />
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

export default function GorevlerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unseenCompletedCount, markAllSeen, dailyTimeLeft, weeklyTimeLeft } =
    useMission();

  useEffect(() => {
    markAllSeen();
  }, []);

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
          {unseenCompletedCount > 0 && (
            <View style={[styles.newBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.newBadgeText}>{unseenCompletedCount} yeni!</Text>
            </View>
          )}
        </View>
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
              <MaterialIcons name="schedule" size={11} color={colors.mutedForeground} />
              <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
                {dailyTimeLeft}
              </Text>
            </View>
          </View>
          {(["caylak", "dedektif", "baskomiser"] as MissionTier[]).map(
            (tier) =>
              dailyByTier[tier].length > 0 && (
                <TierSection key={tier} tier={tier} missions={dailyByTier[tier]} />
              )
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
              <MaterialIcons name="schedule" size={11} color={colors.mutedForeground} />
              <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
                {weeklyTimeLeft}
              </Text>
            </View>
          </View>
          {(["caylak", "dedektif", "baskomiser"] as MissionTier[]).map(
            (tier) =>
              weeklyByTier[tier].length > 0 && (
                <TierSection key={tier} tier={tier} missions={weeklyByTier[tier]} />
              )
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
                <TierSection key={tier} tier={tier} missions={achByTier[tier]} />
              )
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
    gap: 16,
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
    fontSize: 12,
    marginTop: 2,
  },
  newBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
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
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
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
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  tierSection: {
    gap: 8,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  missionCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  missionAccent: {
    width: 3,
    alignSelf: "stretch",
  },
  missionInner: {
    flex: 1,
    padding: 11,
    gap: 8,
  },
  missionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  missionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  missionTextBlock: {
    flex: 1,
    gap: 3,
  },
  missionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  completedTag: {
    fontSize: 13,
    fontWeight: "700",
  },
  missionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  rewardText: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#2A2F4244",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    minWidth: 32,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
});
