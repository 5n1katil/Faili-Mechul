#!/usr/bin/env node
// Regenerates utils/avatarAssetMap.ts from public/avatars/ directory.
// Run: node scripts/gen-avatar-map.js

const fs = require("fs");
const path = require("path");

const avatarsDir = path.join(__dirname, "../public/avatars");
const outputFile = path.join(__dirname, "../utils/avatarAssetMap.ts");

const files = fs.readdirSync(avatarsDir).sort();
const pngFiles = files.filter((f) => f.endsWith(".png"));
const svgFiles = files.filter((f) => f.endsWith(".svg"));

let out = "";
out += "// AUTO-GENERATED — do not edit manually\n";
out += "// Regenerate with: node scripts/gen-avatar-map.js\n";
out += 'import type { ImageSourcePropType } from "react-native";\n\n';

for (const f of pngFiles) {
  const varName =
    "p_" +
    f
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/^_+|_+$/g, "");
  out += `import ${varName} from "../public/avatars/${f}";\n`;
}
out += "\n";

for (const f of svgFiles) {
  const varName =
    "svg_" +
    f
      .replace(".svg", "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/^_+|_+$/g, "");
  out += `import ${varName} from "../public/avatars/${f}";\n`;
}
out += "\n";

out += "export const AVATAR_PNG_MAP: Record<string, ImageSourcePropType> = {\n";
for (const f of pngFiles) {
  const varName =
    "p_" +
    f
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/^_+|_+$/g, "");
  out += `  "${f}": ${varName},\n`;
}
out += "};\n\n";

out +=
  "export const AVATAR_SVG_MAP: Record<string, React.ComponentType<{ width?: number; height?: number; fill?: string; color?: string }>> = {\n";
for (const f of svgFiles) {
  const varName =
    "svg_" +
    f
      .replace(".svg", "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/^_+|_+$/g, "");
  const noExt = f.replace(".svg", "");
  out += `  "${f}": ${varName},\n`;
  out += `  "${noExt}": ${varName},\n`;
}
out += "};\n";

fs.writeFileSync(outputFile, out, "utf8");
console.log(
  `Generated avatarAssetMap.ts: ${pngFiles.length} PNG entries, ${svgFiles.length} SVG entries (${svgFiles.length * 2} SVG map keys)`
);
