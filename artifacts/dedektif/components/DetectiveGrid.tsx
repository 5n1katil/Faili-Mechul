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

const OUTER_BORDER_COLOR = "#FFFFFF28";
const BLOCK_DIVIDER_COLOR = "#FFFFFF50";
const CELL_BORDER_COLOR = "#FFFFFF14";

const HORIZONTAL_INSET = 24;

interface Props {
  suspects: Suspect[];
  weapons: Weapon[];
  locations: Location[];
  gridState: { [key: string]: GridMark };
  onCellPress: (key: string, current: GridMark) => void;
  disabled?: boolean;
  onHeaderPress?: (entity: EntityInfo) => void;
}

function getMarkColors(mark: GridMark, neutralBg: string) {
  if (mark === "check") return { bg: "#052e16", border: "#4ade8080" };
  if (mark === "cross") return { bg: "#2d0e0e", border: "#f8717180" };
  if (mark === "question") return { bg: "#1A1500", border: "#D4A84380" };
  return { bg: neutralBg, border: "transparent" };
}

function GridCell({
  mark,
  onPress,
  disabled,
  cellSize,
}: {
  mark: GridMark;
  onPress: () => void;
  disabled?: boolean;
  cellSize: number;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(1);
  const initialColors = getMarkColors(mark, colors.background);
  const fromBg = useSharedValue(initialColors.bg);
  const toBg = useSharedValue(initialColors.bg);
  const fromBd = useSharedValue(initialColors.border);
  const toBd = useSharedValue(initialColors.border);
  const prevMarkRef = useRef<GridMark>(mark);

  useEffect(() => {
    if (mark !== prevMarkRef.current) {
      const from = getMarkColors(prevMarkRef.current, colors.background);
      const to = getMarkColors(mark, colors.background);
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

  const iconSize = Math.max(10, Math.floor(cellSize * 0.46));

  return (
    <Pressable onPress={handlePress} disabled={disabled} style={{ flex: 1 }}>
      <Animated.View
        style={[
          {
            flex: 1,
            height: cellSize,
            borderWidth: 1,
            alignItems: "center",
            justifyContent: "center",
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
              fontSize: Math.max(9, Math.floor(cellSize * 0.38)),
              fontWeight: "700",
              color: "#D4A843",
              lineHeight: Math.max(12, Math.floor(cellSize * 0.52)),
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
}: {
  icon: string;
  name: string;
  color: string;
  bg: string;
  onPress?: () => void;
  cellSize: number;
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

  const avatarSize = Math.max(20, Math.floor(cellSize * 0.68));
  const avatarRadius = Math.floor(avatarSize / 2);
  const avatarIconSize = Math.max(10, Math.floor(avatarSize * 0.5));
  const headerHeight = Math.max(52, Math.floor(cellSize * 1.75));

  return (
    <Pressable onPress={onPress ? handlePress : undefined} style={{ flex: 1 }}>
      <Animated.View
        style={[
          {
            flex: 1,
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 5,
            height: headerHeight,
            gap: 3,
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
            fontSize: Math.max(6, Math.floor(cellSize * 0.19)),
            textAlign: "center",
            fontWeight: "700",
            letterSpacing: 0.2,
            lineHeight: Math.max(9, Math.floor(cellSize * 0.27)),
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

  const { cellSize, labelWidth } = useMemo(() => {
    const available = screenWidth - HORIZONTAL_INSET;
    const numCols = suspects.length + locations.length;
    const lw = Math.min(80, Math.floor(available * 0.24));
    const cellsWidth = available - lw;
    const ct = Math.floor(cellsWidth / numCols);
    return {
      cellSize: ct,
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

  const numSuspects = suspects.length;
  const numLocations = locations.length;

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
    const avatarSize = Math.max(16, Math.floor(cellSize * 0.5));
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
            size={Math.max(8, Math.floor(avatarSize * 0.5))}
            color={color}
          />
        </View>
        <Text
          style={[
            styles.rowLabelText,
            { color: colors.foreground, fontSize: Math.max(8, Math.floor(cellSize * 0.25)) },
          ]}
          numberOfLines={2}
        >
          {name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Column group labels (ŞÜPHELILER / MEKANLAR) ── */}
      <View style={styles.row}>
        <View style={{ width: labelWidth }} />
        <View style={{ flex: numSuspects, alignItems: "center" }}>
          <Text style={[styles.groupLabel, { color: SUSPECT_COLOR }]}>
            ŞÜPHELILER
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: "transparent" }} />
        <View style={{ flex: numLocations, alignItems: "center" }}>
          <Text style={[styles.groupLabel, { color: LOCATION_COLOR }]}>
            MEKANLAR
          </Text>
        </View>
      </View>

      {/* ── Avatar header row ── */}
      <View style={[styles.row, { marginBottom: 0 }]}>
        <View style={{ width: labelWidth }} />
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            borderWidth: 1,
            borderColor: OUTER_BORDER_COLOR,
            borderBottomWidth: 0,
          }}
        >
          {suspects.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && (
                <View style={{ width: 1, backgroundColor: CELL_BORDER_COLOR }} />
              )}
              <HeaderAvatar
                icon={s.icon}
                name={s.name}
                color={SUSPECT_COLOR}
                bg={SUSPECT_BG}
                cellSize={cellSize}
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
            </React.Fragment>
          ))}
          <View style={{ width: 2, backgroundColor: BLOCK_DIVIDER_COLOR }} />
          {locations.map((loc, i) => (
            <React.Fragment key={loc.id}>
              {i > 0 && (
                <View style={{ width: 1, backgroundColor: CELL_BORDER_COLOR }} />
              )}
              <HeaderAvatar
                icon={loc.icon}
                name={loc.name}
                color={LOCATION_COLOR}
                bg={LOCATION_BG}
                cellSize={cellSize}
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
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ── SİLAHLAR group label in left column ── */}
      <View style={[styles.row, { marginTop: 0 }]}>
        <View style={[styles.sectionGroupLabel, { width: labelWidth, borderLeftColor: WEAPON_COLOR }]}>
          <Text style={[styles.sectionGroupText, { color: WEAPON_COLOR }]}>
            SİLAHLAR
          </Text>
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: OUTER_BORDER_COLOR }} />
      </View>

      {/* ── Weapon rows ── */}
      {weapons.map((weapon, wi) => (
        <View key={weapon.id} style={styles.row}>
          {renderRowLabel(weapon.id, weapon.name, weapon.icon, weapon.description, "weapon")}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: OUTER_BORDER_COLOR,
            }}
          >
            {suspects.map((s, si) => {
              const key = getKey(weapon.id, s.id);
              const mark = gridState[key] ?? "none";
              return (
                <React.Fragment key={key}>
                  {si > 0 && (
                    <View style={{ width: 1, backgroundColor: CELL_BORDER_COLOR }} />
                  )}
                  <GridCell
                    mark={mark}
                    onPress={() => onCellPress(key, cycleNextMark(mark))}
                    disabled={disabled}
                    cellSize={cellSize}
                  />
                </React.Fragment>
              );
            })}
            <View style={{ width: 2, backgroundColor: BLOCK_DIVIDER_COLOR }} />
            {locations.map((loc, li) => {
              const key = getKey(weapon.id, loc.id);
              const mark = gridState[key] ?? "none";
              return (
                <React.Fragment key={key}>
                  {li > 0 && (
                    <View style={{ width: 1, backgroundColor: CELL_BORDER_COLOR }} />
                  )}
                  <GridCell
                    mark={mark}
                    onPress={() => onCellPress(key, cycleNextMark(mark))}
                    disabled={disabled}
                    cellSize={cellSize}
                  />
                </React.Fragment>
              );
            })}
          </View>
        </View>
      ))}

      {/* ── Horizontal block divider (between weapons and locations) ── */}
      <View style={styles.row}>
        <View style={{ width: labelWidth }} />
        <View style={{ flex: 1, height: 2, backgroundColor: BLOCK_DIVIDER_COLOR }} />
      </View>

      {/* ── MEKANLAR group label in left column ── */}
      <View style={[styles.row]}>
        <View style={[styles.sectionGroupLabel, { width: labelWidth, borderLeftColor: LOCATION_COLOR }]}>
          <Text style={[styles.sectionGroupText, { color: LOCATION_COLOR }]}>
            MEKANLAR
          </Text>
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: "transparent" }} />
      </View>

      {/* ── Location rows (L-shape: only suspect cols, right block is empty) ── */}
      {locations.map((location, li) => (
        <View key={location.id} style={styles.row}>
          {renderRowLabel(
            location.id,
            location.name,
            location.icon,
            location.description,
            "location"
          )}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderBottomWidth: li === locations.length - 1 ? 1 : 0,
              borderColor: OUTER_BORDER_COLOR,
            }}
          >
            {suspects.map((s, si) => {
              const key = getKey(location.id, s.id);
              const mark = gridState[key] ?? "none";
              return (
                <React.Fragment key={key}>
                  {si > 0 && (
                    <View style={{ width: 1, backgroundColor: CELL_BORDER_COLOR }} />
                  )}
                  <GridCell
                    mark={mark}
                    onPress={() => onCellPress(key, cycleNextMark(mark))}
                    disabled={disabled}
                    cellSize={cellSize}
                  />
                </React.Fragment>
              );
            })}
            <View style={{ width: 2, backgroundColor: BLOCK_DIVIDER_COLOR }} />
            {/* Empty right block for L-shape */}
            <View
              style={{
                flex: numLocations,
                height: cellSize,
                backgroundColor: "#0F1117",
              }}
            />
          </View>
        </View>
      ))}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  groupLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    paddingVertical: 3,
  },
  sectionGroupLabel: {
    paddingLeft: 6,
    paddingVertical: 4,
    borderLeftWidth: 3,
    justifyContent: "center",
  },
  sectionGroupText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  rowLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 5,
    paddingLeft: 2,
    gap: 4,
  },
  rowLabelText: {
    fontWeight: "600",
    flex: 1,
    lineHeight: 13,
  },
});
