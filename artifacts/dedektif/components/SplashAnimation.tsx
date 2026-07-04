import React, { useCallback, useEffect, useRef } from "react";
import { Dimensions, Image, Platform, StyleSheet, Text, View } from "react-native";
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

const LOGO_SIZE = Math.min(width * 0.74, 310);
const LINE_HALF = 64;

interface SplashAnimationProps {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: SplashAnimationProps) {

  // ── Container ──────────────────────────────────────────────────
  const containerOpacity = useSharedValue(1);

  // ── Background ─────────────────────────────────────────────────
  const bgOpacity = useSharedValue(0);
  const bgScale  = useSharedValue(1.1);

  // ── Vignette centre-glow ───────────────────────────────────────
  const vignetteOpacity = useSharedValue(0);

  // ── Logo ───────────────────────────────────────────────────────
  const logoOpacity = useSharedValue(0);
  const logoScale  = useSharedValue(0.72);
  const logoY      = useSharedValue(30);

  // ── Glow ring ──────────────────────────────────────────────────
  const glowOpacity = useSharedValue(0);
  const glowScale   = useSharedValue(0.88);

  // ── Shimmer ────────────────────────────────────────────────────
  const shimmerX = useSharedValue(-LOGO_SIZE);

  // ── Title ──────────────────────────────────────────────────────
  const titleOpacity = useSharedValue(0);
  const titleY       = useSharedValue(22);
  const titleScale   = useSharedValue(0.94);

  // ── Separator ──────────────────────────────────────────────────
  const lineW      = useSharedValue(0);
  const dotOpacity = useSharedValue(0);
  const dotScale   = useSharedValue(0);

  // ── Subtitle ───────────────────────────────────────────────────
  const subtitleOpacity = useSharedValue(0);
  const subtitleY       = useSharedValue(14);

  // ── Badge ──────────────────────────────────────────────────────
  const badgeOpacity = useSharedValue(0);

  // ── Refs ───────────────────────────────────────────────────────
  const started    = useRef(false);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done       = useRef(false);

