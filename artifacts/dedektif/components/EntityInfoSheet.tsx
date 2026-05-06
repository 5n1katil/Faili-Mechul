import React, { useEffect } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { ComponentProps } from "react";

export type EntityType = "suspect" | "weapon" | "location";

export interface EntityInfo {
  type: EntityType;
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Props {
  visible: boolean;
  entity: EntityInfo | null;
  onClose: () => void;
}

function normalizeMaterialIconName(icon: string | undefined, type: EntityType): string {
  const fallback = type === "suspect" ? "person" : type === "weapon" ? "gavel" : "place";
  if (!icon || !icon.trim()) return fallback;
  const normalized = icon.trim().replace(/_/g, "-");
  if (normalized in MaterialIcons.glyphMap) return normalized;
  return fallback;
}

const TYPE_CONFIG: Record<EntityType, { label: string; color: string; bg: string; hint: string }> = {
  suspect: {
    label: "ŞÜPHELİ",
    color: "#A855F7",
    bg: "#1E1030",
    hint: "Bu kişinin fırsatı ve motifi var mıydı? Olayın yaşandığı yerde bulunuyor muydu?",
  },
  weapon: {
    label: "SİLAH",
    color: "#C8372D",
    bg: "#2E1010",
    hint: "Bu alet olay yerinde mevcut muydu? Kim tarafından temin edilebilirdi?",
  },
  location: {
    label: "MEKAN",
    color: "#D4A843",
    bg: "#2A1E08",
    hint: "Bu mekana kim erişebilirdi? Cinayet burada gerçekleşmiş olabilir mi?",
  },
};

export default function EntityInfoSheet({ visible, entity, onClose }: Props) {
  const colors = useColors();
  const translateY = useSharedValue(400);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(400, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!entity) return null;

  const config = TYPE_CONFIG[entity.type];
  const normalizedIcon = normalizeMaterialIconName(entity.icon, entity.type);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
            sheetStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={[styles.typeTag, { backgroundColor: config.bg, borderColor: config.color + "40" }]}>
            <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
          </View>

          <View style={[styles.iconRing, { backgroundColor: config.bg, borderColor: config.color }]}>
            <MaterialIcons
              name={normalizedIcon as ComponentProps<typeof MaterialIcons>["name"]}
              size={36}
              color={config.color}
            />
          </View>

          <Text style={[styles.entityName, { color: colors.foreground }]}>{entity.name}</Text>
          <Text style={[styles.entityDesc, { color: colors.mutedForeground }]}>{entity.description}</Text>

          <View style={[styles.hintBox, { backgroundColor: config.bg, borderColor: config.color + "30" }]}>
            <View style={styles.hintHeader}>
              <MaterialIcons name="tips-and-updates" size={13} color={config.color} />
              <Text style={[styles.hintLabel, { color: config.color }]}>DEDEKTİF İPUCU</Text>
            </View>
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>{config.hint}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable
            style={[styles.closeBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={onClose}
          >
            <MaterialIcons name="close" size={16} color={colors.mutedForeground} />
            <Text style={[styles.closeBtnText, { color: colors.mutedForeground }]}>Kapat</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  typeTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  entityName: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  entityDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  hintBox: {
    alignSelf: "stretch",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  hintHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hintLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    alignSelf: "stretch",
    marginTop: 4,
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
