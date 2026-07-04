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
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const LOGO_W = width * 0.68;
const LOGO_H = height * 0.38;
const LINE_HALF = 58;

interface SplashAnimationProps {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  // ── Shared values ──────────────────────────────────────────────────────────

  /** Full-screen fade-out at exit */
  const containerOpacity = useSharedValue(1);

  /** Logo — enters from slightly above */
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(-24);

  /** Gold underline glow beneath the logo */
  const glowOpacity = useSharedValue(0);

  /** Title words — enter from slightly below (opposite of logo) */
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(22);

  /** Separator line expands from centre */
  const lineW = useSharedValue(0);
  const dotOpacity = useSharedValue(0);

  /** Subtitle */
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(10);

  /** Studio badge */
  const badgeOpacity = useSharedValue(0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const started = useRef(false);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeCalled = useRef(false);

  const safeComplete = useCallback(() => {
    if (completeCalled.current) return;
    completeCalled.current = true;
    onComplete();
  }, [onComplete]);

  // ── Animation ─────────────────────────────────────────────────────────────
  const run = useCallback(() => {
    if (started.current) return;
    started.current = true;

    const out = Easing.out(Easing.cubic);
    const inEase = Easing.in(Easing.cubic);

    // ① Logo + glow — slide down from above, fade in
    logoOpacity.value = withTiming(1, { duration: 480, easing: out });
    logoY.value = withSpring(0, { damping: 18, stiffness: 140, mass: 0.9 });
    glowOpacity.value = withDelay(200, withTiming(1, { duration: 500, easing: out }));

    // ② Title — slide up from below at the same moment → meets the logo
    titleOpacity.value = withTiming(1, { duration: 460, easing: out });
    titleY.value = withSpring(0, { damping: 18, stiffness: 140, mass: 0.9 });

    // ③ Separator — diamond appears then lines expand outward
    dotOpacity.value = withDelay(280, withTiming(1, { duration: 200, easing: out }));
    lineW.value = withDelay(320, withTiming(LINE_HALF, { duration: 520, easing: out }));

    // ④ Subtitle
    subtitleOpacity.value = withDelay(380, withTiming(1, { duration: 420, easing: out }));
    subtitleY.value = withDelay(380, withTiming(0, { duration: 420, easing: out }));

    // ⑤ Badge
    badgeOpacity.value = withDelay(500, withTiming(1, { duration: 400, easing: out }));

    // ⑥ Haptic feedback
    if (Platform.OS !== "web") {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, 500);
    }

    // ⑦ Exit — JS timer is authoritative (web safe)
    exitTimer.current = setTimeout(() => safeComplete(), 3300);
    containerOpacity.value = withDelay(
      2860,
      withTiming(0, { duration: 420, easing: inEase }, (done) => {
        if (done) runOnJS(safeComplete)();
      })
    );
  }, [safeComplete]);

  useEffect(() => {
    startTimer.current = setTimeout(() => run(), 80);
    return () => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  // ── Animated styles ───────────────────────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineW.value,
    opacity: lineW.value / LINE_HALF,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({ opacity: badgeOpacity.value }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, containerStyle]}>

      {/* ── LOGO — top section ── */}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
          fadeDuration={0}
        />

        {/* Gradient: logo fades seamlessly into background at its bottom edge */}
        <LinearGradient
          colors={["transparent", "rgba(15,17,23,0.6)", "#0F1117"]}
          locations={[0.45, 0.75, 1]}
          style={styles.logoFade}
          pointerEvents="none"
        />
      </Animated.View>

      {/* Gold glow beneath logo — atmospheric depth */}
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />

      {/* ── TEXT — below logo ── */}
      <Animated.View style={[styles.textBlock, titleStyle]}>

        {/* Title */}
        <View style={styles.titleRow}>
          <Animated.Text style={styles.titleWord}>FAİLİ</Animated.Text>
          <View style={styles.titleGap} />
          <Animated.Text style={styles.titleWord}>MEÇHUL</Animated.Text>
        </View>

        {/* Separator */}
        <View style={styles.separatorRow}>
          <Animated.View style={[styles.line, lineStyle]} />
          <Animated.View style={[styles.diamond, dotStyle]} />
          <Animated.View style={[styles.line, lineStyle]} />
        </View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          Dedektif Bulmaca Oyunu
        </Animated.Text>
      </Animated.View>

      {/* ── Studio badge ── */}
      <Animated.Text style={[styles.badge, badgeStyle]}>
        Faili Meçhul Studio
      </Animated.Text>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F1117",
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none" as const,
  },

  // Logo sits in the top quarter of the screen
  logoWrap: {
    width: LOGO_W,
    height: LOGO_H,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  logo: {
    width: LOGO_W,
    height: LOGO_H,
  },
  logoFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: LOGO_H * 0.42,
  },

  // Subtle gold halo at the boundary between logo and text
  glow: {
    position: "absolute",
    top: height * 0.5 - 20,
    width: width * 0.65,
    height: 60,
    borderRadius: 30,
    backgroundColor: "transparent",
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 50,
  },

  // Text block — enters from below, meets the logo
  textBlock: {
    alignItems: "center",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  titleWord: {
    color: "#EDE0CC",
    fontSize: 30,
    fontFamily: "UnnaBold",
    letterSpacing: 7,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleGap: { width: 10 },

  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    height: 6,
  },
  line: {
    height: 1.5,
    backgroundColor: "#D4A843",
  },
  diamond: {
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
