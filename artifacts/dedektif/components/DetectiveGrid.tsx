import React, { useCallback, useEffect, useRef } from "react";
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
  interpolateColor,
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

const SUSPECT_COLOR = "#A855F7";
const WEAPON_COLOR = "#C8372D";
const LOCATION_COLOR = "#D4A843";

const SUSPECT_BG = "#1E103080";
const WEAPON_BG = "#2E101080";
const LOCATION_BG = "#2A1E0880";

const CELL_SIZE = 46;
const CELL_MARGIN = 3;
const CELL_TOTAL = CELL_SIZE + CELL_MARGIN * 2;
const LABEL_WIDTH = 112;
const GROUP_DIVIDER_WIDTH = 2;

interface Props {
  suspects: Suspect[];
  weapons: Weapon[];
  locations: Location[];
  gridState: { [key: string]: GridMark };
  onCellPress: (key: string, current: GridMark) => void;
  disabled?: boolean;
  onHeaderPress?: (entity: EntityInfo) => void;
}

function getMarkColors(mark: GridMark, neutralBg: string, neutralBorder: string) {
  if (mark === "check") return { bg: "#052e16", border: "#4ade8060" };
  if (mark === "cross") return { bg: "#2d0e0e", border: "#f8717160" };
  return { bg: neutralBg, border: neutralBorder };
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
  const colorProgress = useSharedValue(1);
  const initialColors = getMarkColors(mark, colors.background, colors.border);
  const fromBg = useSharedValue(initialColors.bg);
  const toBg = useSharedValue(initialColors.bg);
  const fromBd = useSharedValue(initialColors.border);
  const toBd = useSharedValue(initialColors.border);
  const prevMarkRef = useRef<GridMark>(mark);

  useEffect(() => {
    if (mark !== prevMarkRef.current) {
      const from = getMarkColors(prevMarkRef.current, colors.background, colors.border);
      const to = getMarkColors(mark, colors.background, colors.border);
      fromBg.value = from.bg;
      toBg.value = to.bg;
      fromBd.value = from.border;
      toBd.value = to.border;
      colorProgress.value = 0;
      colorProgress.value = withTiming(1, { duration: 160 });
      prevMarkRef.current = mark;
    }
  }, [mark]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [fromBg.value, toBg.value]
    ),
    borderColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [fromBd.value, toBd.value]
    ),
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

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View style={[styles.cell, animStyle]}>
        {mark === "check" && (
          <MaterialIcons name="check" size={22} color="#4ade80" />
        )}
        {mark === "cross" && (
          <MaterialIcons name="close" size={20} color="#f87171" />
        )}
        {mark === "none" && (
          <Text style={styles.questionMark}>?</Text>
        )}
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
            size={17}
            color={color}
          />
        </View>
        <Text style={[styles.colHeaderText, { color }]} numberOfLines={2}>
          {name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

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

  const getKey = (rowId: string, colId: string) => `${rowId}_${colId}`;

  const suspectGroupWidth = suspects.length * CELL_TOTAL;
  const locationGroupWidth = locations.length * CELL_TOTAL;
  const fullGroupWidth = suspectGroupWidth + GROUP_DIVIDER_WIDTH + locationGroupWidth;

  const renderGroupLabelRow = () => (
    <View style={[styles.row, { marginBottom: 2 }]}>
      <View style={{ width: LABEL_WIDTH }} />
      <View style={[styles.groupLabelBox, { width: suspectGroupWidth }]}>
        <Text style={[styles.groupLabelText, { color: SUSPECT_COLOR }]}>
          ŞÜPHELILER
        </Text>
      </View>
      <View style={{ width: GROUP_DIVIDER_WIDTH }} />
      <View style={[styles.groupLabelBox, { width: locationGroupWidth }]}>
        <Text style={[styles.groupLabelText, { color: LOCATION_COLOR }]}>
          MEKANLAR
        </Text>
      </View>
    </View>
  );

  const renderAvatarRow = () => (
    <View style={[styles.row, { marginBottom: 4 }]}>
      <View style={{ width: LABEL_WIDTH }} />
      {suspects.map((s) => (
        <HeaderAvatar
          key={s.id}
          icon={s.icon}
          name={s.name}
          color={SUSPECT_COLOR}
          bg={SUSPECT_BG}
          onPress={
            onHeaderPress
              ? () =>
                  onHeaderPress({
                    type: "suspect",
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    icon: s.icon,
                  })
              : undefined
          }
        />
      ))}
      <View style={styles.groupDivider} />
      {locations.map((loc) => (
        <HeaderAvatar
          key={loc.id}
          icon={loc.icon}
          name={loc.name}
          color={LOCATION_COLOR}
          bg={LOCATION_BG}
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

  const renderRowLabel = (
    entityId: string,
    name: string,
    icon: string,
    description: string,
    type: "suspect" | "weapon" | "location"
  ) => {
    const color =
      type === "suspect"
        ? SUSPECT_COLOR
        : type === "weapon"
        ? WEAPON_COLOR
        : LOCATION_COLOR;
    const bg =
      type === "suspect"
        ? SUSPECT_BG
        : type === "weapon"
        ? WEAPON_BG
        : LOCATION_BG;
    return (
      <Pressable
        style={[styles.rowLabel, { width: LABEL_WIDTH }]}
        onPress={
          onHeaderPress
            ? () =>
                onHeaderPress({
                  type,
                  id: entityId,
                  name,
                  description,
                  icon,
                })
            : undefined
        }
      >
        <View
          style={[
            styles.rowAvatarCircle,
            { backgroundColor: bg, borderColor: color + "50" },
          ]}
        >
          <MaterialIcons
            name={icon as ComponentProps<typeof MaterialIcons>["name"]}
            size={14}
            color={color}
          />
        </View>
        <Text
          style={[styles.rowLabelText, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {name}
        </Text>
      </Pressable>
    );
  };

  const renderSectionBanner = (
    label: string,
    color: string,
    width: number
  ) => (
    <View style={[styles.row, { marginVertical: 5 }]}>
      <View style={{ width: LABEL_WIDTH }} />
      <View
        style={[
          styles.sectionBanner,
          {
            width,
            borderColor: color + "55",
            borderLeftColor: color,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Text style={[styles.sectionBannerText, { color }]}>{label}</Text>
      </View>
    </View>
  );

  const renderWeaponRow = (weapon: Weapon) => (
    <View key={weapon.id} style={styles.row}>
      {renderRowLabel(
        weapon.id,
        weapon.name,
        weapon.icon,
        weapon.description,
        "weapon"
      )}
      {suspects.map((s) => {
        const key = getKey(weapon.id, s.id);
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
      <View style={styles.groupDivider} />
      {locations.map((loc) => {
        const key = getKey(weapon.id, loc.id);
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

  const renderLocationRow = (location: Location) => (
    <View key={location.id} style={styles.row}>
      {renderRowLabel(
        location.id,
        location.name,
        location.icon,
        location.description,
        "location"
      )}
      {suspects.map((s) => {
        const key = getKey(location.id, s.id);
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
      <View style={styles.groupDivider} />
      <View style={[styles.emptyCorner, { width: locationGroupWidth }]} />
    </View>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      <View>
        {renderGroupLabelRow()}
        {renderAvatarRow()}
        {renderSectionBanner("SİLAHLAR", WEAPON_COLOR, fullGroupWidth)}
        {weapons.map(renderWeaponRow)}
        {renderSectionBanner("MEKANLAR", LOCATION_COLOR, suspectGroupWidth)}
        {locations.map(renderLocationRow)}
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
    marginBottom: 5,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1.5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: CELL_MARGIN,
  },
  questionMark: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
    lineHeight: 20,
  },
  groupLabelBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  groupLabelText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  groupDivider: {
    width: GROUP_DIVIDER_WIDTH,
    height: CELL_SIZE,
    backgroundColor: "#FFFFFF22",
    borderRadius: 1,
  },
  colHeaderInner: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
    marginHorizontal: CELL_MARGIN,
    height: 84,
    gap: 5,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  colHeaderText: {
    fontSize: 9,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 12,
  },
  rowLabel: {
    height: CELL_SIZE,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
    gap: 6,
  },
  rowAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowLabelText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  sectionBanner: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  sectionBannerText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  emptyCorner: {
    height: CELL_SIZE,
  },
});
