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

interface SplashAnimationProps {
  onComplete: () => void;
}

const LOGO_SIZE = Math.min(width * 0.32, 128);
const GLOW_SIZE = LOGO_SIZE + 52;
const GLOW_OUTER_SIZE = LOGO_SIZE + 100;
const LINE_HALF = 56;

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const containerOpacity = useSharedValue(1);

  // Logo — zooms in from 1.4, settles with spring
  const logoScale = useSharedValue(1.4);
  const logoOpacity = useSharedValue(0);

  // Glow layers — inner and outer pulse in opposite phase
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOuterScale = useSharedValue(1);

  // Title — two words enter from opposite vertical directions
  const failOpacity = useSharedValue(0);
  const failY = useSharedValue(-18);
  const mechulOpacity = useSharedValue(0);
  const mechulY = useSharedValue(18);

  // Separator — two halves expand from center diamond
  const lineLeftW = useSharedValue(0);
  const lineRightW = useSharedValue(0);
  const lineDotOpacity = useSharedValue(0);

  // Subtitle
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(10);

  // Studio badge
  const badgeOpacity = useSharedValue(0);

  const animationStarted = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = useCallback(() => {
    if (animationStarted.current) return;
    animationStarted.current = true;

    const easeOut = Easing.out(Easing.cubic);
    const easeIn = Easing.in(Easing.cubic);
    const easeInOut = Easing.inOut(Easing.ease);

    // ── 1. Logo: quick fade + spring settle from 1.4 → 1.0 ──
    logoOpacity.value = withTiming(1, { duration: 220, easing: easeOut });
    logoScale.value = withSpring(1, {
      damping: 14,
      stiffness: 85,
      overshootClamping: false,
    });

    // ── 2. Glow: reveal then breathe in opposite phases ──
    glowOpacity.value = withDelay(280, withTiming(1, { duration: 420, easing: easeOut }));

    glowScale.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 950, easing: easeInOut }),
          withTiming(1.0, { duration: 950, easing: easeInOut })
        ),
        -1,
        true
      )
    );
    glowOuterScale.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1.0, { duration: 950, easing: easeInOut }),
          withTiming(1.14, { duration: 950, easing: easeInOut })
        ),
        -1,
        true
      )
    );

    // ── 3. Title — FAİLİ from above, MEÇHUL from below ──
    failOpacity.value = withDelay(520, withTiming(1, { duration: 380, easing: easeOut }));
    failY.value = withDelay(520, withTiming(0, { duration: 380, easing: easeOut }));

    mechulOpacity.value = withDelay(640, withTiming(1, { duration: 380, easing: easeOut }));
    mechulY.value = withDelay(640, withTiming(0, { duration: 380, easing: easeOut }));

    // ── 4. Separator — center dot then lines expand outward ──
    lineDotOpacity.value = withDelay(780, withTiming(1, { duration: 200, easing: easeOut }));
    lineLeftW.value = withDelay(820, withTiming(LINE_HALF, { duration: 440, easing: easeOut }));
    lineRightW.value = withDelay(820, withTiming(LINE_HALF, { duration: 440, easing: easeOut }));

    // ── 5. Subtitle ──
    subtitleOpacity.value = withDelay(960, withTiming(1, { duration: 380, easing: easeOut }));
    subtitleY.value = withDelay(960, withTiming(0, { duration: 380, easing: easeOut }));

    // ── 6. Studio badge (bottom) ──
    badgeOpacity.value = withDelay(1100, withTiming(1, { duration: 400, easing: easeOut }));

    // ── 7. Landed haptic — subtle pulse as logo settles ──
    if (Platform.OS !== "web") {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, 600);
    }

    // ── 8. Exit ──
    containerOpacity.value = withDelay(
      2800,
      withTiming(0, { duration: 400, easing: easeIn }, (finished) => {
        if (finished) runOnJS(onComplete)();
      })
    );
  }, []);

  const handleImageLoad = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startAnimation();
  }, [startAnimation]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => startAnimation(), 150);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ── Animated styles ──
  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const glowOuterStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowOuterScale.value }],
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
      {/* Vignette — gradient fade from edges to transparent */}
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "transparent"]}
        style={styles.vignetteTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)"]}
        style={styles.vignetteBottom}
        pointerEvents="none"
      />

      {/* Main content */}
      <View style={styles.inner}>
        {/* Logo with layered glow */}
        <View style={styles.logoWrapper}>
          <Animated.View style={[styles.glowOuter, glowOuterStyle]} />
          <Animated.View style={[styles.glow, glowStyle]} />
          <Animated.View style={logoStyle}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageLoad}
              fadeDuration={0}
            />
          </Animated.View>
        </View>

        {/* Title: two words meet from opposite directions */}
        <View style={styles.titleRow}>
          <Animated.Text style={[styles.titleWord, failStyle]}>
            FAİLİ
          </Animated.Text>
          <View style={styles.titleGap} />
          <Animated.Text style={[styles.titleWord, mechulStyle]}>
            MEÇHUL
          </Animated.Text>
        </View>

        {/* Separator: center diamond + two expanding lines */}
        <View style={styles.separatorRow}>
          <Animated.View style={[styles.lineHalf, styles.lineLeft, lineLeftStyle]} />
          <Animated.View style={[styles.lineDiamond, lineDotStyle]} />
          <Animated.View style={[styles.lineHalf, styles.lineRight, lineRightStyle]} />
        </View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          Dedektif Bulmaca Oyunu
        </Animated.Text>
      </View>

      {/* Studio badge — bottom */}
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

  // Vignette
  vignetteTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.22,
  },
  vignetteBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.22,
  },

  inner: {
    alignItems: "center",
  },

  logoWrapper: {
    width: GLOW_OUTER_SIZE,
    height: GLOW_OUTER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 34,
  },
  glowOuter: {
    position: "absolute",
    width: GLOW_OUTER_SIZE,
    height: GLOW_OUTER_SIZE,
    borderRadius: GLOW_OUTER_SIZE / 2,
    backgroundColor: "#D4A84310",
  },
  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: "#D4A84328",
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 38,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE * 0.22,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    overflow: "visible",
  },
  titleWord: {
    color: "#E8D5B7",
    fontSize: 26,
    fontFamily: "UnnaBold",
    letterSpacing: 6,
    textAlign: "center",
  },
  titleGap: {
    width: 11,
  },

  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
    height: 6,
  },
  lineHalf: {
    height: 1.5,
    backgroundColor: "#D4A843",
  },
  lineLeft: {
    alignSelf: "center",
  },
  lineRight: {
    alignSelf: "center",
  },
  lineDiamond: {
    width: 5,
    height: 5,
    backgroundColor: "#D4A843",
    transform: [{ rotate: "45deg" }],
    marginHorizontal: 4,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  subtitle: {
    color: "#7A6F5E",
    fontFamily: "DroidSerifRegular",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 2,
    textAlign: "center",
  },

  badge: {
    position: "absolute",
    bottom: 52,
    color: "#3A3530",
    fontFamily: "DroidSerifRegular",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.5,
    textAlign: "center",
  },
});
