import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/context/GameContext";
import { MissionProvider, useMission } from "@/context/MissionContext";
import { PurchaseProvider } from "@/context/PurchaseContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

const CONFETTI_COLORS = [
  "#D4A843",
  "#4CAF50",
  "#60A5FA",
  "#F87171",
  "#A78BFA",
  "#FB923C",
  "#34D399",
  "#F472B6",
];

const CONFETTI_POSITIONS = [
  { dx: -60, dy: -70, rotate: 45 },
  { dx: -30, dy: -90, rotate: -30 },
  { dx: 0, dy: -80, rotate: 60 },
  { dx: 30, dy: -90, rotate: -15 },
  { dx: 60, dy: -70, rotate: 25 },
  { dx: -50, dy: -55, rotate: -60 },
  { dx: 50, dy: -55, rotate: 40 },
  { dx: -80, dy: -40, rotate: -20 },
  { dx: 80, dy: -40, rotate: 35 },
  { dx: -20, dy: -100, rotate: 15 },
  { dx: 20, dy: -100, rotate: -45 },
  { dx: 0, dy: -60, rotate: 70 },
];

function ConfettiParticle({
  color,
  dx,
  dy,
  rotate,
  delay,
  visible,
}: {
  color: string;
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
  visible: boolean;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      x.value = 0;
      y.value = 0;
      opacity.value = 0;
      scale.value = 0;
      rotation.value = 0;
      return;
    }
    x.value = withDelay(delay, withTiming(dx, { duration: 700, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withTiming(dy, { duration: 700, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 200 }));
    rotation.value = withDelay(delay, withTiming(rotate, { duration: 700 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 150 }));

    const fadeDelay = 1400 + delay;
    opacity.value = withDelay(fadeDelay, withTiming(0, { duration: 400 }));
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        confettiStyles.particle,
        { backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

const confettiStyles = StyleSheet.create({
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});

function MissionCelebrationToast() {
  const { pendingCelebration, clearCelebration } = useMission();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);
  const currentMissionId = useRef<string | null>(null);
  const displayMissionRef = useRef(pendingCelebration[0] ?? null);
  const [showing, setShowing] = React.useState(false);

  const incomingMission = pendingCelebration[0] ?? null;

  useEffect(() => {
    if (!incomingMission) return;
    if (incomingMission.id === currentMissionId.current) return;

    currentMissionId.current = incomingMission.id;
    displayMissionRef.current = incomingMission;
    setShowing(true);

    translateY.value = withSpring(0, { damping: 14, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 200 });

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(90, { duration: 300 });
      setTimeout(() => {
        currentMissionId.current = null;
        setShowing(false);
        clearCelebration();
      }, 340);
    }, 2700);

    return () => clearTimeout(timer);
  }, [incomingMission?.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const m = displayMissionRef.current;
  if (!showing || !m) return null;

  const rewardStr =
    m.reward.points >= 1000
      ? `+${(m.reward.points / 1000).toFixed(0)}K`
      : `+${m.reward.points}`;

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { bottom: insets.bottom + 72 },
        animatedStyle,
      ]}
    >
      {CONFETTI_POSITIONS.map((pos, i) => (
        <ConfettiParticle
          key={i}
          color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
          dx={pos.dx}
          dy={pos.dy}
          rotate={pos.rotate}
          delay={i * 30}
          visible={showing}
        />
      ))}
      <View style={toastStyles.inner}>
        <View style={toastStyles.iconWrap}>
          <MaterialIcons name="emoji-events" size={22} color="#D4A843" />
        </View>
        <View style={toastStyles.textBlock}>
          <Text style={toastStyles.label}>GÖREV TAMAMLANDI!</Text>
          <Text style={toastStyles.missionName} numberOfLines={1}>
            {m.title}
          </Text>
        </View>
        <View style={toastStyles.rewardWrap}>
          <MaterialIcons name="bolt" size={14} color="#D4A843" />
          <Text style={toastStyles.rewardText}>{rewardStr}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 36,
    right: 36,
    zIndex: 9999,
    alignItems: "center",
  },
  inner: {
    backgroundColor: "#1A1F2E",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D4A84366",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    alignSelf: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#D4A84322",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: "#D4A843",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  missionName: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "700",
  },
  rewardWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#D4A84318",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexShrink: 0,
  },
  rewardText: {
    color: "#D4A843",
    fontSize: 13,
    fontWeight: "800",
  },
});

function AppWithMissions() {
  return (
    <>
      <RootLayoutNav />
      <MissionCelebrationToast />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [attReady, setAttReady] = useState(Platform.OS !== "ios");

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    try {
      const { requestTrackingPermissionsAsync } = require("expo-tracking-transparency");
      requestTrackingPermissionsAsync()
        .catch(() => {})
        .finally(() => setAttReady(true));
    } catch {
      setAttReady(true);
    }
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && attReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, attReady]);

  if ((!fontsLoaded && !fontError) || !attReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <PurchaseProvider>
                <GameProvider>
                  <MissionProvider>
                    <AppWithMissions />
                  </MissionProvider>
                </GameProvider>
              </PurchaseProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
