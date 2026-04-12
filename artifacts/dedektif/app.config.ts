import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

  return {
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
      minimumOsVersion: "13.4",
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
        ],
        NSPrivacyCollectedDataTypes: [],
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
      },
      infoPlist: {
        NSUserNotificationUsageDescription:
          "Günlük bulmaca hatırlatmaları için bildirim göndermek istiyoruz.",
        NSPhotoLibraryUsageDescription:
          "Profil fotoğrafınızı seçmek için fotoğraf kütüphanesine erişim gerekiyor.",
        NSUserTrackingUsageDescription:
          "Uygulama deneyimini iyileştirmek ve içeriği kişiselleştirmek için kullanılır.",
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
          origin: "https://failimechul.app/",
        },
      ],
      "expo-font",
      "expo-web-browser",
      "expo-tracking-transparency",
      "./plugins/withRevenueCat",
      "./plugins/withPrivacyManifest",
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
};
