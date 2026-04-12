import React, { useState, useCallback } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { usePurchase } from "@/context/PurchaseContext";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AvatarDisplay } from "@/utils/avatarHelpers";
import { AI_DETECTIVES } from "@/data/aiDetectives";
import { useRouter } from "expo-router";
import {
  fetchLeaderboard,
  type LeaderboardEntry,
  type LeaderboardSortBy,
} from "@/utils/apiClient";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];
type SortKey = "score" | "cases" | "streak" | "hiz";

interface RankEntry {
  name: string;
  avatar: string;
  totalScore: number;
  gamesWon: number;
  maxStreak: number;
  isCurrentUser: boolean;
  isPremiumUser: boolean;
  avgSolveTimeSeconds?: number;
  profileId: string;
}

const SORT_TABS: { key: SortKey; label: string; icon: MaterialIconName }[] = [
  { key: "score",  label: "🏆 Puan", icon: "emoji-events"          },
  { key: "cases",  label: "📁 Vaka", icon: "folder-special"        },
  { key: "streak", label: "🔥 Seri", icon: "local-fire-department" },
  { key: "hiz",    label: "⚡ Hız",  icon: "bolt"                  },
];

const SORT_KEY_TO_API: Record<SortKey, LeaderboardSortBy> = {
  score:  "totalScore",
  cases:  "gamesWon",
  streak: "maxStreak",
  hiz:    "avgSolveTimeSeconds",
};

