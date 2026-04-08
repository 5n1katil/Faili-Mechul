import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  selectedSuspect: string | null;
  selectedWeapon: string | null;
  selectedLocation: string | null;
  suspectName: string | null;
  weaponName: string | null;
  locationName: string | null;
  onOpen: () => void;
  disabled?: boolean;
}

export default function StickyAccuseBar({
  selectedSuspect,
  selectedWeapon,
  selectedLocation,
  suspectName,
  weaponName,
  locationName,
  onOpen,
  disabled,
}: Props) {
  const colors = useColors();
  const selectedCount = [selectedSuspect, selectedWeapon, selectedLocation].filter(Boolean).length;
  const allSelected = selectedCount === 3;

  const chips = [
    { key: "suspect", name: suspectName, icon: "person" as const },
    { key: "location", name: locationName, icon: "location-on" as const },
    { key: "weapon", name: weaponName, icon: "gps-not-fixed" as const },
  ];

  return (
    <Pressable
      onPress={disabled ? undefined : onOpen}
      style={({ pressed }) => [
        styles.bar,
        {
          backgroundColor: colors.card,
          borderColor: allSelected ? `${colors.primary}66` : colors.border,
          opacity: pressed && !disabled ? 0.85 : 1,
        },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}20` }]}>
          <MaterialIcons name="gps-fixed" size={15} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.primary }]}>SON ÇIKARIM</Text>
          <View style={styles.chipRow}>
            {chips.map(({ key, name, icon }) => (
              <View
                key={key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: name ? `${colors.primary}15` : colors.background,
                    borderColor: name ? `${colors.primary}44` : colors.border,
                  },
                ]}
              >
                <MaterialIcons
                  name={icon}
                  size={10}
                  color={name ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[styles.chipText, { color: name ? colors.primary : colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {name ?? "—"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.openBtn, { backgroundColor: allSelected ? colors.primary : `${colors.primary}22` }]}>
        <MaterialIcons
          name="keyboard-arrow-up"
          size={20}
          color={allSelected ? colors.primaryForeground : colors.primary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 5,
  },
  title: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  chipRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "nowrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
    flexShrink: 1,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "600",
    flexShrink: 1,
  },
  openBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
