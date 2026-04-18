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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  AvatarDisplay,
  PRESET_AVATARS,
  CATEGORY_LABELS,
  getAvatarPreset,
  type AvatarCategory,
  type AvatarPreset,
} from "@/utils/avatarHelpers";

const CATEGORIES: AvatarCategory[] = ["dedektif", "hafiye", "supheji", "uzman", "efsane"];
const COLUMNS = 5;
const GOLD = "#D4A843";
const BG = "#0F1117";
const CARD = "#1A1F2E";
const BORDER = "#2A3050";

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

  const cellSize = Math.floor((screenWidth - 32 - (COLUMNS - 1) * 8) / COLUMNS);

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
      onChange(`gallery:${result.assets[0].uri}`);
      onClose();
    }
  };

  const renderItem = useCallback(({ item }: { item: AvatarPreset }) => {
    const selected = value === item.key;
    return (
      <Pressable
        onPress={() => handlePreset(item.key)}
        style={[
          styles.cell,
          {
            width: cellSize,
            height: cellSize + 22,
            borderColor: selected ? GOLD : BORDER,
            backgroundColor: selected ? `${GOLD}18` : CARD,
          },
        ]}
      >
        <AvatarDisplay avatar={item.key} size={cellSize - 16} />
        <Text style={[styles.cellLabel, selected && { color: GOLD }]} numberOfLines={1}>
          {item.label}
        </Text>
        {selected && (
          <View style={styles.checkBadge}>
            <MaterialIcons name="check" size={10} color="#0F1117" />
          </View>
        )}
      </Pressable>
    );
  }, [value, cellSize, handlePreset]);

  const keyExtractor = useCallback((item: AvatarPreset) => item.key, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<AvatarPreset> | null | undefined, index: number) => {
      const rowHeight = cellSize + 22 + 8;
      const row = Math.floor(index / COLUMNS);
      return { length: rowHeight, offset: rowHeight * row, index };
    },
    [cellSize],
  );

  const currentPreset = !value.startsWith("gallery:") ? getAvatarPreset(value) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 60 : insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Avatar Seç</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <MaterialIcons name="close" size={22} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Current avatar preview */}
        <View style={styles.previewRow}>
          <AvatarDisplay
            avatar={value}
            size={56}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.previewLabel}>Seçili Avatar</Text>
            <Text style={styles.previewName}>
              {value.startsWith("gallery:")
                ? "Galeriden fotoğraf"
                : currentPreset?.label ?? "—"}
            </Text>
          </View>
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabs}
        >
          {CATEGORIES.map((cat) => {
            const active = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => handleSelectCategory(cat)}
                style={[
                  styles.tab,
                  { borderColor: active ? GOLD : BORDER, backgroundColor: active ? `${GOLD}18` : CARD },
                ]}
              >
                <Text style={[styles.tabText, { color: active ? GOLD : "#6B7280" }]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Avatar grid */}
        <FlatList
          ref={flatListRef}
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={COLUMNS}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.row}
          style={styles.flatList}
        />

        {/* Gallery button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {value.startsWith("gallery:") && (
            <View style={styles.galleryCurrentRow}>
              <AvatarDisplay avatar={value} size={36} />
              <Text style={styles.galleryCurrentText}>Galeriden seçildi</Text>
              <MaterialIcons name="check-circle" size={18} color={GOLD} />
            </View>
          )}
          <Pressable onPress={handleGallery} style={styles.galleryBtn}>
            <MaterialIcons name="add-photo-alternate" size={22} color={GOLD} />
            <Text style={styles.galleryBtnText}>Galeriden Fotoğraf Seç</Text>
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
    fontSize: 18,
    fontWeight: "800",
    color: "#F9FAFB",
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 40,
    alignItems: "flex-end",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  previewLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  previewName: {
    fontSize: 16,
    color: "#F9FAFB",
    fontWeight: "700",
    marginTop: 2,
  },
  tabs: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  tab: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabText: {
    fontSize: 13,
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
    gap: 8,
    marginBottom: 8,
  },
  cell: {
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    position: "relative",
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  checkBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${GOLD}44`,
    paddingVertical: 14,
  },
  galleryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: GOLD,
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
    fontSize: 13,
    color: "#D1D5DB",
    fontWeight: "500",
  },
});