  const safeComplete = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onComplete();
  }, [onComplete]);

  // ── Animation sequence ─────────────────────────────────────────
  const run = useCallback(() => {
    if (started.current) return;
    started.current = true;

    const eOut = Easing.out(Easing.cubic);
    const eIn  = Easing.in(Easing.cubic);
    const eIO  = Easing.inOut(Easing.sin);

    // ① BG — slow dramatic reveal from black, subtle Ken Burns
    bgOpacity.value = withTiming(1, { duration: 1400, easing: eOut });
    bgScale.value   = withTiming(1.0, { duration: 6000, easing: Easing.out(Easing.quad) });

    // ② Vignette — darkens edges after BG appears
    vignetteOpacity.value = withDelay(300, withTiming(1, { duration: 900, easing: eOut }));

    // ③ Logo — spring bounce up from below
    logoOpacity.value = withDelay(500, withTiming(1, { duration: 550, easing: eOut }));
    logoScale.value   = withDelay(500, withSpring(1, { damping: 14, stiffness: 110, mass: 1.2 }));
    logoY.value       = withDelay(500, withSpring(0, { damping: 18, stiffness: 130, mass: 1.0 }));

    // ④ Glow ring — fade in then breathe
    glowOpacity.value = withDelay(750, withTiming(0.9, { duration: 700, easing: eOut }));
    glowScale.value   = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1.14, { duration: 2200, easing: eIO }),
          withTiming(0.92, { duration: 2200, easing: eIO })
        ),
        -1,
        true
      )
    );

    // ⑤ Shimmer — single golden pass across logo
    shimmerX.value = withDelay(
      1050,
      withTiming(LOGO_SIZE * 1.6, { duration: 800, easing: Easing.out(Easing.quad) })
    );

    // ⑥ Title — scale + slide up
    titleOpacity.value = withDelay(950, withTiming(1, { duration: 550, easing: eOut }));
    titleY.value       = withDelay(950, withSpring(0, { damping: 22, stiffness: 140 }));
    titleScale.value   = withDelay(950, withSpring(1, { damping: 22, stiffness: 150 }));

    // ⑦ Separator
    dotOpacity.value = withDelay(1160, withTiming(1, { duration: 260, easing: eOut }));
    dotScale.value   = withDelay(1160, withSpring(1, { damping: 12, stiffness: 220 }));
    lineW.value      = withDelay(1200, withTiming(LINE_HALF, { duration: 600, easing: eOut }));

    // ⑧ Subtitle
    subtitleOpacity.value = withDelay(1350, withTiming(1, { duration: 550, easing: eOut }));
    subtitleY.value       = withDelay(1350, withSpring(0, { damping: 22, stiffness: 130 }));

    // ⑨ Studio badge
    badgeOpacity.value = withDelay(1600, withTiming(1, { duration: 450, easing: eOut }));

    // ⑩ Haptics
    if (Platform.OS !== "web") {
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 620);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}), 1200);
    }

    // ⑪ Exit — fade to black
    exitTimer.current = setTimeout(() => safeComplete(), 4200);
    containerOpacity.value = withDelay(
      3500,
      withTiming(0, { duration: 700, easing: eIn }, (finished) => {
        if (finished) runOnJS(safeComplete)();
      })
    );
  }, [safeComplete]);

  useEffect(() => {
    startTimer.current = setTimeout(() => run(), 60);
    return () => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (exitTimer.current)  clearTimeout(exitTimer.current);
    };
  }, []);

  // ── Animated styles ────────────────────────────────────────────
  const containerStyle  = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const bgStyle         = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [{ scale: bgScale.value }],
  }));
  const vignetteStyle   = useAnimatedStyle(() => ({ opacity: vignetteOpacity.value }));
  const logoStyle       = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: logoY.value }],
  }));
  const glowStyle       = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const shimmerStyle    = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));
  const titleStyle      = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }, { scale: titleScale.value }],
  }));
  const lineStyle       = useAnimatedStyle(() => ({
    width: lineW.value,
    opacity: Math.min(lineW.value / LINE_HALF, 1),
  }));
  const dotStyle        = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotScale.value }, { rotate: "45deg" }],
  }));
  const subtitleStyle   = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));
  const badgeStyle      = useAnimatedStyle(() => ({ opacity: badgeOpacity.value }));

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, containerStyle]}>

      {/* ── Layer 1: Istanbul night background ── */}
      <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle]} pointerEvents="none">
        <Image
          source={require("../assets/images/intro_bg.png")}
          style={{ width, height }}
          resizeMode="cover"
          fadeDuration={0}
        />
      </Animated.View>

      {/* ── Layer 2: Vignette — edges to black + centre warm ── */}
      <Animated.View style={[StyleSheet.absoluteFillObject, vignetteStyle]} pointerEvents="none">
        {/* Top & bottom darkening */}
        <LinearGradient
          colors={[
            "#000000",
            "rgba(0,0,0,0.72)",
            "rgba(0,0,0,0.22)",
            "rgba(0,0,0,0.22)",
            "rgba(0,0,0,0.72)",
            "#000000",
          ]}
          locations={[0, 0.16, 0.36, 0.64, 0.84, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Left & right darkening */}
        <LinearGradient
          colors={["#000000", "rgba(0,0,0,0.55)", "transparent", "rgba(0,0,0,0.55)", "#000000"]}
          locations={[0, 0.1, 0.5, 0.9, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Warm centre radial glow — subtle gold haze behind content */}
        <LinearGradient
          colors={["transparent", "transparent", "rgba(180,130,30,0.08)", "transparent"]}
          locations={[0, 0.3, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* ── Layer 3: Content ── */}
      <View style={styles.content}>

        {/* Glow halo behind logo */}
        <Animated.View style={[styles.glowRing, glowStyle]} pointerEvents="none" />

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require("../assets/images/intro_logo.png")}
            style={styles.logo}
            resizeMode="contain"
            fadeDuration={0}
          />
          {/* Golden shimmer pass */}
          <View style={styles.shimmerClip} pointerEvents="none">
            <Animated.View style={[styles.shimmerSlide, shimmerStyle]}>
              <LinearGradient
                colors={[
                  "transparent",
                  "rgba(255,230,120,0.18)",
                  "rgba(255,248,190,0.55)",
                  "rgba(255,230,120,0.18)",
                  "transparent",
                ]}
                locations={[0, 0.28, 0.5, 0.72, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shimmerGrad}
              />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Text block */}
        <Animated.View style={[styles.textBlock, titleStyle]}>

          {/* Main title */}
          <View style={styles.titleRow}>
            <Text style={styles.titleWord}>FAİLİ</Text>
            <View style={styles.titleGap} />
            <Text style={styles.titleWord}>MEÇHUL</Text>
          </View>

          {/* Gold separator */}
          <View style={styles.sepRow}>
            <Animated.View style={[styles.line, lineStyle]} />
            <Animated.View style={[styles.diamond, dotStyle]} />
            <Animated.View style={[styles.line, lineStyle]} />
          </View>

          {/* Subtitle — two lines */}
          <Animated.View style={[styles.subtitleWrap, subtitleStyle]}>
            <Text style={styles.subtitleLine1}>Türkiye'nin</Text>
            <Text style={styles.subtitleLine2}>Dedektif Bulmaca Oyunu</Text>
          </Animated.View>

        </Animated.View>
      </View>

      {/* Studio badge */}
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
    backgroundColor: "#000000",
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none" as const,
  },

  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    width: "100%",
  },

  // ── Glow ring ──
  glowRing: {
    position: "absolute",
    width: LOGO_SIZE * 1.32,
    height: LOGO_SIZE * 1.32,
    top: -(LOGO_SIZE * 0.16),
    borderRadius: (LOGO_SIZE * 1.32) / 2,
    backgroundColor: "transparent",
    shadowColor: "#C89B2A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 60,
    elevation: 0,
  },

  // ── Logo ──
  logoWrap: {
    marginBottom: 42,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.7,
    shadowRadius: 32,
    elevation: 24,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  // ── Shimmer ──
  shimmerClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: LOGO_SIZE / 2,
  },
  shimmerSlide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: LOGO_SIZE * 0.6,
  },
  shimmerGrad: {
    flex: 1,
    width: LOGO_SIZE * 0.6,
  },

  // ── Text block ──
  textBlock: {
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  titleWord: {
    color: "#EDE0C4",
    fontSize: 32,
    fontFamily: "UnnaBold",
    fontWeight: "700",
    letterSpacing: 8,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  titleGap: { width: 10 },

  // ── Separator ──
  sepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    height: 8,
  },
  line: {
    height: 1.5,
    backgroundColor: "#D4A843",
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
  diamond: {
    width: 6,
    height: 6,
    backgroundColor: "#D4A843",
    marginHorizontal: 7,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 7,
  },

  // ── Subtitle ──
  subtitleWrap: {
    alignItems: "center",
    gap: 4,
    width: "100%",
    paddingHorizontal: 32,
  },
  subtitleLine1: {
    color: "#B8A07A",
    fontFamily: "DroidSerifRegular",
    fontSize: 15,
    textAlign: "center",
    fontStyle: "italic",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtitleLine2: {
    color: "#957A55",
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // ── Badge ──
  badge: {
    position: "absolute",
    bottom: 54,
    color: "#3D3326",
    fontFamily: "DroidSerifRegular",
    fontSize: 11,
    letterSpacing: 1.8,
    textAlign: "center",
  },
});
