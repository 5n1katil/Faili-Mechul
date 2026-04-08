import React from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { AvatarDisplay, PRESET_AVATARS } from "@/utils/avatarHelpers";
import { useColors } from "@/hooks/useColors";

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  visible: boolean;
  onClose: () => void;
}

export default function AvatarPicker({ value, onChange, visible, onClose }: AvatarPickerProps) {
  const colors = useColors();

  const handleGallery = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("İzin Gerekli", "Galeriye erişim için izin vermeniz gerekiyor.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onChange(`gallery:${result.assets[0].uri}`);
      onClose();
    }
  };

  const handlePreset = (key: string) => {
    onChange(key);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>Avatar Seç</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Hazır ikonlardan seç veya galerinden yükle
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <View style={styles.grid}>
              {PRESET_AVATARS.map((preset) => {
                const selected = value === preset.key;
                return (
                  <Pressable
                    key={preset.key}
                    onPress={() => handlePreset(preset.key)}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: selected ? `${colors.primary}22` : colors.background,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <AvatarDisplay
                      avatar={preset.key}
                      size={40}
                      color={selected ? colors.primary : colors.mutedForeground}
                      backgroundColor="transparent"
                    />
                    <Text
                      style={[
                        styles.cellLabel,
                        { color: selected ? colors.primary : colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {preset.label}
                    </Text>
                    {selected && (
                      <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                        <MaterialIcons name="check" size={10} color={colors.primaryForeground} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleGallery}
              style={[styles.galleryBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <MaterialIcons name="add-photo-alternate" size={22} color={colors.primary} />
              <Text style={[styles.galleryBtnText, { color: colors.primary }]}>Galeriden Fotoğraf Seç</Text>
            </Pressable>

            {value.startsWith("gallery:") && (
              <View style={styles.currentGalleryRow}>
                <AvatarDisplay
                  avatar={value}
                  size={40}
                  color={colors.primary}
                  backgroundColor={`${colors.primary}15`}
                />
                <Text style={[styles.currentGalleryText, { color: colors.mutedForeground }]}>
                  Galeriden seçildi
                </Text>
                <View style={[styles.checkBadgeInline, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="check" size={12} color={colors.primaryForeground} />
                </View>
              </View>
            )}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.border }]}
          >
            <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Kapat</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: "85%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  scroll: { flexGrow: 0 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 16,
  },
  cell: {
    width: 80,
    height: 88,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    position: "relative",
    paddingHorizontal: 4,
  },
  cellLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  checkBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  galleryBtnText: { fontSize: 14, fontWeight: "600" },
  currentGalleryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  currentGalleryText: { flex: 1, fontSize: 13 },
  checkBadgeInline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: { fontSize: 15, fontWeight: "700" },
});
