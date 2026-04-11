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
import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
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

function MissionCelebrationToast() {
  const { pendingCelebration, clearCelebration } = useMission();
  const insets = useSafeAreaInsets();
  const mission = pendingCelebration[0] ?? null;

  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);
  const currentMissionId = useRef<string | null>(null);

  useEffect(() => {
    if (!mission) return;
    if (mission.id === currentMissionId.current) return;
    currentMissionId.current = mission.id;

    translateY.value = withSpring(0, { damping: 14, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 200 });

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 280 });
      translateY.value = withTiming(90, { duration: 280 });
      setTimeout(() => {
        currentMissionId.current = null;
        clearCelebration();
      }, 320);
    }, 2800);

    return () => clearTimeout(timer);
  }, [mission?.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!mission) return null;

  const rewardStr =
    mission.reward.points >= 1000
      ? `+${(mission.reward.points / 1000).toFixed(0)}K`
      : `+${mission.reward.points}`;

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { bottom: insets.bottom + 72 },
        animatedStyle,
      ]}
    >
      <View style={toastStyles.inner}>
        <View style={toastStyles.iconWrap}>
          <MaterialIcons name="emoji-events" size={22} color="#D4A843" />
        </View>
        <View style={toastStyles.textBlock}>
          <Text style={toastStyles.label}>Görev Tamamlandı!</Text>
          <Text style={toastStyles.missionName} numberOfLines={1}>
            {mission.title}
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
    left: 16,
    right: 16,
    zIndex: 9999,
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
    textTransform: "uppercase",
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
