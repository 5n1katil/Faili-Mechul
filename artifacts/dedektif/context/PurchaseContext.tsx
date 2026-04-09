import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import type {
  PurchasesError,
  PurchasesPackage,
} from "react-native-purchases";
import { PURCHASES_ERROR_CODE } from "react-native-purchases";
import { PACK_PRODUCT_IDS } from "@/data/packs";

const PREMIUM_CACHE_KEY = "@dedektif_is_premium";
const PACK_CACHE_PREFIX = "@dedektif_pack_";
const PRODUCT_ID = "com.failimechul.dedektif.vaka_arsivi";
const ENTITLEMENT_ID = "premium";
const DEFAULT_PRICE_STRING = "₺79,99";

function getRevenueCatKey(): string {
  const extra = Constants.expoConfig?.extra as
    | { revenueCatIosKey?: string; revenueCatAndroidKey?: string }
    | undefined;
  const iosKey = extra?.revenueCatIosKey ?? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
  const androidKey = extra?.revenueCatAndroidKey ?? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
  return Platform.OS === "ios" ? iosKey : androidKey;
}

function isRevenueCatConfigured(): boolean {
  return Platform.OS !== "web" && !!getRevenueCatKey();
}

function packCacheKey(packId: string): string {
  return `${PACK_CACHE_PREFIX}${packId}`;
}

type PurchaseContextType = {
  isPremium: boolean;
  isLoading: boolean;
  priceString: string;
  purchaseVacaArsivi: () => Promise<{ success: boolean; message: string }>;
  restorePurchases: () => Promise<{ success: boolean; message: string }>;
  purchasedPacks: Record<string, boolean>;
  isPackPurchased: (packId: string) => boolean;
  purchasePack: (packId: string, priceString: string) => Promise<{ success: boolean; message: string }>;
};

const PurchaseContext = createContext<PurchaseContextType | null>(null);

export function usePurchase(): PurchaseContextType {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be inside PurchaseProvider");
  return ctx;
}

async function getCachedPremium(): Promise<boolean> {
  const cached = await AsyncStorage.getItem(PREMIUM_CACHE_KEY);
  return cached === "1";
}

async function loadCachedPacks(): Promise<Record<string, boolean>> {
  const packIds = Object.keys(PACK_PRODUCT_IDS);
  const result: Record<string, boolean> = {};
  await Promise.all(
    packIds.map(async (packId) => {
      const val = await AsyncStorage.getItem(packCacheKey(packId));
      result[packId] = val === "1";
    })
  );
  return result;
}

async function checkEntitlement(): Promise<boolean> {
  if (Platform.OS === "web") {
    return getCachedPremium();
  }
  if (!isRevenueCatConfigured()) {
    return false;
  }
  try {
    const Purchases = require("react-native-purchases").default;
    const info = await Purchases.getCustomerInfo();
    const active = !!info.entitlements.active[ENTITLEMENT_ID];
    await AsyncStorage.setItem(PREMIUM_CACHE_KEY, active ? "1" : "0");
    return active;
  } catch {
    return getCachedPremium();
  }
}

async function checkPackEntitlements(): Promise<Record<string, boolean>> {
  if (Platform.OS === "web") {
    return loadCachedPacks();
  }
  if (!isRevenueCatConfigured()) {
    return loadCachedPacks();
  }
  try {
    const Purchases = require("react-native-purchases").default;
    const info = await Purchases.getCustomerInfo();
    const result: Record<string, boolean> = {};
    for (const packId of Object.keys(PACK_PRODUCT_IDS)) {
      const productId = PACK_PRODUCT_IDS[packId];
      const purchased = (info.allPurchasedProductIdentifiers as string[]).includes(productId);
      result[packId] = purchased;
      await AsyncStorage.setItem(packCacheKey(packId), purchased ? "1" : "0");
    }
    return result;
  } catch {
    return loadCachedPacks();
  }
}

async function fetchPriceString(): Promise<string> {
  if (!isRevenueCatConfigured()) return DEFAULT_PRICE_STRING;
  try {
    const Purchases = require("react-native-purchases").default;
    const offerings = await Purchases.getOfferings();
    const pkg: PurchasesPackage | undefined =
      offerings.current?.availablePackages?.find(
        (p: PurchasesPackage) => p.product?.identifier === PRODUCT_ID
      ) ?? offerings.current?.availablePackages?.[0];
    return pkg?.product?.priceString ?? DEFAULT_PRICE_STRING;
  } catch {
    return DEFAULT_PRICE_STRING;
  }
}

