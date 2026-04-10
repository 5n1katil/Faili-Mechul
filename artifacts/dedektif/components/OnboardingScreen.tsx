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
  useWindowDimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import DetectiveGrid from "@/components/DetectiveGrid";
import type { Suspect, Weapon, Location } from "@/data/puzzles";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const DEMO_SUSPECTS: Suspect[] = [
  { id: "ds1", name: "Ahmet",  description: "", icon: "face" },
  { id: "ds2", name: "Zeynep", description: "", icon: "badge" },
  { id: "ds3", name: "Murat",  description: "", icon: "elderly" },
];
const DEMO_WEAPONS: Weapon[] = [
  { id: "dw1", name: "Bıçak",   description: "", icon: "cut" },
  { id: "dw2", name: "Zehir",   description: "", icon: "local-pharmacy" },
  { id: "dw3", name: "Tabanca", description: "", icon: "my-location" },
];
const DEMO_LOCATIONS: Location[] = [
  { id: "dl1", name: "Mutfak",    description: "", icon: "restaurant" },
  { id: "dl2", name: "Bahçe",     description: "", icon: "park" },
  { id: "dl3", name: "Kütüphane", description: "", icon: "menu-book" },
];
// Cevap: Zeynep + Bıçak + Bahçe
// Gösterilen durum: Bıçak satırı ve Bahçe mekan satırı çözülmüş,
// otomatik çarpılamalar uygulanmış; geri kalan hücreler henüz incelenmemiş.
const DEMO_GRID_STATE: Record<string, "cross" | "check" | "question"> = {
  // dw1 (Bıçak) — ÇÖZÜLDÜ: Zeynep kullandı, Bahçe'de
  "dw1_ds1": "cross",  "dw1_ds2": "check",  "dw1_ds3": "cross",
  "dw1_dl1": "cross",  "dw1_dl2": "check",  "dw1_dl3": "cross",
  // dw2 (Zehir) — Zeynep=Bıçak → Zeynep≠Zehir; Bahçe=Bıçak → Bahçe≠Zehir
  "dw2_ds2": "cross",  "dw2_dl2": "cross",
  // dw3 (Tabanca) — aynı mantıkla Zeynep≠Tabanca, Bahçe≠Tabanca
  "dw3_ds2": "cross",  "dw3_dl2": "cross",
  // dl1 (Mutfak) — Zeynep=Bahçe → Zeynep≠Mutfak
  "dl1_ds2": "cross",
  // dl2 (Bahçe) — ÇÖZÜLDÜ: Zeynep'in mekanı
  "dl2_ds1": "cross",  "dl2_ds2": "check",  "dl2_ds3": "cross",
  // dl3 (Kütüphane) — Zeynep=Bahçe → Zeynep≠Kütüphane
  "dl3_ds2": "cross",
};

const DEMO_SCALE = 0.68;

function DemoGridWrapper() {
  const { width: screenWidth } = useWindowDimensions();
  const gridWidth = screenWidth - 48;
  const [gridHeight, setGridHeight] = useState(0);

  return (
    <View
      style={{
        width: gridWidth * DEMO_SCALE,
        height: gridHeight > 0 ? gridHeight * DEMO_SCALE : undefined,
        alignSelf: "center",
        overflow: "hidden",
        borderRadius: 10,
      }}
    >
      <View
        style={{
          width: gridWidth,
          transform: [{ scale: DEMO_SCALE }],
          transformOrigin: "top left",
        }}
        onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}
      >
        <DetectiveGrid
          suspects={DEMO_SUSPECTS}
          weapons={DEMO_WEAPONS}
          locations={DEMO_LOCATIONS}
          gridState={DEMO_GRID_STATE}
          onCellPress={() => {}}
          disabled
        />
      </View>
    </View>
  );
}

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
  clue?: string;
}

const SLIDES: Slide[] = [
  {
    icon: "search",
    iconColor: "#D4A843",
    iconBg: "#2A1E0840",
    title: "Faili Meçhul'e Hoş Geldin!",
    subtitle: "Dedektif Bulmaca Oyunu",
    subtitleNoUppercase: true,
    body: "Faili Meçhul, mantık yürütme ile cinayet gizemini birleştiren dedüksiyon temelli bir dedektif bulmaca oyunudur.\n\nHer vakada Kim? Nerede? Neyle? sorularının tek doğru cevabını, ipuçlarını eleyerek ve dedektif ızgarasını doğru kullanarak bulman gerekir.\n\nŞüpheliler, silahlar ve mekanlar arasından doğru kombinasyonu en kısa zamanda bul, diğer dedektifler ile yarışarak liderlik tablosunda adını efsaneler arasına yazdır.",
    tip: "Unutma dedektif, suçu kanıtlanana kadar herkes masumdur...",
  },
  {
    icon: "grid-on",
    iconColor: "#A855F7",
    iconBg: "#1E103040",
    title: "Dedektif Izgarası",
    subtitle: "Mantık Yürüt",
    clue: "İpucu: Zeynep'in parmak izi Bıçak'ta, ayak izi Bahçe'de bulundu.",
    body: "✗  →  Bu kombinasyon imkânsız\n✓  →  Kesin doğru kombinasyon\n?  →  Henüz emin değilim\n\n✓ koyduğunda aynı satır ve sütundaki diğer hücreler otomatik ✗ olur!",
    tip: "Izgara: Zeynep • Bıçak • Bahçe çözüldü. Peki Ahmet ve Murat nerede?",
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
          style={[styles.slideArea, slide.showGrid && { gap: 4 }]}
        >
          {slide.clue && (
            <View style={styles.clueBox}>
              <MaterialIcons name="fingerprint" size={14} color="#D4A843" />
              <Text style={styles.clueText}>{slide.clue}</Text>
            </View>
          )}

          {slide.showGrid ? (
            <DemoGridWrapper />
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
  clueBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#2A1E0860",
    borderLeftWidth: 2,
    borderLeftColor: "#D4A843",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 340,
    alignSelf: "center",
  },
  clueText: {
    flex: 1,
    fontSize: 12,
    color: "#D4A843CC",
    lineHeight: 18,
    fontStyle: "italic",
  },
});
