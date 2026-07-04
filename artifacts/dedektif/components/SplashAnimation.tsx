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

// Foreground logo — large, rounded, prominent
const LOGO_SIZE = Math.min(width * 0.72, 300);
const LOGO_RADIUS = LOGO_SIZE * 0.18;

// Background copy — oversized for Ken Burns, blurred
const BG_SIZE = width * 1.6;

const LINE_HALF = 58;

interface SplashAnimationProps {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  // ── Shared values ─────────────────────────────────────────────
  const containerOpacity = useSharedValue(1);

  // Background logo (depth layer)
  const bgOpacity = useSharedValue(0);
  const bgScale = useSharedValue(1.08);

  // Foreground logo
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(1.06);

  // Glow ring around foreground logo
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.92);

  // Title
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);

  // Separator
  const lineW = useSharedValue(0);
  const dotOpacity = useSharedValue(0);

  // Subtitle & badge
  const subtitleOpacity = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);

  // ── Refs ─────────────────────────────────────────────────────
  const started = useRef(false);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  const safeComplete = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onComplete();
  }, [onComplete]);

  // ── Run animation ─────────────────────────────────────────────
  const run = useCallback(() => {
    if (started.current) return;
    started.current = true;

    const eOut = Easing.out(Easing.cubic);
    const eIn  = Easing.in(Easing.cubic);
    const eIO  = Easing.inOut(Easing.ease);

    // ① Background depth layer — slow Ken Burns drift, semi-transparent
    bgOpacity.value = withTiming(0.16, { duration: 1000, easing: eOut });
    bgScale.value   = withTiming(1.0,  { duration: 4000, easing: Easing.out(Easing.quad) });

    // ② Foreground logo — spring in from slightly scaled-up
    logoOpacity.value = withTiming(1, { duration: 420, easing: eOut });
    logoScale.value   = withSpring(1, { damping: 22, stiffness: 160, mass: 0.85 });

    // ③ Glow ring — fades in, then breathes slowly
    glowOpacity.value = withDelay(180, withTiming(1, { duration: 480, easing: eOut }));
    glowScale.value   = withDelay(
      180,
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1600, easing: eIO }),
          withTiming(0.96, { duration: 1600, easing: eIO })
        ),
        -1,
        true
      )
    );

    // ④ Title — slides up, same moment as logo
    titleOpacity.value = withDelay(60, withTiming(1, { duration: 440, easing: eOut }));
    titleY.value       = withDelay(60, withSpring(0, { damping: 20, stiffness: 150, mass: 0.9 }));

    // ⑤ Separator
    dotOpacity.value = withDelay(280, withTiming(1, { duration: 200, easing: eOut }));
    lineW.value      = withDelay(320, withTiming(LINE_HALF, { duration: 500, easing: eOut }));

    // ⑥ Subtitle & badge
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 400, easing: eOut }));
    badgeOpacity.value    = withDelay(560, withTiming(1, { duration: 400, easing: eOut }));

    // ⑦ Haptic
    if (Platform.OS !== "web") {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, 480);
    }

    // ⑧ Exit — JS timer is authoritative for web
    exitTimer.current = setTimeout(() => safeComplete(), 3300);
    containerOpacity.value = withDelay(
      2860,
      withTiming(0, { duration: 430, easing: eIn }, (finished) => {
        if (finished) runOnJS(safeComplete)();
      })
    );
  }, [safeComplete]);

  useEffect(() => {
    startTimer.current = setTimeout(() => run(), 80);
    return () => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (exitTimer.current)  clearTimeout(exitTimer.current);
    };
  }, []);

  // ── Animated styles ───────────────────────────────────────────
  const containerStyle   = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const bgStyle          = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [{ scale: bgScale.value }],
  }));
  const logoStyle        = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const glowStyle        = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const titleStyle       = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const dotStyle         = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));
  const lineStyle        = useAnimatedStyle(() => ({
    width: lineW.value,
    opacity: lineW.value / LINE_HALF,
  }));
  const subtitleStyle    = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const badgeStyle       = useAnimatedStyle(() => ({ opacity: badgeOpacity.value }));

  // ── Render ────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, containerStyle]}>

      {/* ── Layer 1: Background icon — blurred, semi-transparent, Ken Burns ── */}
      <Animated.View style={[styles.bgWrap, bgStyle]} pointerEvents="none">
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.bgImage}
          resizeMode="cover"
          blurRadius={Platform.OS === "ios" ? 28 : 18}
          fadeDuration={0}
        />
      </Animated.View>

      {/* ── Layer 2: Radial dark overlay — vignette from edges ── */}
      <LinearGradient
        colors={["#0F1117", "rgba(15,17,23,0.82)", "rgba(15,17,23,0.45)", "rgba(15,17,23,0.45)", "rgba(15,17,23,0.82)", "#0F1117"]}
        locations={[0, 0.12, 0.3, 0.7, 0.88, 1]}
        style={styles.vignetteV}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["#0F1117", "rgba(15,17,23,0.75)", "transparent", "rgba(15,17,23,0.75)", "#0F1117"]}
        locations={[0, 0.1, 0.5, 0.9, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.vignetteH}
        pointerEvents="none"
      />

      {/* ── Layer 3: Content ── */}
      <View style={styles.content}>

        {/* Glow ring behind logo */}
        <Animated.View style={[styles.glowRing, glowStyle]} pointerEvents="none" />

        {/* Foreground logo — large, rounded corners, sharp */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <View style={styles.logoInner}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="cover"
              fadeDuration={0}
            />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View style={[styles.textBlock, titleStyle]}>
          <View style={styles.titleRow}>
            <Animated.Text style={styles.titleWord}>FAİLİ</Animated.Text>
            <View style={styles.titleGap} />
            <Animated.Text style={styles.titleWord}>MEÇHUL</Animated.Text>
          </View>

          {/* Separator */}
          <View style={styles.sepRow}>
            <Animated.View style={[styles.line, lineStyle]} />
            <Animated.View style={[styles.diamond, dotStyle]} />
            <Animated.View style={[styles.line, lineStyle]} />
          </View>

          {/* Subtitle */}
          <Animated.Text style={[styles.subtitle, subtitleStyle]}>
            Dedektif Bulmaca Oyunu
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Studio badge */}
      <Animated.Text style={[styles.badge, badgeStyle]}>
        Faili Meçhul Studio
      </Animated.Text>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F1117",
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none" as const,
  },

  // ── Background depth layer ──
  bgWrap: {
    position: "absolute",
    width: BG_SIZE,
    height: BG_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  bgImage: {
    width: BG_SIZE,
    height: BG_SIZE,
    borderRadius: BG_SIZE * 0.18,
  },

  // ── Vignette overlays ──
  vignetteV: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  vignetteH: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // ── Content ──
  content: {
    alignItems: "center",
  },

  // Glow halo — behind the foreground logo
  glowRing: {
    position: "absolute",
    top: -(LOGO_SIZE * 0.12),
    width: LOGO_SIZE * 1.28,
    height: LOGO_SIZE * 1.28,
    borderRadius: (LOGO_SIZE * 1.28) / 2,
    backgroundColor: "transparent",
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.75,
    shadowRadius: 55,
  },

  logoWrap: {
    marginBottom: 38,
    // Outer shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },
  logoInner: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
    overflow: "hidden",
    // Subtle gold border
    borderWidth: 1.5,
    borderColor: "#D4A84340",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  // ── Text block ──
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
    fontSize: 29,
    fontFamily: "UnnaBold",
    letterSpacing: 7,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  titleGap: { width: 9 },

  sepRow: {
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
