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
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
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

const ICONS = {
  suspect: "person" as const,
  location: "location-on" as const,
  weapon: "gps-not-fixed" as const,
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
  const wrongToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (wrongToastRef.current) {
        clearTimeout(wrongToastRef.current);
        wrongToastRef.current = null;
      }
    };
  }, []);

  const canSubmit = Boolean(selectedSuspect && selectedWeapon && selectedLocation);

  const columns: { key: Column; label: string; items: { id: string; name: string }[]; selected: string | null; onSelect: (id: string) => void }[] = [
    {
      key: "suspect",
      label: "KİM",
      items: puzzle.suspects.map((s) => ({ id: s.id, name: s.name })),
      selected: selectedSuspect,
      onSelect: (id) => { onSelectSuspect(id); setActiveColumn(null); },
    },
    {
      key: "location",
      label: "NEREDE",
      items: puzzle.locations.map((l) => ({ id: l.id, name: l.name })),
      selected: selectedLocation,
      onSelect: (id) => { onSelectLocation(id); setActiveColumn(null); },
    },
    {
      key: "weapon",
      label: "NEYLE",
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

  const activeColData = activeColumn ? columns.find((c) => c.key === activeColumn) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={() => { setActiveColumn(null); onClose(); }} />

      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Animated.View pointerEvents="none" style={[styles.flashOverlay, flashStyle]} />

        <View style={styles.sheetHeader}>
          <View style={[styles.headerIconWrap, { backgroundColor: `${colors.primary}20` }]}>
            <MaterialIcons name="gps-fixed" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.sheetTitle, { color: colors.primary }]}>Son Çıkarım</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <MaterialIcons name="close" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {wrongToastVisible && (
          <Animated.View style={[styles.wrongToast, wrongToastStyle]}>
            <MaterialIcons name="warning" size={14} color="#fff" />
            <Text style={styles.wrongToastText}>Yanlış suçlama — +30 saniye eklendi!</Text>
          </Animated.View>
        )}

        <View style={styles.dropdownRow}>
          {columns.map((col) => {
            const isOpen = activeColumn === col.key;
            const selectedItem = col.items.find((i) => i.id === col.selected);
            return (
              <Pressable
                key={col.key}
                onPress={() => setActiveColumn(isOpen ? null : col.key)}
                style={[
                  styles.dropdownBtn,
                  {
                    backgroundColor: isOpen
                      ? `${colors.primary}18`
                      : col.selected
                      ? `${colors.primary}0D`
                      : colors.background,
                    borderColor: isOpen
                      ? colors.primary
                      : col.selected
                      ? `${colors.primary}66`
                      : colors.border,
                  },
                ]}
              >
                <View style={styles.dropdownBtnInner}>
                  <View style={styles.dropdownLabelRow}>
                    <MaterialIcons name={ICONS[col.key]} size={11} color={colors.mutedForeground} />
                    <Text style={[styles.dropdownLabel, { color: colors.mutedForeground }]}>
                      {col.label}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.dropdownValue,
                      { color: selectedItem ? colors.primary : colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedItem ? selectedItem.name : "— Seçiniz —"}
                  </Text>
                </View>
                <MaterialIcons
                  name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={18}
                  color={isOpen ? colors.primary : colors.mutedForeground}
                />
              </Pressable>
            );
          })}
        </View>

        {activeColData && (
          <View style={[styles.optionList, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Pressable
              onPress={() => {
                if (activeColumn === "suspect") onSelectSuspect(null);
                else if (activeColumn === "location") onSelectLocation(null);
                else if (activeColumn === "weapon") onSelectWeapon(null);
                setActiveColumn(null);
              }}
              style={[styles.optionItem, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.optionText, { color: colors.mutedForeground }]}>— Seçiniz —</Text>
            </Pressable>
            <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
              {activeColData.items.map((item) => {
                const isSelected = activeColData.selected === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => activeColData.onSelect(item.id)}
                    style={({ pressed }) => [
                      styles.optionItem,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: `${colors.primary}15` },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    {isSelected && (
                      <MaterialIcons name="check" size={14} color={colors.primary} />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        { color: isSelected ? colors.primary : colors.foreground },
                        isSelected && { fontWeight: "700" },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <Animated.View style={btnStyle}>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || disabled}
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit && !disabled ? colors.primary : colors.muted,
                borderColor: canSubmit && !disabled ? colors.primary : colors.border,
              },
            ]}
          >
            <MaterialIcons
              name="gavel"
              size={18}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 14,
    gap: 16,
    overflow: "hidden",
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#C8372D",
    zIndex: 10,
    pointerEvents: "none",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  wrongToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C8372D",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  wrongToastText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  dropdownRow: {
    flexDirection: "row",
    gap: 8,
  },
  dropdownBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    gap: 4,
  },
  dropdownBtnInner: {
    flex: 1,
    gap: 2,
  },
  dropdownLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  dropdownValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  optionList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 15,
    borderRadius: 13,
    borderWidth: 1,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
