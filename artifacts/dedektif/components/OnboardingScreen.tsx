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
    body: "Izgara hücrelerine dokunarak işaretleme yap:\n\n✗  →  Bu kombinasyon imkânsız\n✓  →  Bu kombinasyon kesin doğru\n?  →  Henüz bilmiyorum",
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

const MINI_SUSPECTS = ["Arif", "Buse", "Can"];
const MINI_LOCATIONS = ["Ev", "Park", "Bar"];
const MINI_WEAPONS = ["Hançer", "Tabanca", "Zehir"];

const WxS: CellMark[][] = [
  ["cross", "check", "cross"],
  ["none",  "cross", "none" ],
  ["none",  "cross", "none" ],
];
const WxL: CellMark[][] = [
  ["check", "cross", "cross"],
  ["none",  "none",  "none" ],
  ["none",  "none",  "none" ],
];
const LxS: CellMark[][] = [
  ["cross", "check", "cross"],
  ["none",  "cross", "none" ],
  ["none",  "cross", "none" ],
];

const MINI_CELL = 28;
const MINI_LABEL = 48;

function MiniCell({ mark }: { mark: CellMark }) {
  const bg =
    mark === "check" ? "#052e16" : mark === "cross" ? "#2d0e0e" : "#1A1F2E";
  const border =
    mark === "check"
      ? "#4ade8066"
      : mark === "cross"
      ? "#f8717166"
      : "#FFFFFF18";

  return (
    <View style={[miniStyles.cell, { backgroundColor: bg, borderColor: border }]}>
      {mark === "check" && (
        <MaterialIcons name="check" size={13} color="#4ade80" />
      )}
      {mark === "cross" && (
        <MaterialIcons name="close" size={12} color="#f87171" />
      )}
    </View>
  );
}

function MiniGrid() {
  return (
    <View style={miniStyles.container}>
      <View style={miniStyles.gridWrapper}>
        <View style={miniStyles.groupHeaderRow}>
          <View style={{ width: MINI_LABEL }} />
          <View style={[miniStyles.groupLabel, { width: MINI_SUSPECTS.length * (MINI_CELL + 5) }]}>
            <Text style={[miniStyles.groupLabelText, { color: "#A855F7" }]}>ŞÜPHELILER</Text>
          </View>
          <View style={miniStyles.miniDivider} />
          <View style={[miniStyles.groupLabel, { width: MINI_LOCATIONS.length * (MINI_CELL + 5) }]}>
            <Text style={[miniStyles.groupLabelText, { color: "#D4A843" }]}>MEKANLAR</Text>
          </View>
        </View>

        <View style={miniStyles.avatarRow}>
          <View style={{ width: MINI_LABEL }} />
          {MINI_SUSPECTS.map((s) => (
            <Text key={s} style={miniStyles.colHeaderText} numberOfLines={1}>
              {s}
            </Text>
          ))}
          <View style={miniStyles.miniDivider} />
          {MINI_LOCATIONS.map((l) => (
            <Text key={l} style={[miniStyles.colHeaderText, { color: "#D4A843" }]} numberOfLines={1}>
              {l}
            </Text>
          ))}
        </View>

        <View style={miniStyles.sectionBanner}>
          <Text style={miniStyles.sectionBannerText}>SİLAHLAR</Text>
        </View>

        {MINI_WEAPONS.map((weapon, rowIdx) => (
          <View key={weapon} style={miniStyles.dataRow}>
            <Text style={miniStyles.weaponLabel} numberOfLines={1}>{weapon}</Text>
            {WxS[rowIdx].map((mark, ci) => (
              <MiniCell key={"ws" + ci} mark={mark} />
            ))}
            <View style={miniStyles.miniDivider} />
            {WxL[rowIdx].map((mark, ci) => (
              <MiniCell key={"wl" + ci} mark={mark} />
            ))}
          </View>
        ))}

        <View style={[miniStyles.sectionBanner, { borderLeftColor: "#D4A843", borderColor: "#D4A84355" }]}>
          <Text style={[miniStyles.sectionBannerText, { color: "#D4A843" }]}>MEKANLAR</Text>
        </View>

        {MINI_LOCATIONS.map((location, rowIdx) => (
          <View key={location} style={miniStyles.dataRow}>
            <Text style={[miniStyles.weaponLabel, { color: "#D4A843" }]} numberOfLines={1}>{location}</Text>
            {LxS[rowIdx].map((mark, ci) => (
              <MiniCell key={"ls" + ci} mark={mark} />
            ))}
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
  },
  gridWrapper: {
    backgroundColor: "#13172280",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF14",
    padding: 10,
    gap: 4,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  groupLabel: {
    alignItems: "center",
    justifyContent: "center",
  },
  groupLabelText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.0,
  },
  miniDivider: {
    width: 2,
    height: MINI_CELL,
    backgroundColor: "#FFFFFF22",
    borderRadius: 1,
    marginHorizontal: 1,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  colHeaderText: {
    width: MINI_CELL,
    fontSize: 9,
    fontWeight: "700",
    color: "#A855F7",
    textAlign: "center",
  },
  sectionBanner: {
    marginLeft: MINI_LABEL,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 5,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: "#C8372D55",
    borderLeftColor: "#C8372D",
    backgroundColor: "#1A1F2E",
    marginBottom: 2,
  },
  sectionBannerText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#C8372D",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  weaponLabel: {
    width: MINI_LABEL,
    fontSize: 10,
    fontWeight: "700",
    color: "#C8372D",
    textAlign: "right",
    paddingRight: 4,
  },
  cell: {
    width: MINI_CELL,
    height: MINI_CELL - 2,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
          style={styles.slideArea}
        >
          {slide.showGrid ? (
            <MiniGrid />
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
          <Text style={styles.slideBody}>{slide.body}</Text>

          {slide.tip && (
            <View style={styles.tipBox}>
              <MaterialIcons name="info-outline" size={16} color="#D4A843" />
              <Text style={styles.tipText}>{slide.tip}</Text>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
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
