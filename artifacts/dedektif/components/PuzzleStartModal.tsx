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
import { getDifficultyColor, getDifficultyLabel, type Difficulty } from "@/data/puzzles";
import type { Puzzle } from "@/data/puzzles";

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.85)" }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconRow, { backgroundColor: isRanked ? "#D4A84322" : "#6B728022" }]}>
            <MaterialIcons
              name={isRanked ? "emoji-events" : "fitness-center"}
              size={36}
              color={isRanked ? "#D4A843" : colors.mutedForeground}
            />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {isRanked ? "Cinayet Gizemini Çözmeye\nHazır Mısınız?" : "Tekrar Oynuyorsunuz"}
          </Text>

          <View style={[styles.puzzleInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.diffBadge, { backgroundColor: `${diffColor}22`, borderColor: `${diffColor}55` }]}>
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

          {isRanked && (
            <Text style={[styles.ruleText, { color: colors.mutedForeground }]}>
              Sadece ilk oynayışınızdan elde ettiğiniz puanlar değerlendirmeye alınır. Daha sonraki oynayışlar kişisel tercihtir ve liderlik sıralamanızı etkilemez.
            </Text>
          )}

          <View style={styles.buttons}>
            <Pressable
              testID="start-game-btn"
              onPress={onStart}
              style={({ pressed }) => [
                styles.startBtn,
                {
                  backgroundColor: isRanked ? "#D4A843" : colors.card,
                  borderColor: isRanked ? "#D4A843" : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <MaterialIcons
                name={isRanked ? "play-arrow" : "replay"}
                size={20}
                color={isRanked ? "#0F1117" : colors.foreground}
              />
              <Text style={[styles.startBtnText, { color: isRanked ? "#0F1117" : colors.foreground }]}>
                {isRanked ? "Oyunu Başlat" : "Oynamaya Devam Et"}
              </Text>
            </Pressable>

            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Geri Dön</Text>
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
    fontSize: 20,
    fontWeight: "800",
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
  diffText: { fontSize: 11, fontWeight: "700" },
  puzzleName: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
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
    fontSize: 13,
    fontWeight: "600",
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
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  ruleText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  buttons: { width: "100%", gap: 10 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    gap: 8,
  },
  startBtnText: { fontSize: 15, fontWeight: "800" },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600" },
});
