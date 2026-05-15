import React from "react";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

/**
 * Noir tek renk vektör büstler — silah/mekan hücrelerindeki Material ikonlarla aynı okuma:
 * düz dolgu, 24×24 grid, yüz veya boydan silüet.
 */
export const SUSPECT_PORTRAIT_KEYS = [
  "noir-f-bun-glasses",
  "noir-m-suit-receding",
  "noir-m-worker-towel",
  "noir-m-captain-cap",
  "noir-f-elder-shawl",
  "noir-m-elder-cane",
  "noir-m-security-cap",
  "noir-f-lab-coat",
  "noir-m-lab-coat",
  "noir-m-chef",
  "noir-f-chef",
  "noir-m-artist-beret",
  "noir-f-artist-hair",
  "noir-m-office-tie",
  "noir-f-office",
  "noir-m-sailor",
  "noir-m-hoodie",
  "noir-f-ponytail",
  "noir-m-beard-full",
  "noir-m-student",
  "noir-f-student",
  "noir-m-hard-hat",
  "noir-f-hard-hat",
  "noir-m-police",
  "noir-f-police",
  "noir-m-athletic",
  "noir-f-athletic",
  "noir-generic-m",
  "noir-generic-f",
] as const;

export type SuspectPortraitKey = (typeof SUSPECT_PORTRAIT_KEYS)[number];

export function isSuspectPortraitKey(s: string): s is SuspectPortraitKey {
  return (SUSPECT_PORTRAIT_KEYS as readonly string[]).includes(s);
}

function Glasses({ color }: { color: string }) {
  return (
    <Path
      d="M9 9.6h6"
      stroke={color}
      strokeWidth={0.65}
      strokeLinecap="round"
      fill="none"
    />
  );
}

