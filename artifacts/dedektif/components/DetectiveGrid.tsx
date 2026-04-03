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
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { GridMark, Suspect, Weapon, Location } from "@/data/puzzles";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import type { ComponentProps } from "react";

interface Props {
  suspects: Suspect[];
  weapons: Weapon[];
  locations: Location[];
  gridState: { [key: string]: GridMark };
  onCellPress: (key: string, current: GridMark) => void;
  disabled?: boolean;
  onHeaderPress?: (entity: EntityInfo) => void;
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
      withSpring(0.78, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getCellContent = () => {
    if (mark === "check") {
      return (
        <MaterialIcons name="check" size={18} color="#4ade80" />
      );
    }
    if (mark === "cross") {
      return (
        <MaterialIcons name="close" size={16} color="#f87171" />
      );
    }
    return (
      <Text style={styles.questionMark}>?</Text>
    );
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={[
          styles.cell,
          { borderColor: colors.border, backgroundColor: colors.background },
          mark === "check" && { borderColor: "#4ade8060", backgroundColor: "#052e16" },
          mark === "cross" && { borderColor: "#f8717160", backgroundColor: "#2d0e0e" },
          animStyle,
        ]}
      >
        {getCellContent()}
      </Animated.View>
    </Pressable>
  );
}

function HeaderAvatar({
  icon,
  name,
  color,
  bg,
  onPress,
}: {
  icon: string;
  name: string;
  color: string;
  bg: string;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!onPress) return;
    scale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withTiming(1, { duration: 80 })
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable onPress={onPress ? handlePress : undefined}>
      <Animated.View style={[styles.colHeaderInner, { width: CELL_SIZE }, animStyle]}>
        <View style={[styles.avatarCircle, { backgroundColor: bg, borderColor: color + "60" }]}>
          <MaterialIcons
            name={icon as ComponentProps<typeof MaterialIcons>["name"]}
            size={14}
            color={color}
          />
        </View>
        <Text style={[styles.colHeaderText, { color: color }]} numberOfLines={2}>
          {name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const CELL_SIZE = 40;
const LABEL_WIDTH = 100;

export default function DetectiveGrid({
  suspects,
  weapons,
  locations,
  gridState,
  onCellPress,
  disabled,
  onHeaderPress,
}: Props) {
  const colors = useColors();

  const cycleNextMark = useCallback((current: GridMark): GridMark => {
    if (current === "none") return "cross";
    if (current === "cross") return "check";
    return "none";
  }, []);

  const getKey = (row: string, col: string) => `${row}_${col}`;

  const renderSectionHeader = (label: string, accentColor: string) => (
    <View
      style={[
        styles.sectionHeader,
        { backgroundColor: colors.card, borderColor: accentColor + "60", borderLeftColor: accentColor },
      ]}
    >
      <Text style={[styles.sectionHeaderText, { color: accentColor }]}>{label}</Text>
    </View>
  );

  const renderColumnHeaders = () => (
    <View style={styles.row}>
      <View style={{ width: LABEL_WIDTH }} />
      {locations.map((loc) => (
        <HeaderAvatar
          key={loc.id}
          icon={loc.icon}
          name={loc.name}
          color="#D4A843"
          bg="#2A1E0840"
          onPress={
            onHeaderPress
              ? () =>
                  onHeaderPress({
                    type: "location",
                    id: loc.id,
                    name: loc.name,
                    description: loc.description,
                    icon: loc.icon,
                  })
              : undefined
          }
        />
      ))}
    </View>
  );

  const renderRow = (
    rowId: string,
    label: string,
    icon: string,
    description: string,
    entityType: "suspect" | "weapon"
  ) => {
    const color = entityType === "suspect" ? "#A855F7" : "#C8372D";
    const bg = entityType === "suspect" ? "#1E1030" : "#2E1010";

    return (
      <View key={rowId} style={styles.row}>
        <Pressable
          style={[styles.rowLabel, { width: LABEL_WIDTH }]}
          onPress={
            onHeaderPress
              ? () =>
                  onHeaderPress({
                    type: entityType,
                    id: rowId,
                    name: label,
                    description,
                    icon,
                  })
              : undefined
          }
        >
          <View style={[styles.rowAvatarCircle, { backgroundColor: bg, borderColor: color + "50" }]}>
            <MaterialIcons
              name={icon as ComponentProps<typeof MaterialIcons>["name"]}
              size={12}
              color={color}
            />
          </View>
          <Text style={[styles.rowLabelText, { color: colors.foreground }]} numberOfLines={2}>
            {label}
          </Text>
        </Pressable>
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
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      <View>
        {renderColumnHeaders()}
        {renderSectionHeader("ŞÜPHELILER", "#A855F7")}
        {suspects.map((s) =>
          renderRow(s.id, s.name, s.icon, s.description, "suspect")
        )}
        {renderSectionHeader("SİLAHLAR", "#C8372D")}
        {weapons.map((w) =>
          renderRow(w.id, w.name, w.icon, w.description, "weapon")
        )}
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
    marginBottom: 3,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  questionMark: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    lineHeight: 18,
  },
  colHeaderInner: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
    marginHorizontal: 2,
    height: 76,
    gap: 4,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  colHeaderText: {
    fontSize: 8,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 0.3,
    lineHeight: 11,
  },
  rowLabel: {
    height: CELL_SIZE,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
    gap: 6,
  },
  rowAvatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowLabelText: {
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
    lineHeight: 13,
  },
  sectionHeader: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginLeft: LABEL_WIDTH,
  },
  sectionHeaderText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
});
