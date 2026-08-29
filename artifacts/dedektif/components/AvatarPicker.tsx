import React, { useState, useCallback, useRef } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  AvatarDisplay,
  PRESET_AVATARS,
  CATEGORY_LABELS,
  getAvatarPreset,
  type AvatarCategory,
  type AvatarPreset,
} from "@/utils/avatarHelpers";

const CATEGORIES: AvatarCategory[] = ["dedektif", "gorevli", "ajan", "uzman"];
const COLUMNS = 4;
const GOLD = "#D4A843";
const BG = "#0F1117";
const CARD = "#1A1F2E";
const BORDER = "#2A3050";
const ACCENT_BLUE = "#1E2A4A";

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  visible: boolean;
  onClose: () => void;
}

export default function AvatarPicker({ value, onChange, visible, onClose }: AvatarPickerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>("dedektif");
  const flatListRef = useRef<FlatList<AvatarPreset>>(null);

  const PAD = 16;
  const GAP = 10;
  const cellSize = Math.floor((screenWidth - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const filtered = PRESET_AVATARS.filter((p) => p.category === activeCategory);

  const handleSelectCategory = useCallback((cat: AvatarCategory) => {
    setActiveCategory(cat);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const handlePreset = useCallback((key: string) => {
    onChange(key);
    onClose();
  }, [onChange, onClose]);

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
      const pickedUri = result.assets[0].uri;
      let stableUri = pickedUri;
      if (Platform.OS !== "web" && FileSystem.documentDirectory) {
        try {
          const avatarDir = `${FileSystem.documentDirectory}avatars/`;
          const dirInfo = await FileSystem.getInfoAsync(avatarDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(avatarDir, { intermediates: true });
          }
          const ext = pickedUri.split(".").pop()?.split("?")[0] ?? "jpg";
          const fileName = `avatar_${Date.now()}.${ext}`;
          const destPath = `${avatarDir}${fileName}`;
          await FileSystem.copyAsync({ from: pickedUri, to: destPath });
          stableUri = destPath;
        } catch {
          stableUri = pickedUri;
        }
      }
      onChange(`gallery:${stableUri}`);
      onClose();
    }
  };

  const renderItem = useCallback(({ item }: { item: AvatarPreset }) => {
    const selected = value === item.key;
    return (
      <Pressable
        onPress={() => handlePreset(item.key)}
        style={({ pressed }) => [
          styles.cell,
          {
            width: cellSize,
            height: cellSize + 28,
            borderColor: selected ? GOLD : BORDER,
            backgroundColor: selected ? `${GOLD}12` : CARD,
            opacity: pressed ? 0.82 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
          selected && styles.cellSelected,
        ]}
      >
        <View style={[styles.imageWrap, { width: cellSize - 8, height: cellSize - 8 }]}>
          <AvatarDisplay
            avatar={item.key}
            size={cellSize - 8}
            borderRadius={12}
          />
          {selected && (
            <View style={styles.checkOverlay}>
              <MaterialIcons name="check-circle" size={22} color={GOLD} />
            </View>
          )}
        </View>
        <Text style={[styles.cellLabel, selected && { color: GOLD, fontFamily: "UnnaBold" }]} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    );
  }, [value, cellSize, handlePreset]);

  const keyExtractor = useCallback((item: AvatarPreset) => item.key, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<AvatarPreset> | null | undefined, index: number) => {
      const rowHeight = cellSize + 28 + GAP;
      const row = Math.floor(index / COLUMNS);
      return { length: rowHeight, offset: rowHeight * row, index };
    },
    [cellSize],
  );

  const currentPreset = !value.startsWith("gallery:") ? getAvatarPreset(value) : null;
  const currentLabel = value.startsWith("gallery:")
    ? "Galeriden fotoğraf"
    : currentPreset?.label ?? "—";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 60 : insets.top }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={styles.headerTitle}>Avatar Seç</Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.6, transform: [{ scale: 0.88 }] },
            ]}
          >
            <MaterialIcons name="close" size={24} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* ── Current avatar preview ── */}
        <LinearGradient
          colors={[`${ACCENT_BLUE}CC`, BG]}
          style={styles.previewGradient}
        >
          <View style={styles.previewRow}>
            <View style={styles.previewAvatarWrap}>
              <AvatarDisplay avatar={value} size={72} borderRadius={16} />
              {!value.startsWith("gallery:") && (
                <View style={styles.previewBadge}>
                  <MaterialIcons name="star" size={10} color={GOLD} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewSublabel}>SEÇİLİ AVATAR</Text>
              <Text style={styles.previewName}>{currentLabel}</Text>
              <Text style={styles.previewCategory}>
                {value.startsWith("gallery:")
                  ? "Kendi fotoğrafın"
                  : currentPreset
                  ? CATEGORY_LABELS[currentPreset.category]
                  : ""}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Category tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabs}
        >
          {CATEGORIES.map((cat) => {
            const active = cat === activeCategory;
            const count = PRESET_AVATARS.filter((p) => p.category === cat).length;
            return (
              <Pressable
                key={cat}
                onPress={() => handleSelectCategory(cat)}
                style={[
                  styles.tab,
                  { borderColor: active ? GOLD : BORDER, backgroundColor: active ? `${GOLD}1A` : "transparent" },
                ]}
              >
                <Text style={[styles.tabText, { color: active ? GOLD : "#6B7280" }]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
                <View style={[styles.tabCount, { backgroundColor: active ? `${GOLD}30` : `${BORDER}80` }]}>
                  <Text style={[styles.tabCountText, { color: active ? GOLD : "#6B7280" }]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Avatar grid ── */}
        <FlatList
          ref={flatListRef}
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={COLUMNS}
          getItemLayout={getItemLayout}
          contentContainerStyle={[styles.gridContent, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.row}
          style={styles.flatList}
        />

        {/* ── Gallery button (floating) ── */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {value.startsWith("gallery:") && (
            <View style={styles.galleryCurrentRow}>
              <AvatarDisplay avatar={value} size={34} borderRadius={10} />
              <Text style={styles.galleryCurrentText}>Galeriden seçildi</Text>
              <MaterialIcons name="check-circle" size={18} color={GOLD} />
            </View>
          )}
          <Pressable
            onPress={handleGallery}
            style={({ pressed }) => [
              styles.galleryBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={[`${GOLD}20`, `${GOLD}08`]}
              style={styles.galleryBtnInner}
            >
              <MaterialIcons name="add-photo-alternate" size={22} color={GOLD} />
              <Text style={styles.galleryBtnText}>Galeriden Fotoğraf Seç</Text>
            </LinearGradient>
          </Pressable>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontFamily: "UnnaBold",
    fontSize: 19,
    fontWeight: "700",
    color: "#F9FAFB",
    letterSpacing: 0.4,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },

  previewGradient: {
    borderBottomWidth: 1,
    borderBottomColor: `${BORDER}80`,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  previewAvatarWrap: {
    position: "relative",
  },
  previewBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  previewSublabel: {
    fontFamily: "UnnaBold",
    fontSize: 10,
    color: "#6B7280",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  previewName: {
    fontFamily: "UnnaBold",
    fontSize: 18,
    color: "#F9FAFB",
    fontWeight: "700",
  },
  previewCategory: {
    fontFamily: "DroidSerifRegular",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    fontStyle: "italic",
  },

  tabs: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tabsContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabText: {
    fontFamily: "UnnaBold",
    fontSize: 13,
    fontWeight: "700",
  },
  tabCount: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabCountText: {
    fontFamily: "UnnaBold",
    fontSize: 11,
    fontWeight: "700",
  },

  flatList: {
    flex: 1,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 8,
  },
  row: {
    gap: 10,
    marginBottom: 10,
  },
  cell: {
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 5,
    paddingBottom: 6,
    position: "relative",
    overflow: "hidden",
  },
  cellSelected: {
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  imageWrap: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  checkOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(15,17,23,0.75)",
    borderRadius: 12,
    padding: 1,
  },
  cellLabel: {
    fontFamily: "DroidSerifRegular",
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 5,
    paddingHorizontal: 4,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    backgroundColor: `${BG}F0`,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  galleryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${GOLD}44`,
    overflow: "hidden",
  },
  galleryBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },
  galleryBtnText: {
    fontFamily: "UnnaBold",
    fontSize: 15,
    fontWeight: "700",
    color: GOLD,
    letterSpacing: 0.3,
  },
  galleryCurrentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: `${GOLD}10`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  galleryCurrentText: {
    flex: 1,
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    color: "#D1D5DB",
    fontWeight: "500",
  },
});
