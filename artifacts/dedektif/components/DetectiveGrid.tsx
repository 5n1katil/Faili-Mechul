import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { GridMark, Suspect, Weapon, Location } from "@/data/puzzles";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import type { ComponentProps } from "react";

const SUSPECT_COLOR = "#A855F7";
const WEAPON_COLOR = "#C8372D";
const LOCATION_COLOR = "#D4A843";

const SUSPECT_BG = "#2A1050";
const WEAPON_BG = "#3D1212";
const LOCATION_BG = "#3A2800";

const OUTER_BORDER_COLOR = "#FFFFFF50";
const BLOCK_DIVIDER_COLOR = "#FFFFFF80";
const CELL_SEP_COLOR = "#FFFFFF2A";

interface Props {
  suspects: Suspect[];
  weapons: Weapon[];
  locations: Location[];
  gridState: { [key: string]: GridMark };
  autoCrossOwners?: { [key: string]: string[] };
  onCellPress: (key: string, current: GridMark) => void;
  disabled?: boolean;
  onHeaderPress?: (entity: EntityInfo) => void;
  isComplete?: boolean;
}

function getMarkStyle(mark: GridMark) {
  if (mark === "check")    return { bg: "#0a3d1f", border: "#22c55e99" };
  if (mark === "cross")    return { bg: "#3b0f0f", border: "#ef444499" };
  if (mark === "question") return { bg: "#1f1600", border: "#D4A84399" };
  return { bg: "#FFFFFF08", border: "#FFFFFF22" };
}

