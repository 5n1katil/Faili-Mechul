import AsyncStorage from "@react-native-async-storage/async-storage";
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
  PURCHASES_ERROR_CODE,
  PurchasesPackage,
} from "react-native-purchases";

const PREMIUM_CACHE_KEY = "@dedektif_is_premium";
const PRODUCT_ID = "com.failimechul.dedektif.vaka_arsivi";
const ENTITLEMENT_ID = "premium";
const DEFAULT_PRICE_STRING = "₺79,99";

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "";

type PurchaseContextType = {
  isPremium: boolean;
  isLoading: boolean;
  priceString: string;
  purchaseVacaArsivi: () => Promise<{ success: boolean; message: string }>;
  restorePurchases: () => Promise<{ success: boolean; message: string }>;
};

const PurchaseContext = createContext<PurchaseContextType | null>(null);

export function usePurchase(): PurchaseContextType {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be inside PurchaseProvider");
  return ctx;
}

function getNativeKey(): string {
  return Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
}

function isRevenueCatConfigured(): boolean {
  return Platform.OS !== "web" && !!getNativeKey();
}

async function checkEntitlement(): Promise<boolean> {
  if (Platform.OS === "web") {
    const cached = await AsyncStorage.getItem(PREMIUM_CACHE_KEY);
    return cached === "1";
  }
  if (!isRevenueCatConfigured()) {
    return false;
  }
  try {
    const Purchases = require("react-native-purchases").default;
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch {
    return false;
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
    Purchases.configure({ apiKey: getNativeKey() });
  } catch {}
}

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [priceString, setPriceString] = useState(DEFAULT_PRICE_STRING);

  useEffect(() => {
    initRevenueCat();
    Promise.all([checkEntitlement(), fetchPriceString()]).then(([premium, price]) => {
      setIsPremium(premium);
      setPriceString(price);
      setIsLoading(false);
    });
  }, []);

  const purchaseVacaArsivi = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(PREMIUM_CACHE_KEY, "1");
      setIsPremium(true);
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
      const pkg: PurchasesPackage | undefined =
        offerings.current?.availablePackages?.find(
          (p: PurchasesPackage) => p.product?.identifier === PRODUCT_ID
        ) ?? offerings.current?.availablePackages?.[0];

      if (!pkg) {
        return { success: false, message: "Satın alma paketi bulunamadı. Lütfen daha sonra tekrar deneyin." };
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      if (active) {
        await AsyncStorage.setItem(PREMIUM_CACHE_KEY, "1");
        setIsPremium(true);
        return { success: true, message: "Vaka Arşivi'ne hoş geldiniz! Tüm vakalar açıldı." };
      }
      return { success: false, message: "Satın alma tamamlanamadı. Lütfen tekrar deneyin." };
    } catch (err: unknown) {
      const rcErr = err as PurchasesError & { userCancelled?: boolean };
      const CANCELLED = "1" as PURCHASES_ERROR_CODE;
      if (rcErr?.userCancelled === true || rcErr?.code === CANCELLED) {
        return { success: false, message: "Satın alma iptal edildi." };
      }
      return { success: false, message: "Bir hata oluştu. Lütfen internet bağlantınızı kontrol edin." };
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (Platform.OS === "web") {
      const cached = await AsyncStorage.getItem(PREMIUM_CACHE_KEY);
      if (cached === "1") {
        setIsPremium(true);
        return { success: true, message: "Satın almalar geri yüklendi." };
      }
      return { success: false, message: "Geri yüklenecek satın alma bulunamadı." };
    }

    if (!isRevenueCatConfigured()) {
      return { success: false, message: "App Store hesabınızla giriş yaparak gerçek cihazda deneyin." };
    }

    try {
      const Purchases = require("react-native-purchases").default;
      const info = await Purchases.restorePurchases();
      const active = !!info.entitlements.active[ENTITLEMENT_ID];
      if (active) {
        await AsyncStorage.setItem(PREMIUM_CACHE_KEY, "1");
        setIsPremium(true);
        return { success: true, message: "Satın almalar başarıyla geri yüklendi." };
      }
      return { success: false, message: "Bu hesaba ait satın alma bulunamadı." };
    } catch {
      return { success: false, message: "Geri yükleme başarısız oldu. Lütfen tekrar deneyin." };
    }
  }, []);

  return (
    <PurchaseContext.Provider value={{ isPremium, isLoading, priceString, purchaseVacaArsivi, restorePurchases }}>
      {children}
    </PurchaseContext.Provider>
  );
}
