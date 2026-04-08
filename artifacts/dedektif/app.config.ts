import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
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
      NSUserNotificationUsageDescription: "Günlük bulmaca hatırlatmaları için",
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
    revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "",
    revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "",
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
