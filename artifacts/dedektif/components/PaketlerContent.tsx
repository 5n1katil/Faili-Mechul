import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Linking,
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
  PURCHASABLE_PACKS,
  getPuzzlesForPack,
  getRawPuzzlesForPack,
  getDifficultyStars,
} from "@/data/packs";
import { useColors } from "@/hooks/useColors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIVACY_URL = "https://doc-hosting.flycricket.io/faili-mechul-privacy-policy/e9ef8c9c-2e2e-486c-b5ae-70d067237627/privacy";
const TERMS_URL = "https://doc-hosting.flycricket.io/faili-mechul-terms-of-use/4f269815-97dc-472b-b9a5-d57f8e1c8673/terms";

let _embeddedScrollY = 0;
let _embeddedExpandedPack: string | null = null;

export default function PaketlerContent({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { startPuzzle } = useGame();
  const { isPackPurchased, purchasePack, restorePurchases, isLoading, packPrices } = usePurchase();

  const totalPuzzles = PURCHASABLE_PACKS.reduce((sum, pack) => sum + getRawPuzzlesForPack(pack.packId).length, 0);

  const scrollRef = useRef<ScrollView>(null);

  // Restore expanded pack from module-level var so state survives game navigation
  const [expandedPack, setExpandedPack] = useState<string | null>(_embeddedExpandedPack);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Keep module-level var in sync with state changes (user toggling packs manually)
  useEffect(() => {
    if (embedded) _embeddedExpandedPack = expandedPack;
  }, [embedded, expandedPack]);

  useEffect(() => {
    if (!embedded) return;
    const savedY = _embeddedScrollY;
    if (savedY > 0) {
      // Slightly longer timeout to let the restored expanded pack render first
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: savedY, animated: false });
      }, 100);
    }
  }, [embedded]);

  const togglePack = useCallback((packId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPack((prev) => (prev === packId ? null : packId));
  }, []);

  const handlePurchase = useCallback(
    async (packId: string) => {
      setPurchasing(packId);
      const result = await purchasePack(packId, packPrices[packId] ?? "");
      setPurchasing(null);
      if (!result.success && result.message !== "Satın alma iptal edildi.") {
        Alert.alert("Satın Alma", result.message);
      }
    },
    [purchasePack, packPrices]
  );

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    Alert.alert(
      result.success ? "Geri Yükleme Başarılı" : "Geri Yükleme",
      result.message
    );
  }, [restorePurchases]);

  const handleStartPuzzle = useCallback(
    (packId: string, puzzleIndex: number) => {
      const puzzles = getPuzzlesForPack(packId);
      const puzzle = puzzles[puzzleIndex];
      if (!puzzle) return;
      startPuzzle(puzzle);
      if (!embedded) {
        router.push("/(tabs)/oyun");
      }
    },
    [startPuzzle, router, embedded]
  );

  const paddingTop = embedded ? 8 : (Platform.OS === "web" ? 67 : insets.top);
  const paddingBottom = embedded ? (insets.bottom + 80) : (insets.bottom + 80);

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: paddingTop + 8, paddingBottom },
      ]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={embedded ? (e) => { _embeddedScrollY = e.nativeEvent.contentOffset.y; } : undefined}
    >
      {/* Premium Paketler header — matches Premium Vakalar style */}
      <View style={styles.premHeader}>
        <MaterialIcons name="workspace-premium" size={22} color="#D4A843" />
        <Text style={styles.premHeaderTitle}>Premium Paketler</Text>
        <View style={styles.premHeaderBadge}>
          <Text style={styles.premHeaderBadgeText}>{PURCHASABLE_PACKS.length} Paket</Text>
        </View>
      </View>
      <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
        {PURCHASABLE_PACKS.length} farklı tema · {totalPuzzles} özgün vaka
      </Text>

      <Pressable
        onPress={handleRestore}
        disabled={restoring || isLoading}
        style={({ pressed }) => [
          styles.restoreBtn,
          { borderColor: colors.border, backgroundColor: colors.card, opacity: (restoring || isLoading || pressed) ? 0.5 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Önceki satın almalarımı geri yükle"
      >
        {restoring ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        ) : (
          <MaterialIcons name="restore" size={15} color={colors.mutedForeground} />
        )}
        <Text style={[styles.restoreBtnText, { color: colors.mutedForeground }]}>
          {restoring ? "Geri Yükleniyor…" : "Satın Almalarımı Geri Yükle"}
        </Text>
      </Pressable>

      {PURCHASABLE_PACKS.map((pack) => {
        const purchased = isPackPurchased(pack.packId);
        const isExpanded = expandedPack === pack.packId;
        const isPurchasing = purchasing === pack.packId;
        const rawPuzzles = getRawPuzzlesForPack(pack.packId);
        const displayPrice = isLoading ? "…" : (packPrices[pack.packId] ?? `₺${pack.price.toFixed(2)}`);

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
              accessibilityRole="button"
              accessibilityLabel={`${pack.packTitle} paketini ${isExpanded ? "kapat" : "aç"}`}
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
                    isLoading ? (
                      <ActivityIndicator size="small" color={pack.accentColor} style={{ width: 40 }} />
                    ) : (
                      <Text style={[styles.priceLabel, { color: pack.accentColor }]}>
                        {displayPrice}
                      </Text>
                    )
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
                        handlePurchase(pack.packId);
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
                    accessibilityRole="button"
                    accessibilityLabel={purchased ? `${rawPuzzle.title} vakasını oyna` : `${rawPuzzle.title} — satın al`}
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
                    onPress={() => !isPurchasing && handlePurchase(pack.packId)}
                    style={({ pressed }) => [
                      styles.purchaseBtn,
                      {
                        backgroundColor: isPurchasing
                          ? pack.packColor + "66"
                          : pack.accentColor,
                        opacity: isLoading || isPurchasing || pressed ? 0.7 : 1,
                      },
                    ]}
                    disabled={isLoading || isPurchasing}
                    accessibilityRole="button"
                    accessibilityLabel={`${pack.packTitle} paketini satın al — ${displayPrice}`}
                  >
                    {isPurchasing ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <>
                        <MaterialIcons name="shopping-cart" size={16} color="#000000" />
                        <Text style={styles.purchaseBtnText}>
                          Paketi Satın Al — {displayPrice}
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

      <View style={styles.legalRow}>
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_URL)}
          accessibilityRole="link"
          accessibilityLabel="Gizlilik Politikası"
          hitSlop={8}
        >
          <Text style={styles.legalLink}>Gizlilik Politikası</Text>
        </Pressable>
        <Text style={styles.legalSep}>·</Text>
        <Pressable
          onPress={() => Linking.openURL(TERMS_URL)}
          accessibilityRole="link"
          accessibilityLabel="Kullanım Şartları"
          hitSlop={8}
        >
          <Text style={styles.legalLink}>Kullanım Şartları</Text>
        </Pressable>
      </View>

      <Text style={styles.legalNote}>
        Tek seferlik ödeme · Abonelik yok · Aynı Apple ID / Google hesabıyla tüm cihazlarda geri yüklenebilir
      </Text>
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
  premHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  premHeaderTitle: {
    fontSize: 20,
    fontFamily: "UnnaBold",
    fontWeight: "700",
    letterSpacing: 0.4,
    color: "#D4A843",
    flexShrink: 1,
  },
  premHeaderBadge: {
    backgroundColor: "#D4A84330",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#D4A84360",
    alignItems: "center",
  },
  premHeaderBadgeText: {
    fontSize: 13,
    fontFamily: "UnnaBold",
    fontWeight: "800",
    color: "#D4A843",
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: "UnnaBold",
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  screenSubtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 2,
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: "500",
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
    fontFamily: "UnnaBold",
    fontWeight: "600",
    letterSpacing: 0.2,
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
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  legalLink: {
    fontSize: 12,
    color: "#888888",
    textDecorationLine: "underline",
  },
  legalSep: {
    fontSize: 12,
    color: "#555555",
  },
  legalNote: {
    fontSize: 11,
    color: "#555555",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
});
