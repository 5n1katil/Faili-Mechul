import React, { useCallback, useEffect, useRef } from "react";
import { Dimensions, Image, Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const BG_LOGO_SIZE = width * 1.15;
const LINE_HALF = 60;

interface SplashAnimationProps {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const containerOpacity = useSharedValue(1);

  // Background logo — large, semi-transparent, slow Ken Burns drift
  const bgLogoOpacity = useSharedValue(0);
  const bgLogoScale = useSharedValue(1.12);

  // Inner glow ring — pulses slowly
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.9);

  // Title words — enter from opposite directions
  const failOpacity = useSharedValue(0);
  const failY = useSharedValue(-22);
  const mechulOpacity = useSharedValue(0);
  const mechulY = useSharedValue(22);

  // Separator
  const lineLeftW = useSharedValue(0);
  const lineRightW = useSharedValue(0);
  const lineDotOpacity = useSharedValue(0);

  // Subtitle & badge
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(10);
  const badgeOpacity = useSharedValue(0);

  const animationStarted = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = useCallback(() => {
    if (animationStarted.current) return;
    animationStarted.current = true;

    const easeOut = Easing.out(Easing.cubic);
    const easeIn = Easing.in(Easing.cubic);
    const easeInOut = Easing.inOut(Easing.ease);

    // 1. Background logo: slow fade in to ~28% opacity, gentle scale drift
    bgLogoOpacity.value = withTiming(0.28, { duration: 900, easing: easeOut });
    bgLogoScale.value = withTiming(1.0, { duration: 3200, easing: Easing.out(Easing.quad) });

    // 2. Inner glow ring: appears with pulsing breath
    glowOpacity.value = withDelay(300, withTiming(1, { duration: 500, easing: easeOut }));
    glowScale.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1400, easing: easeInOut }),
          withTiming(0.95, { duration: 1400, easing: easeInOut })
        ),
        -1,
        true
      )
    );

    // 3. Title — FAİLİ from above, MEÇHUL from below
    failOpacity.value = withDelay(520, withTiming(1, { duration: 420, easing: easeOut }));
    failY.value = withDelay(520, withTiming(0, { duration: 420, easing: easeOut }));
    mechulOpacity.value = withDelay(660, withTiming(1, { duration: 420, easing: easeOut }));
    mechulY.value = withDelay(660, withTiming(0, { duration: 420, easing: easeOut }));

    // 4. Separator
    lineDotOpacity.value = withDelay(820, withTiming(1, { duration: 200, easing: easeOut }));
    lineLeftW.value = withDelay(860, withTiming(LINE_HALF, { duration: 480, easing: easeOut }));
    lineRightW.value = withDelay(860, withTiming(LINE_HALF, { duration: 480, easing: easeOut }));

    // 5. Subtitle
    subtitleOpacity.value = withDelay(1020, withTiming(1, { duration: 400, easing: easeOut }));
    subtitleY.value = withDelay(1020, withTiming(0, { duration: 400, easing: easeOut }));

    // 6. Studio badge
    badgeOpacity.value = withDelay(1180, withTiming(1, { duration: 400, easing: easeOut }));

    // 7. Haptic
    if (Platform.OS !== "web") {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, 650);
    }

    // 8. Exit
    containerOpacity.value = withDelay(
      2900,
      withTiming(0, { duration: 420, easing: easeIn }, (finished) => {
        if (finished) runOnJS(onComplete)();
      })
    );
  }, []);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => startAnimation(), 100);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const bgLogoStyle = useAnimatedStyle(() => ({
    opacity: bgLogoOpacity.value,
    transform: [{ scale: bgLogoScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const failStyle = useAnimatedStyle(() => ({
    opacity: failOpacity.value,
    transform: [{ translateY: failY.value }],
  }));
  const mechulStyle = useAnimatedStyle(() => ({
    opacity: mechulOpacity.value,
    transform: [{ translateY: mechulY.value }],
  }));
  const lineDotStyle = useAnimatedStyle(() => ({ opacity: lineDotOpacity.value }));
  const lineLeftStyle = useAnimatedStyle(() => ({
    width: lineLeftW.value,
    opacity: lineLeftW.value / LINE_HALF,
  }));
  const lineRightStyle = useAnimatedStyle(() => ({
    width: lineRightW.value,
    opacity: lineRightW.value / LINE_HALF,
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: badgeOpacity.value }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>

      {/* ── Background logo — large, behind everything, semi-transparent ── */}
      <Animated.View style={[styles.bgLogoWrap, bgLogoStyle]} pointerEvents="none">
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.bgLogo}
          resizeMode="contain"
          fadeDuration={0}
        />
      </Animated.View>

      {/* Dark gradient vignette — top and bottom depth */}
      <LinearGradient
        colors={["rgba(15,17,23,0.72)", "transparent"]}
        style={styles.vignetteTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(15,17,23,0.88)"]}
        style={styles.vignetteBottom}
        pointerEvents="none"
      />

      {/* Radial glow — behind the text, centered */}
      <Animated.View style={[styles.glowRing, glowStyle]} pointerEvents="none" />

      {/* ── Foreground: text content ── */}
      <View style={styles.content}>

        {/* Title */}
        <View style={styles.titleRow}>
          <Animated.Text style={[styles.titleWord, failStyle]}>FAİLİ</Animated.Text>
          <View style={styles.titleGap} />
          <Animated.Text style={[styles.titleWord, mechulStyle]}>MEÇHUL</Animated.Text>
        </View>

        {/* Separator */}
        <View style={styles.separatorRow}>
          <Animated.View style={[styles.lineHalf, lineLeftStyle]} />
          <Animated.View style={[styles.lineDiamond, lineDotStyle]} />
          <Animated.View style={[styles.lineHalf, lineRightStyle]} />
        </View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          Dedektif Bulmaca Oyunu
        </Animated.Text>
      </View>

      {/* Studio badge */}
      <Animated.Text style={[styles.badge, badgeStyle]}>
        Faili Meçhul Studio
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F1117",
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none" as const,
  },

  bgLogoWrap: {
    position: "absolute",
    width: BG_LOGO_SIZE,
    height: BG_LOGO_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  bgLogo: {
    width: BG_LOGO_SIZE,
    height: BG_LOGO_SIZE,
  },

  vignetteTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.28,
  },
  vignetteBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.28,
  },

  glowRing: {
    position: "absolute",
    width: width * 0.82,
    height: width * 0.82,
    borderRadius: (width * 0.82) / 2,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 70,
    backgroundColor: "#D4A84306",
  },

  content: {
    alignItems: "center",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  titleWord: {
    color: "#EDE0CC",
    fontSize: 30,
    fontFamily: "UnnaBold",
    letterSpacing: 7,
    textAlign: "center",
    textShadowColor: "#000000AA",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleGap: {
    width: 10,
  },

  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    height: 6,
  },
  lineHalf: {
    height: 1.5,
    backgroundColor: "#D4A843",
  },
  lineDiamond: {
    width: 5,
    height: 5,
    backgroundColor: "#D4A843",
    transform: [{ rotate: "45deg" }],
    marginHorizontal: 5,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },

  subtitle: {
    color: "#6B6051",
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    letterSpacing: 2.5,
    textAlign: "center",
    textShadowColor: "#000000AA",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  badge: {
    position: "absolute",
    bottom: 52,
    color: "#35302B",
    fontFamily: "DroidSerifRegular",
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: "center",
  },
});
