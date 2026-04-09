import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "@/context/GameContext";
import { usePurchase } from "@/context/PurchaseContext";
import {
  PACKS,
  getPuzzlesForPack,
  getRawPuzzlesForPack,
  getDifficultyStars,
  getDifficultyLabel,
} from "@/data/packs";
import { useColors } from "@/hooks/useColors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PaketlerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { startPuzzle } = useGame();
  const { isPackPurchased, purchasePack, isLoading } = usePurchase();

  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const togglePack = useCallback((packId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPack((prev) => (prev === packId ? null : packId));
  }, []);

  const handlePurchase = useCallback(
    async (packId: string, packTitle: string, price: number) => {
      setPurchasing(packId);
      const priceLabel = `₺${price.toFixed(2)}`;
      const result = await purchasePack(packId, priceLabel);
      setPurchasing(null);
      if (!result.success && result.message !== "Satın alma iptal edildi.") {
        Alert.alert("Satın Alma", result.message);
      }
    },
    [purchasePack]
  );

  const handleStartPuzzle = useCallback(
    (packId: string, puzzleIndex: number) => {
      const puzzles = getPuzzlesForPack(packId);
      const puzzle = puzzles[puzzleIndex];
      if (!puzzle) return;
      startPuzzle(puzzle);
      router.push("/(tabs)/oyun");
    },
    [startPuzzle, router]
  );

  const paddingTop = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: paddingTop + 8, paddingBottom: insets.bottom + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.primary }]}>
        Premium Paketler
      </Text>
      <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
        5 farklı tema, 25 özgün vaka
      </Text>

      {PACKS.map((pack) => {
        const purchased = isPackPurchased(pack.packId);
        const isExpanded = expandedPack === pack.packId;
        const isPurchasing = purchasing === pack.packId;
        const rawPuzzles = getRawPuzzlesForPack(pack.packId);

        return (
          <View
            key={pack.packId}
            style={[
              styles.packCard,
              {
                borderColor: isExpanded ? pack.accentColor : pack.packColor + "44",
                backgroundColor: pack.packColor + "18",
              },
            ]}
          >
            <Pressable
              onPress={() => togglePack(pack.packId)}
              style={styles.packHeader}
              android_ripple={{ color: pack.accentColor + "22" }}
            >
              <Text style={styles.packIconEmoji}>{pack.packIcon}</Text>
              <View style={styles.packHeaderText}>
                <Text style={[styles.packTitle, { color: pack.accentColor }]}>
                  {pack.packTitle}
                </Text>
                <Text style={[styles.packSubtitle, { color: "#AAAAAA" }]}>
                  {pack.packSubtitle}
                </Text>
                <View style={styles.packMeta}>
                  <Text style={[styles.puzzleCountBadge, { color: pack.accentColor }]}>
                    5 Vaka
                  </Text>
                  {purchased ? (
                    <View style={[styles.ownedBadge, { backgroundColor: "#2D7D4622" }]}>
                      <MaterialIcons name="check-circle" size={12} color="#4CAF50" />
                      <Text style={[styles.ownedText, { color: "#4CAF50" }]}>Sahip</Text>
                    </View>
                  ) : (
                    <Text style={[styles.priceLabel, { color: pack.accentColor }]}>
                      ₺{pack.price.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
              <MaterialIcons
                name={isExpanded ? "expand-less" : "expand-more"}
                size={24}
                color={pack.accentColor}
              />
            </Pressable>

            {isExpanded && (
              <View style={styles.packBody}>
                <Text style={[styles.packDescription, { color: "#BBBBBB" }]}>
                  {pack.description}
                </Text>

                {rawPuzzles.map((rawPuzzle, idx) => (
                  <Pressable
                    key={rawPuzzle.puzzleId}
                    onPress={() => {
                      if (!purchased) {
                        handlePurchase(pack.packId, pack.packTitle, pack.price);
                        return;
                      }
                      handleStartPuzzle(pack.packId, idx);
                    }}
                    style={[
                      styles.puzzleRow,
                      {
                        borderColor: purchased
                          ? pack.packColor + "44"
                          : "#33333388",
                        backgroundColor: purchased
                          ? pack.packColor + "22"
                          : "#1A1A1A",
                      },
                    ]}
                  >
                    <View style={styles.puzzleRowLeft}>
                      <Text style={[styles.puzzleDifficulty, { color: pack.accentColor }]}>
                        {getDifficultyStars(rawPuzzle.difficulty)}
                      </Text>
                      <Text
                        style={[
                          styles.puzzleTitle,
                          { color: purchased ? "#EEEEEE" : "#666666" },
                        ]}
                        numberOfLines={1}
                      >
                        {rawPuzzle.title}
                      </Text>
                      <Text style={[styles.puzzleSubtitle, { color: "#777777" }]} numberOfLines={1}>
                        {rawPuzzle.subtitle}
                      </Text>
                    </View>
                    <View style={styles.puzzleRowRight}>
                      {purchased ? (
                        <MaterialIcons name="play-circle-outline" size={22} color={pack.accentColor} />
                      ) : (
                        <MaterialIcons name="lock" size={18} color="#555555" />
                      )}
                    </View>
                  </Pressable>
                ))}

                {!purchased && (
                  <Pressable
                    onPress={() =>
                      !isPurchasing && handlePurchase(pack.packId, pack.packTitle, pack.price)
                    }
                    style={[
                      styles.purchaseBtn,
                      {
                        backgroundColor: isPurchasing
                          ? pack.packColor + "66"
                          : pack.accentColor,
                        opacity: isLoading || isPurchasing ? 0.7 : 1,
                      },
                    ]}
                    disabled={isLoading || isPurchasing}
                  >
                    {isPurchasing ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <>
                        <MaterialIcons name="shopping-cart" size={16} color="#000000" />
                        <Text style={styles.purchaseBtnText}>
                          Paketi Satın Al — ₺{pack.price.toFixed(2)}
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.footer}>
        <MaterialIcons name="info-outline" size={14} color="#555555" />
        <Text style={[styles.footerText, { color: "#555555" }]}>
          RevenueCat üzerinden güvenli ödeme. Satın aldıktan sonra başka cihazlarda geri yükleyebilirsiniz.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  screenSubtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  packCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  packHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  packIconEmoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  packHeaderText: {
    flex: 1,
    gap: 2,
  },
  packTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  packSubtitle: {
    fontSize: 12,
    fontStyle: "italic",
  },
  packMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  puzzleCountBadge: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.8,
  },
  ownedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  ownedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  packBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  packDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  puzzleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  puzzleRowLeft: {
    flex: 1,
    gap: 1,
  },
  puzzleDifficulty: {
    fontSize: 11,
    letterSpacing: 2,
  },
  puzzleTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  puzzleSubtitle: {
    fontSize: 11,
    fontStyle: "italic",
  },
  puzzleRowRight: {
    width: 28,
    alignItems: "center",
  },
  purchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 4,
  },
  purchaseBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
