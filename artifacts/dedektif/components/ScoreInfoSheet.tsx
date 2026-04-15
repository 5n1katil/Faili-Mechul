import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Row {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  label: string;
  formula: string;
  note?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ScoreInfoSheet({ visible, onClose }: Props) {
  const colors = useColors();

  const rows: Row[] = [
    {
      icon: "stars",
      iconColor: colors.primary,
      label: "Baz Puan",
      formula: "+10.000",
      note: "Her bulmaca bu puanla başlar",
    },
    {
      icon: "timer",
      iconColor: "#C8372D",
      label: "Süre Cezası",
      formula: "−10 puan / saniye",
      note: "Hızlı çözdükçe daha az puan kaybedersin",
    },
    {
      icon: "gavel",
      iconColor: "#C8372D",
      label: "Yanlış Tahmin",
      formula: "−500 puan + 30 sn",
      note: "Her yanlış tahmin hem puan hem süre cezası",
    },
    {
      icon: "lock-open",
      iconColor: "#f97316",
      label: "Ek İpucu",
      formula: "−300 puan + 30 sn",
      note: "Kilitli ipuçları açmak ekstra ceza getirir",
    },
    {
      icon: "upgrade",
      iconColor: "#4ade80",
      label: "Zorluk Bonusu",
      formula: "Dedektif: +2.000\nBaşkomiser: +5.000",
      note: "Zor bulmacalar ekstra puan verir",
    },
    {
      icon: "local-fire-department",
      iconColor: "#FF6B35",
      label: "Seri Bonusu",
      formula: "+50 puan × seri (maks. +500)",
      note: "Üst üste gün oynayarak seri bonusu kazan",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.header}>
          <MaterialIcons name="info-outline" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Puan Nasıl Hesaplanır?</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {rows.map((row, i) => (
            <View
              key={i}
              style={[styles.row, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${row.iconColor}18` }]}>
                <MaterialIcons name={row.icon} size={20} color={row.iconColor} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{row.label}</Text>
                <Text style={[styles.rowFormula, { color: row.iconColor }]}>{row.formula}</Text>
                {row.note && (
                  <Text style={[styles.rowNote, { color: colors.mutedForeground }]}>{row.note}</Text>
                )}
              </View>
            </View>
          ))}

          <View style={[styles.finalRow, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}33` }]}>
            <MaterialIcons name="emoji-events" size={18} color={colors.primary} />
            <Text style={[styles.finalText, { color: colors.primary }]}>
              Toplam = Baz + Zorluk + Seri − Süre − Yanlış − İpucu{"\n"}
              <Text style={[styles.finalSub, { color: colors.mutedForeground }]}>Minimum 100 puan garantisi</Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  rowFormula: { fontSize: 13, fontWeight: "800", marginBottom: 3 },
  rowNote: { fontSize: 11, lineHeight: 16 },
  finalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  finalText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 20 },
  finalSub: { fontSize: 11, fontWeight: "500" },
});
