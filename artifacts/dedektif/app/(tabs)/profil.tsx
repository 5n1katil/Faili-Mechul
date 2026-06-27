import React, { useCallback, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import Animated, { FadeInDown } from "react-native-reanimated";
import SettingsScreen from "@/components/SettingsScreen";
import { unlockMusicFromGesture } from "@/utils/backgroundMusic";
import PaywallModal from "@/components/PaywallModal";
import AvatarPicker from "@/components/AvatarPicker";
import { AvatarDisplay } from "@/utils/avatarHelpers";
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

function SectionTitle({
  icon,
  label,
}: {
  icon: MaterialIconName;
  label: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitleRow}>
      <MaterialIcons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.sectionTitleText, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.sectionTitleLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

function StatGroup({
  label,
  items,
}: {
  label: string;
  items: { value: string | number; label: string }[];
}) {
  const colors = useColors();
  return (
    <View style={[styles.statGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statGroupLabel, { color: colors.secondaryForeground }]}>{label}</Text>
      <View style={styles.statGroupRow}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={[styles.statGroupDivider, { backgroundColor: colors.border }]} />}
            <View style={styles.statGroupItem}>
              <Text style={[styles.statGroupValue, { color: colors.primary }]}>{item.value}</Text>
              <Text style={[styles.statGroupItemLabel, { color: colors.secondaryForeground }]}>{item.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function BadgeItem({ badgeId, colors }: { badgeId: string; colors: ReturnType<typeof useColors> }) {
  const info = BADGE_INFO[badgeId];
  if (!info) return null;
  const accentColor = info.color ?? colors.primary;
  return (
    <View style={[styles.badgeItem, { backgroundColor: colors.card, borderColor: `${accentColor}66` }]}>
      <View style={[styles.badgeIcon, { backgroundColor: `${accentColor}22` }]}>
        <MaterialIcons name={info.icon} size={24} color={accentColor} />
      </View>
      <Text style={[styles.badgeLabel, { color: colors.foreground }]}>{info.label}</Text>
      <Text style={[styles.badgeDesc, { color: colors.secondaryForeground }]}>{info.desc}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  customIcon,
  title,
  subtitle,
  right,
  onPress,
  hasDivider,
}: {
  icon: MaterialIconName;
  customIcon?: ReturnType<typeof require>;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  hasDivider?: boolean;
}) {
  const colors = useColors();
  const inner = (
    <View style={[styles.settingsRowInner, hasDivider && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[styles.settingsIcon, { backgroundColor: customIcon ? "transparent" : `${colors.primary}18` }]}>
        {customIcon ? (
          <Image source={customIcon} style={{ width: 40, height: 40 }} resizeMode="contain" />
        ) : (
          <MaterialIcons name={icon} size={20} color={colors.primary} />
        )}
      </View>
      <View style={styles.settingsInfo}>
        <Text style={[styles.settingsTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingsSubtitle, { color: colors.secondaryForeground }]}>{subtitle}</Text>
        )}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export default function ProfilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, gameHistory, updateProfile } = useGame();
  const { isPremium, priceString } = usePurchase();
  const { isAwarded } = useMission();

  const [showSettings, setShowSettings] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState(profile.bio ?? "");
  const bioInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<import("react-native").ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

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

  const fmtTime = (sec: number) =>
    sec > 0
      ? `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`
      : "—";

  return (
    <>
      <AvatarPicker
        visible={showAvatarPicker}
        value={profile.avatar}
        onChange={handleAvatarChange}
        onClose={() => setShowAvatarPicker(false)}
      />
      <SettingsScreen visible={showSettings} onClose={() => setShowSettings(false)} />
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Profil Kartı ───────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(0).springify()}>
            <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                onPress={() => setShowAvatarPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Avatar değiştir"
                style={styles.avatarWrapper}
              >
                <View style={[styles.avatarContainer, { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}>
                  <AvatarDisplay
                    avatar={profile.avatar || "d01"}
                    size={72}
                    color={colors.primary}
                    backgroundColor="transparent"
                  />
                  <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                    <MaterialIcons name="edit" size={11} color={colors.primaryForeground} />
                  </View>
                </View>
              </Pressable>

              <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>

              {editingBio ? (
                <View style={styles.bioEditRow}>
                  <TextInput
                    ref={bioInputRef}
                    style={[
                      styles.bioInput,
                      { color: colors.foreground, borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
                    ]}
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
                  <Text style={[styles.bioCounter, { color: colors.mutedForeground }]}>{bioText.length}/160</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.bioRow}
                  onPress={() => { setBioText(profile.bio ?? ""); setEditingBio(true); }}
                >
                  <Text
                    style={[
                      styles.bioText,
                      { color: profile.bio ? colors.secondaryForeground : `${colors.mutedForeground}88` },
                    ]}
                    numberOfLines={2}
                  >
                    {profile.bio || "Bio ekle..."}
                  </Text>
                  <MaterialIcons name="edit" size={13} color={`${colors.mutedForeground}88`} />
                </Pressable>
              )}

              <View style={[styles.streakPill, { backgroundColor: "#FF6B3522", borderColor: "#FF6B3544" }]}>
                <MaterialIcons name="local-fire-department" size={16} color="#FF6B35" />
                <Text style={styles.streakPillText}>
                  {profile.currentStreak} günlük seri
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Premium Kart ─────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(60).springify()}>
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
                <View style={styles.premiumGoldTopBar} />
                <View style={styles.premiumActiveInner}>
                  <View style={[styles.settingsIcon, { backgroundColor: "#D4A84330", width: 44, height: 44, borderRadius: 22 }]}>
                    <MaterialIcons name="local-police" size={24} color="#D4A843" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingsTitle, { color: "#D4A843", fontFamily: "DroidSerifRegular", fontSize: 16 }]}>
                      🔱 Baş Dedektif
                    </Text>
                    <Text style={[styles.settingsSubtitle, { color: "#D4A84399" }]}>
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
                    <Text style={[styles.premiumStatValue, { color: "#D4A843" }]}>{fmtTime(bestTimeSeconds)}</Text>
                    <Text style={[styles.premiumStatLabel, { color: "#D4A84399" }]}>en iyi süre</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowPaywall(true)}
                style={({ pressed }) => [
                  styles.settingsCard,
                  { backgroundColor: "#D4A84310", borderColor: "#D4A84355", opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <SettingsRow
                  icon="lock-open"
                  title="Vaka Arşivini Aç"
                  subtitle={`Tüm vakalar · Tek seferlik · ${priceString}`}
                  right={<MaterialIcons name="chevron-right" size={22} color="#D4A843" />}
                />
              </Pressable>
            )}
          </Animated.View>

          {/* ── İstatistikler ─────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 8 }}>
            <SectionTitle icon="bar-chart" label="İSTATİSTİKLER" />
            <StatGroup
              label="OYUNLAR"
              items={[
                { value: profile.gamesPlayed, label: "Oynanan" },
                { value: profile.gamesWon, label: "Çözülen" },
                { value: `%${winRate}`, label: "Başarı" },
              ]}
            />
            <StatGroup
              label="SERİ"
              items={[
                { value: profile.totalScore.toLocaleString("tr-TR"), label: "Toplam Puan" },
                { value: profile.currentStreak, label: "Mevcut Seri" },
                { value: profile.maxStreak, label: "En Uzun Seri" },
              ]}
            />
            <StatGroup
              label="SÜRELER"
              items={[
                { value: fmtTime(profile.avgSolveTimeSeconds), label: "Ort. Süre" },
                { value: fmtTime(bestTimeSeconds), label: "En İyi Süre" },
                { value: flawlessCount, label: "Hatasız" },
              ]}
            />
          </Animated.View>

          {/* ── Rozetler ──────────────────────────────────────────── */}
          {visibleBadges.length > 0 && (
            <Animated.View entering={FadeInDown.delay(160).springify()} style={{ gap: 8 }}>
              <SectionTitle icon="military-tech" label="ROZETLER" />
              <View style={styles.badgesGrid}>
                {visibleBadges.map((b) => (
                  <BadgeItem key={b} badgeId={b} colors={colors} />
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── Ayarlar ───────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={{ gap: 8 }}>
            <SectionTitle icon="settings" label="AYARLAR" />
            <Pressable
              onPress={() => {
                unlockMusicFromGesture();
                setShowSettings(true);
              }}
              style={({ pressed }) => [
                styles.settingsCard,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <SettingsRow
                icon="settings"
                customIcon={require("../../assets/images/icon_ayarlar.png")}
                title="Ayarlar"
                subtitle="Müzik, ses efektleri, gizlilik, premium"
                right={<MaterialIcons name="chevron-right" size={20} color={colors.secondaryForeground} />}
              />
            </Pressable>
          </Animated.View>

          {/* ── Son Oyunlar ───────────────────────────────────────── */}
          {recentHistory.length > 0 && (
            <Animated.View entering={FadeInDown.delay(270).springify()} style={{ gap: 8 }}>
              <SectionTitle icon="history" label="SON OYUNLAR" />
              <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {recentHistory.map((rec, i) => (
                  <View
                    key={i}
                    style={[
                      styles.historyItem,
                      i < recentHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.historyIcon,
                        { backgroundColor: rec.completed ? `${colors.success}22` : `${colors.border}` },
                      ]}
                    >
                      <MaterialIcons
                        name={rec.completed ? "check-circle" : "cancel"}
                        size={20}
                        color={rec.completed ? colors.success : colors.mutedForeground}
                      />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                        {rec.date} · {rec.puzzleId}
                      </Text>
                      <Text
                        style={[
                          styles.historyResult,
                          { color: rec.completed ? colors.foreground : colors.secondaryForeground },
                        ]}
                      >
                        {rec.completed ? "Tamamlandı" : "Yarım bırakıldı"}
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
              </View>
            </Animated.View>
          )}

        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 18, paddingTop: 16 },

  /* ── Profil kartı ── */
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },
  avatarWrapper: {
    alignItems: "center",
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontSize: 22, fontFamily: "UnnaBold", fontWeight: "400", letterSpacing: 0.2 },
  bioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  bioText: {
    flex: 1,
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  bioEditRow: { width: "100%", gap: 4 },
  bioInput: {
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    lineHeight: 18,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlignVertical: "top",
    minHeight: 60,
  },
  bioCounter: { fontFamily: "DroidSerifRegular", fontSize: 11, textAlign: "right", marginRight: 4 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  streakPillText: { color: "#FF6B35", fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "700" },

  /* ── Section title ── */
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitleText: {
    fontSize: 13,
    fontFamily: "UnnaBold",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sectionTitleLine: {
    flex: 1,
    height: 1,
  },

  /* ── Stat groups ── */
  statGroup: {
    borderRadius: 14,
    borderWidth: 1,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  statGroupLabel: {
    fontSize: 10,
    fontFamily: "UnnaBold",
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statGroupRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statGroupDivider: {
    width: 1,
    height: 36,
  },
  statGroupItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statGroupValue: { fontSize: 24, fontFamily: "UnnaBold", fontWeight: "600", letterSpacing: 0.2 },
  statGroupItemLabel: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "600", textAlign: "center" },

  /* ── Badges ── */
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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
  badgeLabel: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "700", textAlign: "center" },
  badgeDesc: { fontFamily: "DroidSerifRegular", fontSize: 11, textAlign: "center", lineHeight: 16 },

  /* ── Settings card ── */
  settingsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingsRowInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 14,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  settingsInfo: { flex: 1 },
  settingsTitle: { fontSize: 15, fontFamily: "UnnaBold", fontWeight: "600" },
  settingsSubtitle: { fontFamily: "DroidSerifRegular", fontSize: 12, marginTop: 2, lineHeight: 17 },

  /* ── Premium kart ── */
  premiumActiveCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  premiumGoldTopBar: { height: 3, backgroundColor: "#D4A843" },
  premiumActiveInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 14,
  },
  premiumStatRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  premiumStat: { flex: 1, alignItems: "center", gap: 2 },
  premiumStatDivider: { width: 1, marginVertical: 2 },
  premiumStatValue: { fontSize: 18, fontFamily: "UnnaBold", fontWeight: "600" },
  premiumStatLabel: { fontFamily: "DroidSerifRegular", fontSize: 10, fontWeight: "600", textAlign: "center" },

  /* ── Son oyunlar ── */
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  historyInfo: { flex: 1 },
  historyDate: { fontFamily: "DroidSerifRegular", fontSize: 11 },
  historyResult: { fontFamily: "DroidSerifRegular", fontSize: 14, fontWeight: "600", marginTop: 2 },
  historyStats: { alignItems: "flex-end", gap: 2 },
  historyScore: { fontFamily: "DroidSerifRegular", fontSize: 18, fontWeight: "700" },
  historyMistakes: { fontFamily: "DroidSerifRegular", fontSize: 11 },
});
