const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

const PRIVACY_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>NSPrivacyAccessedAPITypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>NSPrivacyAccessedAPIType</key>
\t\t\t<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
\t\t\t<key>NSPrivacyAccessedAPITypeReasons</key>
\t\t\t<array>
\t\t\t\t<string>CA92.1</string>
\t\t\t</array>
\t\t</dict>
\t</array>
\t<key>NSPrivacyCollectedDataTypes</key>
\t<array/>
\t<key>NSPrivacyTracking</key>
\t<false/>
\t<key>NSPrivacyTrackingDomains</key>
\t<array/>
</dict>
</plist>
`;

/**
 * Expo config plugin that creates PrivacyInfo.xcprivacy for iOS 17+.
 *
 * Apple requires apps to declare which "required reason" APIs they access.
 * AsyncStorage uses NSUserDefaults (reason CA92.1 — same-app access).
 * Without this manifest the App Store may reject the build.
 *
 * References:
 *   https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
 *   https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
 */
function withPrivacyManifest(config) {
  config = withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const { projectName, platformProjectRoot } = modConfig.modRequest;
      const destPath = path.join(platformProjectRoot, projectName, "PrivacyInfo.xcprivacy");
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, PRIVACY_MANIFEST, "utf8");
      return modConfig;
    },
  ]);

  config = withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults;
    const { projectName } = modConfig.modRequest;
    const fileName = "PrivacyInfo.xcprivacy";
    const filePath = `${projectName}/${fileName}`;

    const existingRefs = project.hash.project.objects["PBXFileReference"] ?? {};
    const alreadyAdded = Object.values(existingRefs).some(
      (ref) => typeof ref === "object" && ref.path === fileName
    );
    if (alreadyAdded) return modConfig;

    const target = project.getFirstTarget();
    if (target) {
      project.addResourceFile(filePath, { target: target.uuid });
    }

    return modConfig;
  });

  return config;
}

module.exports = withPrivacyManifest;
