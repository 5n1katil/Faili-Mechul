import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  isRanked: boolean;
  onContinue: () => void;
  onExit: () => void;
}

export default function ExitConfirmSheet({ visible, isRanked, onContinue, onExit }: Props) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onContinue}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.75)" }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconRow, { backgroundColor: "#C8372D22" }]}>
            <MaterialIcons name="exit-to-app" size={30} color="#C8372D" />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {isRanked ? "Oyundan Çıkış Yapıyorsunuz" : "Antrenman Modundan\nÇıkış Yapıyorsunuz"}
          </Text>

          {isRanked ? (
            <View style={[styles.warningBox, { backgroundColor: "#C8372D12", borderColor: "#C8372D44" }]}>
              <MaterialIcons name="warning-amber" size={16} color="#C8372D" />
              <Text style={[styles.warningText, { color: "#C8372D" }]}>
                Ayrılırsanız bu oynayıştan elde edebileceğiniz puan geçersiz olur ve liderlik sıralamanız etkilenmez.
              </Text>
            </View>
          ) : (
            <View style={[styles.warningBox, { backgroundColor: "#6B728012", borderColor: "#6B728044" }]}>
              <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
                Bu oynayış zaten puansız modda, liderlik tablosunu etkilemez.
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [
                styles.continueBtn,
                { backgroundColor: "#D4A843", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <MaterialIcons name="play-arrow" size={18} color="#0F1117" />
              <Text style={[styles.continueBtnText, { color: "#0F1117" }]}>Devam Et</Text>
            </Pressable>

            <Pressable
              onPress={onExit}
              style={({ pressed }) => [
                styles.exitBtn,
                { borderColor: "#C8372D55", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.exitBtnText, { color: "#C8372D" }]}>Çık</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  sheet: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  iconRow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "DroidSerifRegular",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  warningBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  buttons: { width: "100%", gap: 10 },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  continueBtnText: { fontFamily: "DroidSerifRegular", fontSize: 15, fontWeight: "800" },
  exitBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  exitBtnText: { fontFamily: "DroidSerifRegular", fontSize: 14, fontWeight: "700" },
});
