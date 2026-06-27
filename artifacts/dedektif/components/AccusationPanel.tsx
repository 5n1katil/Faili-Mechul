import React, { useRef, useState } from "react";
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
import type { Puzzle } from "@/data/puzzles";

interface Props {
  puzzle: Puzzle;
  selectedSuspect: string | null;
  selectedWeapon: string | null;
  selectedLocation: string | null;
  onSelectSuspect: (id: string) => void;
  onSelectWeapon: (id: string) => void;
  onSelectLocation: (id: string) => void;
  onSubmit: (suspectId: string, weaponId: string, locationId: string) => boolean | void;
  onWrongAnswer?: () => void;
  disabled?: boolean;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? `${colors.primary}22` : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 1.5 : 1,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {selected && (
        <MaterialIcons name="check-circle" size={12} color={colors.primary} />
      )}
      <Text
        style={[
          styles.chipText,
          { color: selected ? colors.primary : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AccusationPanel({
  puzzle,
  selectedSuspect,
  selectedWeapon,
  selectedLocation,
  onSelectSuspect,
  onSelectWeapon,
  onSelectLocation,
  onSubmit,
  onWrongAnswer,
  disabled,
}: Props) {
  const colors = useColors();
  const canSubmit = Boolean(selectedSuspect && selectedWeapon && selectedLocation);
  const btnScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const [wrongToastVisible, setWrongToastVisible] = useState(false);
  const wrongToastOpacity = useSharedValue(0);
  const wrongToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    onWrongAnswer?.();
  };

  const handleSubmit = () => {
    if (!canSubmit || disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const submitResult = onSubmit(selectedSuspect!, selectedWeapon!, selectedLocation!);
    if (submitResult === false) {
      showWrongFlash();
    }
  };

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const wrongToastStyle = useAnimatedStyle(() => ({
    opacity: wrongToastOpacity.value,
  }));

  const sections = [
    {
      label: "KİM",
      icon: "person" as const,
      items: puzzle.suspects.map((s) => ({ id: s.id, name: s.name })),
      selected: selectedSuspect,
      onSelect: onSelectSuspect,
    },
    {
      label: "NEREDE",
      icon: "location-on" as const,
      items: puzzle.locations.map((l) => ({ id: l.id, name: l.name })),
      selected: selectedLocation,
      onSelect: onSelectLocation,
    },
    {
      label: "NEYLE",
      icon: "gps-not-fixed" as const,
      items: puzzle.weapons.map((w) => ({ id: w.id, name: w.name })),
      selected: selectedWeapon,
      onSelect: onSelectWeapon,
    },
  ];

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, flashStyle]}
      />

      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.primary}22` }]}>
          <MaterialIcons name="gps-fixed" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>SON ÇIKARIM</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {[selectedSuspect, selectedWeapon, selectedLocation].filter(Boolean).length}/3 seçildi
        </Text>
      </View>

      {wrongToastVisible && (
        <Animated.View style={[styles.wrongToast, wrongToastStyle]}>
          <MaterialIcons name="gavel" size={14} color="#fff" />
          <Text style={styles.wrongToastText}>Yanlış suçlama — +30 saniye eklendi!</Text>
        </Animated.View>
      )}

      {sections.map((section) => (
        <View key={section.label} style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <MaterialIcons name={section.icon} size={12} color={colors.mutedForeground} />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {section.label}
            </Text>
            {section.selected && (
              <Text style={[styles.selectedName, { color: colors.primary }]} numberOfLines={1}>
                ← {section.items.find((i) => i.id === section.selected)?.name}
              </Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {section.items.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                selected={section.selected === item.id}
                onPress={() => !disabled && section.onSelect(item.id)}
              />
            ))}
          </ScrollView>
        </View>
      ))}

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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    overflow: "hidden",
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#C8372D",
    borderRadius: 14,
    zIndex: 1,
    pointerEvents: "none",
  },
  wrongToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C8372D",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    zIndex: 2,
  },
  wrongToastText: {
    color: "#fff",
    fontFamily: "DroidSerifRegular",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    flex: 1,
  },
  headerSub: {
    fontFamily: "DroidSerifRegular",
    fontSize: 11,
    fontWeight: "600",
  },
  section: {
    gap: 6,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sectionLabel: {
    fontFamily: "DroidSerifRegular",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  selectedName: {
    fontFamily: "DroidSerifRegular",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  chipText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    fontWeight: "600",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  submitText: {
    fontFamily: "DroidSerifRegular",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
