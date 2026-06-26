import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { VOLUME_STEPS, type VolumeStep } from "@/utils/soundSettings";

interface Props {
  label: string;
  subtitle?: string;
  value: VolumeStep;
  onChange: (value: VolumeStep) => void;
}

export default function VolumeStepControl({ label, subtitle, value, onChange }: Props) {
  const colors = useColors();
  const isMuted = value === 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
          ) : null}
        </View>
        <Text style={[styles.valueBadge, { color: isMuted ? colors.mutedForeground : colors.primary }]}>
          {isMuted ? "Kapalı" : `%${value}`}
        </Text>
      </View>

      <View style={styles.stepsRow}>
        {VOLUME_STEPS.filter((s) => s > 0).map((step) => {
          const active = value === step;
          return (
            <Pressable
              key={step}
              onPress={() => onChange(step)}
              style={[
                styles.stepChip,
                {
                  backgroundColor: active ? `${colors.primary}28` : colors.background,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.stepText,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {step}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => onChange(0)}
        style={[
          styles.muteBtn,
          {
            backgroundColor: isMuted ? `${colors.primary}22` : colors.background,
            borderColor: isMuted ? colors.primary : colors.border,
          },
        ]}
      >
        <MaterialIcons
          name={isMuted ? "volume-off" : "volume-mute"}
          size={18}
          color={isMuted ? colors.primary : colors.mutedForeground}
        />
        <Text style={[styles.muteText, { color: isMuted ? colors.primary : colors.mutedForeground }]}>
          Müziği kapat
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  label: { fontFamily: "DroidSerifRegular", fontSize: 15, fontWeight: "700" },
  subtitle: { fontFamily: "DroidSerifRegular", fontSize: 12, marginTop: 2, lineHeight: 17 },
  valueBadge: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "800", marginTop: 2 },
  stepsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  stepChip: {
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  stepText: { fontFamily: "DroidSerifRegular", fontSize: 12, fontWeight: "700" },
  muteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  muteText: { fontFamily: "DroidSerifRegular", fontSize: 13, fontWeight: "600" },
});
