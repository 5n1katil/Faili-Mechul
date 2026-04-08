import React, { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import Animated, { FadeInDown } from "react-native-reanimated";
import OnboardingScreen from "@/components/OnboardingScreen";
import PaywallModal from "@/components/PaywallModal";
import AvatarPicker from "@/components/AvatarPicker";
import { AvatarDisplay } from "@/utils/avatarHelpers";
import { soundSettings } from "@/utils/soundSettings";
import { usePurchase } from "@/context/PurchaseContext";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const BADGE_INFO: Record<string, { label: string; icon: MaterialIconName; desc: string }> = {
  ilk_cozum: { label: "İlk Çözüm", icon: "emoji-events", desc: "İlk bulmacayı çözdünüz!" },
  bes_cozum: { label: "5 Bulmaca", icon: "star", desc: "5 bulmaca çözdünüz!" },
  hafta_serisi: { label: "Haftalık Seri", icon: "local-fire-department", desc: "7 gün üst üste oynadınız!" },
  hatasiz: { label: "Hatasız", icon: "verified", desc: "Bir bulmacayı hiç hata yapmadan çözdünüz!" },
};

function BadgeItem({ badgeId, colors }: { badgeId: string; colors: ReturnType<typeof useColors> }) {
  const info = BADGE_INFO[badgeId];
  if (!info) return null;
  return (
    <View
      style={[styles.badgeItem, { backgroundColor: colors.card, borderColor: colors.primary }]}
    >
      <View style={[styles.badgeIcon, { backgroundColor: `${colors.primary}22` }]}>
        <MaterialIcons name={info.icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.badgeLabel, { color: colors.foreground }]}>{info.label}</Text>
      <Text style={[styles.badgeDesc, { color: colors.mutedForeground }]}>{info.desc}</Text>
    </View>
  );
}

