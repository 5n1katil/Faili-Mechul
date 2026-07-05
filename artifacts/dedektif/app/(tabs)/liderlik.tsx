import React, { useState, useCallback, useRef, useEffect } from "react";
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
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
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

const LEADERBOARD_AVATARS = [
  "av_dedektif", "av_gece", "av_komiser", "av_genckadin", "av_fbi", "av_sert",
  "av_polis", "av_memur", "av_trafik", "av_denizci", "av_ajan", "av_operator",
  "av_muhabir", "av_sokak", "av_uzman", "av_katip", "av_pipo", "av_golge",
  "av_asil", "av_hacker", "av_sheriff", "av_yargi", "av_doktor", "av_foto",
  "av_adli", "av_professore", "av_yonetici", "av_analist", "av_supheji",
  "av_yazar", "av_diva", "av_patron", "av_kedi", "av_basin", "av_barista",
  "av_kasket", "av_mor", "av_elit", "av_gorevli", "av_kizil", "av_kartal",
  "av_fedora", "av_esarp", "av_buyukanne", "av_albay", "av_bogazli",
  "av_silindir", "av_mufekkir", "av_bob", "av_siyahsapka",
];

function hashStringToAvatarIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % LEADERBOARD_AVATARS.length;
}

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
  const avatar =
    e.avatar && e.avatar !== "detective"
      ? e.avatar
      : LEADERBOARD_AVATARS[hashStringToAvatarIndex(e.playerId || e.displayName)];
  return {
    name: e.displayName,
    avatar,
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
  const isTop3 = rank <= 3;

  // Premium palette: gold / silver-steel / warm bronze
  const rankColor =
    rank === 1 ? "#FFD700" :
    rank === 2 ? "#C8D8F0" :
    rank === 3 ? "#E8946A" :
    "#6B7A99";

  // Flame icon for 1st, premium / military for 2nd-3rd, tag for rest
  const rankIcon: MaterialIconName =
    rank === 1 ? "local-fire-department" :
    rank === 2 ? "workspace-premium" :
    rank === 3 ? "military-tech" :
    "tag";

  // Glow ring: only opacity is animated — GPU-accelerated, glitch-free everywhere
  const minOp = rank === 1 ? 0.18 : rank === 2 ? 0.1 : 0.06;
  const maxOp = rank === 1 ? 0.72 : rank === 2 ? 0.46 : 0.28;
  const glowOp = useSharedValue(minOp);
  React.useEffect(() => {
    if (!isTop3) return;
    const dur = rank === 1 ? 2000 : rank === 2 ? 2600 : 3200;
    glowOp.value = withRepeat(
      withSequence(
        withTiming(maxOp, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(minOp, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowRingStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }));

  // Static (non-animated) depth shadow for premium look
  const staticShadow = isTop3 ? {
    shadowColor:   rankColor,
    shadowOpacity: rank === 1 ? 0.38 : rank === 2 ? 0.2 : 0.13,
    shadowRadius:  rank === 1 ? 14   : rank === 2 ? 8   : 5,
    shadowOffset:  { width: 0, height: rank === 1 ? 6 : 3 },
    elevation:     rank === 1 ? 18   : rank === 2 ? 10  : 6,
  } : {};

  // Card backgrounds
  const bgColor = entry.isCurrentUser
    ? `${colors.primary}20`
    : rank === 1 ? "#2E2508"    // deep gold
    : rank === 2 ? "#1A2535"    // steel blue
    : rank === 3 ? "#261B10"    // warm bronze
    : "#1A2340";                // light blue for regular

  const borderColorVal = entry.isCurrentUser
    ? colors.primary
    : rank === 1 ? "#FFD700CC"
    : rank === 2 ? "#C8D8F066"
    : rank === 3 ? "#E8946A55"
    : "#FFFFFF1A";

  const badgeSize = rank === 1 ? 52 : rank === 2 ? 46 : rank === 3 ? 42 : 38;
  const iconSize  = rank === 1 ? 28 : rank === 2 ? 22 : rank === 3 ? 20 : 14;

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

  const nameColor  = entry.isCurrentUser ? colors.primary : isTop3 ? rankColor : colors.foreground;
  const scoreColor = entry.isCurrentUser ? colors.primary : isTop3 ? rankColor : colors.foreground;
  const metaColor  = isTop3 ? `${rankColor}99` : colors.mutedForeground;
  const timeColor  = isTop3 ? `${rankColor}77` : colors.mutedForeground;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <View style={[{ borderRadius: 14, overflow: "visible" }, staticShadow]}>
        {/* Pulsing glow ring — absolute positioned, only opacity animates */}
        {isTop3 && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: -5,
                left: -5,
                right: -5,
                bottom: -5,
                borderRadius: 19,
                borderWidth: rank === 1 ? 2.5 : rank === 2 ? 2 : 1.5,
                borderColor: rankColor,
              },
              glowRingStyle,
            ]}
          />
        )}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.rankItem,
            {
              backgroundColor: bgColor,
              borderColor: borderColorVal,
              borderWidth: rank === 1 ? 1.5 : 1,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          {/* Rank badge — larger + bordered for top 3 */}
          <View
            style={[
              styles.rankBadge,
              {
                width: badgeSize,
                height: badgeSize,
                borderRadius: badgeSize / 2,
                backgroundColor: `${rankColor}${isTop3 ? "28" : "18"}`,
                borderWidth: isTop3 ? 1.5 : 0,
                borderColor: `${rankColor}55`,
              },
            ]}
          >
            {isTop3 ? (
              <MaterialIcons name={rankIcon} size={iconSize} color={rankColor} />
            ) : (
              <>
                <MaterialIcons name={rankIcon} size={iconSize} color={rankColor} />
                <Text style={[styles.rankNum, { color: rankColor }]}>{rank}</Text>
              </>
            )}
          </View>

          {/* Avatar — colored border for top 3 */}
          <View
            style={[
              styles.avatarWrapper,
              {
                backgroundColor: `${colors.primary}15`,
                borderColor: isTop3 ? `${rankColor}55` : `${colors.primary}40`,
                borderWidth: isTop3 ? 2 : 1.5,
              },
            ]}
          >
            <AvatarDisplay
              avatar={entry.avatar || "d01"}
              size={36}
              color={entry.isCurrentUser ? colors.primary : isTop3 ? rankColor : colors.mutedForeground}
              backgroundColor="transparent"
            />
          </View>

          {/* Info */}
          <View style={styles.rankInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.rankName, { color: nameColor }]} numberOfLines={1}>
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
                color={metaColor}
              />
              <Text style={[styles.metaText, { color: metaColor }]}>
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
                <MaterialIcons name="schedule" size={10} color={timeColor} />
                <Text style={[styles.avgTimeText, { color: timeColor }]}>
                  {`ort. ${Math.floor(entry.avgSolveTimeSeconds / 60)}:${(entry.avgSolveTimeSeconds % 60).toString().padStart(2, "0")}`}
                </Text>
              </View>
            )}
          </View>

          {/* Score — bigger font for top 3 */}
          <View style={styles.rankScore}>
            <Text style={[styles.scoreValue, { color: scoreColor, fontSize: rank === 1 ? 24 : rank === 2 ? 22 : 20 }]}>
              {typeof metaValue === "number" ? metaValue.toLocaleString("tr-TR") : metaValue}
            </Text>
            <Text style={[styles.scoreLabel, { color: metaColor }]}>{metaLabel}</Text>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function LiderlikScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, playerId } = useGame();
  const { isPremium } = usePurchase();
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const sortKeyRef = useRef<SortKey>("score");
  const [apiEntries, setApiEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const flatListRef = useRef<FlatList<RankEntry>>(null);
  const userScrolledRef = useRef(false);

  const loadLeaderboard = useCallback(async (key: SortKey) => {
    setLoading(true);
    const data = await fetchLeaderboard(SORT_KEY_TO_API[key], 50);
    setApiEntries(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      userScrolledRef.current = false;
      loadLeaderboard(sortKeyRef.current);
    }, [loadLeaderboard])
  );

  const handleSortChange = (key: SortKey) => {
    userScrolledRef.current = false;
    sortKeyRef.current = key;
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

  const npcEntries: RankEntry[] = AI_DETECTIVES.map((d) => ({
    name: d.name,
    avatar: d.avatar,
    totalScore: d.totalScore,
    gamesWon: d.gamesWon,
    maxStreak: d.maxStreak,
    avgSolveTimeSeconds: d.avgSolveTimeSeconds,
    isCurrentUser: false,
    isPremiumUser: false,
    profileId: `ai-${d.name.toLowerCase().replace(/\s+/g, "-")}`,
  }));

  const realEntries: RankEntry[] =
    apiEntries !== null && apiEntries.length > 0
      ? apiEntries.filter((e) => e.playerId !== playerId).map(apiEntryToRank)
      : [];

  const sorted = sortEntries([...npcEntries, ...realEntries, myEntry], sortKey);
  const myIndex = sorted.findIndex((e) => e.isCurrentUser);
  const myRank = myIndex + 1;

  useEffect(() => {
    if (loading || userScrolledRef.current || myIndex < 0) return;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: myIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [loading, myIndex]);

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
            Türkiye Geneli
          </Text>
        </View>
        {myRank > 0 && (
          <View style={[styles.myRankBadge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}60` }]}>
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
                active ? styles.filterTabActive : styles.filterTabInactive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: active ? "#1a1205" : "#ffffff" },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
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
          ref={flatListRef}
          data={sorted}
          keyExtractor={(item, i) => `${item.profileId}-${i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            {
              paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
            },
          ]}
          onScrollBeginDrag={() => {
            userScrolledRef.current = true;
          }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
              });
            }, 300);
          }}
          renderItem={({ item, index }) => (
            <RankItem
              entry={item}
              rank={index + 1}
              sortKey={sortKey}
              colors={colors}
              delay={Math.min(index * 20, 400)}
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
  headerTitle: { fontSize: 22, fontFamily: "UnnaBold", fontWeight: "700", letterSpacing: 0 },
  headerSub: { fontFamily: "DroidSerifRegular", fontSize: 12, fontWeight: "500", marginTop: 2 },
  myRankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  myRankText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "UnnaBold",
    letterSpacing: 0.3,
  },
  filterBar: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 22,
    borderWidth: 1.5,
    minWidth: 0,
  },
  filterTabActive: {
    backgroundColor: "#D4A843",
    borderColor: "#D4A843",
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },
  filterTabInactive: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTabText: {
    fontSize: 15,
    fontFamily: "UnnaBold",
    fontWeight: "700",
    letterSpacing: 0.1,
    textAlign: "center",
  },
  list: { padding: 12, gap: 0 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
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
  rankNum: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "700" },
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
  rankName: { fontSize: 16, fontFamily: "UnnaBold", fontWeight: "700", flexShrink: 1 },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  youText: { fontFamily: "DroidSerifRegular", fontSize: 10, fontWeight: "700" },
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
    fontFamily: "DroidSerifRegular",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "DroidSerifRegular", fontSize: 12 },
  avgTimeRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  avgTimeText: { fontFamily: "DroidSerifRegular", fontSize: 10 },
  rankScore: { alignItems: "flex-end", minWidth: 52 },
  scoreValue: { fontSize: 20, fontFamily: "UnnaBold", fontWeight: "700" },
  scoreLabel: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "500" },
});
