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

const HERO_HEIGHT = height * 0.54;
const LINE_HALF = 60;

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const containerOpacity = useSharedValue(1);

  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(1.08);

  const ambientOpacity = useSharedValue(0);
  const ambientScale = useSharedValue(0.85);

  const failOpacity = useSharedValue(0);
  const failY = useSharedValue(-20);
  const mechulOpacity = useSharedValue(0);
  const mechulY = useSharedValue(20);

  const lineLeftW = useSharedValue(0);
  const lineRightW = useSharedValue(0);
  const lineDotOpacity = useSharedValue(0);

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

    heroOpacity.value = withTiming(1, { duration: 480, easing: easeOut });
    heroScale.value = withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) });

    ambientOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: easeOut }));
    ambientScale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 1800, easing: easeInOut }),
          withTiming(1.0, { duration: 1800, easing: easeInOut })
        ),
        -1,
        true
      )
    );

    failOpacity.value = withDelay(560, withTiming(1, { duration: 420, easing: easeOut }));
    failY.value = withDelay(560, withTiming(0, { duration: 420, easing: easeOut }));

    mechulOpacity.value = withDelay(700, withTiming(1, { duration: 420, easing: easeOut }));
    mechulY.value = withDelay(700, withTiming(0, { duration: 420, easing: easeOut }));

    lineDotOpacity.value = withDelay(850, withTiming(1, { duration: 220, easing: easeOut }));
    lineLeftW.value = withDelay(890, withTiming(LINE_HALF, { duration: 480, easing: easeOut }));
    lineRightW.value = withDelay(890, withTiming(LINE_HALF, { duration: 480, easing: easeOut }));

    subtitleOpacity.value = withDelay(1060, withTiming(1, { duration: 400, easing: easeOut }));
    subtitleY.value = withDelay(1060, withTiming(0, { duration: 400, easing: easeOut }));

    badgeOpacity.value = withDelay(1220, withTiming(1, { duration: 400, easing: easeOut }));

    if (Platform.OS !== "web") {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, 700);
    }

    containerOpacity.value = withDelay(
      2900,
      withTiming(0, { duration: 420, easing: easeIn }, (finished) => {
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

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));

  const ambientStyle = useAnimatedStyle(() => ({
    opacity: ambientOpacity.value,
    transform: [{ scale: ambientScale.value }],
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

      {/* ── Hero logo — covers top of screen ── */}
      <Animated.View style={[styles.heroWrap, heroStyle]}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.heroImage}
          resizeMode="contain"
          onLoad={handleImageLoad}
          onError={handleImageLoad}
          fadeDuration={0}
        />
        {/* Gradient fade: logo → background */}
        <LinearGradient
          colors={["transparent", "transparent", "rgba(15,17,23,0.55)", "#0F1117"]}
          locations={[0, 0.42, 0.72, 1]}
          style={styles.heroFade}
          pointerEvents="none"
        />
      </Animated.View>

      {/* Ambient radial glow — lives at the border between hero and text */}
      <Animated.View style={[styles.ambient, ambientStyle]} pointerEvents="none" />

      {/* ── Text content — positioned below the hero fade ── */}
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
    pointerEvents: "none" as const,
  },

  heroWrap: {
    width: width,
    height: HERO_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImage: {
    width: width * 0.78,
    height: HERO_HEIGHT * 0.82,
  },
  heroFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 0.52,
  },

  ambient: {
    position: "absolute",
    top: HERO_HEIGHT * 0.6,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: "#D4A84309",
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 60,
  },

  content: {
    alignItems: "center",
    marginTop: 8,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    overflow: "visible",
  },
  titleWord: {
    color: "#EDE0CC",
    fontSize: 30,
    fontFamily: "UnnaBold",
    letterSpacing: 7,
    textAlign: "center",
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
    fontWeight: "500",
    letterSpacing: 2.5,
    textAlign: "center",
  },

  badge: {
    position: "absolute",
    bottom: 52,
    color: "#35302B",
    fontFamily: "DroidSerifRegular",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.5,
    textAlign: "center",
  },
});
