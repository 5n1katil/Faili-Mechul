import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ComponentProps } from "react";
import {
  FlatList,
  Image,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DetectiveGrid from "@/components/DetectiveGrid";
import type { Suspect, Weapon, Location } from "@/data/puzzles";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const DEMO_SUSPECTS: Suspect[] = [
  { id: "ds1", name: "Ahmet",  description: "", icon: "👨" },
  { id: "ds2", name: "Zeynep", description: "", icon: "noun-woman-58199.png" },
  { id: "ds3", name: "Murat",  description: "", icon: "👴" },
];
const DEMO_WEAPONS: Weapon[] = [
  { id: "dw1", name: "Bıçak",   description: "", icon: "🔪" },
  { id: "dw2", name: "Zehir",   description: "", icon: "local-pharmacy" },
  { id: "dw3", name: "Tabanca", description: "", icon: "security" },
];
const DEMO_LOCATIONS: Location[] = [
  { id: "dl1", name: "Mutfak",    description: "", icon: "restaurant" },
  { id: "dl2", name: "Bahçe",     description: "", icon: "park" },
  { id: "dl3", name: "Kütüphane", description: "", icon: "library-books" },
];
const DEMO_GRID_STATE: Record<string, "cross" | "check" | "question"> = {
  "dw1_ds1": "cross",  "dw1_ds2": "check",  "dw1_ds3": "cross",
  "dw1_dl1": "cross",  "dw1_dl2": "check",  "dw1_dl3": "cross",
  "dw2_ds2": "cross",  "dw2_dl2": "cross",
  "dw3_ds2": "cross",  "dw3_dl2": "cross",
  "dl1_ds2": "cross",
  "dl2_ds1": "cross",  "dl2_ds2": "check",  "dl2_ds3": "cross",
  "dl3_ds2": "cross",
};

function DemoGridWrapper({ contentWidth, screenHeight }: { contentWidth: number; screenHeight: number }) {
  const maxGridHeight = screenHeight * 0.38;
  const [naturalHeight, setNaturalHeight] = useState(0);
  const scaleByHeight = naturalHeight > 0
    ? Math.min(1, maxGridHeight / naturalHeight)
    : 1;
  const scale = Math.min(scaleByHeight, 0.92);

  return (
    <View
      style={{
        width: contentWidth * scale,
        height: naturalHeight > 0 ? naturalHeight * scale : undefined,
        alignSelf: "center",
        overflow: "hidden",
        borderRadius: 10,
      }}
    >
      <View
        style={{
          width: contentWidth,
          transform: [{ scale }],
          transformOrigin: "top left",
        }}
        onLayout={(e) => setNaturalHeight(e.nativeEvent.layout.height)}
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

const CLUE_EXAMPLES = [
  {
    locked: false,
    text: "Otopsi raporu: vücutta kimyasal toksin izine rastlanmadı. Zehir kullanılmamış.",
    hint: "→ Zehir elendi!",
  },
  {
    locked: false,
    text: "Tanıklar, cinayetten önce Mehmet Bey'in bahçede değil mutfakta olduğunu gördü.",
    hint: "→ Bahçe elendi!",
  },
  {
    locked: false,
    text: "Kütüphane kapısı olaydan önce içten kilitliydi; katil bu odayı kullanmamış.",
    hint: "→ Kütüphane elendi!",
  },
  {
    locked: false,
    text: "Maktulün eli kâğıt kesiğiyle yaralıydı; kavga mutfakta başlamış olabilir.",
    hint: "→ Dikkat: Mutfak!",
  },
  {
    locked: true,
    text: "Gece boyunca hiç kimse silah sesi duymadı. Kullanılan alet sessizdi.",
    hint: "→ Tabanca elendi!",
  },
];

function ClueExampleBox({ contentWidth }: { contentWidth: number }) {
  const GOLD = "#D4A843";
  const RED = "#C8372D";

  return (
    <View style={{ width: contentWidth, gap: 8 }}>
      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 2, paddingBottom: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ backgroundColor: GOLD, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 10, fontWeight: "700", color: "#0F1117" }}>AÇIK</Text>
          </View>
          <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 12, color: "#6B7280" }}>Baştan görünür ipucu</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ backgroundColor: RED, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 10, fontWeight: "700", color: "#FFF" }}>+30 sn ⏱</Text>
          </View>
          <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 12, color: "#6B7280" }}>Bonus ipucu</Text>
        </View>
      </View>

      {/* Clue cards */}
      {CLUE_EXAMPLES.map((clue, i) => (
        <View key={i} style={{
          backgroundColor: "#1A1F2E",
          borderRadius: 10,
          borderLeftWidth: 3,
          borderLeftColor: clue.locked ? RED : GOLD,
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
          paddingHorizontal: 12,
          gap: 10,
        }}>
          <MaterialIcons
            name={clue.locked ? "lock" : "fingerprint"}
            size={18}
            color={clue.locked ? RED : GOLD}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 12, color: "#D1D5DB", lineHeight: 18 }}>
              "{clue.text}"
            </Text>
            <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 11, color: clue.locked ? RED + "BB" : GOLD + "BB", marginTop: 3, fontWeight: "600" }}>
              {clue.hint}
            </Text>
          </View>
          <View style={{
            backgroundColor: clue.locked ? RED : GOLD,
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 3,
          }}>
            <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 9, fontWeight: "700", color: clue.locked ? "#FFF" : "#0F1117", letterSpacing: 0.5 }}>
              {clue.locked ? "+30 sn ⏱" : "AÇIK"}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MockAccusationCard({ contentWidth }: { contentWidth: number }) {
  const GOLD = "#D4A843";
  const RED = "#C8372D";
  const SEP = "#2A3050";
  const rows = [
    { label: "KİM", value: "Rıfat Bey" },
    { label: "NEREDE", value: "Mutfak" },
    { label: "NEYLE", value: "Bıçak" },
  ];
  return (
    <View style={{
      width: contentWidth,
      alignSelf: "center",
      backgroundColor: "#1A1F2E",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: SEP,
      overflow: "hidden",
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: SEP }}>
        <MaterialIcons name="gavel" size={16} color={RED} />
        <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 12, fontWeight: "800", color: GOLD, letterSpacing: 1.5 }}>SON ÇIKARIM</Text>
      </View>

      {rows.map((row, i) => (
        <View key={row.label} style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: i < rows.length - 1 ? 1 : 0,
          borderBottomColor: SEP,
        }}>
          <Text style={{ width: 72, fontFamily: "DroidSerifRegular", fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 }}>{row.label}</Text>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0F1117", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 14, fontWeight: "600", color: "#F9FAFB" }}>{row.value}</Text>
            <MaterialIcons name="expand-more" size={20} color="#6B7280" />
          </View>
        </View>
      ))}

      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}>
        <View style={{ backgroundColor: GOLD, borderRadius: 10, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
          <MaterialIcons name="send" size={18} color="#0F1117" />
          <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 15, fontWeight: "800", color: "#0F1117" }}>Raporu Gönder</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 10 }}>
        <MaterialIcons name="warning-amber" size={13} color={RED} />
        <Text style={{ flex: 1, fontFamily: "DroidSerifRegular", fontSize: 12, color: RED + "CC", fontWeight: "500" }}>Yanlış tahmin → +30 sn ceza eklenir, oyun devam eder</Text>
      </View>
    </View>
  );
}

