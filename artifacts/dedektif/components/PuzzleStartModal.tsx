import React from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

const BADGE_IMAGES: Record<string, ImageSourcePropType> = {
  caylak: require("../assets/images/badge_caylak.png"),
  dedektif: require("../assets/images/badge_dedektif.png"),
  baskomiser: require("../assets/images/badge_bas_komiser.png"),
};
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getDifficultyColor, getDifficultyLabel, type Difficulty } from "@/data/puzzles";
import type { Puzzle } from "@/data/puzzles";

function hasFingerprintClue(puzzle: Puzzle): boolean {
  return puzzle.clues.some((c) => c.mechanicType === "parmak_izi");
}

interface Props {
  visible: boolean;
  puzzle: Puzzle;
  isRanked: boolean;
  onStart: () => void;
  onCancel: () => void;
}

export default function PuzzleStartModal({ visible, puzzle, isRanked, onStart, onCancel }: Props) {
  const colors = useColors();
  const diffColor = getDifficultyColor(puzzle.difficulty as Difficulty);
  const diffLabel = getDifficultyLabel(puzzle.difficulty as Difficulty);

  const startScale = useSharedValue(1);
  const startStyle = useAnimatedStyle(() => ({ transform: [{ scale: startScale.value }] }));
  const cancelScale = useSharedValue(1);
  const cancelStyle = useAnimatedStyle(() => ({ transform: [{ scale: cancelScale.value }] }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.85)" }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconRow, { backgroundColor: isRanked ? "#D4A84322" : "#6B728022" }]}>
            <Image
              source={require("../assets/images/icon_detektif_sapka.png")}
              style={{ width: 56, height: 56 }}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {isRanked ? "Cinayet Gizemini Çözmeye\nHazır Mısınız?" : "Antrenman Modunda\nOynuyorsunuz"}
          </Text>

          <View style={[styles.puzzleInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.diffBadge, { backgroundColor: `${diffColor}18`, borderColor: `${diffColor}55`, flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 2 }]}>
              <Image
                source={BADGE_IMAGES[puzzle.difficulty] ?? BADGE_IMAGES.caylak}
                style={{ width: 28, height: 28, marginVertical: -4 }}
                resizeMode="contain"
              />
              <Text style={[styles.diffText, { color: diffColor }]}>{diffLabel}</Text>
            </View>
            <Text style={[styles.puzzleName, { color: colors.foreground }]} numberOfLines={2}>
              {puzzle.title}
            </Text>
          </View>

          <View style={styles.tipBox}>
            <MaterialIcons name="lightbulb-outline" size={16} color="#60A5FA" />
            <Text style={styles.tipText}>
              Unutma! Şüphelilerin her biri tek bir mekana tek bir silah getirmişti, ancak sadece biri katildi...
            </Text>
          </View>

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: isRanked ? "#D4A84312" : "#6B728012",
                borderColor: isRanked ? "#D4A84344" : "#6B728044",
              },
            ]}
          >
            <MaterialIcons
              name={isRanked ? "workspace-premium" : "info-outline"}
              size={16}
              color={isRanked ? "#D4A843" : colors.mutedForeground}
            />
            <Text style={[styles.infoText, { color: isRanked ? "#D4A843" : colors.mutedForeground }]}>
              {isRanked
                ? "İlk oynayışınız! Elde ettiğiniz puan liderlik tablosuna işlenecek."
                : "Bu bulmacayı daha önce çözdünüz. Bu oynayış liderlik sıralamanızı etkilemez."}
            </Text>
          </View>

          {hasFingerprintClue(puzzle) && (
            <View style={styles.fpWarningBox}>
              <MaterialIcons name="fingerprint" size={16} color="#f97316" />
              <Text style={styles.fpWarningText}>
                Bu vakada parmak izi karşılaştırması var. Yanlış eşleşme seçerseniz{" "}
                <Text style={{ fontWeight: "800" }}>−30 saniye</Text> ceza uygulanır (normal hata cezasından farklıdır).
              </Text>
            </View>
          )}

          {isRanked && (
            <Text style={[styles.ruleText, { color: colors.mutedForeground }]}>
              Sadece ilk oynayışınızdan elde ettiğiniz puanlar değerlendirmeye alınır. Daha sonraki oynayışlar kişisel tercihtir ve liderlik sıralamanızı etkilemez.
            </Text>
          )}

          <View style={styles.buttons}>
            {/* ── Oyunu Başlat ── */}
            <Animated.View style={startStyle}>
              <Pressable
                testID="start-game-btn"
                onPress={onStart}
                onPressIn={() => { startScale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
                onPressOut={() => { startScale.value = withSpring(1, { damping: 12, stiffness: 280 }); }}
                style={({ pressed }) => [
                  styles.startBtn,
                  {
                    backgroundColor: pressed
                      ? isRanked ? "#B8922F" : colors.border
                      : isRanked ? "#D4A843" : colors.card,
                    borderColor: isRanked
                      ? pressed ? "#C8A040" : "#D4A843"
                      : colors.border,
                  },
                ]}
              >
                <MaterialIcons
                  name={isRanked ? "play-arrow" : "replay"}
                  size={22}
                  color={isRanked ? "#0F1117" : colors.foreground}
                />
                <Text style={[styles.startBtnText, { color: isRanked ? "#0F1117" : colors.foreground }]}>
                  {isRanked ? "Oyunu Başlat" : "Oynamaya Devam Et"}
                </Text>
              </Pressable>
            </Animated.View>

            {/* ── Geri Dön ── */}
            <Animated.View style={cancelStyle}>
              <Pressable
                onPress={() => {
                  cancelScale.value = withSpring(0.96, { damping: 18, stiffness: 500 });
                  onCancel();
                }}
                onPressIn={() => { cancelScale.value = withSpring(0.95, { damping: 18, stiffness: 500 }); }}
                onPressOut={() => { cancelScale.value = withSpring(1, { damping: 14, stiffness: 320 }); }}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    backgroundColor: pressed ? "#FFFFFF0E" : "#FFFFFF08",
                    borderColor: pressed ? "#FFFFFF30" : "#FFFFFF18",
                  },
                ]}
              >
                <MaterialIcons name="chevron-left" size={18} color={colors.foreground} />
                <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Geri Dön</Text>
              </Pressable>
            </Animated.View>
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
    padding: 24,
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
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "UnnaBold",
    fontSize: 20,
    textAlign: "center",
    lineHeight: 28,
  },
  puzzleInfo: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  diffBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  diffText: { fontFamily: "DroidSerifRegular", fontSize: 11, fontWeight: "700" },
  puzzleName: { fontFamily: "DroidSerifRegular", fontSize: 14, fontWeight: "600", lineHeight: 20 },
  tipBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#60A5FA44",
    backgroundColor: "#1E3A5F",
    padding: 12,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    lineHeight: 19,
    color: "#93C5FD",
  },
  infoBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    lineHeight: 19,
  },
  ruleText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  fpWarningBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f9731644",
    backgroundColor: "#1a100088",
    padding: 12,
    gap: 8,
  },
  fpWarningText: {
    flex: 1,
    fontFamily: "DroidSerifRegular",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    color: "#fdba74",
  },
  buttons: { width: "100%", gap: 10 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 15,
    gap: 8,
  },
  startBtnText: { fontFamily: "UnnaBold", fontSize: 17, fontWeight: "700" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  cancelBtnText: { fontFamily: "DroidSerifRegular", fontSize: 15, fontWeight: "600" },
});
