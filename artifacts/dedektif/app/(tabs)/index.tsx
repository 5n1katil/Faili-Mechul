import React, { useEffect, useRef } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import {
  getDailyPuzzle,
  getDifficultyColor,
  getDifficultyLabel,
  PUZZLES,
  type Difficulty,
} from "@/data/puzzles";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  FadeInDown,
} from "react-native-reanimated";

function PuzzleCard({
  puzzle,
  onPress,
  delay,
}: {
  puzzle: (typeof PUZZLES)[0];
  onPress: () => void;
  delay: number;
}) {
  const colors = useColors();
  const diffColor = getDifficultyColor(puzzle.difficulty as Difficulty);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.puzzleCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={styles.puzzleCardTop}>
          <View style={[styles.diffBadge, { backgroundColor: `${diffColor}22`, borderColor: `${diffColor}66` }]}>
            <Text style={[styles.diffText, { color: diffColor }]}>
              {getDifficultyLabel(puzzle.difficulty as Difficulty)}
            </Text>
          </View>
          <View style={styles.puzzleCardMeta}>
            <MaterialIcons name="person" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {puzzle.suspects.length} şüpheli
            </Text>
          </View>
        </View>
        <Text style={[styles.puzzleTitle, { color: colors.foreground }]} numberOfLines={2}>
          {puzzle.title}
        </Text>
        <Text style={[styles.puzzleStory, { color: colors.mutedForeground }]} numberOfLines={2}>
          {puzzle.story}
        </Text>
        <View style={[styles.playRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.playText, { color: colors.primary }]}>Oynamak için dokun</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, gameHistory, startDailyPuzzle, startPuzzle } = useGame();

  const dailyPuzzle = getDailyPuzzle();
  const todayStr = new Date().toISOString().split("T")[0];
  const playedToday = gameHistory.some((h) => h.date === todayStr);
  const otherPuzzles = PUZZLES.filter((p) => p.id !== dailyPuzzle.id).slice(0, 6);

  const handleDailyPlay = () => {
    startDailyPuzzle();
    router.push("/oyun");
  };

  const handlePuzzlePlay = (puzzle: (typeof PUZZLES)[0]) => {
    startPuzzle(puzzle);
    router.push("/oyun");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? 67 + 20 : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(0).springify()}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greetingSmall, { color: colors.mutedForeground }]}>
              Merhaba, {profile.name}
            </Text>
            <Text style={[styles.appTitle, { color: colors.primary }]}>
              Dedektif
            </Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="local-fire-department" size={20} color="#FF6B35" />
            <Text style={[styles.streakText, { color: colors.foreground }]}>
              {profile.currentStreak}
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Pressable
          onPress={handleDailyPlay}
          style={[
            styles.dailyCard,
            { backgroundColor: colors.card, borderColor: colors.primary },
            playedToday && { opacity: 0.7 },
          ]}
        >
          <View style={styles.dailyTop}>
            <View style={[styles.dailyBadge, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="today" size={12} color={colors.primaryForeground} />
              <Text style={[styles.dailyBadgeText, { color: colors.primaryForeground }]}>
                GÜNÜN BULMACASI
              </Text>
            </View>
            {playedToday && (
              <View style={[styles.doneBadge, { backgroundColor: `${colors.success}22` }]}>
                <MaterialIcons name="check-circle" size={14} color={colors.success} />
                <Text style={[styles.doneText, { color: colors.success }]}>Tamamlandı</Text>
              </View>
            )}
          </View>
          <Text style={[styles.dailyTitle, { color: colors.foreground }]}>{dailyPuzzle.title}</Text>
          <Text style={[styles.dailyStory, { color: colors.mutedForeground }]} numberOfLines={3}>
            {dailyPuzzle.story}
          </Text>
          <View style={[styles.dailyFooter, { borderTopColor: colors.border }]}>
            <View style={[styles.diffBadge, { backgroundColor: `${getDifficultyColor(dailyPuzzle.difficulty as Difficulty)}22`, borderColor: `${getDifficultyColor(dailyPuzzle.difficulty as Difficulty)}66` }]}>
              <Text style={[styles.diffText, { color: getDifficultyColor(dailyPuzzle.difficulty as Difficulty) }]}>
                {getDifficultyLabel(dailyPuzzle.difficulty as Difficulty)}
              </Text>
            </View>
            <View style={styles.playNowBtn}>
              <Text style={[styles.playNowText, { color: colors.primary }]}>
                {playedToday ? "Tekrar Oyna" : "Oyna"}
              </Text>
              <MaterialIcons name="play-circle-filled" size={22} color={colors.primary} />
            </View>
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <View style={[styles.statsRow]}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{profile.gamesWon}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Çözülen</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{profile.totalScore}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Toplam Puan</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: "#FF6B35" }]}>{profile.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Seri</Text>
          </View>
        </View>
      </Animated.View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Diğer Bulmacalar</Text>
      {otherPuzzles.map((puzzle, i) => (
        <PuzzleCard
          key={puzzle.id}
          puzzle={puzzle}
          onPress={() => handlePuzzlePlay(puzzle)}
          delay={300 + i * 60}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  greetingSmall: { fontSize: 13, fontWeight: "500" },
  appTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 6,
  },
  streakText: { fontSize: 18, fontWeight: "700" },
  dailyCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 10,
  },
  dailyTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  dailyBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  dailyBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  doneText: { fontSize: 11, fontWeight: "600" },
  dailyTitle: { fontSize: 18, fontWeight: "700", lineHeight: 24 },
  dailyStory: { fontSize: 13, lineHeight: 20 },
  dailyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  playNowBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  playNowText: { fontSize: 15, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  puzzleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  puzzleCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  puzzleCardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  diffBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  diffText: { fontSize: 11, fontWeight: "700" },
  puzzleTitle: { fontSize: 15, fontWeight: "700", lineHeight: 22 },
  puzzleStory: { fontSize: 12, lineHeight: 18 },
  playRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  playText: { fontSize: 13, fontWeight: "600" },
});
