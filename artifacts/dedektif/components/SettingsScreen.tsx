import React, { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { unlockMusicFromGesture } from "@/utils/backgroundMusic";
import {
  bumpMusicPlayback,
  DEFAULT_VOLUME,
  soundSettings,
  subscribeSoundSettings,
  type VolumeStep,
} from "@/utils/soundSettings";
import VolumeStepControl from "@/components/VolumeStepControl";

import PaywallModal from "@/components/PaywallModal";
import { usePurchase } from "@/context/PurchaseContext";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

interface Props {
  visible: boolean;
  onClose: () => void;
}

function SectionHeader({
  icon,
  label,
  iconColor,
}: {
  icon: MaterialIconName;
  label: string;
  iconColor?: string;
}) {
  const colors = useColors();
  const accent = iconColor ?? colors.primary;
  return (
    <View style={styles.sectionHeader}>
      <MaterialIcons name={icon} size={20} color={accent} />
      <Text style={[styles.sectionLabel, { color: accent }]}>{label}</Text>
      <View style={[styles.sectionLine, { backgroundColor: `${accent}40` }]} />
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  hasDivider,
}: {
  icon: MaterialIconName;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  hasDivider?: boolean;
}) {
  const colors = useColors();
  const inner = (
    <View
      style={[
        styles.settingsRowInner,
        hasDivider && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.settingsIcon, { backgroundColor: `${colors.primary}18` }]}>
        <MaterialIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingsInfo}>
        <Text style={[styles.settingsTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.settingsSubtitle, { color: colors.secondaryForeground }]}>
            {subtitle}
          </Text>
        ) : null}
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

const PRIVACY_ITEMS = [
  { key: "showStats" as const, label: "İstatistiklerimi göster", icon: "bar-chart" as const },
  { key: "showBadges" as const, label: "Rozetlerimi göster", icon: "military-tech" as const },
  { key: "showBio" as const, label: "Bio'mu göster", icon: "person" as const },
  { key: "showAvatar" as const, label: "Avatarımı göster", icon: "face" as const },
];

