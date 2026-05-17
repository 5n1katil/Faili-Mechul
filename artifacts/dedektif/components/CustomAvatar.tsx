import React, { useId } from "react";
import { Image, Platform, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, Image as SvgImage, Mask, Rect } from "react-native-svg";
import { resolveAvatarUri } from "@/utils/avatarAssets";
import { AVATAR_PNG_MAP, AVATAR_SVG_MAP } from "@/utils/avatarAssetMap";

interface Props {
  icon: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

function resolveFileName(icon: string): string {
  const hasExt = /\.(svg|png|webp|jpg|jpeg|gif)$/i.test(icon);
  return hasExt ? icon : `${icon}.svg`;
}

/**
 * Monochrome suspect silhouette via CSS mask (web) or bundled static asset (native).
 * On native, PNG files use tintColor and SVG files use react-native-svg-transformer.
 * `icon` is extensionless for SVG pool entries, or includes `.png` for hand assets.
 */
export default function CustomAvatar({
  icon,
  size = 40,
  color = "currentColor",
  style,
}: Props) {
  const fill = color === "currentColor" ? "#FFFFFF" : color;
  const maskId = useId().replace(/:/g, "");

  if (Platform.OS === "web") {
    // Prefer PNG when a bundled PNG asset exists for this icon name
    const hasPng = AVATAR_PNG_MAP[`${icon}.png`] !== undefined;
    const webFileName = hasPng
      ? `${icon}.png`
      : /\.(svg|png|webp|jpg|jpeg|gif)$/i.test(icon)
      ? icon
      : `${icon}.svg`;
    const uri = `/avatars/${webFileName}`;
    const webMaskStyle = {
      WebkitMask: `url(${uri}) center/contain no-repeat`,
      mask: `url(${uri}) center/contain no-repeat`,
      WebkitMaskSize: "contain",
      maskSize: "contain",
    } as unknown as ViewStyle;
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            backgroundColor: fill,
          },
          webMaskStyle,
          style,
        ]}
      />
    );
  }

  // Native: use bundled static assets
  const fileName = resolveFileName(icon);

  // PNG: use tintColor to apply the desired color as a monochrome mask
  const pngSource =
    AVATAR_PNG_MAP[fileName] ??
    AVATAR_PNG_MAP[`${icon}.png`] ??
    AVATAR_PNG_MAP[icon];
  if (pngSource !== undefined) {
    return (
      <View
        style={[
          { width: size, height: size, alignItems: "center", justifyContent: "center" },
          style,
        ]}
      >
        <Image
          source={pngSource}
          style={{ width: size, height: size, tintColor: fill }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // SVG: use react-native-svg-transformer component with fill prop
  const SvgComponent = AVATAR_SVG_MAP[fileName] ?? AVATAR_SVG_MAP[icon];
  if (SvgComponent !== undefined) {
    return (
      <View
        style={[
          { width: size, height: size, alignItems: "center", justifyContent: "center" },
          style,
        ]}
      >
        <SvgComponent width={size} height={size} fill={fill} />
      </View>
    );
  }

  // Fallback: try URL-based SVG mask (original approach, covers edge cases)
  const uri = resolveAvatarUri(icon);
  return (
    <View
      style={[
        { width: size, height: size, alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <Mask id={maskId} x={0} y={0} width={size} height={size}>
            <SvgImage
              width={size}
              height={size}
              href={uri}
              preserveAspectRatio="xMidYMid meet"
            />
          </Mask>
        </Defs>
        <Rect width={size} height={size} fill={fill} mask={`url(#${maskId})`} />
      </Svg>
    </View>
  );
}
