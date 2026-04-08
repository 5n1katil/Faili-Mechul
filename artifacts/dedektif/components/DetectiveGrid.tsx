import React, { useCallback, useMemo, useState } from "react";
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
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { GridMark, Suspect, Weapon, Location } from "@/data/puzzles";
import type { EntityInfo } from "@/components/EntityInfoSheet";
import type { ComponentProps } from "react";

// ─── Entity colors ───────────────────────────────────────────────────────────
const SUSPECT_COLOR = "#A855F7";
const WEAPON_COLOR = "#C8372D";
const LOCATION_COLOR = "#D4A843";

// Richer avatar backgrounds (more saturated / less transparent)
const SUSPECT_BG = "#2A1050";
const WEAPON_BG = "#3D1212";
const LOCATION_BG = "#3A2800";

// ─── Grid chrome colors ──────────────────────────────────────────────────────
const OUTER_BORDER_COLOR = "#FFFFFF50";   // 31% — clearly visible outer frame
const BLOCK_DIVIDER_COLOR = "#FFFFFF80";  // 50% — strong section divider
const CELL_SEP_COLOR = "#FFFFFF2A";       // 17% — subtle but visible cell grid

// ─── Cell state colors ───────────────────────────────────────────────────────
function getMarkStyle(mark: GridMark) {
  if (mark === "check")    return { bg: "#0a3d1f", border: "#22c55e99" };
  if (mark === "cross")    return { bg: "#3b0f0f", border: "#ef444499" };
  if (mark === "question") return { bg: "#1f1600", border: "#D4A84399" };
  return { bg: "#FFFFFF08", border: CELL_SEP_COLOR };
}

interface Props {
  suspects: Suspect[];
  weapons: Weapon[];
  locations: Location[];
  gridState: { [key: string]: GridMark };
  onCellPress: (key: string, current: GridMark) => void;
  disabled?: boolean;
  onHeaderPress?: (entity: EntityInfo) => void;
}

// ─── GridCell ─────────────────────────────────────────────────────────────────
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
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.72, { damping: 12, stiffness: 350 }),
      withSpring(1, { damping: 14, stiffness: 220 })
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const { bg, border } = getMarkStyle(mark);
  const iconSize = Math.max(10, Math.floor(cellSize * 0.46));

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
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
        {mark === "check" && (
          <MaterialIcons name="check" size={iconSize} color="#4ade80" />
        )}
        {mark === "cross" && (
          <MaterialIcons name="close" size={iconSize} color="#f87171" />
        )}
        {mark === "question" && (
          <Text
            style={{
              fontSize: Math.max(9, Math.floor(cellSize * 0.4)),
              fontWeight: "700",
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

// ─── EntityLabel (shared for top-header & left row labels) ───────────────────
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

  const avatarSize = Math.max(22, Math.floor(cellSize * 0.62));
  const avatarRadius = Math.floor(avatarSize / 2);
  const avatarIconSize = Math.max(11, Math.floor(avatarSize * 0.52));
  const nameFontSize = Math.max(7, Math.floor(cellSize * 0.2));
  const nameLineHeight = Math.max(10, Math.floor(cellSize * 0.28));

  if (isRowLabel) {
    return (
      <Pressable
        onPress={onHeaderPress ? handlePress : undefined}
        style={{ width: labelWidth, height: cellSize }}
      >
        <Animated.View
          style={[
            {
              width: labelWidth,
              height: cellSize,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 4,
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
              borderColor: color + "AA",
              backgroundColor: bg,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
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
              color,
              fontSize: nameFontSize,
              fontWeight: "700",
              letterSpacing: 0.1,
              lineHeight: nameLineHeight,
              flex: 1,
            }}
            numberOfLines={2}
          >
            {name}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }

  const headerHeight = Math.max(54, Math.floor(cellSize * 1.85));
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
            borderColor: color + "AA",
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
            fontSize: nameFontSize,
            textAlign: "center",
            fontWeight: "700",
            letterSpacing: 0.1,
            lineHeight: nameLineHeight,
            color,
            width: cellSize,
          }}
          numberOfLines={2}
        >
          {name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DetectiveGrid({
  suspects,
  weapons,
  locations,
  gridState,
  onCellPress,
  disabled,
  onHeaderPress,
}: Props) {
  // Use onLayout to measure the ACTUAL container width (avoids overflow from
  // parent padding/border that useWindowDimensions cannot account for)
  const [containerWidth, setContainerWidth] = useState(0);

  const { cellSize, labelWidth } = useMemo(() => {
    if (containerWidth === 0) return { cellSize: 0, labelWidth: 0 };
    const numCols = suspects.length + locations.length;
    const lw = Math.min(72, Math.floor(containerWidth * 0.22));
    const ct = Math.floor((containerWidth - lw) / numCols);
    return { cellSize: ct, labelWidth: lw };
  }, [containerWidth, suspects.length, locations.length]);

  const cycleNextMark = useCallback((current: GridMark): GridMark => {
    if (current === "none") return "cross";
    if (current === "cross") return "check";
    if (current === "check") return "question";
    return "none";
  }, []);

  const mk = (rowId: string, colId: string) => `${rowId}_${colId}`;

  const renderCells = (rowId: string, colEntities: { id: string }[]) =>
    colEntities.map((e, i) => {
      const cellKey = mk(rowId, e.id);
      const mark = gridState[cellKey] ?? "none";
      return (
        <React.Fragment key={cellKey}>
          {i > 0 && <View style={{ width: 1, backgroundColor: CELL_SEP_COLOR }} />}
          <GridCell
            mark={mark}
            onPress={() => onCellPress(cellKey, cycleNextMark(mark))}
            disabled={disabled}
            cellSize={cellSize}
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
          {/* ── Column group labels ── */}
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

          {/* ── Top entity avatars ── */}
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

          {/* ── SİLAHLAR section label + top border ── */}
          <View style={styles.row}>
            <View style={[styles.sectionLabel, { width: labelWidth, borderLeftColor: WEAPON_COLOR }]}>
              <Text style={[styles.sectionLabelText, { color: WEAPON_COLOR }]}>SİLAHLAR</Text>
            </View>
            <View style={{ width: weaponBlockOuter, height: 1, backgroundColor: OUTER_BORDER_COLOR }} />
          </View>

          {/* ── Weapon rows ── */}
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

          {/* ── Horizontal block divider ── */}
          <View style={styles.row}>
            <View style={{ width: labelWidth }} />
            <View style={{ width: weaponBlockOuter, height: 2, backgroundColor: BLOCK_DIVIDER_COLOR }} />
          </View>

          {/* ── MEKANLAR section label ── */}
          <View style={styles.row}>
            <View style={[styles.sectionLabel, { width: labelWidth, borderLeftColor: LOCATION_COLOR }]}>
              <Text style={[styles.sectionLabelText, { color: LOCATION_COLOR }]}>MEKANLAR</Text>
            </View>
          </View>

          {/* ── Location rows (L-shape: suspect columns only) ── */}
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
  sectionLabel: {
    paddingLeft: 6,
    paddingVertical: 5,
    borderLeftWidth: 3,
    justifyContent: "center",
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
