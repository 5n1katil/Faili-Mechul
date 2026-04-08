import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

const PREMIUM_CACHE_KEY = "@dedektif_is_premium";
const PRODUCT_ID = "com.failimechul.dedektif.vaka_arsivi";
const ENTITLEMENT_ID = "premium";

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "";

type PurchaseContextType = {
  isPremium: boolean;
  isLoading: boolean;
  purchaseVacaArsivi: () => Promise<{ success: boolean; message: string }>;
  restorePurchases: () => Promise<{ success: boolean; message: string }>;
};

const PurchaseContext = createContext<PurchaseContextType | null>(null);

export function usePurchase(): PurchaseContextType {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be inside PurchaseProvider");
  return ctx;
}

async function checkEntitlement(): Promise<boolean> {
  if (Platform.OS === "web") {
    const cached = await AsyncStorage.getItem(PREMIUM_CACHE_KEY);
    return cached === "1";
  }
  try {
    const Purchases = require("react-native-purchases").default;
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch {
    const cached = await AsyncStorage.getItem(PREMIUM_CACHE_KEY);
    return cached === "1";
  }
}

function initRevenueCat() {
  if (Platform.OS === "web") return;
  const key = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  if (!key) return;
  try {
    const Purchases = require("react-native-purchases").default;
    Purchases.configure({ apiKey: key });
  } catch {}
}

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initRevenueCat();
    checkEntitlement().then((p) => {
      setIsPremium(p);
      setIsLoading(false);
    });
  }, []);

  const purchaseVacaArsivi = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(PREMIUM_CACHE_KEY, "1");
      setIsPremium(true);
      return { success: true, message: "Satın alma simüle edildi (web önizleme)." };
    }

    const key = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    if (!key) {
      await AsyncStorage.setItem(PREMIUM_CACHE_KEY, "1");
      setIsPremium(true);
      return { success: true, message: "Satın alma simüle edildi (API anahtarı yapılandırılmadı)." };
    }

    try {
      const Purchases = require("react-native-purchases").default;
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.find(
        (p: any) => p.product?.identifier === PRODUCT_ID
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
    } catch (err: any) {
      if (err?.code === "1" || err?.userCancelled) {
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

    const key = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    if (!key) {
      return { success: false, message: "RevenueCat yapılandırılmamış. Gerçek cihazda deneyin." };
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
    <PurchaseContext.Provider value={{ isPremium, isLoading, purchaseVacaArsivi, restorePurchases }}>
      {children}
    </PurchaseContext.Provider>
  );
}