function SlideStartOptions({ contentWidth }: { contentWidth: number }) {
  const GOLD = "#D4A843";
  const CARD_BG = "#1A1F2E";
  const SEP = "#2A3050";

  const options = [
    {
      icon: "today" as MaterialIconName,
      iconColor: GOLD,
      accent: GOLD,
      label: "Günlük Vaka",
      desc: "Ana sayfada her gün yeni bir vaka seni bekler. Tamamen ücretsiz — oyna butonuna bas, hemen başla.",
      badge: "Her gün yenilenir · Ücretsiz",
    },
    {
      icon: "folder-special" as MaterialIconName,
      iconColor: "#A855F7",
      accent: "#A855F7",
      label: "Vaka Arşivi",
      desc: "9 tematik pakette 60'tan fazla vaka! Olimpos'tan Ergenekon'a, Asgard'dan modern şehirlere uzanan bir arşiv.",
      badge: "9 Paket · 60+ Vaka · Çaylak → Efsane Komiser",
    },
  ];

  return (
    <View style={{ width: contentWidth, gap: 12 }}>
      {options.map((opt) => (
        <View
          key={opt.label}
          style={{
            backgroundColor: CARD_BG,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: opt.accent + "50",
            overflow: "hidden",
          }}
        >
          <View style={{ width: "100%", height: 3, backgroundColor: opt.accent }} />
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 16 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: opt.accent + "18",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <MaterialIcons name={opt.icon} size={24} color={opt.accent} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 15, fontWeight: "800", color: "#F9FAFB" }}>{opt.label}</Text>
              <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 12, color: "#9CA3AF", lineHeight: 18 }}>{opt.desc}</Text>
              <View style={{
                alignSelf: "flex-start",
                marginTop: 4,
                backgroundColor: opt.accent + "22",
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <Text style={{ fontFamily: "DroidSerifRegular", fontSize: 10, fontWeight: "700", color: opt.accent, letterSpacing: 0.3 }}>{opt.badge}</Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: GOLD + "12",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: GOLD + "30",
        paddingHorizontal: 12,
        paddingVertical: 9,
      }}>
        <MaterialIcons name="local-fire-department" size={16} color={GOLD} />
        <Text style={{ flex: 1, fontFamily: "DroidSerifRegular", fontSize: 12, color: GOLD + "DD", lineHeight: 17, fontWeight: "500" }}>
          Her gün yeni bir vaka — üst üste çöz, serini kır ve liderlik tablosunda yüksel!
        </Text>
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
  showClueExample?: boolean;
  showAccusation?: boolean;
  showStartOptions?: boolean;
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
    icon: "play-circle-outline",
    iconColor: "#D4A843",
    iconBg: "#2A1E0840",
    title: "Oyuna Nasıl Başlarsın?",
    subtitle: "İki Yol, Sonsuz Vaka",
    subtitleNoUppercase: true,
    body: "Günlük Vaka ile ücretsiz başla ya da Vaka Arşivi'nden 9 tematik paket arasından istediğini seç.",
    showStartOptions: true,
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
    showClueExample: true,
    body: "Her bulmacada baştan en az 4 standart ipucu açık gelir. Bunlar; tanık ifadeleri, adli raporlar ve fiziksel delillerden oluşur — her biri seni bir adım daha yaklaştırır.\n\nDaha fazlasına ihtiyaç duyarsan \"Sonraki İpucu\" ile bir tane daha açabilirsin — ama her bonus ipucu kronometreye +30 saniye ekler!",
    tip: "İpuçsuz çözersen daha yüksek puan alırsın — sadece gerçekten gerektiğinde bonus ipucu aç!",
  },
  {
    icon: "gavel",
    iconColor: "#C8372D",
    iconBg: "#2E101040",
    title: "Suçlama",
    subtitle: "Kararını Bildir",
    showAccusation: true,
    body: "Tüm delilleri değerlendirince alt çubukta \"SUÇLA\" butonuna bas. Açılan panelde 3 kutuyu doldur:\n\nKİM (şüpheli)  ·  NEREDE (mekan)  ·  NEYLE (silah)\n\n\"Raporu Gönder\" aktif olunca kararını bildir.",
    tip: "Yanlış suçlama: kırmızı titreme + +30 saniye ceza — ama oyun devam eder! Emin olmadan suçlama yapma.",
  },
];

