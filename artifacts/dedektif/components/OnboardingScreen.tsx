import React, { useState } from "react";
import type { ComponentProps } from "react";
import {
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
  body: string;
  tip?: string;
}

const SLIDES: Slide[] = [
  {
    icon: "search",
    iconColor: "#D4A843",
    iconBg: "#2A1E0840",
    title: "Dedektif'e Hoş Geldin!",
    subtitle: "Cinayeti Çöz",
    body: "Her bulmacada bir cinayet var. Şüpheliler, silahlar ve mekanlar arasından doğru kombinasyonu bulman gerekiyor.",
    tip: "3 yanlış cevap hakkın var — dikkatli ol!",
  },
  {
    icon: "grid-on",
    iconColor: "#A855F7",
    iconBg: "#1E103040",
    title: "Dedektif Izgarası",
    subtitle: "Mantık Yürüt",
    body: "Izgara hücrelerine dokunarak işaretleme yap. Her dokunuş sırasıyla değişir:\n\n✗  →  Bu kombinasyon imkânsız\n✓  →  Bu kombinasyon kesin doğru\n?  →  Henüz bilmiyorum",
    tip: "Bir satırda yalnızca bir ✓ olabilir!",
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
    body: "Şüpheliyi, silahı ve mekanı belirledikten sonra alt taraftaki \"SUÇLA\" butonuna bas. Yanlışsa bir hata hakkın gider.",
    tip: "Emin olmadan suçlama — 3 hata hakkını korumaya çalış!",
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
          style={styles.slideArea}
        >
          <View style={[styles.iconWrapper, { backgroundColor: slide.iconBg }]}>
            <View style={[styles.iconCircle, { borderColor: slide.iconColor + "60", backgroundColor: slide.iconBg }]}>
              <MaterialIcons name={slide.icon} size={54} color={slide.iconColor} />
            </View>
          </View>

          <Text style={styles.slideSubtitle}>{slide.subtitle.toUpperCase()}</Text>
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
    gap: 16,
    paddingHorizontal: 8,
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
