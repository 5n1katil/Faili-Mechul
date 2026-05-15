import React, { useId } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, Image as SvgImage, Mask, Rect } from "react-native-svg";
import { resolveAvatarUri } from "@/utils/avatarAssets";

interface Props {
  icon: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Monochrome suspect silhouette via CSS mask (web) or SVG mask (native).
 * `icon` is extensionless for SVG pool entries, or includes `.png` for hand assets.
 */
export default function CustomAvatar({
  icon,
  size = 40,
  color = "currentColor",
  style,
}: Props) {
  const uri = resolveAvatarUri(icon);
  const fill = color === "currentColor" ? "#FFFFFF" : color;
  const maskId = useId().replace(/:/g, "");

  if (Platform.OS === "web") {
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
