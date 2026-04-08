import React, { useState } from "react";
import type { ComponentProps } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { usePurchase } from "@/context/PurchaseContext";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AvatarDisplay } from "@/utils/avatarHelpers";
import { AI_DETECTIVES } from "@/data/aiDetectives";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];
type SortKey = "score" | "cases" | "streak";

interface RankEntry {
  name: string;
  avatar: string;
  totalScore: number;
  gamesWon: number;
  maxStreak: number;
  isCurrentUser: boolean;
  isPremiumUser: boolean;
}

const SORT_TABS: { key: SortKey; label: string; icon: MaterialIconName }[] = [
  { key: "score",  label: "Puan",  icon: "emoji-events"         },
  { key: "cases",  label: "Vaka",  icon: "folder-special"       },
  { key: "streak", label: "Seri",  icon: "local-fire-department" },
];

function sortEntries(entries: RankEntry[], key: SortKey): RankEntry[] {
  return [...entries].sort((a, b) => {
    if (key === "score")  return b.totalScore - a.totalScore;
    if (key === "cases")  return b.gamesWon   - a.gamesWon;
    return b.maxStreak - a.maxStreak;
  });
}

interface RankItemProps {
  entry: RankEntry;
  rank: number;
  sortKey: SortKey;
  colors: ReturnType<typeof useColors>;
  delay: number;
}

function RankItem({ entry, rank, sortKey, colors, delay }: RankItemProps) {
  const rankColor =
    rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : colors.mutedForeground;
  const rankIcon: MaterialIconName =
    rank === 1 ? "emoji-events" : rank === 2 ? "workspace-premium" : rank === 3 ? "military-tech" : "tag";

  const metaValue =
    sortKey === "score"  ? entry.totalScore :
    sortKey === "cases"  ? entry.gamesWon :
    entry.maxStreak;

  const metaLabel =
    sortKey === "score"  ? "puan" :
    sortKey === "cases"  ? "vaka" :
    "seri";

  const isTop3 = rank <= 3;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <View
        style={[
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
              <MaterialIcons name="workspace-premium" size={14} color="#D4A843" />
            )}
          </View>
          <View style={styles.metaRow}>
            <MaterialIcons
              name={sortKey === "streak" ? "local-fire-department" : sortKey === "cases" ? "folder" : "star"}
              size={11}
              color={colors.mutedForeground}
            />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {sortKey === "score"
                ? `${entry.gamesWon} vaka · ${entry.maxStreak} seri`
                : sortKey === "cases"
                ? `${entry.totalScore.toLocaleString("tr-TR")} puan · ${entry.maxStreak} seri`
                : `${entry.totalScore.toLocaleString("tr-TR")} puan · ${entry.gamesWon} vaka`}
            </Text>
          </View>
        </View>

        <View style={styles.rankScore}>
          <Text style={[styles.scoreValue, { color: entry.isCurrentUser ? colors.primary : colors.foreground }]}>
            {metaValue.toLocaleString("tr-TR")}
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>{metaLabel}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function LiderlikScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useGame();
  const { isPremium } = usePurchase();
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const myEntry: RankEntry = {
    name: profile.name,
    avatar: profile.avatar || "detective",
    totalScore: profile.totalScore,
    gamesWon: profile.gamesWon,
    maxStreak: profile.maxStreak,
    isCurrentUser: true,
    isPremiumUser: isPremium,
  };

  const aiEntries: RankEntry[] = AI_DETECTIVES.map((d) => ({
    ...d,
    isCurrentUser: false,
    isPremiumUser: false,
  }));

  const sorted = sortEntries([...aiEntries, myEntry], sortKey);
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
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Tüm Zamanlar</Text>
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
              onPress={() => setSortKey(tab.key)}
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
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
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
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11 },
  rankScore: { alignItems: "flex-end", minWidth: 52 },
  scoreValue: { fontSize: 18, fontWeight: "800" },
  scoreLabel: { fontSize: 10, fontWeight: "500" },
});
