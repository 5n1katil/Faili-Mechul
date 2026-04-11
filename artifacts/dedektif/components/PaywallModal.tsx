import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { usePurchase } from "@/context/PurchaseContext";
import { useColors } from "@/hooks/useColors";

const PRIVACY_URL = "https://failimechul.app/gizlilik";
const TERMS_URL = "https://failimechul.app/kullanim-sartlari";

interface Props {
  visible: boolean;
  onClose: () => void;
  premiumPuzzleCount?: number;
}

function makeFeatures(count: number) {
  return [
    {
      icon: "folder-open" as const,
      label: `${count} Premium Vaka`,
      text: "Çaylak'tan Baş Komiser'e kadar tüm zorluk seviyelerinde özgün bulmacalar",
    },
    {
      icon: "refresh" as const,
      label: "Otomatik Erişim",
      text: "Yeni vakalar çıktıkça otomatik olarak kilidini açar — ek ödeme yok",
    },
    {
      icon: "emoji-events" as const,
      label: "Baş Dedektif Rozeti",
      text: "Liderlik tablosunda 🔱 altın Baş Dedektif ünvanı ve özel rozet",
    },
    {
      icon: "trending-up" as const,
      label: "İlerleme Takibi",
      text: "Kişisel istatistikler ve zorluk bazlı performans geçmişi",
    },
    {
      icon: "all-inclusive" as const,
      label: "Tek Seferlik Ödeme",
      text: "Abonelik yok, süre sınırı yok — bir kez öde, sonsuza kadar oyna",
    },
    {
      icon: "devices" as const,
      label: "Tüm Cihazlar",
      text: "Aynı Apple ID / Google hesabıyla iPhone, iPad ve Android'de geçerli",
    },
    {
      icon: "support-agent" as const,
      label: "Öncelikli Destek",
      text: "Doğrudan geliştirici desteği ve yeni vakalara erken erişim",
    },
  ];
}

export default function PaywallModal({ visible, onClose, premiumPuzzleCount = 19 }: Props) {
  const colors = useColors();
  const { purchaseVacaArsivi, restorePurchases, isLoading, priceString } = usePurchase();
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const FEATURES = makeFeatures(premiumPuzzleCount);

  const handlePurchase = async () => {
    setBuying(true);
    setMessage(null);
    const result = await purchaseVacaArsivi();
    setBuying(false);
    setMessage({ text: result.message, ok: result.success });
    if (result.success) {
      setTimeout(() => onClose(), 1200);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setMessage(null);
    const result = await restorePurchases();
    setRestoring(false);
    setMessage({ text: result.message, ok: result.success });
    if (result.success) {
      setTimeout(() => onClose(), 1200);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          >
            <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}44` }]}>
              <MaterialIcons name="local-police" size={44} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>Premium Vaka Arşivi</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Baş Dedektif koltuğuna otur — {premiumPuzzleCount} premium vaka seni bekliyor
            </Text>

            <View style={[styles.priceBox, { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}0A` }]}>
              {isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ height: 42 }} />
              ) : (
                <Text style={[styles.price, { color: colors.primary }]}>{priceString}</Text>
              )}
              <Text style={[styles.priceNote, { color: colors.mutedForeground }]}>
                Tek seferlik · Ömür boyu erişim · Abonelik yok
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <MaterialIcons name="star" size={15} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>NE KAZANİYORSUNUZ?</Text>
            </View>

            <View style={[styles.featureList, { borderColor: colors.border }]}>
              {FEATURES.map((f, i) => (
                <View
                  key={i}
                  style={[
                    styles.featureRow,
                    i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}18` }]}>
                    <MaterialIcons name={f.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text style={[styles.featureLabel, { color: colors.foreground }]}>{f.label}</Text>
                    <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f.text}</Text>
                  </View>
                </View>
              ))}
            </View>

            {message && (
              <View
                style={[
                  styles.messageBox,
                  {
                    backgroundColor: message.ok ? `${colors.success}18` : `#C8372D18`,
                    borderColor: message.ok ? `${colors.success}55` : `#C8372D55`,
                  },
                ]}
              >
                <MaterialIcons
                  name={message.ok ? "check-circle" : "error"}
                  size={16}
                  color={message.ok ? colors.success : "#C8372D"}
                />
                <Text style={[styles.messageText, { color: message.ok ? colors.success : "#C8372D" }]}>
                  {message.text}
                </Text>
              </View>
            )}

            <Pressable
              onPress={handlePurchase}
              disabled={buying || restoring || isLoading}
              style={({ pressed }) => [
                styles.buyBtn,
                { backgroundColor: colors.primary, opacity: (buying || restoring || isLoading || pressed) ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Vaka Arşivini satın al — ${priceString}`}
            >
              {buying ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <MaterialIcons name="lock-open" size={20} color={colors.primaryForeground} />
                  <Text style={[styles.buyBtnText, { color: colors.primaryForeground }]}>
                    Vaka Arşivini Aç — {priceString}
                  </Text>
                </>
              )}
            </Pressable>

            <View style={styles.legalRow}>
              <Pressable
                onPress={() => Linking.openURL(PRIVACY_URL)}
                accessibilityRole="link"
                accessibilityLabel="Gizlilik Politikası"
                hitSlop={8}
              >
                <Text style={[styles.legalLink, { color: colors.mutedForeground }]}>
                  Gizlilik Politikası
                </Text>
              </Pressable>
              <Text style={[styles.legalSep, { color: colors.mutedForeground }]}>·</Text>
              <Pressable
                onPress={() => Linking.openURL(TERMS_URL)}
                accessibilityRole="link"
                accessibilityLabel="Kullanım Şartları"
                hitSlop={8}
              >
                <Text style={[styles.legalLink, { color: colors.mutedForeground }]}>
                  Kullanım Şartları
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleRestore}
              disabled={buying || restoring || isLoading}
              style={({ pressed }) => [
                styles.restoreBtn,
                { borderColor: colors.border, opacity: (buying || restoring || pressed) ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Önceki satın almalarımı geri yükle"
            >
              {restoring ? (
                <ActivityIndicator color={colors.mutedForeground} size="small" />
              ) : (
                <Text style={[styles.restoreBtnText, { color: colors.mutedForeground }]}>
                  Satın almalarımı geri yükle
                </Text>
              )}
            </Pressable>

            <Text style={[styles.legalNote, { color: colors.mutedForeground }]}>
              Ödeme, satın alma onaylanınca Apple ID hesabınıza borç alınır. Abonelik bulunmamaktadır.
              Aynı Apple ID ile tüm cihazlarınızda kullanabilirsiniz.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "92%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 24,
    gap: 14,
    alignItems: "center",
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  priceBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  price: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  priceNote: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  featureList: {
    width: "100%",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  featureTextWrap: {
    flex: 1,
    gap: 2,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  featureText: {
    fontSize: 12,
    lineHeight: 17,
  },
  messageBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  buyBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
  },
  buyBtnText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  restoreBtn: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  legalSep: {
    fontSize: 12,
  },
  legalNote: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 4,
  },
});
