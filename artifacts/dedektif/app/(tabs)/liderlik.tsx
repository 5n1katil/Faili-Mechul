import React from "react";
import type { ComponentProps } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import Animated, { FadeInDown } from "react-native-reanimated";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface RankItemProps {
  entry: { name: string; score: number; time: number; mistakes: number; date: string };
  rank: number;
  isCurrentUser: boolean;
  colors: ReturnType<typeof useColors>;
}

function RankItem({ entry, rank, isCurrentUser, colors }: RankItemProps) {
  const rankColor =
    rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : colors.mutedForeground;
  const rankIcon: MaterialIconName =
    rank === 1 ? "emoji-events" : rank === 2 ? "workspace-premium" : rank === 3 ? "military-tech" : "tag";

  return (
    <Animated.View entering={FadeInDown.delay(rank * 40).springify()}>
      <View
        style={[
          styles.rankItem,
          {
            backgroundColor: isCurrentUser ? `${colors.primary}15` : colors.card,
            borderColor: isCurrentUser ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={[styles.rankBadge, { backgroundColor: `${rankColor}22` }]}>
          <MaterialIcons name={rankIcon} size={18} color={rankColor} />
          {rank > 3 && (
            <Text style={[styles.rankNum, { color: rankColor }]}>{rank}</Text>
          )}
        </View>
        <View style={styles.rankInfo}>
          <Text style={[styles.rankName, { color: colors.foreground }]}>
            {entry.name}
            {isCurrentUser && (
              <Text style={[styles.youText, { color: colors.primary }]}> (Sen)</Text>
            )}
          </Text>
          <View style={styles.rankMeta}>
            <MaterialIcons name="timer" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {formatTime(entry.time)}
            </Text>
            <Text style={[styles.dotSep, { color: colors.border }]}>•</Text>
            <MaterialIcons name="error-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {entry.mistakes} hata
            </Text>
          </View>
        </View>
        <View style={styles.rankScore}>
          <Text style={[styles.scoreValue, { color: colors.primary }]}>{entry.score}</Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>puan</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function LiderlikScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { leaderboard, profile } = useGame();

  const today = new Date().toISOString().split("T")[0];
  const sorted = [...leaderboard]
    .filter((e) => e.date === today)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

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
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Bugünün Liderleri</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          En iyi {sorted.length} oyuncu
        </Text>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="emoji-events" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Henüz Kimse Yok
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            İlk bulmacayı çözerek tabloya gir!
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={[
            styles.list,
            {
              paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
            },
          ]}
          scrollEnabled={sorted.length > 0}
          renderItem={({ item, index }) => (
            <RankItem
              entry={item}
              rank={index + 1}
              isCurrentUser={item.name === profile.name}
              colors={colors}
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontWeight: "500" },
  list: { padding: 16, gap: 8 },
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: { fontSize: 14, fontWeight: "700" },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  rankMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  dotSep: { fontSize: 12 },
  rankScore: { alignItems: "flex-end" },
  scoreValue: { fontSize: 20, fontWeight: "700" },
  scoreLabel: { fontSize: 11, fontWeight: "500" },
  youText: { fontWeight: "600" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
});
