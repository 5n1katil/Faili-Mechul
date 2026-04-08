import React, { useState } from "react";
import type { ComponentProps } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

interface Slide {
  icon: MaterialIconName;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  subtitleNoUppercase?: boolean;
  body: string;
  tip?: string;
  showGrid?: boolean;
}

const SLIDES: Slide[] = [
  {
    icon: "search",
    iconColor: "#D4A843",
    iconBg: "#2A1E0840",
    title: "Faili Meçhul'e Hoş Geldin!",
    subtitle: "Dedektif Bulmaca Oyunu",
    subtitleNoUppercase: true,
    body: "Her bulmacada çözmen gereken bir cinayet gizemi seni bekliyor... Şüpheliler, silahlar ve mekanlar arasından doğru kombinasyonu en kısa zamanda bul, diğer dedektifler ile yarışarak liderlik tablosunda adını efsaneler arasına yazdır.",
    tip: "Yanlış tahminler zaman cezasına dönüşür — dikkatli ol!",
  },
  {
    icon: "grid-on",
    iconColor: "#A855F7",
    iconBg: "#1E103040",
    title: "Dedektif Izgarası",
    subtitle: "Mantık Yürüt",
    body: "Izgara hücrelerine dokunarak işaretleme yap:\n✗  →  Bu kombinasyon imkânsız\n✓  →  Bu kombinasyon kesin doğru\n?  →  Henüz bilmiyorum",
    tip: "Bir satırda yalnızca bir ✓ olabilir!",
    showGrid: true,
  },
  {
    icon: "lightbulb",
    iconColor: "#D4A843",
    iconBg: "#2A1E0840",
    title: "İpuçları",
    subtitle: "Delilleri Değerlendir",
    body: "Ekranın alt kısmında ipuçları seni yönlendirir. Başlangıçta bir ipucu görünür; \"Sonraki\" butonuyla daha fazla ipucu açabilirsin.",
    tip: "Her açtığın ipucu puanından kesiyor — mümkün olduğunca az kullan!",
  },
  {
    icon: "gavel",
    iconColor: "#C8372D",
    iconBg: "#2E101040",
    title: "Suçlama",
    subtitle: "Kararını Bildir",
    body: "Şüpheliyi, silahı ve mekanı belirledikten sonra alt taraftaki \"SUÇLA\" butonuna bas. Yanlış tahmin yaparsan süreye ceza eklenir ama oyun bitmez!",
    tip: "Emin olmadan suçlama — her hata zaman cezası olarak puanına yansır!",
  },
];

type CellMark = "check" | "cross" | "none";

const M_S_COLOR = "#A855F7";
const M_W_COLOR = "#C8372D";
const M_L_COLOR = "#D4A843";
const M_S_BG = "#2A1050";
const M_W_BG = "#3D1212";
const M_L_BG = "#3A2800";
const M_OUTER = "#FFFFFF50";
const M_BLKDIV = "#FFFFFF80";
const M_CELLSEP = "#FFFFFF2A";

const MINI_CELL = 22;
const MINI_LABEL = 22;
const MINI_DIV = 2;

const MINI_SUSPECTS = [
  { id: "arif", icon: "person",         name: "Arif" },
  { id: "buse", icon: "face",           name: "Buse" },
  { id: "can",  icon: "person-outline", name: "Can"  },
] as const;

const MINI_WEAPONS = [
  { id: "hancer",  icon: "content-cut", name: "Hançer"  },
  { id: "tabanca", icon: "gps-fixed",   name: "Tabanca" },
  { id: "zehir",   icon: "science",     name: "Zehir"   },
] as const;

const MINI_LOCATIONS = [
  { id: "ev",   icon: "home", name: "Ev"   },
  { id: "park", icon: "park", name: "Park" },
] as const;

const WxS: CellMark[][] = [
  ["cross", "check", "cross"],
  ["none",  "cross", "none" ],
  ["none",  "cross", "none" ],
];
const WxL: CellMark[][] = [
  ["check", "cross"],
  ["none",  "none" ],
  ["none",  "none" ],
];
const LxS: CellMark[][] = [
  ["cross", "check", "cross"],
  ["none",  "cross", "none" ],
];

function MiniCell({ mark }: { mark: CellMark }) {
  const bg =
    mark === "check" ? "#0a3d1f" : mark === "cross" ? "#3b0f0f" : "#FFFFFF08";
  const border =
    mark === "check" ? "#22c55e99" : mark === "cross" ? "#ef444499" : "#FFFFFF22";
  const sz = Math.floor(MINI_CELL * 0.46);
  return (
    <View style={{ width: MINI_CELL, height: MINI_CELL, backgroundColor: bg, borderWidth: 1, borderColor: border, alignItems: "center", justifyContent: "center" }}>
      {mark === "check" && <MaterialIcons name="check" size={sz} color="#4ade80" />}
      {mark === "cross" && <MaterialIcons name="close" size={sz} color="#f87171" />}
    </View>
  );
}

