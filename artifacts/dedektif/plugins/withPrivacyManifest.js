const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Expo config plugin that copies PrivacyInfo.xcprivacy into the iOS project
 * during EAS prebuild and registers it in the Xcode project file.
 *
 * Apple requires apps to declare which "required reason" APIs they access
 * (https://developer.apple.com/documentation/bundleresources/privacy_manifest_files).
 * This app uses AsyncStorage → NSUserDefaults (reason CA92.1).
 *
 * The source file lives at artifacts/dedektif/PrivacyInfo.xcprivacy.
 * EAS runs this plugin via `expo prebuild` before each iOS build.
 */
function withPrivacyManifest(config) {
  config = withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const { projectName, platformProjectRoot } = modConfig.modRequest;
      const projectRoot = modConfig.modRequest.projectRoot;

      const srcPath = path.join(projectRoot, "PrivacyInfo.xcprivacy");
      const destPath = path.join(platformProjectRoot, projectName, "PrivacyInfo.xcprivacy");

      if (!fs.existsSync(srcPath)) {
        throw new Error(
          `[withPrivacyManifest] Source file not found: ${srcPath}\n` +
          "Create PrivacyInfo.xcprivacy in the app root before building."
        );
      }

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);

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
