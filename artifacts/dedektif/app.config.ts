import type { ExpoConfig, ConfigContext } from "expo/config";
import {
  withAndroidManifest,
  type AndroidConfig,
} from "expo/config-plugins";

function withRevenueCat(config: ExpoConfig): ExpoConfig {
  return withAndroidManifest(config, (androidConfig) => {
    const manifest: AndroidConfig.Manifest.AndroidManifest =
      androidConfig.modResults;

    const mainApplication = manifest.manifest;
    if (!mainApplication["uses-permission"]) {
      mainApplication["uses-permission"] = [];
    }

    const hasBilling = mainApplication["uses-permission"].some(
      (p) => p.$?.["android:name"] === "com.android.vending.BILLING"
    );

    if (!hasBilling) {
      mainApplication["uses-permission"].push({
        $: { "android:name": "com.android.vending.BILLING" },
      });
    }

    return androidConfig;
  });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

  const baseConfig: ExpoConfig = {
    ...config,
    name: "Faili Meçhul",
    slug: "dedektif",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "dedektif",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0F1117",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.failimechul.dedektif",
      buildNumber: "1",
      infoPlist: {
        NSUserNotificationUsageDescription:
          "Günlük bulmaca hatırlatmaları için",
      },
    },
    android: {
      package: "com.failimechul.dedektif",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#0F1117",
      },
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://replit.com/",
        },
      ],
      "expo-font",
      "expo-web-browser",
    ],
    extra: {
      revenueCatIosKey: iosKey,
      revenueCatAndroidKey: androidKey,
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };

  return withRevenueCat(baseConfig);
};
