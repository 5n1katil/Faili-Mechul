import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface SplashAnimationProps {
  onComplete: () => void;
}

const LOGO_SIZE = Math.min(width * 0.32, 128);
const GLOW_SIZE = LOGO_SIZE + 48;
const GLOW_OUTER_SIZE = LOGO_SIZE + 90;

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const containerOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.82);
  const glowOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(14);
  const lineScale = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(8);

  const animationStarted = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = useCallback(() => {
    if (animationStarted.current) return;
    animationStarted.current = true;

    const easeOut = Easing.out(Easing.cubic);
    const easeIn = Easing.in(Easing.cubic);

    logoOpacity.value = withTiming(1, { duration: 450, easing: easeOut });
    logoScale.value = withTiming(1, { duration: 650, easing: easeOut });
    glowOpacity.value = withDelay(160, withTiming(1, { duration: 480, easing: easeOut }));

    titleOpacity.value = withDelay(360, withTiming(1, { duration: 400, easing: easeOut }));
    titleY.value = withDelay(360, withTiming(0, { duration: 400, easing: easeOut }));

    lineScale.value = withDelay(540, withTiming(1, { duration: 420, easing: easeOut }));

    subtitleOpacity.value = withDelay(660, withTiming(1, { duration: 360, easing: easeOut }));
    subtitleY.value = withDelay(660, withTiming(0, { duration: 360, easing: easeOut }));

    containerOpacity.value = withDelay(
      1750,
      withTiming(0, { duration: 350, easing: easeIn }, (finished) => {
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
    timeoutRef.current = setTimeout(() => {
      startAnimation();
    }, 150);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: lineScale.value }],
    opacity: lineScale.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <View style={styles.inner}>
        <View style={styles.logoWrapper}>
          <Animated.View style={[styles.glow, glowStyle]} />
          <Animated.View style={[styles.glowOuter, glowStyle]} />
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

        <Animated.Text style={[styles.title, titleStyle]}>
          FAİLİ MEÇHUL
        </Animated.Text>

        <Animated.View style={[styles.line, lineStyle]} />

        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          Dedektif Bulmaca Oyunu
        </Animated.Text>
      </View>
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
  },
  inner: {
    alignItems: "center",
    gap: 0,
  },
  logoWrapper: {
    width: GLOW_OUTER_SIZE,
    height: GLOW_OUTER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  glowOuter: {
    position: "absolute",
    width: GLOW_OUTER_SIZE,
    height: GLOW_OUTER_SIZE,
    borderRadius: GLOW_OUTER_SIZE / 2,
    backgroundColor: "#D4A84308",
  },
  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: "#D4A84322",
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 32,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE * 0.22,
  },
  title: {
    color: "#E8D5B7",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 14,
  },
  line: {
    width: 120,
    height: 1.5,
    backgroundColor: "#D4A843",
    marginBottom: 10,
  },
  subtitle: {
    color: "#7A6F5E",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1.5,
    textAlign: "center",
  },
});
