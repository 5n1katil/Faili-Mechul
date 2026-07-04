import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
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
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { Puzzle } from "@/data/puzzles";

interface Props {
  visible: boolean;
  onClose: () => void;
  puzzle: Puzzle;
  selectedSuspect: string | null;
  selectedWeapon: string | null;
  selectedLocation: string | null;
  onSelectSuspect: (id: string | null) => void;
  onSelectWeapon: (id: string | null) => void;
  onSelectLocation: (id: string | null) => void;
  onSubmit: (suspectId: string, weaponId: string, locationId: string) => boolean | void;
  disabled?: boolean;
}

type Column = "suspect" | "location" | "weapon";

const COL_CONFIG: Record<Column, { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; color: string }> = {
  suspect: { icon: "person", label: "KİM", color: "#A855F7" },
  location: { icon: "location-on", label: "NEREDE", color: "#D4A843" },
  weapon: { icon: "gps-not-fixed", label: "NEYLE", color: "#C8372D" },
};

export default function AccusationSheet({
  visible,
  onClose,
  puzzle,
  selectedSuspect,
  selectedWeapon,
  selectedLocation,
  onSelectSuspect,
  onSelectWeapon,
  onSelectLocation,
  onSubmit,
  disabled,
}: Props) {
  const colors = useColors();
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [wrongToastVisible, setWrongToastVisible] = useState(false);

  const flashOpacity = useSharedValue(0);
  const btnScale = useSharedValue(1);
  const wrongToastOpacity = useSharedValue(0);
  const sheetScale = useSharedValue(0.96);
  const sheetOpacity = useSharedValue(0);
  const wrongToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      sheetScale.value = withSpring(1, { damping: 32, stiffness: 320, mass: 0.8 });
      sheetOpacity.value = withTiming(1, { duration: 180 });
    } else {
      sheetScale.value = withTiming(0.96, { duration: 150 });
      sheetOpacity.value = withTiming(0, { duration: 150 });
      setActiveColumn(null);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (wrongToastRef.current) {
        clearTimeout(wrongToastRef.current);
        wrongToastRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!visible && wrongToastRef.current) {
      clearTimeout(wrongToastRef.current);
      wrongToastRef.current = null;
      setWrongToastVisible(false);
    }
  }, [visible]);

  const canSubmit = Boolean(selectedSuspect && selectedWeapon && selectedLocation);

  const columns: {
    key: Column;
    items: { id: string; name: string }[];
    selected: string | null;
    onSelect: (id: string) => void;
  }[] = [
    {
      key: "suspect",
      items: puzzle.suspects.map((s) => ({ id: s.id, name: s.name })),
      selected: selectedSuspect,
      onSelect: (id) => { onSelectSuspect(id); setActiveColumn(null); },
    },
    {
      key: "location",
      items: puzzle.locations.map((l) => ({ id: l.id, name: l.name })),
      selected: selectedLocation,
      onSelect: (id) => { onSelectLocation(id); setActiveColumn(null); },
    },
    {
      key: "weapon",
      items: puzzle.weapons.map((w) => ({ id: w.id, name: w.name })),
      selected: selectedWeapon,
      onSelect: (id) => { onSelectWeapon(id); setActiveColumn(null); },
    },
  ];

  const showWrongFlash = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    flashOpacity.value = withSequence(
      withTiming(0.4, { duration: 60 }),
      withTiming(0.2, { duration: 80 }),
      withTiming(0.35, { duration: 60 }),
      withTiming(0, { duration: 250 }),
    );
    btnScale.value = withSequence(
      withSpring(0.95, { damping: 8 }),
      withSpring(1, { damping: 12 }),
    );
    setWrongToastVisible(true);
    wrongToastOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1800 }),
      withTiming(0, { duration: 400 }),
    );
    if (wrongToastRef.current) clearTimeout(wrongToastRef.current);
    wrongToastRef.current = setTimeout(() => setWrongToastVisible(false), 2450);
  };

  const handleSubmit = () => {
    if (!canSubmit || disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const result = onSubmit(selectedSuspect!, selectedWeapon!, selectedLocation!);
    if (result === false) {
      showWrongFlash();
    }
  };

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
  const wrongToastStyle = useAnimatedStyle(() => ({ opacity: wrongToastOpacity.value }));
  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sheetScale.value }],
    opacity: sheetOpacity.value,
  }));

  const totalSelected = [selectedSuspect, selectedLocation, selectedWeapon].filter(Boolean).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={() => { setActiveColumn(null); onClose(); }} />

      <View style={styles.centeredWrapper} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { backgroundColor: colors.card }, sheetAnimStyle]}>
          <Animated.View pointerEvents="none" style={[styles.flashOverlay, flashStyle]} />

          {/* ── Header ── */}
          <View style={[styles.sheetHeader, { borderBottomColor: `${colors.primary}22` }]}>
            <View style={[styles.headerIconWrap, { backgroundColor: `${colors.primary}20` }]}>
              <MaterialIcons name="gavel" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: colors.primary }]}>Son Çıkarım</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                {totalSelected}/3 seçim tamamlandı
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
              hitSlop={10}
            >
              <MaterialIcons name="close" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* ── Wrong Toast ── */}
          {wrongToastVisible && (
            <Animated.View style={[styles.wrongToast, wrongToastStyle]}>
              <MaterialIcons name="warning" size={14} color="#fff" />
              <Text style={styles.wrongToastText}>Yanlış suçlama — +30 saniye eklendi!</Text>
            </Animated.View>
          )}

          {/* ── Vertical Column Rows ── */}
          <View style={styles.columnsContainer}>
            {columns.map((col, idx) => {
              const cfg = COL_CONFIG[col.key];
              const isOpen = activeColumn === col.key;
              const selectedItem = col.items.find((i) => i.id === col.selected);
              const hasSelection = Boolean(col.selected);

              return (
                <Animated.View
                  key={col.key}
                  entering={FadeInDown.delay(idx * 60).springify()}
                >
                  <Pressable
                    onPress={() => setActiveColumn(isOpen ? null : col.key)}
                    style={({ pressed }) => [
                      styles.colRow,
                      {
                        backgroundColor: isOpen
                          ? `${cfg.color}18`
                          : hasSelection
                          ? `${cfg.color}0D`
                          : colors.background,
                        borderColor: isOpen
                          ? cfg.color
                          : hasSelection
                          ? `${cfg.color}66`
                          : `${colors.border}`,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    {/* Left: icon + label */}
                    <View style={[styles.colIconWrap, { backgroundColor: `${cfg.color}22` }]}>
                      <MaterialIcons name={cfg.icon} size={18} color={cfg.color} />
                    </View>
                    <View style={styles.colInfo}>
                      <Text style={[styles.colLabel, { color: cfg.color }]}>{cfg.label}</Text>
                      <Text
                        style={[
                          styles.colValue,
                          { color: hasSelection ? colors.foreground : colors.mutedForeground },
                          hasSelection && { fontWeight: "700" },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedItem ? selectedItem.name : "— Seçiniz —"}
                      </Text>
                    </View>
                    {/* Right: status + chevron */}
                    <View style={styles.colRight}>
                      {hasSelection && (
                        <View style={[styles.checkBadge, { backgroundColor: `${cfg.color}22` }]}>
                          <MaterialIcons name="check" size={13} color={cfg.color} />
                        </View>
                      )}
                      <MaterialIcons
                        name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                        size={20}
                        color={isOpen ? cfg.color : colors.mutedForeground}
                      />
                    </View>
                  </Pressable>

                  {/* Options list */}
                  {isOpen && (
                    <Animated.View
                      entering={ZoomIn.duration(180).springify()}
                      style={[styles.optionList, { backgroundColor: colors.background, borderColor: `${cfg.color}44` }]}
                    >
                      <Pressable
                        onPress={() => {
                          if (col.key === "suspect") onSelectSuspect(null);
                          else if (col.key === "location") onSelectLocation(null);
                          else onSelectWeapon(null);
                          setActiveColumn(null);
                        }}
                        style={({ pressed }) => [
                          styles.optionItem,
                          { borderBottomColor: colors.border },
                          pressed && { backgroundColor: `${colors.border}40` },
                        ]}
                      >
                        <Text style={[styles.optionText, { color: colors.mutedForeground }]}>— Seçiniz —</Text>
                      </Pressable>
                      <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
                        {col.items.map((item) => {
                          const isSel = col.selected === item.id;
                          return (
                            <Pressable
                              key={item.id}
                              onPress={() => col.onSelect(item.id)}
                              style={({ pressed }) => [
                                styles.optionItem,
                                { borderBottomColor: colors.border },
                                isSel && { backgroundColor: `${cfg.color}15` },
                                pressed && { opacity: 0.7 },
                              ]}
                            >
                              {isSel && <MaterialIcons name="check" size={14} color={cfg.color} />}
                              <Text
                                style={[
                                  styles.optionText,
                                  { color: isSel ? cfg.color : colors.foreground },
                                  isSel && { fontWeight: "700" },
                                ]}
                              >
                                {item.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </Animated.View>
                  )}
                </Animated.View>
              );
            })}
          </View>

          {/* ── Submit ── */}
          <Animated.View style={btnStyle}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || disabled}
              onPressIn={() => { if (canSubmit && !disabled) btnScale.value = withSpring(0.97, { damping: 14, stiffness: 380 }); }}
              onPressOut={() => { btnScale.value = withSpring(1, { damping: 12, stiffness: 280 }); }}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: canSubmit && !disabled ? colors.primary : colors.muted,
                  borderColor: canSubmit && !disabled ? colors.primary : colors.border,
                  opacity: canSubmit && !disabled ? 1 : 0.55,
                },
              ]}
            >
              <MaterialIcons
                name="gavel"
                size={20}
                color={canSubmit && !disabled ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.submitText,
                  { color: canSubmit && !disabled ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                Raporu Gönder
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  centeredWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 60,
  },
  sheet: {
    width: "100%",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingBottom: 22,
    paddingTop: 16,
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#C8372D",
    zIndex: 10,
    pointerEvents: "none",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontFamily: "UnnaBold",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  sheetSubtitle: {
    fontFamily: "DroidSerifRegular",
    fontSize: 14,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  wrongToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C8372D",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  wrongToastText: {
    color: "#fff",
    fontFamily: "DroidSerifRegular",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  columnsContainer: {
    gap: 10,
  },
  colRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  colIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  colInfo: {
    flex: 1,
    gap: 2,
  },
  colLabel: {
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  colValue: {
    fontFamily: "DroidSerifRegular",
    fontSize: 16,
    fontWeight: "500",
  },
  colRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  optionList: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  optionText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 14,
    fontWeight: "500",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1.5,
    gap: 8,
    marginTop: 2,
  },
  submitText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
