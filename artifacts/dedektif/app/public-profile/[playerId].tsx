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
import type { PublicProfile } from "@/utils/apiClient";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type AIProfileData = {
  kind: "ai";
  name: string;
  avatar: string;
  totalScore: number;
  gamesWon: number;
  maxStreak: number;
  avgSolveTimeSeconds: number;
  bio?: string;
};

type BackendProfileData = {
  kind: "backend";
  raw: PublicProfile;
};

type ProfileData = AIProfileData | BackendProfileData;

function PrivacyPlaceholder({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.privacyPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MaterialIcons name="lock" size={14} color={colors.mutedForeground} />
      <Text style={[styles.privacyPlaceholderText, { color: colors.mutedForeground }]}>
        {label} gizli
      </Text>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  colors,
}: {
  icon: MaterialIconName;
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

    if (playerId.startsWith("ai-")) {
      const slug = playerId.slice(3);
      const ai = AI_DETECTIVES.find(
        (d) => d.name.toLowerCase().replace(/\s+/g, "-") === slug
      );
      if (ai) {
        setData({ kind: "ai", ...ai });
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
        setData({ kind: "backend", raw: res });
      })
      .catch(() => {
        setError("Profil yüklenirken bir hata oluştu.");
      })
      .finally(() => setLoading(false));
  }, [playerId]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const resolvedName: string = (() => {
    if (isMe) return myProfile.name;
    if (!data) return "Profil";
    if (data.kind === "ai") return data.name;
    return data.raw.displayName;
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {loading ? "Profil" : resolvedName}
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
      ) : isMe ? (
        <MeProfile myProfile={myProfile} colors={colors} botPad={botPad} />
      ) : data?.kind === "ai" ? (
        <AIProfile data={data} colors={colors} botPad={botPad} />
      ) : data?.kind === "backend" ? (
        <BackendProfile raw={data.raw} colors={colors} botPad={botPad} />
      ) : null}
    </View>
  );
}

function MeProfile({
  myProfile,
  colors,
  botPad,
}: {
  myProfile: ReturnType<typeof useGame>["profile"];
  colors: ReturnType<typeof useColors>;
  botPad: number;
}) {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(0).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AvatarDisplay avatar={myProfile.avatar || "detective"} size={88} color={colors.primary} />
        <Text style={[styles.name, { color: colors.foreground }]}>{myProfile.name}</Text>
        <View style={[styles.badge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
          <MaterialIcons name="person" size={13} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>Sen</Text>
        </View>
        {myProfile.bio ? (
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{myProfile.bio}</Text>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>İSTATİSTİKLER</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="emoji-events" value={myProfile.totalScore.toLocaleString("tr-TR")} label="Toplam Puan" colors={colors} />
          <StatCard icon="folder-special" value={String(myProfile.gamesWon)} label="Çözülen Vaka" colors={colors} />
          <StatCard icon="local-fire-department" value={String(myProfile.maxStreak)} label="En Uzun Seri" colors={colors} />
          {myProfile.avgSolveTimeSeconds != null && (
            <StatCard icon="timer" value={fmtTime(myProfile.avgSolveTimeSeconds)} label="Ort. Süre" colors={colors} />
          )}
        </View>
      </Animated.View>

      {myProfile.badges && myProfile.badges.length > 0 && (
        <Animated.View entering={FadeInDown.delay(90).springify()}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ROZETLER</Text>
          <View style={styles.badgesWrap}>
            {myProfile.badges.map((b) => (
              <View key={b} style={[styles.badgeChip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}44` }]}>
                <Text style={[styles.badgeChipText, { color: colors.primary }]}>{b}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

function AIProfile({ data, colors, botPad }: { data: AIProfileData; colors: ReturnType<typeof useColors>; botPad: number }) {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(0).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AvatarDisplay avatar={data.avatar} size={88} color={colors.mutedForeground} />
        <Text style={[styles.name, { color: colors.foreground }]}>{data.name}</Text>
        <View style={[styles.badge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
          <MaterialIcons name="verified-user" size={13} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>Kayıtlı Dedektif</Text>
        </View>
        {data.bio ? (
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{data.bio}</Text>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>İSTATİSTİKLER</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="emoji-events" value={data.totalScore.toLocaleString("tr-TR")} label="Toplam Puan" colors={colors} />
          <StatCard icon="folder-special" value={String(data.gamesWon)} label="Çözülen Vaka" colors={colors} />
          <StatCard icon="local-fire-department" value={String(data.maxStreak)} label="En Uzun Seri" colors={colors} />
          <StatCard icon="timer" value={fmtTime(data.avgSolveTimeSeconds)} label="Ort. Süre" colors={colors} />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function BackendProfile({ raw, colors, botPad }: { raw: PublicProfile; colors: ReturnType<typeof useColors>; botPad: number }) {
  const privacy = raw.privacy;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(0).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {privacy.showAvatar && raw.avatar ? (
          <AvatarDisplay avatar={raw.avatar} size={88} color={colors.mutedForeground} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: `${colors.mutedForeground}15` }]}>
            <MaterialIcons name="lock" size={36} color={colors.mutedForeground} />
          </View>
        )}
        <Text style={[styles.name, { color: colors.foreground }]}>{raw.displayName}</Text>
        {raw.isPremium && (
          <View style={[styles.badge, { backgroundColor: "#D4A84320", borderColor: "#D4A84344" }]}>
            <MaterialIcons name="local-police" size={13} color="#D4A843" />
            <Text style={[styles.badgeText, { color: "#D4A843" }]}>Baş Dedektif</Text>
          </View>
        )}
        {privacy.showBio ? (
          raw.bio ? (
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>{raw.bio}</Text>
          ) : null
        ) : (
          <PrivacyPlaceholder label="Bio" colors={colors} />
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>İSTATİSTİKLER</Text>
        {privacy.showStats && raw.stats ? (
          <View style={styles.statsGrid}>
            <StatCard icon="emoji-events" value={raw.stats.totalScore.toLocaleString("tr-TR")} label="Toplam Puan" colors={colors} />
            <StatCard icon="folder-special" value={String(raw.stats.gamesWon)} label="Çözülen Vaka" colors={colors} />
            <StatCard icon="local-fire-department" value={String(raw.stats.maxStreak)} label="En Uzun Seri" colors={colors} />
            {raw.stats.avgSolveTimeSeconds != null && (
              <StatCard icon="timer" value={fmtTime(raw.stats.avgSolveTimeSeconds)} label="Ort. Süre" colors={colors} />
            )}
          </View>
        ) : (
          <PrivacyPlaceholder label="Bu bilgi" colors={colors} />
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(90).springify()}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ROZETLER</Text>
        {privacy.showBadges && raw.badges && raw.badges.length > 0 ? (
          <View style={styles.badgesWrap}>
            {raw.badges.map((b) => (
              <View key={b} style={[styles.badgeChip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}44` }]}>
                <Text style={[styles.badgeChipText, { color: colors.primary }]}>{b}</Text>
              </View>
            ))}
          </View>
        ) : (
          <PrivacyPlaceholder label="Rozetler" colors={colors} />
        )}
      </Animated.View>
    </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
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
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
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
  badgesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeChipText: { fontSize: 13, fontWeight: "600" },
  privacyPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyPlaceholderText: { fontSize: 14 },
});
