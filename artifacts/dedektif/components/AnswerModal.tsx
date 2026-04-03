import React, { useState } from "react";
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
import { useColors } from "@/hooks/useColors";
import type { Puzzle } from "@/data/puzzles";

interface Props {
  visible: boolean;
  puzzle: Puzzle;
  onSubmit: (suspectId: string, weaponId: string, locationId: string) => void;
  onClose: () => void;
}

export default function AnswerModal({ visible, puzzle, onSubmit, onClose }: Props) {
  const colors = useColors();
  const [suspect, setSuspect] = useState<string | null>(null);
  const [weapon, setWeapon] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  const canSubmit = suspect && weapon && location;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSubmit(suspect, weapon, location);
  };

  const renderOption = (
    id: string,
    label: string,
    selected: string | null,
    onSelect: (id: string) => void
  ) => {
    const isSelected = selected === id;
    return (
      <Pressable
        key={id}
        onPress={() => onSelect(id)}
        style={[
          styles.option,
          {
            backgroundColor: isSelected ? `${colors.primary}22` : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.radio,
            { borderColor: isSelected ? colors.primary : colors.mutedForeground },
          ]}
        >
          {isSelected && (
            <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
          )}
        </View>
        <Text
          style={[
            styles.optionText,
            { color: isSelected ? colors.primary : colors.foreground },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>Çözümünüz</Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              KATİL KİM?
            </Text>
            {puzzle.suspects.map((s) =>
              renderOption(s.id, s.name, suspect, setSuspect)
            )}

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              HANGİ SİLAHLA?
            </Text>
            {puzzle.weapons.map((w) =>
              renderOption(w.id, w.name, weapon, setWeapon)
            )}

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              NEREDE?
            </Text>
            {puzzle.locations.map((l) =>
              renderOption(l.id, l.name, location, setLocation)
            )}
          </ScrollView>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[
              styles.submitBtn,
              { backgroundColor: canSubmit ? colors.primary : colors.muted },
            ]}
          >
            <MaterialIcons
              name="gavel"
              size={20}
              color={canSubmit ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.submitText,
                { color: canSubmit ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              SUÇLAYAN KARARIM
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
