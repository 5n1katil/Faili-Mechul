import React, { useRef } from "react";
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
import type { Puzzle } from "@/data/puzzles";

interface Props {
  puzzle: Puzzle;
  selectedSuspect: string | null;
  selectedWeapon: string | null;
  selectedLocation: string | null;
  onSelectSuspect: (id: string) => void;
  onSelectWeapon: (id: string) => void;
  onSelectLocation: (id: string) => void;
  onSubmit: (suspectId: string, weaponId: string, locationId: string) => void;
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
  disabled,
}: Props) {
  const colors = useColors();
  const canSubmit = Boolean(selectedSuspect && selectedWeapon && selectedLocation);
  const btnScale = useSharedValue(1);
  const btnColor = useSharedValue(0);

  const handleSubmit = () => {
    if (!canSubmit || disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSubmit(selectedSuspect!, selectedWeapon!, selectedLocation!);
  };

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
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
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.primary}22` }]}>
          <MaterialIcons name="gps-fixed" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>SON ÇIKARIM</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {[selectedSuspect, selectedWeapon, selectedLocation].filter(Boolean).length}/3 seçildi
        </Text>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
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
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    flex: 1,
  },
  headerSub: {
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
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  selectedName: {
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
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