function MiniColIcon({ icon, color, bg }: { icon: string; color: string; bg: string }) {
  const avSz = Math.max(16, Math.floor(MINI_CELL * 0.78));
  const colH = Math.max(24, Math.floor(MINI_CELL * 1.3));
  return (
    <View style={{ width: MINI_CELL, height: colH, alignItems: "center", justifyContent: "flex-end", paddingBottom: 3 }}>
      <View style={{ width: avSz, height: avSz, borderRadius: avSz / 2, borderWidth: 1.5, borderColor: color + "AA", backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name={icon as ComponentProps<typeof MaterialIcons>["name"]} size={Math.floor(avSz * 0.68)} color={color} />
      </View>
    </View>
  );
}

function MiniRowIcon({ icon, color, bg }: { icon: string; color: string; bg: string }) {
  const avSz = Math.max(18, Math.floor(MINI_CELL * 0.78));
  return (
    <View style={{ width: MINI_LABEL, height: MINI_CELL, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: avSz, height: avSz, borderRadius: avSz / 2, borderWidth: 1.5, borderColor: color + "AA", backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name={icon as ComponentProps<typeof MaterialIcons>["name"]} size={Math.floor(avSz * 0.68)} color={color} />
      </View>
    </View>
  );
}

function MiniGrid() {
  const nS = MINI_SUSPECTS.length;
  const nL = MINI_LOCATIONS.length;
  const sCellsInner = nS * MINI_CELL + Math.max(0, nS - 1);
  const lCellsInner = nL * MINI_CELL + Math.max(0, nL - 1);
  const suspectBlockOuter = sCellsInner + 2;
  const weaponBlockOuter = sCellsInner + MINI_DIV + lCellsInner + 2;

  return (
    <View style={miniStyles.container}>
      <View style={{ overflow: "visible" }}>
        {/* Row 1: Group headers */}
        <View style={miniStyles.row}>
          <View style={{ width: MINI_LABEL }} />
          <View style={{ width: suspectBlockOuter, alignItems: "center" }}>
            <Text style={[miniStyles.groupLabel, { color: M_S_COLOR }]}>ŞÜPHELILER</Text>
          </View>
          <View style={{ width: MINI_DIV }} />
          <View style={{ width: lCellsInner, alignItems: "center" }}>
            <Text style={[miniStyles.groupLabel, { color: M_L_COLOR }]}>MEKANLAR</Text>
          </View>
        </View>

        {/* Row 2: Column icons */}
        <View style={miniStyles.row}>
          <View style={{ width: MINI_LABEL }} />
          {MINI_SUSPECTS.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <View style={{ width: 1, backgroundColor: M_CELLSEP }} />}
              <MiniColIcon icon={s.icon} color={M_S_COLOR} bg={M_S_BG} />
            </React.Fragment>
          ))}
          <View style={{ width: MINI_DIV + 2, backgroundColor: M_BLKDIV }} />
          {MINI_LOCATIONS.map((l, i) => (
            <React.Fragment key={l.id}>
              {i > 0 && <View style={{ width: 1, backgroundColor: M_CELLSEP }} />}
              <MiniColIcon icon={l.icon} color={M_L_COLOR} bg={M_L_BG} />
            </React.Fragment>
          ))}
        </View>

        {/* SİLAHLAR banner */}
        <View style={[miniStyles.row, miniStyles.bannerRow]}>
          <View style={{ width: 3, backgroundColor: M_W_COLOR, alignSelf: "stretch" }} />
          <View style={{ width: 6 }} />
          <Text style={[miniStyles.bannerText, { color: M_W_COLOR }]}>SİLAHLAR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: M_OUTER, alignSelf: "center", marginLeft: 6 }} />
        </View>

        {/* Weapon rows (full width: suspects + locations) */}
        {MINI_WEAPONS.map((weapon, ri) => (
          <View key={weapon.id} style={miniStyles.row}>
            <MiniRowIcon icon={weapon.icon} color={M_W_COLOR} bg={M_W_BG} />
            <View style={[miniStyles.cellsBlock, { width: weaponBlockOuter }]}>
              {WxS[ri].map((mark, ci) => (
                <React.Fragment key={`ws_${ri}_${ci}`}>
                  {ci > 0 && <View style={{ width: 1, backgroundColor: M_CELLSEP }} />}
                  <MiniCell mark={mark} />
                </React.Fragment>
              ))}
              <View style={{ width: MINI_DIV, backgroundColor: M_BLKDIV }} />
              {WxL[ri].map((mark, ci) => (
                <React.Fragment key={`wl_${ri}_${ci}`}>
                  {ci > 0 && <View style={{ width: 1, backgroundColor: M_CELLSEP }} />}
                  <MiniCell mark={mark} />
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Horizontal divider */}
        <View style={miniStyles.row}>
          <View style={{ width: MINI_LABEL }} />
          <View style={{ width: weaponBlockOuter, height: 2, backgroundColor: M_BLKDIV }} />
        </View>

        {/* MEKANLAR banner */}
        <View style={[miniStyles.row, miniStyles.bannerRow]}>
          <View style={{ width: 3, backgroundColor: M_L_COLOR, alignSelf: "stretch" }} />
          <View style={{ width: 6 }} />
          <Text style={[miniStyles.bannerText, { color: M_L_COLOR }]}>MEKANLAR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: M_OUTER, alignSelf: "center", marginLeft: 6 }} />
        </View>

        {/* Location rows (L-shape: suspects only) */}
        {MINI_LOCATIONS.map((location, ri) => (
          <View key={location.id} style={miniStyles.row}>
            <MiniRowIcon icon={location.icon} color={M_L_COLOR} bg={M_L_BG} />
            <View style={[miniStyles.cellsBlock, { width: suspectBlockOuter }]}>
              {LxS[ri].map((mark, ci) => (
                <React.Fragment key={`ls_${ri}_${ci}`}>
                  {ci > 0 && <View style={{ width: 1, backgroundColor: M_CELLSEP }} />}
                  <MiniCell mark={mark} />
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
      </View>

      <Text style={miniStyles.caption}>Örnek: Buse, Hançerle Ev'de suç işledi</Text>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
    overflow: "visible",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  groupLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.4,
    paddingVertical: 2,
  },
  bannerRow: {
    paddingVertical: 3,
  },
  bannerText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  cellsBlock: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: M_OUTER,
  },
  caption: {
    fontSize: 11,
    color: "#6B7280",
    fontStyle: "italic",
  },
});

interface Props {
  visible: boolean;
  onDone: () => void;
  closeLabel?: string;
}

export default function OnboardingScreen({ visible, onDone, closeLabel }: Props) {
  const insets = useSafeAreaInsets();
  const [slideIndex, setSlideIndex] = useState(0);
  const [key, setKey] = useState(0);

  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      onDone();
      setSlideIndex(0);
    } else {
      setSlideIndex((i) => i + 1);
      setKey((k) => k + 1);
    }
  };

  const handleSkip = () => {
    onDone();
    setSlideIndex(0);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      transparent={false}
      onRequestClose={handleSkip}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: "#0F1117",
            paddingTop: Platform.OS === "web" ? 67 : insets.top,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom,
          },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === slideIndex
                    ? { backgroundColor: "#D4A843", width: 20 }
                    : { backgroundColor: "#D4A84340" },
                ]}
              />
            ))}
          </View>
          <Pressable onPress={handleSkip} style={styles.skipBtn} hitSlop={10}>
            <Text style={styles.skipText}>{closeLabel ?? "Atla"}</Text>
            <MaterialIcons name="close" size={16} color="#6B7280" />
          </Pressable>
        </View>

        <Animated.View
          key={key}
          entering={FadeIn.duration(260)}
          exiting={FadeOut.duration(160)}
          style={[styles.slideArea, slide.showGrid && { gap: 6 }]}
        >
          {slide.showGrid ? (
            <Image
              source={require("@/assets/images/grid-example.png")}
              style={{ width: "100%", maxHeight: 260, borderRadius: 8 }}
              resizeMode="contain"
            />
          ) : slideIndex === 0 ? (
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.iconWrapper, { backgroundColor: slide.iconBg }]}>
              <View style={[styles.iconCircle, { borderColor: slide.iconColor + "60", backgroundColor: slide.iconBg }]}>
                <MaterialIcons name={slide.icon} size={54} color={slide.iconColor} />
              </View>
            </View>
          )}

          <Text style={styles.slideSubtitle}>
            {slide.subtitleNoUppercase
              ? slide.subtitle
              : slide.subtitle.toLocaleUpperCase("tr-TR")}
          </Text>
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={[styles.slideBody, slide.showGrid && { fontSize: 13, lineHeight: 21 }]}>{slide.body}</Text>

          {slide.tip && (
            <View style={[styles.tipBox, slide.showGrid && { paddingVertical: 8, marginTop: 0 }]}>
              <MaterialIcons name="info-outline" size={15} color="#D4A843" />
              <Text style={[styles.tipText, slide.showGrid && { fontSize: 12, lineHeight: 18 }]}>{slide.tip}</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.bottomArea}>
          <View style={styles.stepRow}>
            <Text style={styles.stepText}>
              {slideIndex + 1} / {SLIDES.length}
            </Text>
          </View>
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: "#D4A843", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? "Başla" : "İleri"}
            </Text>
            <MaterialIcons
              name={isLast ? "play-arrow" : "arrow-forward"}
              size={20}
              color="#0F1117"
            />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    width: 8,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  slideArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 8,
  },
  logoImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  slideSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4A843",
    letterSpacing: 2,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F9FAFB",
    textAlign: "center",
    lineHeight: 34,
  },
  slideBody: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 340,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#D4A84318",
    borderColor: "#D4A84344",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    maxWidth: 340,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#D4A843",
    lineHeight: 20,
    fontWeight: "500",
  },
  bottomArea: {
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16,
  },
  stepRow: {
    alignItems: "center",
  },
  stepText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F1117",
    letterSpacing: 0.5,
  },
});