export default function ProfilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, gameHistory, updateProfile } = useGame();
  const { isPremium, restorePurchases, priceString } = usePurchase();

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => soundSettings.enabled);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    soundSettings.refresh().then((val) => setSoundEnabled(val));
  }, []);

  const handleSoundToggle = (val: boolean) => {
    soundSettings.enabled = val;
    setSoundEnabled(val);
  };

  const winRate =
    profile.gamesPlayed > 0
      ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
      : 0;

  const recentHistory = gameHistory.slice(0, 10);

  const handleAvatarChange = (newAvatar: string) => {
    updateProfile(profile.name, newAvatar);
  };

  const handleRestore = async () => {
    setRestoring(true);
    setRestoreMsg(null);
    const result = await restorePurchases();
    setRestoring(false);
    setRestoreMsg({ text: result.message, ok: result.success });
  };

  return (
    <>
      <AvatarPicker
        visible={showAvatarPicker}
        value={profile.avatar}
        onChange={handleAvatarChange}
        onClose={() => setShowAvatarPicker(false)}
      />
      <OnboardingScreen
        visible={showHowToPlay}
        onDone={() => setShowHowToPlay(false)}
        closeLabel="Kapat"
      />
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
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
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatarContainer, { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}>
              <AvatarDisplay
                avatar={profile.avatar || "detective"}
                size={64}
                color={colors.primary}
                backgroundColor="transparent"
              />
              <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="edit" size={11} color={colors.primaryForeground} />
              </View>
              <Pressable
                onPress={() => setShowAvatarPicker(true)}
                style={StyleSheet.absoluteFillObject}
                accessibilityRole="button"
                accessibilityLabel="Avatar değiştir"
              />
            </View>
            <View style={styles.nameRow}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
            </View>
            <View style={styles.streakRow}>
              <MaterialIcons name="local-fire-department" size={18} color="#FF6B35" />
              <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>
                {profile.currentStreak} günlük seri
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View style={styles.statsGrid}>
            {[
              { value: profile.gamesPlayed, label: "Oynanan" },
              { value: profile.gamesWon, label: "Kazanılan" },
              { value: `%${winRate}`, label: "Başarı" },
              { value: profile.totalScore, label: "Toplam Puan" },
              { value: profile.currentStreak, label: "Mevcut Seri" },
              { value: profile.maxStreak, label: "En Uzun Seri" },
              {
                value:
                  profile.avgSolveTimeSeconds > 0
                    ? `${Math.floor(profile.avgSolveTimeSeconds / 60)}:${(profile.avgSolveTimeSeconds % 60).toString().padStart(2, "0")}`
                    : "—",
                label: "Ort. Süre",
              },
            ].map((stat, i) => (
              <View
                key={i}
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {profile.badges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rozetler</Text>
            <View style={styles.badgesGrid}>
              {profile.badges.map((b) => (
                <BadgeItem key={b} badgeId={b} colors={colors} />
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <Pressable
            onPress={() => setShowHowToPlay(true)}
            style={[styles.howToPlayBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.howToPlayIcon, { backgroundColor: `${colors.primary}18` }]}>
              <MaterialIcons name="help-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.howToPlayInfo}>
              <Text style={[styles.howToPlayTitle, { color: colors.foreground }]}>Nasıl Oynanır?</Text>
              <Text style={[styles.howToPlayDesc, { color: colors.mutedForeground }]}>
                Dedektif ızgarasını ve ipuçlarını öğren
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.mutedForeground} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <View style={[styles.settingsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.howToPlayIcon, { backgroundColor: `${colors.primary}18` }]}>
              <MaterialIcons name="volume-up" size={22} color={colors.primary} />
            </View>
            <View style={styles.howToPlayInfo}>
              <Text style={[styles.howToPlayTitle, { color: colors.foreground }]}>Ses Efektleri</Text>
              <Text style={[styles.howToPlayDesc, { color: colors.mutedForeground }]}>
                Oyun seslerini aç veya kapat
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: colors.border, true: `${colors.primary}88` }}
              thumbColor={soundEnabled ? colors.primary : colors.mutedForeground}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).springify()}>
          {isPremium ? (
            <View
              style={[
                styles.premiumActiveCard,
                {
                  backgroundColor: "#D4A84314",
                  borderColor: "#D4A843",
                  shadowColor: "#D4A843",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 8,
                },
              ]}
            >
              <View style={[styles.premiumGoldTopBar]} />
              <View style={styles.premiumActiveInner}>
                <View style={[styles.howToPlayIcon, { backgroundColor: "#D4A84330" }]}>
                  <MaterialIcons name="local-police" size={24} color="#D4A843" />
                </View>
                <View style={styles.howToPlayInfo}>
                  <Text style={[styles.howToPlayTitle, { color: "#D4A843", fontSize: 15, fontWeight: "800" }]}>
                    🔱 Baş Dedektif
                  </Text>
                  <Text style={[styles.howToPlayDesc, { color: "#D4A84399" }]}>
                    Vaka Arşivi aktif · Tüm vakalar açık
                  </Text>
                </View>
                <MaterialIcons name="verified" size={22} color="#D4A843" />
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowPaywall(true)}
              style={({ pressed }) => [
                styles.howToPlayBtn,
                { backgroundColor: "#D4A84310", borderColor: "#D4A84344", opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.howToPlayIcon, { backgroundColor: "#D4A84318" }]}>
                <MaterialIcons name="lock-open" size={22} color="#D4A843" />
              </View>
              <View style={styles.howToPlayInfo}>
                <Text style={[styles.howToPlayTitle, { color: "#D4A843" }]}>Vaka Arşivini Aç</Text>
                <Text style={[styles.howToPlayDesc, { color: colors.mutedForeground }]}>
                  Tüm vakalar · Tek seferlik · {priceString}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#D4A843" />
            </Pressable>
          )}
        </Animated.View>

        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(265).springify()}>
            <Pressable
              onPress={handleRestore}
              disabled={restoring}
              style={({ pressed }) => [
                styles.restoreBtn,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: (pressed || restoring) ? 0.6 : 1 },
              ]}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <MaterialIcons name="restore" size={18} color={colors.mutedForeground} />
              )}
              <View style={styles.howToPlayInfo}>
                <Text style={[styles.howToPlayTitle, { color: colors.foreground }]}>Satın Almalarımı Geri Yükle</Text>
                {restoreMsg && (
                  <Text style={[styles.howToPlayDesc, { color: restoreMsg.ok ? colors.success : colors.accent }]}>
                    {restoreMsg.text}
                  </Text>
                )}
                {!restoreMsg && (
                  <Text style={[styles.howToPlayDesc, { color: colors.mutedForeground }]}>
                    Önceki satın almayı geri yükle
                  </Text>
                )}
              </View>
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(270).springify()}>
          <Pressable
            onPress={() => Linking.openURL("https://failimechul.app/gizlilik")}
            style={[styles.howToPlayBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.howToPlayIcon, { backgroundColor: `${colors.mutedForeground}18` }]}>
              <MaterialIcons name="privacy-tip" size={22} color={colors.mutedForeground} />
            </View>
            <View style={styles.howToPlayInfo}>
              <Text style={[styles.howToPlayTitle, { color: colors.foreground }]}>Gizlilik Politikası</Text>
              <Text style={[styles.howToPlayDesc, { color: colors.mutedForeground }]}>
                Verileriniz ve kullanım koşulları
              </Text>
            </View>
            <MaterialIcons name="open-in-new" size={18} color={colors.mutedForeground} />
          </Pressable>
        </Animated.View>

        {recentHistory.length > 0 && (
          <Animated.View entering={FadeInDown.delay(280).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Son Oyunlar</Text>
            {recentHistory.map((rec, i) => (
              <View
                key={i}
                style={[
                  styles.historyItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: rec.completed ? `${colors.success}44` : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.historyIcon,
                    { backgroundColor: rec.completed ? `${colors.success}22` : `${colors.accent}22` },
                  ]}
                >
                  <MaterialIcons
                    name={rec.completed ? "check-circle" : "cancel"}
                    size={20}
                    color={rec.completed ? colors.success : colors.accent}
                  />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                    {rec.date}
                  </Text>
                  <Text style={[styles.historyResult, { color: rec.completed ? colors.success : colors.accent }]}>
                    {rec.completed ? "Çözüldü" : "Çözülemedi"}
                  </Text>
                </View>
                <View style={styles.historyStats}>
                  {rec.completed && (
                    <Text style={[styles.historyScore, { color: colors.primary }]}>{rec.score}</Text>
                  )}
                  <Text style={[styles.historyMistakes, { color: colors.mutedForeground }]}>
                    {rec.wrongGuesses} hata
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileName: { fontSize: 22, fontWeight: "700" },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakLabel: { fontSize: 13, fontWeight: "500" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "28%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeItem: {
    flex: 1,
    minWidth: "42%",
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  badgeDesc: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  howToPlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  premiumActiveCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  premiumGoldTopBar: {
    height: 3,
    backgroundColor: "#D4A843",
  },
  premiumActiveInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 14,
  },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  howToPlayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  howToPlayInfo: { flex: 1 },
  howToPlayTitle: { fontSize: 15, fontWeight: "700" },
  howToPlayDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 12 },
  historyResult: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  historyStats: { alignItems: "flex-end", gap: 2 },
  historyScore: { fontSize: 18, fontWeight: "700" },
  historyMistakes: { fontSize: 11 },
});