export default function SettingsScreen({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useGame();
  const { isPremium, priceString, restorePurchases } = usePurchase();

  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [mainVolume, setMainVolume] = useState<VolumeStep>(DEFAULT_VOLUME);
  const [caseVolume, setCaseVolume] = useState<VolumeStep>(DEFAULT_VOLUME);
  const [audioReady, setAudioReady] = useState(false);

  const [showPaywall, setShowPaywall] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const syncFromSettings = () => {
    setSfxEnabled(soundSettings.sfxEnabled);
    setMainVolume(soundSettings.mainMusicVolume);
    setCaseVolume(soundSettings.caseMusicVolume);
  };

  useEffect(() => {
    if (!visible) {
      setAudioReady(false);

      setShowPaywall(false);
      return;
    }
    void soundSettings.refresh().then(() => {
      syncFromSettings();
      setAudioReady(true);
    });
    return subscribeSoundSettings(syncFromSettings);
  }, [visible]);

  const handleMainVolume = (v: VolumeStep) => {
    const wasMuted = mainVolume === 0;
    soundSettings.mainMusicVolume = v;
    setMainVolume(v);
    if (wasMuted && v > 0) {
      unlockMusicFromGesture();
      bumpMusicPlayback();
    }
  };

  const handleCaseVolume = (v: VolumeStep) => {
    const wasMuted = caseVolume === 0;
    soundSettings.caseMusicVolume = v;
    setCaseVolume(v);
    if (wasMuted && v > 0) {
      unlockMusicFromGesture();
      bumpMusicPlayback();
    }
  };

  const handleSfxToggle = (val: boolean) => {
    soundSettings.sfxEnabled = val;
    setSfxEnabled(val);
  };

  const handlePrivacyToggle = (key: (typeof PRIVACY_ITEMS)[number]["key"], val: boolean) => {
    updateProfile({ privacySettings: { ...profile.privacySettings, [key]: val } });
  };

  const handleRestore = async () => {
    setRestoring(true);
    setRestoreMsg(null);
    const result = await restorePurchases();
    setRestoring(false);
    setRestoreMsg({ text: result.message, ok: result.success });
  };

  const settingsModalOpen = visible && !showPaywall;

  return (
    <>
      <Modal
        visible={settingsModalOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.background,
              paddingTop: Platform.OS === "web" ? 67 : insets.top,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerBtn} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ayarlar</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.headerCloseBtn,
                pressed && { opacity: 0.65, transform: [{ scale: 0.88 }] },
              ]}
            >
              <MaterialIcons name="close" size={26} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Ses Ayarları */}
            <SectionHeader icon="volume-up" label="SES AYARLARI" />

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardPad}>
                <VolumeStepControl
                  label="Ana Arka Plan Müziği"
                  subtitle="Menü ve vaka listesinde çalar"
                  value={audioReady ? mainVolume : DEFAULT_VOLUME}
                  onChange={handleMainVolume}
                />
              </View>
              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
              <View style={styles.cardPad}>
                <VolumeStepControl
                  label="Vaka Arka Plan Müziği"
                  subtitle="Oyun başladığında, daha kısık sesle"
                  value={audioReady ? caseVolume : DEFAULT_VOLUME}
                  onChange={handleCaseVolume}
                />
              </View>
              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
              <SettingsRow
                icon="graphic-eq"
                title="Ses Efektleri"
                subtitle="Dedektif ızgarası ve oyun sesleri"
                right={
                  <Switch
                    value={sfxEnabled}
                    onValueChange={handleSfxToggle}
                    trackColor={{ false: colors.border, true: `${colors.primary}88` }}
                    thumbColor={sfxEnabled ? colors.primary : colors.mutedForeground}
                  />
                }
              />
            </View>

            {/* Profil gizlilik */}
            <SectionHeader icon="shield" label="PROFİL GİZLİLİK AYARLARI" />

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {PRIVACY_ITEMS.map((item, idx, arr) => (
                <SettingsRow
                  key={item.key}
                  icon={item.icon}
                  title={item.label}
                  hasDivider={idx < arr.length - 1}
                  right={
                    <Switch
                      value={profile.privacySettings?.[item.key] ?? true}
                      onValueChange={(val) => handlePrivacyToggle(item.key, val)}
                      trackColor={{ false: colors.border, true: `${colors.primary}88` }}
                      thumbColor={
                        (profile.privacySettings?.[item.key] ?? true)
                          ? colors.primary
                          : colors.mutedForeground
                      }
                    />
                  }
                />
              ))}
            </View>

            {/* Premium — en alt */}
            <SectionHeader icon="local-police" label="PREMİUM" iconColor="#D4A843" />

            {isPremium ? (
              <View
                style={[
                  styles.card,
                  styles.premiumActive,
                  { backgroundColor: "#D4A84314", borderColor: "#D4A843" },
                ]}
              >
                <MaterialIcons name="verified" size={22} color="#D4A843" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingsTitle, { color: "#D4A843" }]}>
                    Premium Vaka Arşivi aktif
                  </Text>
                  <Text style={[styles.settingsSubtitle, { color: "#D4A84399" }]}>
                    Tüm vakalar açık
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setShowPaywall(true)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: "#D4A84310",
                      borderColor: "#D4A84355",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <SettingsRow
                    icon="lock-open"
                    title="Premium Vaka Arşivini Aç"
                    subtitle={`Tüm vakalar · Tek seferlik · ${priceString}`}
                    right={<MaterialIcons name="chevron-right" size={22} color="#D4A843" />}
                  />
                </Pressable>

                <Pressable
                  onPress={handleRestore}
                  disabled={restoring}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: restoring || pressed ? 0.7 : 1,
                      marginTop: 8,
                    },
                  ]}
                >
                  <View style={styles.settingsRowInner}>
                    <View style={[styles.settingsIcon, { backgroundColor: `${colors.primary}18` }]}>
                      {restoring ? (
                        <ActivityIndicator size="small" color={colors.mutedForeground} />
                      ) : (
                        <MaterialIcons name="restore" size={20} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.settingsInfo}>
                      <Text style={[styles.settingsTitle, { color: colors.foreground }]}>
                        Satın Almalarımı Geri Yükle
                      </Text>
                      {restoreMsg ? (
                        <Text
                          style={[
                            styles.settingsSubtitle,
                            { color: restoreMsg.ok ? colors.success : colors.accent },
                          ]}
                        >
                          {restoreMsg.text}
                        </Text>
                      ) : (
                        <Text style={[styles.settingsSubtitle, { color: colors.secondaryForeground }]}>
                          Önceki satın almayı geri yükle
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <PaywallModal
        visible={visible && showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCloseBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "UnnaBold", fontWeight: "600" },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
  },
  sectionLabel: { fontSize: 15, fontFamily: "UnnaBold", fontWeight: "700", letterSpacing: 1.6 },
  sectionLine: { flex: 1, height: 1.5 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardPad: { padding: 14 },
  cardDivider: { height: 1, marginHorizontal: 14 },
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
  premiumActive: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
});