function initRevenueCat(): void {
  if (!isRevenueCatConfigured()) return;
  try {
    const Purchases = require("react-native-purchases").default;
    Purchases.configure({ apiKey: getRevenueCatKey() });
  } catch {}
}

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [priceString, setPriceString] = useState(DEFAULT_PRICE_STRING);
  const [purchasedPacks, setPurchasedPacks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    initRevenueCat();
    Promise.all([
      checkEntitlement(),
      fetchPriceString(),
      checkPackEntitlements(),
    ]).then(([premium, price, packs]) => {
      setIsPremium(premium);
      setPriceString(price);
      setPurchasedPacks(packs);
      setIsLoading(false);
    });
  }, []);

  const isPackPurchased = useCallback(
    (packId: string): boolean => !!purchasedPacks[packId],
    [purchasedPacks]
  );

  const purchasePack = useCallback(
    async (packId: string, _priceLabel: string): Promise<{ success: boolean; message: string }> => {
      const productId = PACK_PRODUCT_IDS[packId];
      if (!productId) {
        return { success: false, message: "Geçersiz paket." };
      }

      if (Platform.OS === "web") {
        await AsyncStorage.setItem(packCacheKey(packId), "1");
        setPurchasedPacks((prev) => ({ ...prev, [packId]: true }));
        return { success: true, message: "Satın alma simüle edildi (web önizleme)." };
      }

      if (!isRevenueCatConfigured()) {
        return {
          success: false,
          message: "Uygulama mağaza satın almaları yapılandırılmamış. Lütfen App Store'dan deneyin.",
        };
      }

      try {
        const Purchases = require("react-native-purchases").default;
        const offerings = await Purchases.getOfferings();
        const allPackages: PurchasesPackage[] = [];
        for (const offering of Object.values(offerings.all as Record<string, { availablePackages: PurchasesPackage[] }>)) {
          allPackages.push(...offering.availablePackages);
        }
        const pkg: PurchasesPackage | undefined = allPackages.find(
          (p) => p.product?.identifier === productId
        );

        if (!pkg) {
          return {
            success: false,
            message: "Paket bulunamadı. Lütfen daha sonra tekrar deneyin.",
          };
        }

        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const purchased = (customerInfo.allPurchasedProductIdentifiers as string[]).includes(productId);

        if (purchased) {
          await AsyncStorage.setItem(packCacheKey(packId), "1");
          setPurchasedPacks((prev) => ({ ...prev, [packId]: true }));
          return { success: true, message: "Paket başarıyla satın alındı!" };
        }
        return { success: false, message: "Satın alma tamamlanamadı. Lütfen tekrar deneyin." };
      } catch (err: unknown) {
        const rcErr = err as PurchasesError & { userCancelled?: boolean };
        if (
          rcErr?.userCancelled === true ||
          rcErr?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
        ) {
          return { success: false, message: "Satın alma iptal edildi." };
        }
        return {
          success: false,
          message: "Bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.",
        };
      }
    },
    []
  );

  const purchaseVacaArsivi = useCallback(async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(PREMIUM_CACHE_KEY, "1");
      setIsPremium(true);
      return { success: true, message: "Satın alma simüle edildi (web önizleme)." };
    }

    if (!isRevenueCatConfigured()) {
      return {
        success: false,
        message:
          "Uygulama mağaza satın almaları yapılandırılmamış. Lütfen App Store'dan deneyin.",
      };
    }

    try {
      const Purchases = require("react-native-purchases").default;
      const offerings = await Purchases.getOfferings();
      const pkg: PurchasesPackage | undefined =
        offerings.current?.availablePackages?.find(
          (p: PurchasesPackage) => p.product?.identifier === PRODUCT_ID
        ) ?? offerings.current?.availablePackages?.[0];

      if (!pkg) {
        return {
          success: false,
          message: "Satın alma paketi bulunamadı. Lütfen daha sonra tekrar deneyin.",
        };
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      if (active) {
        await AsyncStorage.setItem(PREMIUM_CACHE_KEY, "1");
        setIsPremium(true);
        return {
          success: true,
          message: "Vaka Arşivi'ne hoş geldiniz! Tüm vakalar açıldı.",
        };
      }
      return {
        success: false,
        message: "Satın alma tamamlanamadı. Lütfen tekrar deneyin.",
      };
    } catch (err: unknown) {
      const rcErr = err as PurchasesError & { userCancelled?: boolean };
      if (
        rcErr?.userCancelled === true ||
        rcErr?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      ) {
        return { success: false, message: "Satın alma iptal edildi." };
      }
      return {
        success: false,
        message: "Bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.",
      };
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (Platform.OS === "web") {
      const cached = await AsyncStorage.getItem(PREMIUM_CACHE_KEY);
      const cachedPacks = await loadCachedPacks();
      const anyRestored = cached === "1" || Object.values(cachedPacks).some(Boolean);
      if (cached === "1") setIsPremium(true);
      setPurchasedPacks(cachedPacks);
      if (anyRestored) {
        return { success: true, message: "Satın almalar geri yüklendi." };
      }
      return {
        success: false,
        message: "Geri yüklenecek satın alma bulunamadı.",
      };
    }

    if (!isRevenueCatConfigured()) {
      return {
        success: false,
        message: "App Store hesabınızla giriş yaparak gerçek cihazda deneyin.",
      };
    }

    try {
      const Purchases = require("react-native-purchases").default;
      const info = await Purchases.restorePurchases();
      const active = !!info.entitlements.active[ENTITLEMENT_ID];
      if (active) {
        await AsyncStorage.setItem(PREMIUM_CACHE_KEY, "1");
        setIsPremium(true);
      }
      const restoredPacks: Record<string, boolean> = {};
      for (const packId of Object.keys(PACK_PRODUCT_IDS)) {
        const productId = PACK_PRODUCT_IDS[packId];
        const purchased = (info.allPurchasedProductIdentifiers as string[]).includes(productId);
        restoredPacks[packId] = purchased;
        await AsyncStorage.setItem(packCacheKey(packId), purchased ? "1" : "0");
      }
      setPurchasedPacks(restoredPacks);

      const anyRestored = active || Object.values(restoredPacks).some(Boolean);
      if (anyRestored) {
        return { success: true, message: "Satın almalar başarıyla geri yüklendi." };
      }
      return {
        success: false,
        message: "Bu hesaba ait satın alma bulunamadı.",
      };
    } catch {
      return {
        success: false,
        message: "Geri yükleme başarısız oldu. Lütfen tekrar deneyin.",
      };
    }
  }, []);

  return (
    <PurchaseContext.Provider
      value={{
        isPremium,
        isLoading,
        priceString,
        purchaseVacaArsivi,
        restorePurchases,
        purchasedPacks,
        isPackPurchased,
        purchasePack,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
}