function GridCell({
  mark,
  onPress,
  disabled,
  cellSize,
  isComplete,
  glowDelay,
}: {
  mark: GridMark;
  onPress: () => void;
  disabled?: boolean;
  cellSize: number;
  isComplete?: boolean;
  glowDelay?: number;
}) {
  const scale = useSharedValue(1);
  const glowProgress = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowOverlayStyle = useAnimatedStyle(() => ({
    opacity: glowProgress.value,
  }));

  useEffect(() => {
    if (isComplete && mark === "check") {
      glowProgress.value = withDelay(
        glowDelay ?? 0,
        withSequence(
          withTiming(1, { duration: 180 }),
          withTiming(1, { duration: 220 }),
          withTiming(0, { duration: 450 }),
        ),
      );
    } else {
      glowProgress.value = withTiming(0, { duration: 200 });
    }
  }, [isComplete, mark]);

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const { bg, border } = getMarkStyle(mark);
  const iconSize = Math.max(10, Math.floor(cellSize * 0.46));

  return (
    <Pressable testID="grid-cell" onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={[
          {
            width: cellSize,
            height: cellSize,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
          },
          animStyle,
        ]}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#4ade80" }, glowOverlayStyle]}
          pointerEvents="none"
        />
        {mark === "check" && (
          <MaterialIcons name="check" size={iconSize} color="#4ade80" />
        )}
        {mark === "cross" && (
          <MaterialIcons name="close" size={iconSize} color="#f87171" />
        )}
        {mark === "question" && (
          <Text
            style={{
              fontSize: Math.max(12, Math.floor(cellSize * 0.42)),
              fontWeight: "900",
              color: "#D4A843",
              lineHeight: Math.max(12, Math.floor(cellSize * 0.54)),
            }}
          >
            ?
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

function EntityLabel({
  icon,
  name,
  color,
  bg,
  entityId,
  description,
  type,
  cellSize,
  labelWidth,
  onHeaderPress,
  isRowLabel,
}: {
  icon: string;
  name: string;
  color: string;
  bg: string;
  entityId: string;
  description: string;
  type: "suspect" | "weapon" | "location";
  cellSize: number;
  labelWidth: number;
  onHeaderPress?: (entity: EntityInfo) => void;
  isRowLabel: boolean;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!onHeaderPress) return;
    scale.value = withSequence(
      withTiming(0.88, { duration: 70 }),
      withTiming(1, { duration: 70 })
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onHeaderPress({ type, id: entityId, name, description, icon });
  };

  const avatarSize = Math.max(24, Math.floor(cellSize * 0.78));
  const avatarRadius = Math.floor(avatarSize / 2);
  const avatarIconSize = Math.max(12, Math.floor(avatarSize * 0.54));

  const isEmojiIcon = (str: string): boolean => (str.codePointAt(0) ?? 0) > 127;

  if (isRowLabel) {
    return (
      <Pressable
        onPress={onHeaderPress ? handlePress : undefined}
        style={{ width: labelWidth, height: cellSize, alignItems: "center", justifyContent: "center" }}
      >
        <Animated.View
          style={[
            {
              width: labelWidth,
              height: cellSize,
              alignItems: "center",
              justifyContent: "center",
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
              borderColor: color + "AA",
              backgroundColor: bg,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {isEmojiIcon(icon) ? (
              <Text numberOfLines={1} style={{ fontSize: avatarIconSize, lineHeight: avatarIconSize * 1.2, includeFontPadding: false, textAlign: "center" }}>
                {icon}
              </Text>
            ) : (
              <MaterialIcons
                name={icon as ComponentProps<typeof MaterialIcons>["name"]}
                size={avatarIconSize}
                color={color}
              />
            )}
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  const headerHeight = Math.max(44, Math.floor(cellSize * 1.4));
  return (
    <Pressable
      onPress={onHeaderPress ? handlePress : undefined}
      style={{ width: cellSize, height: headerHeight }}
    >
      <Animated.View
        style={[
          {
            width: cellSize,
            height: headerHeight,
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 6,
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
            borderColor: color + "AA",
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {isEmojiIcon(icon) ? (
            <Text numberOfLines={1} style={{ fontSize: avatarIconSize, lineHeight: avatarIconSize * 1.2, includeFontPadding: false, textAlign: "center" }}>
              {icon}
            </Text>
          ) : (
            <MaterialIcons
              name={icon as ComponentProps<typeof MaterialIcons>["name"]}
              size={avatarIconSize}
              color={color}
            />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function DetectiveGrid({
  suspects,
  weapons,
  locations,
  gridState,
  autoCrossOwners = {},
  onCellPress,
  disabled,
  onHeaderPress,
  isComplete,
}: Props) {
  const [containerWidth, setContainerWidth] = useState(0);

  const { cellSize, labelWidth } = useMemo(() => {
    if (containerWidth === 0) return { cellSize: 0, labelWidth: 0 };
    const nS = suspects.length;
    const nL = locations.length;
    const numCols = nS + nL;
    // Row pixel budget: (numCols+1)*cs + (nS-1 separators) + (nL-1 separators) + 2 divider + 2 border
    // = (numCols+1)*cs + nS + nL + 2  →  solve for cs:
    const overhead = nS + nL + 2;
    const cs = Math.max(0, Math.floor((containerWidth - overhead) / (numCols + 1)));
    return { cellSize: cs, labelWidth: cs };
  }, [containerWidth, suspects.length, locations.length]);

  const cycleNextMark = useCallback((current: GridMark): GridMark => {
    if (current === "none") return "cross";
    if (current === "cross") return "check";
    if (current === "check") return "question";
    return "none";
  }, []);

  const mk = (rowId: string, colId: string) => `${rowId}_${colId}`;

  const checkCellGlowMap = useMemo(() => {
    if (!isComplete) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    let idx = 0;
    for (const weapon of weapons) {
      for (const s of suspects) {
        const key = mk(weapon.id, s.id);
        if (gridState[key] === "check") map[key] = idx++ * 180;
      }
      for (const loc of locations) {
        const key = mk(weapon.id, loc.id);
        if (gridState[key] === "check") map[key] = idx++ * 180;
      }
    }
    for (const loc of locations) {
      for (const s of suspects) {
        const key = mk(loc.id, s.id);
        if (gridState[key] === "check") map[key] = idx++ * 180;
      }
    }
    return map;
  }, [isComplete]);

  const renderCells = (rowId: string, colEntities: { id: string }[]) =>
    colEntities.map((e, i) => {
      const cellKey = mk(rowId, e.id);
      const mark = gridState[cellKey] ?? "none";
      const isAutoCrossed = (autoCrossOwners[cellKey]?.length ?? 0) > 0;
      return (
        <React.Fragment key={cellKey}>
          {i > 0 && <View style={{ width: 1, backgroundColor: CELL_SEP_COLOR }} />}
          <GridCell
            mark={mark}
            onPress={() => onCellPress(cellKey, cycleNextMark(mark))}
            disabled={disabled || isAutoCrossed}
            cellSize={cellSize}
            isComplete={isComplete}
            glowDelay={checkCellGlowMap[cellKey]}
          />
        </React.Fragment>
      );
    });

  const nS = suspects.length;
  const nL = locations.length;

  const sCellsInner = cellSize > 0 ? nS * cellSize + Math.max(0, nS - 1) : 0;
  const lCellsInner = cellSize > 0 ? nL * cellSize + Math.max(0, nL - 1) : 0;
  const divider = 2;

  const suspectBlockOuter = sCellsInner + 2;
  const weaponBlockOuter = sCellsInner + divider + lCellsInner + 2;

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContainerWidth(Math.floor(e.nativeEvent.layout.width))}
    >
      {containerWidth === 0 ? null : (
        <>
          <View style={styles.row}>
            <View style={{ width: labelWidth }} />
            <View style={{ width: suspectBlockOuter, alignItems: "center" }}>
              <Text style={[styles.groupLabel, { color: SUSPECT_COLOR }]}>ŞÜPHELILER</Text>
            </View>
            <View style={{ width: divider }} />
            <View style={{ width: lCellsInner, alignItems: "center" }}>
              <Text style={[styles.groupLabel, { color: LOCATION_COLOR }]}>MEKANLAR</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ width: labelWidth }} />
            {suspects.map((s) => (
              <EntityLabel
                key={s.id}
                icon={s.icon} name={s.name} color={SUSPECT_COLOR} bg={SUSPECT_BG}
                entityId={s.id} description={s.description} type="suspect"
                cellSize={cellSize} labelWidth={labelWidth}
                onHeaderPress={onHeaderPress} isRowLabel={false}
              />
            ))}
            <View style={{ width: divider + 2, backgroundColor: BLOCK_DIVIDER_COLOR }} />
            {locations.map((loc) => (
              <EntityLabel
                key={loc.id}
                icon={loc.icon} name={loc.name} color={LOCATION_COLOR} bg={LOCATION_BG}
                entityId={loc.id} description={loc.description} type="location"
                cellSize={cellSize} labelWidth={labelWidth}
                onHeaderPress={onHeaderPress} isRowLabel={false}
              />
            ))}
          </View>

          <View style={[styles.row, { paddingVertical: 4 }]}>
            <View style={{ width: 3, backgroundColor: WEAPON_COLOR, alignSelf: "stretch" }} />
            <View style={{ width: 6 }} />
            <Text style={[styles.sectionLabelText, { color: WEAPON_COLOR }]}>SİLAHLAR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: OUTER_BORDER_COLOR, alignSelf: "center", marginLeft: 8 }} />
          </View>

          {weapons.map((weapon) => (
            <View key={weapon.id} style={styles.row}>
              <EntityLabel
                icon={weapon.icon} name={weapon.name} color={WEAPON_COLOR} bg={WEAPON_BG}
                entityId={weapon.id} description={weapon.description} type="weapon"
                cellSize={cellSize} labelWidth={labelWidth}
                onHeaderPress={onHeaderPress} isRowLabel={true}
              />
              <View style={[styles.cellsBlock, { width: weaponBlockOuter }]}>
                {renderCells(weapon.id, suspects)}
                <View style={{ width: divider, backgroundColor: BLOCK_DIVIDER_COLOR }} />
                {renderCells(weapon.id, locations)}
              </View>
            </View>
          ))}

          <View style={styles.row}>
            <View style={{ width: labelWidth }} />
            <View style={{ width: weaponBlockOuter, height: 2, backgroundColor: BLOCK_DIVIDER_COLOR }} />
          </View>

          <View style={[styles.row, { paddingVertical: 4 }]}>
            <View style={{ width: 3, backgroundColor: LOCATION_COLOR, alignSelf: "stretch" }} />
            <View style={{ width: 6 }} />
            <Text style={[styles.sectionLabelText, { color: LOCATION_COLOR }]}>MEKANLAR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: OUTER_BORDER_COLOR, alignSelf: "center", marginLeft: 8 }} />
          </View>

          {locations.map((location, li) => (
            <View key={location.id} style={styles.row}>
              <EntityLabel
                icon={location.icon} name={location.name} color={LOCATION_COLOR} bg={LOCATION_BG}
                entityId={location.id} description={location.description} type="location"
                cellSize={cellSize} labelWidth={labelWidth}
                onHeaderPress={onHeaderPress} isRowLabel={true}
              />
              <View
                style={[
                  styles.cellsBlock,
                  {
                    width: suspectBlockOuter,
                    ...(li === locations.length - 1
                      ? { borderBottomWidth: 1 }
                      : {}),
                  },
                ]}
              >
                {renderCells(location.id, suspects)}
              </View>
            </View>
          ))}
        </>
      )}
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
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    paddingVertical: 3,
  },
  sectionLabelText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  cellsBlock: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: OUTER_BORDER_COLOR,
  },
});
