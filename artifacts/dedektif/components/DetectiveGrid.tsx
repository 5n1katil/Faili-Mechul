import React, { useCallback } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { GridMark, Suspect, Weapon, Location } from "@/data/puzzles";

interface Props {
  suspects: Suspect[];
  weapons: Weapon[];
  locations: Location[];
  gridState: { [key: string]: GridMark };
  onCellPress: (key: string, current: GridMark) => void;
  disabled?: boolean;
}

function GridCell({
  mark,
  onPress,
  disabled,
}: {
  mark: GridMark;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withTiming(1, { duration: 80 })
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getCellContent = () => {
    if (mark === "check") {
      return <MaterialIcons name="check" size={16} color={colors.success} />;
    }
    if (mark === "cross") {
      return <MaterialIcons name="close" size={14} color={colors.accent} />;
    }
    return null;
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={[
          styles.cell,
          { borderColor: colors.border, backgroundColor: colors.card },
          mark === "check" && { borderColor: colors.success, backgroundColor: "#1a2e1a" },
          mark === "cross" && { borderColor: colors.accent, backgroundColor: "#2e1a1a" },
          animStyle,
        ]}
      >
        {getCellContent()}
      </Animated.View>
    </Pressable>
  );
}

const CELL_SIZE = 34;
const LABEL_WIDTH = 80;
const LABEL_HEIGHT = 28;

export default function DetectiveGrid({
  suspects,
  weapons,
  locations,
  gridState,
  onCellPress,
  disabled,
}: Props) {
  const colors = useColors();

  const cycleNextMark = useCallback((current: GridMark): GridMark => {
    if (current === "none") return "cross";
    if (current === "cross") return "check";
    return "none";
  }, []);

  const getKey = (row: string, col: string) => `${row}_${col}`;

  const renderSectionHeader = (label: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{label}</Text>
    </View>
  );

  const renderColumnHeaders = () => (
    <View style={styles.row}>
      <View style={{ width: LABEL_WIDTH }} />
      {locations.map((loc) => (
        <View
          key={loc.id}
          style={[styles.colHeader, { width: CELL_SIZE, borderColor: colors.border }]}
        >
          <Text style={[styles.colHeaderText, { color: colors.mutedForeground }]} numberOfLines={2}>
            {loc.name}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderRow = (rowId: string, label: string) => (
    <View key={rowId} style={styles.row}>
      <View style={[styles.rowLabel, { width: LABEL_WIDTH }]}>
        <Text style={[styles.rowLabelText, { color: colors.foreground }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
      {locations.map((loc) => {
        const key = getKey(rowId, loc.id);
        const mark = gridState[key] ?? "none";
        return (
          <GridCell
            key={key}
            mark={mark}
            onPress={() => onCellPress(key, cycleNextMark(mark))}
            disabled={disabled}
          />
        );
      })}
    </View>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      <View>
        {renderColumnHeaders()}
        {renderSectionHeader("ŞÜPHELILER")}
        {suspects.map((s) => renderRow(s.id, s.name))}
        {renderSectionHeader("SİLAHLAR")}
        {weapons.map((w) => renderRow(w.id, w.name))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 1,
  },
  colHeader: {
    width: CELL_SIZE,
    height: LABEL_HEIGHT * 2,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    marginHorizontal: 1,
  },
  colHeaderText: {
    fontSize: 9,
    textAlign: "center",
    fontWeight: "600",
  },
  rowLabel: {
    height: CELL_SIZE,
    justifyContent: "center",
    paddingRight: 6,
  },
  rowLabelText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "right",
  },
  sectionHeader: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: LABEL_WIDTH,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
