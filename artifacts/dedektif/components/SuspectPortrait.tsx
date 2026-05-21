import React from "react";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";

/**
 * Noir tek renk vektör büstler — açık boyun + geniş omuz silüeti.
 * 24×24 grid. Her portre: baş + boyun + omuz + gövde + meslek aksesuarı.
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

/**
 * Standart boyun + omuz gövde yolu.
 * Baş: cy=8.5, r=3.2  →  boyun x:10.2-13.8  →  omuzlar x:4.5-19.5  →  gövde y:22
 */
function Body({ color }: { color: string }) {
  return (
    <Path
      d="M10.2 11.8 L9.8 13.8 Q7 15 5 17.5 L4.5 22 H19.5 L19 17.5 Q17 15 14.2 13.8 L13.8 11.8 Z"
      fill={color}
    />
  );
}

/** Şapkalı portreler için alçaltılmış gövde (baş cy=10.5) */
function BodyLow({ color }: { color: string }) {
  return (
    <Path
      d="M10.2 13.8 L9.8 15.5 Q7 16.8 5 19 L4.5 22 H19.5 L19 19 Q17 16.8 14.2 15.5 L13.8 13.8 Z"
      fill={color}
    />
  );
}

function renderPortrait(key: SuspectPortraitKey, color: string): React.ReactNode {
  const f = { fill: color };

  switch (key) {
    /* ── Topuz + gözlük ─────────────────────────────────────────────── */
    case "noir-f-bun-glasses":
      return (
        <G>
          {/* Topuz */}
          <Ellipse cx={12} cy={4.2} rx={2.2} ry={1.8} {...f} />
          <Rect x={11} y={4} width={2} height={2} {...f} />
          {/* Baş */}
          <Circle cx={12} cy={8.5} r={3.2} {...f} />
          {/* Gözlük çerçevesi */}
          <Path
            d="M9.2 8.5 H10.8 M13.2 8.5 H14.8 M10.8 8.5 Q12 9 13.2 8.5"
            stroke={color}
            strokeWidth={0.7}
            strokeLinecap="round"
            fill="none"
            opacity={0.55}
          />
          <Body color={color} />
        </G>
      );

    /* ── Kel tepeli takım ───────────────────────────────────────────── */
    case "noir-m-suit-receding":
      return (
        <G>
          {/* Kel / saç çizgisi */}
          <Path d="M8.8 5.8 Q12 4.5 15.2 5.8 Q13.5 5 12 5 Q10.5 5 8.8 5.8Z" {...f} />
          {/* Baş */}
          <Circle cx={12} cy={8.8} r={3.2} {...f} />
          {/* Kravat */}
          <Path
            d="M12 12 L11.2 15 L12 16.5 L12.8 15 Z"
            fill={color}
            opacity={0.7}
          />
          <Body color={color} />
        </G>
      );

    /* ── Kasketli hamam işçisi ──────────────────────────────────────── */
    case "noir-m-worker-towel":
      return (
        <G>
          {/* Kafa havlusu (yatay dikdörtgen band) */}
          <Rect x={8} y={5.5} width={8} height={2.8} rx={1.2} {...f} />
          {/* Baş */}
          <Circle cx={12} cy={10.5} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Kaptan şapkası ─────────────────────────────────────────────── */
    case "noir-m-captain-cap":
      return (
        <G>
          {/* Şapka üstü */}
          <Path d="M8 7.5 L12 5 L16 7.5 H8Z" {...f} />
          {/* Şapka siperi */}
          <Path d="M7 8.5 H17 V9.5 Q12 10 7 9.5 Z" {...f} />
          {/* Baş */}
          <Circle cx={12} cy={11} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Yaşlı kadın şal ────────────────────────────────────────────── */
    case "noir-f-elder-shawl":
      return (
        <G>
          {/* Baş */}
          <Circle cx={12} cy={8} r={3} {...f} />
          {/* Şal / baş örtüsü */}
          <Path d="M8.5 9.5 Q12 7 15.5 9.5 Q14 11.5 12 11.5 Q10 11.5 8.5 9.5Z" {...f} opacity={0.8} />
          {/* Gövde şal drape */}
          <Path
            d="M9.8 11.5 L9 13.5 Q6 15.2 4.5 18 L4 22 H20 L19.5 18 Q18 15.2 15 13.5 L14.2 11.5 Z"
            {...f}
          />
        </G>
      );

    /* ── Yaşlı adam baston ──────────────────────────────────────────── */
    case "noir-m-elder-cane":
      return (
        <G>
          {/* Baş */}
          <Circle cx={11} cy={8.5} r={3.1} {...f} />
          {/* Gövde (biraz sola kaymış) */}
          <Path
            d="M9.2 11.7 L8.8 13.5 Q6 14.8 4.5 17 L4 22 H18 L17.5 17 Q15.5 14.8 12.8 13.5 L12.8 11.7 Z"
            {...f}
          />
          {/* Baston */}
          <Path
            d="M18 13 L18 22"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M16.5 13 Q18 11.5 19.5 13"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      );

    /* ── Güvenlik düz kasket ─────────────────────────────────────────── */
    case "noir-m-security-cap":
      return (
        <G>
          {/* Düz kasket */}
          <Rect x={8} y={6} width={8} height={3.2} rx={0.5} {...f} />
          {/* Kasket siperi */}
          <Path d="M7 9.2 H17 V10 H7 Z" {...f} opacity={0.75} />
          {/* Baş */}
          <Circle cx={12} cy={11} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Kadın laboratuvar önlüğü ───────────────────────────────────── */
    case "noir-f-lab-coat":
      return (
        <G>
          {/* Baş */}
          <Circle cx={12} cy={8.2} r={3.1} {...f} />
          {/* Gövde */}
          <Path
            d="M10.2 11.5 L9.8 13.2 Q7 14.5 5 17 L4.5 22 H19.5 L19 17 Q17 14.5 14.2 13.2 L13.8 11.5 Z"
            {...f}
          />
          {/* Önlük ortası dikişi */}
          <Path
            d="M12 13.5 L12 20"
            stroke={color}
            strokeWidth={0.6}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
          {/* Yaka açıklığı */}
          <Path
            d="M10.5 13 L12 15 L13.5 13"
            stroke={color}
            strokeWidth={0.6}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
        </G>
      );

    /* ── Erkek laboratuvar önlüğü ───────────────────────────────────── */
    case "noir-m-lab-coat":
      return (
        <G>
          {/* Baş */}
          <Circle cx={12} cy={8} r={3.2} {...f} />
          <Body color={color} />
          {/* Önlük yaka + dikiş */}
          <Path
            d="M10 13.5 L12 16 L14 13.5"
            stroke={color}
            strokeWidth={0.65}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
          <Path
            d="M12 16 L12 21"
            stroke={color}
            strokeWidth={0.6}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
        </G>
      );

    /* ── Erkek aşçı (uzun şapka) ────────────────────────────────────── */
    case "noir-m-chef":
      return (
        <G>
          {/* Uzun aşçı şapkası */}
          <Path d="M9 8.5 Q9 3 12 3 Q15 3 15 8.5 H9Z" {...f} />
          <Path d="M8.5 8.5 H15.5 V9.5 H8.5 Z" {...f} />
          {/* Baş */}
          <Circle cx={12} cy={11} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Kadın aşçı (kısa şapka) ────────────────────────────────────── */
    case "noir-f-chef":
      return (
        <G>
          {/* Kısa aşçı şapkası */}
          <Path d="M9.2 8 Q9.5 4.5 12 4.5 Q14.5 4.5 14.8 8 H9.2Z" {...f} />
          <Path d="M8.8 8 H15.2 V9 H8.8 Z" {...f} />
          {/* Baş */}
          <Circle cx={12} cy={11} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Erkek sanatçı bere ─────────────────────────────────────────── */
    case "noir-m-artist-beret":
      return (
        <G>
          {/* Bere (sola yatık) */}
          <Ellipse cx={11} cy={6} rx={4.5} ry={2} {...f} />
          <Path d="M14.5 6 L15 7.5" stroke={color} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          {/* Baş */}
          <Circle cx={12} cy={10} r={3.1} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Kadın sanatçı dalgalı saç ──────────────────────────────────── */
    case "noir-f-artist-hair":
      return (
        <G>
          {/* Dalgalı uzun saç */}
          <Path d="M8.5 6 Q7.5 10 8 14 L9.5 13.5 Q9 10 10 7 Q8.8 6.5 8.5 6Z" {...f} />
          <Path d="M15.5 6 Q16.5 10 16 14 L14.5 13.5 Q15 10 14 7 Q15.2 6.5 15.5 6Z" {...f} />
          {/* Baş */}
          <Circle cx={12} cy={9} r={3.2} {...f} />
          {/* Gövde */}
          <Path
            d="M10.2 12.3 L9.8 14 Q7 15.3 5 17.8 L4.5 22 H19.5 L19 17.8 Q17 15.3 14.2 14 L13.8 12.3 Z"
            {...f}
          />
        </G>
      );

    /* ── Erkek ofis kravatı ─────────────────────────────────────────── */
    case "noir-m-office-tie":
      return (
        <G>
          {/* Baş */}
          <Circle cx={12} cy={8.2} r={3.3} {...f} />
          {/* Geniş takım omuzlar */}
          <Path
            d="M10.2 11.6 L9.5 13.2 Q6.5 14.2 4.5 16.5 L4 22 H20 L19.5 16.5 Q17.5 14.2 14.5 13.2 L13.8 11.6 Z"
            {...f}
          />
          {/* Kravat */}
          <Path d="M12 13 L11 16.5 L12 18 L13 16.5 Z" fill={color} opacity={0.65} />
        </G>
      );

    /* ── Kadın ofis bluz ────────────────────────────────────────────── */
    case "noir-f-office":
      return (
        <G>
          {/* Baş */}
          <Circle cx={12} cy={8.2} r={3.1} {...f} />
          <Body color={color} />
          {/* Yaka detayı */}
          <Path
            d="M10.5 13 Q12 15 13.5 13"
            stroke={color}
            strokeWidth={0.6}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
        </G>
      );

    /* ── Erkek denizci ──────────────────────────────────────────────── */
    case "noir-m-sailor":
      return (
        <G>
          {/* Denizci şapkası */}
          <Path d="M8 8 L12 5.5 L16 8 H8Z" {...f} />
          <Path d="M7.5 8 H16.5 V9 H7.5 Z" {...f} />
          {/* Baş */}
          <Circle cx={12} cy={11} r={3} {...f} />
          {/* Gövde V-yaka */}
          <Path
            d="M10.2 13.8 L9.8 15.5 Q7 16.8 5 19 L4.5 22 H19.5 L19 19 Q17 16.8 14.2 15.5 L13.8 13.8 Z"
            {...f}
          />
          {/* V yaka şeridi */}
          <Path
            d="M10 14 L12 17 L14 14"
            stroke={color}
            strokeWidth={0.8}
            strokeLinecap="round"
            fill="none"
            opacity={0.55}
          />
        </G>
      );

    /* ── Kapüşon ────────────────────────────────────────────────────── */
    case "noir-m-hoodie":
      return (
        <G>
          {/* Kapüşon dış şekli */}
          <Path d="M7.5 5 Q12 3.5 16.5 5 Q18 7 17.5 10 L14.5 11 Q13 9.5 12 9.5 Q11 9.5 9.5 11 L6.5 10 Q6 7 7.5 5Z" {...f} />
          {/* Baş */}
          <Circle cx={12} cy={9.5} r={2.6} {...f} />
          {/* Gövde */}
          <Path
            d="M10 12.2 L9.5 14 Q7 15.3 5 17.8 L4.5 22 H19.5 L19 17.8 Q17 15.3 14.5 14 L14 12.2 Z"
            {...f}
          />
        </G>
      );

    /* ── Kadın at kuyruğu ───────────────────────────────────────────── */
    case "noir-f-ponytail":
      return (
        <G>
          {/* Saç (yanlarda ve arka at kuyruğu) */}
          <Path d="M8.5 6.5 Q7.5 9 8 12 L9.5 11.8 Q9 9 9.5 7 Q8.8 6.5 8.5 6.5Z" {...f} />
          {/* At kuyruğu */}
          <Path d="M15 7 Q17 9 16.5 13 L15.2 13.5 Q15.5 10 14.5 7.5 Q14.8 7 15 7Z" {...f} />
          {/* Saç bandı */}
          <Path d="M15 9 Q16 9.5 16.2 10.5" stroke={color} strokeWidth={0.8} strokeLinecap="round" fill="none" />
          {/* Baş */}
          <Circle cx={12} cy={9} r={3.1} {...f} />
          {/* Gövde */}
          <Path
            d="M10.2 12.2 L9.8 14 Q7 15.3 5 17.8 L4.5 22 H19.5 L19 17.8 Q17 15.3 14.2 14 L13.8 12.2 Z"
            {...f}
          />
        </G>
      );

    /* ── Erkek tam sakal ────────────────────────────────────────────── */
    case "noir-m-beard-full":
      return (
        <G>
          {/* Baş */}
          <Circle cx={12} cy={8} r={3.2} {...f} />
          {/* Tam sakal (çeneden aşağı dolgu) */}
          <Path d="M9 10.5 Q9.5 14.5 12 14.5 Q14.5 14.5 15 10.5 Q12 13 9 10.5Z" {...f} />
          {/* Gövde */}
          <Path
            d="M10 14 L9.5 15.5 Q7 16.8 5 19 L4.5 22 H19.5 L19 19 Q17 16.8 14.5 15.5 L14 14 Z"
            {...f}
          />
        </G>
      );

    /* ── Erkek öğrenci (kare kep) ───────────────────────────────────── */
    case "noir-m-student":
      return (
        <G>
          {/* Kare mezuniyet kep */}
          <Rect x={8} y={6} width={8} height={1.5} {...f} />
          <Path d="M8 5 L12 3 L16 5 L12 7 Z" {...f} />
          <Path d="M15.5 5.5 L15.5 9" stroke={color} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          {/* Baş */}
          <Circle cx={12} cy={10.5} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Kadın öğrenci (kare kep) ───────────────────────────────────── */
    case "noir-f-student":
      return (
        <G>
          {/* Kare mezuniyet kep */}
          <Rect x={8.5} y={6} width={7} height={1.5} {...f} />
          <Path d="M8.5 5.2 L12 3.2 L15.5 5.2 L12 7.2 Z" {...f} />
          <Path d="M15 5.5 L15 9" stroke={color} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          {/* Baş */}
          <Circle cx={12} cy={10.5} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Erkek baret (inşaat kasket) ────────────────────────────────── */
    case "noir-m-hard-hat":
      return (
        <G>
          {/* Baret kubbe */}
          <Path d="M7 8.5 Q7 4 12 4 Q17 4 17 8.5 H7Z" {...f} />
          {/* Baret kenar bandı */}
          <Path d="M6 8.5 H18 V9.5 H6 Z" {...f} opacity={0.8} />
          {/* Baş */}
          <Circle cx={12} cy={11} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Kadın baret ────────────────────────────────────────────────── */
    case "noir-f-hard-hat":
      return (
        <G>
          {/* Baret kubbe (biraz daha küçük) */}
          <Path d="M7.5 8.5 Q7.5 4.5 12 4.5 Q16.5 4.5 16.5 8.5 H7.5Z" {...f} />
          <Path d="M6.5 8.5 H17.5 V9.5 H6.5 Z" {...f} opacity={0.8} />
          {/* Baş */}
          <Circle cx={12} cy={11} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Erkek polis şapkası ─────────────────────────────────────────── */
    case "noir-m-police":
      return (
        <G>
          {/* Polis kasket üstü */}
          <Path d="M8 8 Q8 5.5 12 5.5 Q16 5.5 16 8 H8Z" {...f} />
          {/* Kep siperi */}
          <Path d="M7 8 H17 V9.2 Q12 9.8 7 9.2 Z" {...f} opacity={0.85} />
          {/* Rozet ipucu */}
          <Circle cx={12} cy={7} r={0.8} fill={color} opacity={0.5} />
          {/* Baş */}
          <Circle cx={12} cy={11} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Kadın polis şapkası ─────────────────────────────────────────── */
    case "noir-f-police":
      return (
        <G>
          {/* Polis kasket üstü (biraz daha küçük) */}
          <Path d="M8.5 8.2 Q8.5 6 12 6 Q15.5 6 15.5 8.2 H8.5Z" {...f} />
          <Path d="M7.5 8.2 H16.5 V9.2 Q12 9.8 7.5 9.2 Z" {...f} opacity={0.85} />
          {/* Baş */}
          <Circle cx={12} cy={11} r={3} {...f} />
          <BodyLow color={color} />
        </G>
      );

    /* ── Erkek atletik (geniş omuzlar) ──────────────────────────────── */
    case "noir-m-athletic":
      return (
        <G>
          {/* Baş */}
          <Circle cx={12} cy={7.8} r={3.1} {...f} />
          {/* Çok geniş atletik omuzlar */}
          <Path
            d="M10.2 11 L9.5 12.5 Q5.5 13.5 3.5 16 L3 22 H21 L20.5 16 Q18.5 13.5 14.5 12.5 L13.8 11 Z"
            {...f}
          />
          {/* Atlet yaka şeridi */}
          <Path
            d="M10 12.5 L12 15 L14 12.5"
            stroke={color}
            strokeWidth={0.7}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
        </G>
      );

    /* ── Kadın atletik ───────────────────────────────────────────────── */
    case "noir-f-athletic":
      return (
        <G>
          {/* Baş */}
          <Circle cx={12} cy={8} r={3} {...f} />
          {/* Geniş omuzlar */}
          <Path
            d="M10.2 11.1 L9.5 12.8 Q6 14 4.5 16.5 L4 22 H20 L19.5 16.5 Q18 14 14.5 12.8 L13.8 11.1 Z"
            {...f}
          />
          {/* Spor yaka */}
          <Path
            d="M10 13 L12 15.5 L14 13"
            stroke={color}
            strokeWidth={0.65}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
        </G>
      );

    /* ── Genel erkek silüeti ─────────────────────────────────────────── */
    case "noir-generic-m":
      return (
        <G>
          <Circle cx={12} cy={8.2} r={3.2} {...f} />
          <Body color={color} />
        </G>
      );

    /* ── Genel kadın silüeti ─────────────────────────────────────────── */
    case "noir-generic-f":
      return (
        <G>
          <Circle cx={12} cy={8.2} r={3.1} {...f} />
          {/* Hafif daha dar omuzlar */}
          <Path
            d="M10.5 11.4 L10 13.2 Q7.5 14.5 5.5 17 L5 22 H19 L18.5 17 Q16.5 14.5 14 13.2 L13.5 11.4 Z"
            {...f}
          />
        </G>
      );

    default:
      return (
        <G>
          <Circle cx={12} cy={8.2} r={3.2} {...f} />
          <Body color={color} />
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
