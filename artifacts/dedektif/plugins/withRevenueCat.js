const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Expo config plugin for RevenueCat (react-native-purchases).
 *
 * react-native-purchases@9.x does not ship an app.plugin.js so this local
 * plugin handles the required native configuration:
 *
 * - Android: adds the BILLING permission to AndroidManifest.xml so Google
 *   Play Billing (used by RevenueCat) can function.
 * - iOS: no extra config needed — StoreKit.framework is linked automatically
 *   via CocoaPods auto-linking during `expo prebuild / eas build`.
 */
function withRevenueCat(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;

    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    const hasBilling = manifest["uses-permission"].some(
      (p) => p.$?.["android:name"] === "com.android.vending.BILLING"
    );

    if (!hasBilling) {
      manifest["uses-permission"].push({
        $: { "android:name": "com.android.vending.BILLING" },
      });
    }

    return androidConfig;
  });
}

module.exports = withRevenueCat;
