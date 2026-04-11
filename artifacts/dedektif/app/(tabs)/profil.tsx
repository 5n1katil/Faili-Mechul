import React, { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
import { useMission } from "@/context/MissionContext";
import { ALL_MISSIONS } from "@/data/missions";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const BADGE_INFO: Record<string, { label: string; icon: MaterialIconName; desc: string; color?: string }> = {
  bas_dedektif:      { label: "Baş Dedektif",          icon: "workspace-premium",      desc: "Premium Vaka Arşivini açtınız!", color: "#D4A843" },
  ilk_cozum:         { label: "İlk Çözüm",             icon: "emoji-events",           desc: "İlk bulmacayı çözdünüz!" },
  bes_cozum:         { label: "5 Vaka",                icon: "star",                   desc: "5 bulmaca çözdünüz!" },
  on_cozum:          { label: "10 Vaka",               icon: "star-half",              desc: "10 bulmaca çözdünüz!" },
  yirmi_cozum:       { label: "20 Vaka",               icon: "grade",                  desc: "20 bulmaca çözdünüz!" },
  uzman_dedektif:    { label: "Uzman Dedektif",        icon: "military-tech",          desc: "Tüm ücretsiz bulmacaları çözdünüz!", color: "#D4A843" },
  soguk_iz:          { label: "İlk Seri",              icon: "local-fire-department",  desc: "3 gün üst üste oynadınız!", color: "#F97316" },
  hafta_serisi:      { label: "Haftalık Seri",         icon: "local-fire-department",  desc: "7 gün üst üste oynadınız!" },
  on_seri:           { label: "Sönmez Ateş",           icon: "whatshot",               desc: "10 gün üst üste oynadınız!", color: "#F97316" },
  hatasiz:           { label: "Hatasız",               icon: "verified",               desc: "Bir bulmacayı hiç hata yapmadan çözdünüz!" },
  hizli_dedektif:    { label: "Hızlı Dedektif",        icon: "bolt",                   desc: "Bir bulmacayı 3 dakikadan kısa sürede çözdünüz!", color: "#60A5FA" },
  otuz_vaka:         { label: "30 Vaka",               icon: "military-tech",          desc: "30 bulmaca çözdünüz!", color: "#D4A843" },
  elli_vaka:         { label: "50 Vaka",               icon: "military-tech",          desc: "50 bulmaca çözdünüz!", color: "#D4A843" },
  sifir_hata_usta:   { label: "Hatasız Usta",          icon: "verified",               desc: "10 bulmacayı hatasız çözdünüz!" },
  iki_hafta_serisi:  { label: "İki Hafta Serisi",      icon: "whatshot",               desc: "14 günlük seri oluşturdunuz!", color: "#F97316" },
  hiz_makinesi:      { label: "Hız Makinesi",          icon: "speed",                  desc: "5 bulmacayı 3 dakikadan kısa sürede çözdünüz!", color: "#60A5FA" },
  dedektif_usta:     { label: "Dedektif Ustası",       icon: "manage-search",          desc: "10 Dedektif seviyesi bulmaca çözdünüz!" },
  komiser_cirak:     { label: "Komiser Çıraklığı",     icon: "local-police",           desc: "5 Baş Komiser seviyesi bulmaca çözdünüz!", color: "#D4A843" },
  puan_usta:         { label: "Puan Ustası",           icon: "trending-up",            desc: "Tek bir bulmacada 12.000+ puan kazandınız!" },
  uc_hafta_serisi:   { label: "Üç Hafta",              icon: "whatshot",               desc: "21 günlük seri oluşturdunuz!", color: "#F97316" },
  yuz_vaka:          { label: "100 Vaka",              icon: "auto-graph",             desc: "100 bulmaca çözdünüz!", color: "#D4A843" },
  mukemmeliyetci:    { label: "Mükemmeliyetçi",        icon: "verified",               desc: "20 bulmacayı hatasız çözdünüz!", color: "#D4A843" },
  altin_sicil:       { label: "Altın Sicil",           icon: "workspace-premium",      desc: "30 bulmacayı hatasız çözdünüz!", color: "#D4A843" },
  ay_serisi:         { label: "Ay Serisi",             icon: "local-fire-department",  desc: "30 günlük seri oluşturdunuz!", color: "#F97316" },
  efsane_seri:       { label: "Efsane Seri",           icon: "whatshot",               desc: "50 günlük seri oluşturdunuz!", color: "#C8372D" },
  simsek:            { label: "Şimşek",                icon: "flash-on",               desc: "Bir bulmacayı 90 saniyeden kısa sürede çözdünüz!", color: "#60A5FA" },
  komiser_usta:      { label: "Komiser Ustası",        icon: "gavel",                  desc: "10 Baş Komiser seviyesi bulmaca çözdünüz!", color: "#D4A843" },
  puan_efsane:       { label: "Puan Efsanesi",         icon: "diamond",                desc: "Toplam 100.000 puan kazandınız!", color: "#D4A843" },
  yuksek_gerilim:    { label: "Yüksek Gerilim",        icon: "trending-up",            desc: "Tek bir bulmacada 15.000+ puan kazandınız!", color: "#D4A843" },
  efsane_hazine:     { label: "Efsane Hazinesi",       icon: "emoji-events",           desc: "Toplam 200.000 puan kazandınız!", color: "#D4A843" },
};

function BadgeItem({ badgeId, colors }: { badgeId: string; colors: ReturnType<typeof useColors> }) {
  const info = BADGE_INFO[badgeId];
  if (!info) return null;
  const accentColor = info.color ?? colors.primary;
  return (
    <View
      style={[styles.badgeItem, { backgroundColor: colors.card, borderColor: `${accentColor}66` }]}
    >
      <View style={[styles.badgeIcon, { backgroundColor: `${accentColor}22` }]}>
        <MaterialIcons name={info.icon} size={24} color={accentColor} />
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
  const { isAwarded } = useMission();

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => soundSettings.enabled);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState(profile.bio ?? "");
  const bioInputRef = useRef<TextInput>(null);

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

  const completedRecords = gameHistory.filter((h) => h.completed);

  const bestTimeSeconds =
    completedRecords.length > 0
      ? Math.min(...completedRecords.map((h) => h.timeSeconds))
      : 0;

  const flawlessCount = completedRecords.filter((h) => h.wrongGuesses === 0).length;

  const recentHistory = gameHistory.slice(0, 10);

  const missionBadges = ALL_MISSIONS
    .filter((m) => m.reward.badge && isAwarded(m.id))
    .map((m) => m.reward.badge as string);

  const rawBadges = isPremium && !profile.badges.includes("bas_dedektif")
    ? ["bas_dedektif", ...profile.badges]
    : profile.badges;

  const visibleBadges = [...new Set([...rawBadges, ...missionBadges])];

  const handleAvatarChange = (newAvatar: string) => {
    updateProfile({ avatar: newAvatar });
  };

  const handleBioSave = () => {
    setEditingBio(false);
    updateProfile({ bio: bioText.trim() });
  };

  const handlePrivacyToggle = (key: keyof typeof profile.privacySettings, val: boolean) => {
    updateProfile({ privacySettings: { ...profile.privacySettings, [key]: val } });
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

            {editingBio ? (
              <View style={styles.bioEditRow}>
                <TextInput
                  ref={bioInputRef}
                  style={[styles.bioInput, { color: colors.foreground, borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}
                  value={bioText}
                  onChangeText={setBioText}
                  maxLength={160}
                  placeholder="Kendinizi tanıtın..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  autoFocus
                  returnKeyType="done"
                  blurOnSubmit
                  onBlur={handleBioSave}
                />
                <Text style={[styles.bioCounter, { color: colors.mutedForeground }]}>
                  {bioText.length}/160
                </Text>
              </View>
            ) : (
              <Pressable style={styles.bioRow} onPress={() => { setBioText(profile.bio ?? ""); setEditingBio(true); }}>
                <Text
                  style={[
                    styles.bioText,
                    { color: profile.bio ? colors.mutedForeground : `${colors.mutedForeground}66` },
                  ]}
                  numberOfLines={2}
                >
                  {profile.bio || "Bio ekle..."}
                </Text>
                <MaterialIcons name="edit" size={14} color={`${colors.mutedForeground}88`} />
              </Pressable>
            )}

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
              {
                value:
                  bestTimeSeconds > 0
                    ? `${Math.floor(bestTimeSeconds / 60)}:${(bestTimeSeconds % 60).toString().padStart(2, "0")}`
                    : "—",
                label: "En İyi Süre",
              },
              {
                value: flawlessCount,
                label: "Hatasız Çözüm",
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

        {visibleBadges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rozetler</Text>
            <View style={styles.badgesGrid}>
              {visibleBadges.map((b) => (
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

        <Animated.View entering={FadeInDown.delay(255).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Genel Profil Görünürlüğü</Text>
          <View style={[styles.privacyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {([
              { key: "showStats" as const, label: "İstatistiklerimi göster", icon: "bar-chart" as const },
              { key: "showBadges" as const, label: "Rozetlerimi göster", icon: "military-tech" as const },
              { key: "showBio" as const, label: "Bio'mu göster", icon: "person" as const },
              { key: "showAvatar" as const, label: "Avatarımı göster", icon: "face" as const },
            ]).map((item, idx, arr) => (
              <View
                key={item.key}
                style={[
                  styles.privacyRow,
                  idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <MaterialIcons name={item.icon} size={18} color={colors.mutedForeground} />
                <Text style={[styles.privacyLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Switch
                  value={profile.privacySettings?.[item.key] ?? true}
                  onValueChange={(val) => handlePrivacyToggle(item.key, val)}
                  trackColor={{ false: colors.border, true: `${colors.primary}88` }}
                  thumbColor={(profile.privacySettings?.[item.key] ?? true) ? colors.primary : colors.mutedForeground}
                />
              </View>
            ))}
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
              <View style={[styles.premiumStatRow, { borderTopColor: "#D4A84330" }]}>
                <View style={styles.premiumStat}>
                  <Text style={[styles.premiumStatValue, { color: "#D4A843" }]}>{profile.gamesWon}</Text>
                  <Text style={[styles.premiumStatLabel, { color: "#D4A84399" }]}>çözülen vaka</Text>
                </View>
                <View style={[styles.premiumStatDivider, { backgroundColor: "#D4A84330" }]} />
                <View style={styles.premiumStat}>
                  <Text style={[styles.premiumStatValue, { color: "#D4A843" }]}>{flawlessCount}</Text>
                  <Text style={[styles.premiumStatLabel, { color: "#D4A84399" }]}>hatasız çözüm</Text>
                </View>
                <View style={[styles.premiumStatDivider, { backgroundColor: "#D4A84330" }]} />
                <View style={styles.premiumStat}>
                  <Text style={[styles.premiumStatValue, { color: "#D4A843" }]}>
                    {bestTimeSeconds > 0 ? `${Math.floor(bestTimeSeconds / 60)}:${(bestTimeSeconds % 60).toString().padStart(2, "0")}` : "—"}
                  </Text>
                  <Text style={[styles.premiumStatLabel, { color: "#D4A84399" }]}>en iyi süre</Text>
                </View>
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
  bioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  bioText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  bioEditRow: {
    width: "100%",
    gap: 4,
  },
  bioInput: {
    fontSize: 13,
    lineHeight: 18,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlignVertical: "top",
    minHeight: 60,
  },
  bioCounter: {
    fontSize: 11,
    textAlign: "right",
    marginRight: 4,
  },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakLabel: { fontSize: 13, fontWeight: "500" },
  privacyCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  privacyLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
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
  premiumStatRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  premiumStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  premiumStatDivider: {
    width: 1,
    marginVertical: 2,
  },
  premiumStatValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  premiumStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
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