function renderPortrait(key: SuspectPortraitKey, color: string): React.ReactNode {
  const f = { fill: color };
  switch (key) {
    case "noir-f-bun-glasses":
      return (
        <G>
          <Ellipse cx={12} cy={5.2} rx={2.4} ry={1.35} {...f} />
          <Circle cx={12} cy={10} r={3.4} {...f} />
          <Path
            d="M8.5 13.2c1.2-.8 2.8-1 3.5-1s2.3.2 3.5 1l1.1 8.3h-9.2l1.1-8.3z"
            {...f}
          />
          <Glasses color={color} />
        </G>
      );
    case "noir-m-suit-receding":
      return (
        <G>
          <Path
            d="M9 5.8q3-1.2 6 0 1.2 1.8 1.2 3.8 0 2.8-2.2 3.8-1.8.8-3.8.8t-3.8-.8q-2.2-1-2.2-3.8 0-2 1.2-3.8z"
            {...f}
          />
          <Path d="M5.5 13.5l1.2-1.8h10.6l1.2 1.8-.3 8.5h-12.4l-.3-8.5z" {...f} />
          <Path d="M12 13.8l-.6 8.2h1.2l-.6-8.2z" fill={color} opacity={0.85} />
        </G>
      );
    case "noir-m-worker-towel":
      return (
        <G>
          <Circle cx={12} cy={8.2} r={2.7} {...f} />
          <Path d="M3.5 11.5l1.5-1.2h14l1.5 1.2-.5 10.5h-16l-.5-10.5z" {...f} />
          <Path
            d="M7 14.5h10"
            stroke={color}
            strokeWidth={0.9}
            strokeLinecap="round"
            fill="none"
            opacity={0.9}
          />
        </G>
      );
    case "noir-m-captain-cap":
      return (
        <G>
          <Path d="M7 7.5l5-2.2 5 2.2v1.2H7V7.5z" {...f} />
          <Circle cx={12} cy={11.5} r={3.2} {...f} />
          <Path d="M6.5 14.5h11l-1 7.5h-9l-1-7.5z" {...f} />
        </G>
      );
    case "noir-f-elder-shawl":
      return (
        <G>
          <Circle cx={12} cy={9.5} r={3.2} {...f} />
          <Path
            d="M6 13q6 2 12 0l1.5 9h-15l1.5-9z"
            {...f}
          />
          <Path d="M8 12q4 2.5 8 0" stroke={color} strokeWidth={0.6} fill="none" opacity={0.85} />
        </G>
      );
    case "noir-m-elder-cane":
      return (
        <G>
          <Circle cx={12} cy={9} r={3.1} {...f} />
          <Path d="M6 13.5h8.5v8h-6.5l-2-8z" {...f} />
          <Path
            d="M17.5 8v14"
            stroke={color}
            strokeWidth={1.1}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      );
    case "noir-m-security-cap":
      return (
        <G>
          <Path d="M8.5 6.5h7L16 9H8l-.5-2.5z" {...f} />
          <Circle cx={12} cy={11.5} r={3.1} {...f} />
          <Path d="M6 14h12v8H6v-8z" {...f} />
        </G>
      );
    case "noir-f-lab-coat":
      return (
        <G>
          <Circle cx={12} cy={9.5} r={3.1} {...f} />
          <Path d="M7.5 13h9l1.5 9h-12l1.5-9z" {...f} />
          <Path d="M12 13v6" stroke={color} strokeWidth={0.55} fill="none" opacity={0.8} />
        </G>
      );
    case "noir-m-lab-coat":
      return (
        <G>
          <Circle cx={12} cy={9} r={3.2} {...f} />
          <Path d="M6.5 12.8h11l1 9.2h-13l1-9.2z" {...f} />
          <Path d="M12 12.8v5.5" stroke={color} strokeWidth={0.55} fill="none" opacity={0.8} />
        </G>
      );
    case "noir-m-chef":
      return (
        <G>
          <Path d="M8 5.5c1.2-1.8 3.8-1.8 4.8 0 .6-1.2 2.4-1.2 3.2 0l1.5 3.5H6.5l1.5-3.5z" {...f} />
          <Circle cx={12} cy={11.5} r={3} {...f} />
          <Path d="M6.5 14.5h11l-.8 7.5h-9.4l-.8-7.5z" {...f} />
        </G>
      );
    case "noir-f-chef":
      return (
        <G>
          <Path d="M8.5 5c1 1.6 3 1.6 3.5 0 .8 1.4 2.7 1.4 3.5 0l1.8 3.8H6.7l1.8-3.8z" {...f} />
          <Circle cx={12} cy={11.2} r={2.9} {...f} />
          <Path d="M7.5 14h9l1 8.5h-11l1-8.5z" {...f} />
        </G>
      );
    case "noir-m-artist-beret":
      return (
        <G>
          <Ellipse cx={11} cy={6} rx={4} ry={1.6} {...f} />
          <Circle cx={12} cy={10.5} r={3.1} {...f} />
          <Path d="M6.5 14l1-1.5h9l1 1.5-.5 8h-10l-.5-8z" {...f} />
        </G>
      );
    case "noir-f-artist-hair":
      return (
        <G>
          <Path d="M8 5.5q4-2 8 0v3q-4 1.5-8 0v-3z" {...f} />
          <Circle cx={12} cy={10.5} r={3} {...f} />
          <Path d="M7.5 13.5h9l1.2 8.5h-11.4l1.2-8.5z" {...f} />
        </G>
      );
    case "noir-m-office-tie":
      return (
        <G>
          <Circle cx={12} cy={9.5} r={3.2} {...f} />
          <Path d="M5.5 13h13l-.5 9h-12l-.5-9z" {...f} />
          <Path d="M12 13l-.7 9h1.4L12 13z" fill={color} opacity={0.88} />
        </G>
      );
    case "noir-f-office":
      return (
        <G>
          <Circle cx={12} cy={9.5} r={3.1} {...f} />
          <Path d="M7 13.5h10l1 8h-12l1-8z" {...f} />
          <Path d="M9.5 13.5l1.2 3h2.6l1.2-3" stroke={color} strokeWidth={0.5} fill="none" opacity={0.75} />
        </G>
      );
    case "noir-m-sailor":
      return (
        <G>
          <Path d="M7.5 7h9L15 9.5H9L7.5 7z" {...f} />
          <Circle cx={12} cy={11.5} r={3} {...f} />
          <Path d="M6 14h12l-1.2 8H7.2L6 14z" {...f} />
          <Path d="M8 15.5h8" stroke={color} strokeWidth={0.55} fill="none" opacity={0.75} />
        </G>
      );
    case "noir-m-hoodie":
      return (
        <G>
          <Path d="M8 8.5q4-2.5 8 0l1.5 3.5H6.5L8 8.5z" {...f} />
          <Circle cx={12} cy={11.5} r={2.7} {...f} />
          <Path d="M5.5 14.5h13l-.5 7.5h-12l-.5-7.5z" {...f} />
        </G>
      );
    case "noir-f-ponytail":
      return (
        <G>
          <Path d="M12 4.5c-1.5 0-2.8 1-3 2.5-.5 3 0 5.5 0 5.5s.5-2.5 0-5.5c-.2-1.5-1.5-2.5-3-2.5z" {...f} />
          <Circle cx={12} cy={10} r={3} {...f} />
          <Path d="M7.5 13h9l1.5 9h-12l1.5-9z" {...f} />
        </G>
      );
    case "noir-m-beard-full":
      return (
        <G>
          <Circle cx={12} cy={9} r={3} {...f} />
          <Path d="M9 12.5q3 4.5 6 0v2q-3 3.2-6 0v-2z" {...f} />
          <Path d="M6.5 14h11l-1 8h-9l-1-8z" {...f} />
        </G>
      );
    case "noir-m-student":
      return (
        <G>
          <Circle cx={12} cy={9.5} r={3.1} {...f} />
          <Path d="M8 4.5l4 2 4-2v2l-4 2-4-2v-2z" {...f} />
          <Path d="M6 14h12v8H6v-8z" {...f} />
        </G>
      );
    case "noir-f-student":
      return (
        <G>
          <Circle cx={12} cy={10} r={3} {...f} />
          <Path d="M7 5.5l5 2.2 5-2.2v1.8l-5 2-5-2V5.5z" {...f} />
          <Path d="M7.5 13.5h9l1.2 8h-11.4l1.2-8z" {...f} />
        </G>
      );
    case "noir-m-hard-hat":
      return (
        <G>
          <Path d="M7.5 6.5h9c.8 2.2.8 3.8 0 4.5h-9c-.8-.7-.8-2.3 0-4.5z" {...f} />
          <Circle cx={12} cy={11.5} r={2.9} {...f} />
          <Path d="M5.5 14.5h13v7.5h-13v-7.5z" {...f} />
        </G>
      );
    case "noir-f-hard-hat":
      return (
        <G>
          <Path d="M8 6.5h8c.7 2 .7 3.5 0 4.2H8c-.7-.7-.7-2.2 0-4.2z" {...f} />
          <Circle cx={12} cy={11.2} r={2.8} {...f} />
          <Path d="M7 14h10l1 8H6l1-8z" {...f} />
        </G>
      );
    case "noir-m-police":
      return (
        <G>
          <Path d="M8 6.5h8l.5 2.5h-9l.5-2.5z" {...f} />
          <Circle cx={12} cy={11} r={3} {...f} />
          <Path d="M5.5 14h13l-1 8h-11l-1-8z" {...f} />
        </G>
      );
    case "noir-f-police":
      return (
        <G>
          <Path d="M8.5 6h7l.5 2.5H8l.5-2.5z" {...f} />
          <Circle cx={12} cy={10.8} r={2.9} {...f} />
          <Path d="M7 13.5h10l1.2 8.3h-12.4L7 13.5z" {...f} />
        </G>
      );
    case "noir-m-athletic":
      return (
        <G>
          <Circle cx={12} cy={8.5} r={2.6} {...f} />
          <Path d="M4.5 12l2-2h11l2 2-1 10h-13l-1-10z" {...f} />
          <Path d="M8 13.5h8" stroke={color} strokeWidth={0.7} fill="none" opacity={0.85} />
        </G>
      );
    case "noir-f-athletic":
      return (
        <G>
          <Circle cx={12} cy={9} r={2.8} {...f} />
          <Path d="M6 12.5h12l1 8.5H5l1-8.5z" {...f} />
          <Path d="M9 12l1.5 2h3L15 12" stroke={color} strokeWidth={0.55} fill="none" opacity={0.8} />
        </G>
      );
    case "noir-generic-m":
      return (
        <G>
          <Circle cx={12} cy={9.5} r={3.2} {...f} />
          <Path d="M6 13.5h12l-1 8.5H7l-1-8.5z" {...f} />
        </G>
      );
    case "noir-generic-f":
      return (
        <G>
          <Circle cx={12} cy={10} r={3.1} {...f} />
          <Path d="M8 13.5c1.5-.6 3.5-.6 5 0l1.5 8h-8l1.5-8z" {...f} />
        </G>
      );
    default:
      return (
        <G>
          <Circle cx={12} cy={10} r={3.2} {...f} />
          <Path d="M7 14h10l1 8H6l1-8z" {...f} />
        </G>
      );
  }
}

export function SuspectPortrait({
  portrait,
  size,
  color,
}: {
  portrait: SuspectPortraitKey;
  size: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Şüpheli silüeti">
      {renderPortrait(portrait, color)}
    </Svg>
  );
}