function fmtTime(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function sortEntries(entries: RankEntry[], key: SortKey): RankEntry[] {
  return [...entries].sort((a, b) => {
    if (key === "score")  return b.totalScore - a.totalScore;
    if (key === "cases")  return b.gamesWon   - a.gamesWon;
    if (key === "streak") return b.maxStreak   - a.maxStreak;
    const aT = a.avgSolveTimeSeconds || Infinity;
    const bT = b.avgSolveTimeSeconds || Infinity;
    return aT - bT;
  });
}

function apiEntryToRank(e: LeaderboardEntry): RankEntry {
  return {
    name: e.displayName,
    avatar: e.avatar || "detective",
    totalScore: e.totalScore,
    gamesWon: e.gamesWon,
    maxStreak: e.maxStreak,
    isCurrentUser: false,
    isPremiumUser: e.isPremium,
    avgSolveTimeSeconds: e.avgSolveTimeSeconds,
    profileId: e.playerId,
  };
}

interface RankItemProps {
  entry: RankEntry;
  rank: number;
  sortKey: SortKey;
  colors: ReturnType<typeof useColors>;
  delay: number;
  onPress: () => void;
}

function RankItem({ entry, rank, sortKey, colors, delay, onPress }: RankItemProps) {
  const rankColor =
    rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : colors.mutedForeground;
  const rankIcon: MaterialIconName =
    rank === 1 ? "emoji-events" : rank === 2 ? "workspace-premium" : rank === 3 ? "military-tech" : "tag";

  const metaValue: string | number =
    sortKey === "score"  ? entry.totalScore :
    sortKey === "cases"  ? entry.gamesWon :
    sortKey === "streak" ? entry.maxStreak :
    entry.avgSolveTimeSeconds ? fmtTime(entry.avgSolveTimeSeconds) : "—";

  const metaLabel =
    sortKey === "score"  ? "puan" :
    sortKey === "cases"  ? "vaka" :
    sortKey === "streak" ? "seri" :
    "süre";

  const isTop3 = rank <= 3;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.rankItem,
          {
            backgroundColor: entry.isCurrentUser
              ? `${colors.primary}18`
              : isTop3
              ? `${rankColor}09`
              : colors.card,
            borderColor: entry.isCurrentUser
              ? colors.primary
              : isTop3
              ? `${rankColor}44`
              : colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={[styles.rankBadge, { backgroundColor: `${rankColor}22` }]}>
          <MaterialIcons name={rankIcon} size={isTop3 ? 20 : 14} color={rankColor} />
          {rank > 3 && (
            <Text style={[styles.rankNum, { color: rankColor }]}>{rank}</Text>
          )}
        </View>

        <View style={[styles.avatarWrapper, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
          <AvatarDisplay
            avatar={entry.avatar || "detective"}
            size={36}
            color={entry.isCurrentUser ? colors.primary : colors.mutedForeground}
            backgroundColor="transparent"
          />
        </View>

        <View style={styles.rankInfo}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.rankName,
                { color: entry.isCurrentUser ? colors.primary : colors.foreground },
              ]}
              numberOfLines={1}
            >
              {entry.name}
            </Text>
            {entry.isCurrentUser && (
              <View style={[styles.youBadge, { backgroundColor: `${colors.primary}30` }]}>
                <Text style={[styles.youText, { color: colors.primary }]}>Sen</Text>
              </View>
            )}
            {entry.isPremiumUser && (
              <View style={[styles.premiumChip, { backgroundColor: "#D4A84320", borderColor: "#D4A84355" }]}>
                <MaterialIcons name="workspace-premium" size={10} color="#D4A843" />
                <Text style={[styles.premiumChipText, { color: "#D4A843" }]}>Baş Dedektif</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <MaterialIcons
              name={
                sortKey === "streak" ? "local-fire-department" :
                sortKey === "cases"  ? "folder" :
                sortKey === "hiz"    ? "bolt" :
                "star"
              }
              size={11}
              color={colors.mutedForeground}
            />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {sortKey === "score"
                ? `${entry.gamesWon} vaka · ${entry.maxStreak} seri`
                : sortKey === "cases"
                ? `${entry.totalScore.toLocaleString("tr-TR")} puan · ${entry.maxStreak} seri`
                : sortKey === "streak"
                ? `${entry.totalScore.toLocaleString("tr-TR")} puan · ${entry.gamesWon} vaka`
                : `${entry.gamesWon} vaka · ${entry.maxStreak} seri`}
            </Text>
          </View>
          {sortKey !== "hiz" && entry.avgSolveTimeSeconds != null && entry.avgSolveTimeSeconds > 0 && (
            <View style={styles.avgTimeRow}>
              <MaterialIcons name="schedule" size={10} color={colors.mutedForeground} />
              <Text style={[styles.avgTimeText, { color: colors.mutedForeground }]}>
                {`ort. ${Math.floor(entry.avgSolveTimeSeconds / 60)}:${(entry.avgSolveTimeSeconds % 60).toString().padStart(2, "0")}`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.rankScore}>
          <Text style={[styles.scoreValue, { color: entry.isCurrentUser ? colors.primary : colors.foreground }]}>
            {typeof metaValue === "number" ? metaValue.toLocaleString("tr-TR") : metaValue}
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>{metaLabel}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function LiderlikScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, playerId } = useGame();
  const { isPremium } = usePurchase();
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [apiEntries, setApiEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadLeaderboard = useCallback(
    async (key: SortKey) => {
      setLoading(true);
      const data = await fetchLeaderboard(SORT_KEY_TO_API[key], 50);
      setApiEntries(data);
      setLoading(false);
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard(sortKey);
    }, [loadLeaderboard, sortKey])
  );

  const handleSortChange = (key: SortKey) => {
    setSortKey(key);
    loadLeaderboard(key);
  };

  const myEntry: RankEntry = {
    name: profile.name,
    avatar: profile.avatar || "detective",
    totalScore: profile.totalScore,
    gamesWon: profile.gamesWon,
    maxStreak: profile.maxStreak,
    isCurrentUser: true,
    isPremiumUser: isPremium,
    avgSolveTimeSeconds: profile.avgSolveTimeSeconds,
    profileId: playerId ?? "me",
  };

  const useApiData = apiEntries !== null && apiEntries.length > 0;

  const baseEntries: RankEntry[] = useApiData
    ? apiEntries
        .filter((e) => e.playerId !== playerId)
        .map(apiEntryToRank)
    : AI_DETECTIVES.map((d) => ({
        ...d,
        isCurrentUser: false,
        isPremiumUser: false,
        profileId: `ai-${d.name.toLowerCase().replace(/\s+/g, "-")}`,
      }));

  const sorted = sortEntries([...baseEntries, myEntry], sortKey);
  const myRank = sorted.findIndex((e) => e.isCurrentUser) + 1;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "web" ? 67 : insets.top,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>Dedektif Sıralaması</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {useApiData ? "Gerçek Oyuncular" : "Tüm Zamanlar"}
          </Text>
        </View>
        {myRank > 0 && (
          <View style={[styles.myRankBadge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}50` }]}>
            <MaterialIcons name="person" size={14} color={colors.primary} />
            <Text style={[styles.myRankText, { color: colors.primary }]}>#{myRank}</Text>
          </View>
        )}
      </View>

      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        {SORT_TABS.map((tab) => {
          const active = sortKey === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => handleSortChange(tab.key)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: active ? colors.primary : "transparent",
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <MaterialIcons
                name={tab.icon}
                size={14}
                color={active ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.filterTabText,
                  { color: active ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item, i) => `${item.name}-${i}`}
          contentContainerStyle={[
            styles.list,
            {
              paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
            },
          ]}
          renderItem={({ item, index }) => (
            <RankItem
              entry={item}
              rank={index + 1}
              sortKey={sortKey}
              colors={colors}
              delay={index * 30}
              onPress={() => {
                if (item.isCurrentUser) {
                  router.push("/(tabs)/profil");
                } else {
                  router.push({ pathname: "/public-profile/[playerId]", params: { playerId: item.profileId } });
                }
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  myRankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  myRankText: { fontSize: 14, fontWeight: "700" },
  filterBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterTabText: { fontSize: 12, fontWeight: "700" },
  list: { padding: 12, gap: 0 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: { fontSize: 13, fontWeight: "700" },
  avatarWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rankInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3, flexWrap: "nowrap" },
  rankName: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  youText: { fontSize: 10, fontWeight: "700" },
  premiumChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumChipText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11 },
  avgTimeRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  avgTimeText: { fontSize: 10 },
  rankScore: { alignItems: "flex-end", minWidth: 52 },
  scoreValue: { fontSize: 18, fontWeight: "800" },
  scoreLabel: { fontSize: 10, fontWeight: "500" },
});