interface SlidePageProps {
  slide: Slide;
  slideIndex: number;
  screenWidth: number;
  screenHeight: number;
}

function SlidePage({ slide, slideIndex, screenWidth, screenHeight }: SlidePageProps) {
  const contentWidth = screenWidth - 48;
  const isShortScreen = screenHeight < 700;

  return (
    <ScrollView
      style={{ width: screenWidth, flex: 1 }}
      contentContainerStyle={[
        styles.slideScroll,
        slide.showGrid && { gap: 6 },
        slide.showClueExample && { gap: 10 },
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {slide.clue && (
        <View style={[styles.clueBox, { width: contentWidth }]}>
          <MaterialIcons name="fingerprint" size={15} color="#D4A843" />
          <Text style={styles.clueText}>{slide.clue}</Text>
        </View>
      )}

      {slide.showStartOptions ? (
        <SlideStartOptions contentWidth={contentWidth} />
      ) : slide.showGrid ? (
        <DemoGridWrapper contentWidth={contentWidth} screenHeight={screenHeight} />
      ) : slide.showClueExample ? (
        <ClueExampleBox contentWidth={contentWidth} />
      ) : slide.showAccusation ? (
        <MockAccusationCard contentWidth={contentWidth} />
      ) : slideIndex === 0 ? (
        <Image
          source={require("@/assets/images/logo.png")}
          style={[
            styles.logoImage,
            isShortScreen && { width: 110, height: 110, borderRadius: 55 },
          ]}
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
      <Text style={[
        styles.slideBody,
        { width: contentWidth },
        slide.showGrid && { fontFamily: "DroidSerifRegular", fontSize: 13, lineHeight: 21 },
      ]}>
        {slide.body}
      </Text>

      {slide.tip && (
        <View style={[
          styles.tipBox,
          { width: contentWidth },
          slide.showGrid && { paddingVertical: 8, marginTop: 0 },
        ]}>
          <MaterialIcons name="info-outline" size={15} color="#D4A843" />
          <Text style={[styles.tipText, slide.showGrid && { fontFamily: "DroidSerifRegular", fontSize: 12, lineHeight: 18 }]}>
            {slide.tip}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

interface Props {
  visible: boolean;
  onDone: () => void;
  closeLabel?: string;
}

export default function OnboardingScreen({ visible, onDone, closeLabel }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [slideIndex, setSlideIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const isLast = slideIndex === SLIDES.length - 1;

  useEffect(() => {
    if (visible) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      setSlideIndex(0);
    }
  }, [visible]);

  const goNext = () => {
    if (isLast) {
      onDone();
    } else {
      const next = slideIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setSlideIndex(next);
    }
  };

  const handleSkip = () => onDone();

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setSlideIndex(newIndex);
  };

  const renderSlide = useCallback(({ item, index }: { item: Slide; index: number }) => (
    <SlidePage
      slide={item}
      slideIndex={index}
      screenWidth={screenWidth}
      screenHeight={screenHeight}
    />
  ), [screenWidth, screenHeight]);

  const getItemLayout = useCallback((
    _data: ArrayLike<Slide> | null | undefined,
    index: number,
  ) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  }), [screenWidth]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
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

        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={getItemLayout}
          style={styles.flatList}
          scrollEventThrottle={16}
        />

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
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 24,
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
  flatList: {
    flex: 1,
  },
  slideScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
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
    fontFamily: "UnnaBold",
    fontWeight: "600",
    color: "#F9FAFB",
    textAlign: "center",
    lineHeight: 34,
  },
  slideBody: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 24,
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
    paddingHorizontal: 24,
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
