import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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

const GROUP_DIVIDER_WIDTH = 2;
const HORIZONTAL_INSET = 40;

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
  if (mark === "question") return { bg: "#1A1500", border: "#D4A84360" };
  return { bg: neutralBg, border: neutralBorder };
}

function GridCell({
  mark,
  onPress,
  disabled,
  cellSize,
  cellMargin,
}: {
  mark: GridMark;
  onPress: () => void;
  disabled?: boolean;
  cellSize: number;
  cellMargin: number;
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

  const iconSize = Math.max(12, Math.floor(cellSize * 0.5));

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={[
          {
            width: cellSize,
            height: cellSize,
            borderWidth: 1.5,
            borderRadius: Math.max(6, Math.floor(cellSize * 0.2)),
            alignItems: "center",
            justifyContent: "center",
            marginHorizontal: cellMargin,
          },
          animStyle,
        ]}
      >
        {mark === "check" && (
          <MaterialIcons name="check" size={iconSize} color="#4ade80" />
        )}
        {mark === "cross" && (
          <MaterialIcons name="close" size={iconSize} color="#f87171" />
        )}
        {mark === "question" && (
          <Text
            style={{
              fontSize: Math.max(10, Math.floor(cellSize * 0.4)),
              fontWeight: "700",
              color: "#D4A843",
              lineHeight: Math.max(14, Math.floor(cellSize * 0.55)),
            }}
          >
            ?
          </Text>
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
  cellSize,
  cellMargin,
}: {
  icon: string;
  name: string;
  color: string;
  bg: string;
  onPress?: () => void;
  cellSize: number;
  cellMargin: number;
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

  const avatarSize = Math.max(22, Math.floor(cellSize * 0.72));
  const avatarRadius = Math.floor(avatarSize / 2);
  const avatarIconSize = Math.max(11, Math.floor(avatarSize * 0.5));
  const headerHeight = Math.max(60, Math.floor(cellSize * 1.8));

  return (
    <Pressable onPress={onPress ? handlePress : undefined}>
      <Animated.View
        style={[
          {
            width: cellSize,
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 6,
            marginHorizontal: cellMargin,
            height: headerHeight,
            gap: 4,
          },
          animStyle,
        ]}
      >
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarRadius,
            borderWidth: 1.5,
            borderColor: color + "60",
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons
            name={icon as ComponentProps<typeof MaterialIcons>["name"]}
            size={avatarIconSize}
            color={color}
          />
        </View>
        <Text
          style={{
            fontSize: Math.max(7, Math.floor(cellSize * 0.2)),
            textAlign: "center",
            fontWeight: "700",
            letterSpacing: 0.2,
            lineHeight: Math.max(10, Math.floor(cellSize * 0.28)),
            color,
          }}
          numberOfLines={2}
        >
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
  const { width: screenWidth } = useWindowDimensions();

  const { cellSize, cellMargin, cellTotal, labelWidth } = useMemo(() => {
    const available = screenWidth - HORIZONTAL_INSET;
    const numCols = suspects.length + locations.length;
    const lw = Math.min(90, Math.floor(available * 0.26));
    const ct = Math.floor((available - lw - GROUP_DIVIDER_WIDTH) / numCols);
    const cm = Math.max(2, Math.floor(ct * 0.065));
    const cs = ct - cm * 2;
    return {
      cellSize: cs,
      cellMargin: cm,
      cellTotal: ct,
      labelWidth: lw,
    };
  }, [screenWidth, suspects.length, locations.length]);

  const cycleNextMark = useCallback((current: GridMark): GridMark => {
    if (current === "none") return "cross";
    if (current === "cross") return "check";
    if (current === "check") return "question";
    return "none";
  }, []);

  const getKey = (rowId: string, colId: string) => `${rowId}_${colId}`;

  const suspectGroupWidth = suspects.length * cellTotal;
  const locationGroupWidth = locations.length * cellTotal;
  const fullGroupWidth = suspectGroupWidth + GROUP_DIVIDER_WIDTH + locationGroupWidth;

  const renderGroupLabelRow = () => (
    <View style={[styles.row, { marginBottom: 2 }]}>
      <View style={{ width: labelWidth }} />
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
      <View style={{ width: labelWidth }} />
      {suspects.map((s) => (
        <HeaderAvatar
          key={s.id}
          icon={s.icon}
          name={s.name}
          color={SUSPECT_COLOR}
          bg={SUSPECT_BG}
          cellSize={cellSize}
          cellMargin={cellMargin}
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
      <View
        style={{
          width: GROUP_DIVIDER_WIDTH,
          height: cellSize,
          backgroundColor: "#FFFFFF22",
          borderRadius: 1,
        }}
      />
      {locations.map((loc) => (
        <HeaderAvatar
          key={loc.id}
          icon={loc.icon}
          name={loc.name}
          color={LOCATION_COLOR}
          bg={LOCATION_BG}
          cellSize={cellSize}
          cellMargin={cellMargin}
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
    const avatarSize = Math.max(18, Math.floor(cellSize * 0.55));
    return (
      <Pressable
        style={[styles.rowLabel, { width: labelWidth, height: cellSize }]}
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
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: Math.floor(avatarSize / 2),
            borderWidth: 1.5,
            borderColor: color + "50",
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MaterialIcons
            name={icon as ComponentProps<typeof MaterialIcons>["name"]}
            size={Math.max(9, Math.floor(avatarSize * 0.5))}
            color={color}
          />
        </View>
        <Text
          style={[
            styles.rowLabelText,
            { color: colors.foreground, fontSize: Math.max(9, Math.floor(cellSize * 0.28)) },
          ]}
          numberOfLines={2}
        >
          {name}
        </Text>
      </Pressable>
    );
  };

  const renderSectionBanner = (label: string, color: string, width: number) => (
    <View style={[styles.row, { marginVertical: 4 }]}>
      <View style={{ width: labelWidth }} />
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
    <View key={weapon.id} style={[styles.row, { marginBottom: 4 }]}>
      {renderRowLabel(weapon.id, weapon.name, weapon.icon, weapon.description, "weapon")}
      {suspects.map((s) => {
        const key = getKey(weapon.id, s.id);
        const mark = gridState[key] ?? "none";
        return (
          <GridCell
            key={key}
            mark={mark}
            onPress={() => onCellPress(key, cycleNextMark(mark))}
            disabled={disabled}
            cellSize={cellSize}
            cellMargin={cellMargin}
          />
        );
      })}
      <View
        style={{
          width: GROUP_DIVIDER_WIDTH,
          height: cellSize,
          backgroundColor: "#FFFFFF22",
          borderRadius: 1,
        }}
      />
      {locations.map((loc) => {
        const key = getKey(weapon.id, loc.id);
        const mark = gridState[key] ?? "none";
        return (
          <GridCell
            key={key}
            mark={mark}
            onPress={() => onCellPress(key, cycleNextMark(mark))}
            disabled={disabled}
            cellSize={cellSize}
            cellMargin={cellMargin}
          />
        );
      })}
    </View>
  );

  const renderLocationRow = (location: Location) => (
    <View key={location.id} style={[styles.row, { marginBottom: 4 }]}>
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
            cellSize={cellSize}
            cellMargin={cellMargin}
          />
        );
      })}
      <View
        style={{
          width: GROUP_DIVIDER_WIDTH,
          height: cellSize,
          backgroundColor: "#FFFFFF22",
          borderRadius: 1,
        }}
      />
      <View style={{ width: locationGroupWidth, height: cellSize }} />
    </View>
  );

  return (
    <View style={styles.container}>
      {renderGroupLabelRow()}
      {renderAvatarRow()}
      {renderSectionBanner("SİLAHLAR", WEAPON_COLOR, fullGroupWidth)}
      {weapons.map(renderWeaponRow)}
      {renderSectionBanner("MEKANLAR", LOCATION_COLOR, suspectGroupWidth)}
      {locations.map(renderLocationRow)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
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
  rowLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 6,
    gap: 5,
  },
  rowLabelText: {
    fontWeight: "600",
    flex: 1,
    lineHeight: 14,
  },
  sectionBanner: {
    paddingVertical: 5,
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
});
