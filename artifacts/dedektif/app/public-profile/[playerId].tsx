import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { AvatarDisplay } from "@/utils/avatarHelpers";
import { AI_DETECTIVES } from "@/data/aiDetectives";
import { apiClient } from "@/utils/apiClient";
import type { PlayerProfile } from "@/utils/apiClient";

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type ProfileData = {
  name: string;
  avatar: string;
  bio?: string;
  totalScore?: number;
  gamesWon?: number;
  maxStreak?: number;
  avgSolveTimeSeconds?: number;
  isAI?: boolean;
};

export default function PublicProfileScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile: myProfile, playerId: myPlayerId } = useGame();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMe = playerId === myPlayerId || playerId === "me";

  useEffect(() => {
    if (!playerId) return;

    if (isMe) {
      setData({
        name: myProfile.name,
        avatar: myProfile.avatar || "detective",
        bio: myProfile.bio,
        totalScore: myProfile.totalScore,
        gamesWon: myProfile.gamesWon,
        maxStreak: myProfile.maxStreak,
        avgSolveTimeSeconds: myProfile.avgSolveTimeSeconds,
      });
      setLoading(false);
      return;
    }

    if (playerId.startsWith("ai-")) {
      const slug = playerId.slice(3);
      const ai = AI_DETECTIVES.find(
        (d) => d.name.toLowerCase().replace(/\s+/g, "-") === slug
      );
      if (ai) {
        setData({
          name: ai.name,
          avatar: ai.avatar,
          totalScore: ai.totalScore,
          gamesWon: ai.gamesWon,
          maxStreak: ai.maxStreak,
          avgSolveTimeSeconds: ai.avgSolveTimeSeconds,
          isAI: true,
        });
      } else {
        setError("Profil bulunamadı.");
      }
      setLoading(false);
      return;
    }

    apiClient
      .getProfile(playerId)
      .then((res) => {
        if (!res) {
          setError("Bu profil gizlenmiş veya bulunamadı.");
          return;
        }
        const p = res as PlayerProfile;
        setData({
          name: p.name,
          avatar: p.avatar ?? "detective",
          bio: p.bio ?? undefined,
          totalScore: p.totalScore ?? undefined,
          gamesWon: p.gamesWon ?? undefined,
          maxStreak: p.maxStreak ?? undefined,
          avgSolveTimeSeconds: p.avgSolveTimeSeconds ?? undefined,
        });
      })
      .catch(() => {
        setError("Profil yüklenirken bir hata oluştu.");
      })
      .finally(() => setLoading(false));
  }, [playerId]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {loading ? "Profil" : data?.name ?? "Profil"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialIcons name="person-off" size={56} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error}</Text>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(0).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AvatarDisplay avatar={data.avatar} size={88} />
            <Text style={[styles.name, { color: colors.foreground }]}>{data.name}</Text>
            {data.isAI && (
              <View style={[styles.aiBadge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
                <MaterialIcons name="smart-toy" size={13} color={colors.primary} />
                <Text style={[styles.aiBadgeText, { color: colors.primary }]}>AI Rakip</Text>
              </View>
            )}
            {isMe && (
              <View style={[styles.aiBadge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
                <MaterialIcons name="person" size={13} color={colors.primary} />
                <Text style={[styles.aiBadgeText, { color: colors.primary }]}>Sen</Text>
              </View>
            )}
            {data.bio ? (
              <Text style={[styles.bio, { color: colors.mutedForeground }]}>{data.bio}</Text>
            ) : null}
          </Animated.View>

          {(data.totalScore !== undefined || data.gamesWon !== undefined) && (
            <Animated.View entering={FadeInDown.delay(60).springify()}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                ISTATISTIKLER
              </Text>
              <View style={styles.statsGrid}>
                {data.totalScore !== undefined && (
                  <StatCard
                    icon="emoji-events"
                    value={data.totalScore.toLocaleString("tr-TR")}
                    label="Toplam Puan"
                    colors={colors}
                  />
                )}
                {data.gamesWon !== undefined && (
                  <StatCard
                    icon="folder-special"
                    value={String(data.gamesWon)}
                    label="Çözülen Vaka"
                    colors={colors}
                  />
                )}
                {data.maxStreak !== undefined && (
                  <StatCard
                    icon="local-fire-department"
                    value={String(data.maxStreak)}
                    label="En Uzun Seri"
                    colors={colors}
                  />
                )}
                {data.avgSolveTimeSeconds !== undefined && (
                  <StatCard
                    icon="timer"
                    value={fmtTime(data.avgSolveTimeSeconds)}
                    label="Ort. Süre"
                    colors={colors}
                  />
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  colors,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  value: string;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MaterialIcons name={icon} size={22} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 15, textAlign: "center", paddingHorizontal: 32 },
  content: { padding: 16, gap: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  name: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  aiBadgeText: { fontSize: 12, fontWeight: "600" },
  bio: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "500" },
});
