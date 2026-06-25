import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from "@expo-google-fonts/dm-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  withSequence,
  Easing,
} from "react-native-reanimated";

import { Asset } from "expo-asset";
import { SplashAnimation } from "@/components/SplashAnimation";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/context/GameContext";
import { MissionProvider, useMission } from "@/context/MissionContext";
import type { Mission } from "@/data/missions";
import { PurchaseProvider } from "@/context/PurchaseContext";
import { useSounds } from "@/hooks/useSounds";
import BackgroundMusicController from "@/components/BackgroundMusicController";

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

function formatMissionPts(pts: number): string {
  if (pts >= 1000) return `+${(pts / 1000).toFixed(pts % 1000 === 0 ? 0 : 1)}K`;
  return `+${pts}`;
}

function MissionCelebrationToast() {
  const { pendingCelebration, clearCelebration } = useMission();
  const insets = useSafeAreaInsets();
  const { play, playVictorySequence } = useSounds();

  const toastY = useSharedValue(120);
  const toastOp = useSharedValue(0);
  const toastScale = useSharedValue(0.92);
  const rewardPulse = useSharedValue(0.88);
  const lastSingleId = useRef<string | null>(null);
  const singleMissionRef = useRef<Mission | null>(null);
  const [showToast, setShowToast] = useState(false);

  const modalY = useSharedValue(300);
  const modalOp = useSharedValue(0);
  const modalBadgeScale = useSharedValue(0.9);
  const [showModal, setShowModal] = useState(false);
  const [modalMissions, setModalMissions] = useState<Mission[]>([]);

  useEffect(() => {
    if (pendingCelebration.length === 0) return;

    if (pendingCelebration.length === 1) {
      const m = pendingCelebration[0];
      if (m.id === lastSingleId.current) return;
      lastSingleId.current = m.id;
      singleMissionRef.current = m;
      setShowToast(true);
      play("success");
      toastY.value = withSpring(0, { damping: 14, stiffness: 180 });
      toastOp.value = withTiming(1, { duration: 200 });
      toastScale.value = withSequence(
        withSpring(1.04, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
      rewardPulse.value = withSequence(
        withDelay(80, withSpring(1.2, { damping: 9, stiffness: 260 })),
        withSpring(1, { damping: 11, stiffness: 220 })
      );
      const t = setTimeout(() => {
        toastOp.value = withTiming(0, { duration: 300 });
        toastY.value = withTiming(90, { duration: 300 });
        setTimeout(() => {
          lastSingleId.current = null;
          setShowToast(false);
          clearCelebration();
        }, 340);
      }, 2700);
      return () => clearTimeout(t);
    }

    if (showModal) return;
    setModalMissions([...pendingCelebration]);
    setShowModal(true);
    playVictorySequence();
    modalOp.value = withTiming(1, { duration: 250 });
    modalY.value = withSpring(0, { damping: 14, stiffness: 150 });
    modalBadgeScale.value = withSequence(
      withDelay(80, withSpring(1.12, { damping: 10, stiffness: 240 })),
      withSpring(1, { damping: 12, stiffness: 180 })
    );
  }, [clearCelebration, pendingCelebration, play, playVictorySequence, showModal]);

  const handleCloseModal = () => {
    modalOp.value = withTiming(0, { duration: 220 });
    modalY.value = withTiming(300, { duration: 250 });
    setTimeout(() => {
      setShowModal(false);
      setModalMissions([]);
      clearCelebration();
    }, 260);
  };

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }, { scale: toastScale.value }],
    opacity: toastOp.value,
  }));

  const rewardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardPulse.value }],
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalY.value }],
    opacity: modalOp.value,
  }));

  const modalBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalBadgeScale.value }],
  }));

  const singleM = singleMissionRef.current;
  const totalPoints = modalMissions.reduce((s, m) => s + m.reward.points, 0);

  return (
    <>
      {showToast && singleM && (
        <Animated.View style={[toastStyles.container, { bottom: insets.bottom + 72 }, toastStyle]}>
          {CONFETTI_POSITIONS.map((pos, i) => (
            <ConfettiParticle
              key={i}
              color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
              dx={pos.dx}
              dy={pos.dy}
              rotate={pos.rotate}
              delay={i * 30}
              visible={showToast}
            />
          ))}
          <View style={toastStyles.inner}>
            <View style={toastStyles.iconWrap}>
              <MaterialIcons name="emoji-events" size={22} color="#D4A843" />
            </View>
            <View style={toastStyles.textBlock}>
              <Text style={toastStyles.label}>GÖREV TAMAMLANDI!</Text>
              <Text style={toastStyles.missionName} numberOfLines={1}>
                {singleM.title}
              </Text>
            </View>
            <Animated.View style={[toastStyles.rewardWrap, rewardStyle]}>
              <MaterialIcons name="bolt" size={14} color="#D4A843" />
              <Text style={toastStyles.rewardText}>{formatMissionPts(singleM.reward.points)}</Text>
            </Animated.View>
          </View>
          <Text style={toastStyles.rewardHint}>Puan toplandı ve toplam puanına eklendi.</Text>
        </Animated.View>
      )}

      {showModal && (
        <Animated.View style={[multiStyles.backdrop, modalStyle]} pointerEvents="box-none">
          <Pressable style={multiStyles.dimArea} onPress={handleCloseModal} />
          <View style={[multiStyles.card, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
            <View style={multiStyles.handle} />
            <View style={multiStyles.header}>
              <View style={multiStyles.headerIconWrap}>
                <MaterialIcons name="emoji-events" size={26} color="#D4A843" />
              </View>
              <View style={multiStyles.headerText}>
                <Text style={multiStyles.headerLabel}>GÖREVLER TAMAMLANDI!</Text>
                <Text style={multiStyles.headerSub}>{modalMissions.length} görev toplandı</Text>
              </View>
              <Animated.View style={[multiStyles.totalBadge, modalBadgeStyle]}>
                <MaterialIcons name="bolt" size={15} color="#000" />
                <Text style={multiStyles.totalBadgeText}>{formatMissionPts(totalPoints)}</Text>
              </Animated.View>
            </View>

            <View style={multiStyles.divider} />

            <ScrollView
              style={{ maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {modalMissions.map((mission) => (
                <View key={mission.id} style={multiStyles.missionRow}>
                  <MaterialIcons name="check-circle" size={18} color="#4ade80" />
                  <Text style={multiStyles.missionRowName} numberOfLines={2}>
                    {mission.title}
                  </Text>
                  <View style={multiStyles.missionRowReward}>
                    <MaterialIcons name="bolt" size={13} color="#D4A843" />
                    <Text style={multiStyles.missionRowPoints}>
                      {formatMissionPts(mission.reward.points)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable style={multiStyles.closeBtn} onPress={handleCloseModal}>
              <Text style={multiStyles.closeBtnText}>Tamam</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </>
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
  rewardHint: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 7,
    textAlign: "center",
  },
});

const multiStyles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 9999,
    justifyContent: "flex-end",
  },
  dimArea: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    backgroundColor: "#1A1F2E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#D4A84355",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3A4060",
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#D4A84322",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  headerLabel: {
    color: "#D4A843",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  headerSub: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#D4A843",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 0,
  },
  totalBadgeText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#2A2F4266",
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  missionRowName: {
    flex: 1,
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  missionRowReward: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },
  missionRowPoints: {
    color: "#D4A843",
    fontSize: 13,
    fontWeight: "700",
  },
  closeBtn: {
    backgroundColor: "#D4A843",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  closeBtnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

function AppWithMissions({ splashReady }: { splashReady: boolean }) {
  return (
    <>
      <BackgroundMusicController splashReady={splashReady} />
      <RootLayoutNav />
      <MissionCelebrationToast />
    </>
  );
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    MightySouly: require("../assets/fonts/MightySouly.ttf"),
  });

  useEffect(() => {
    async function prepare() {
      try {
        await Asset.fromModule(require("../assets/images/icon.png")).downloadAsync();
      } catch {
      } finally {
        SplashScreen.hideAsync();
      }
    }
    void prepare();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <PurchaseProvider>
                <GameProvider>
                  <MissionProvider>
                    <AppWithMissions splashReady={splashDone} />
                  </MissionProvider>
                </GameProvider>
              </PurchaseProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
      {!splashDone && (
        <SplashAnimation onComplete={() => setSplashDone(true)} />
      )}
    </SafeAreaProvider>
  );
}
