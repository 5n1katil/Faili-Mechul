import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useMission } from "@/context/MissionContext";

function tryIsLiquidGlassAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("expo-glass-effect") as {
      isLiquidGlassAvailable?: () => boolean;
    };
    return (
      typeof mod.isLiquidGlassAvailable === "function" &&
      mod.isLiquidGlassAvailable()
    );
  } catch {
    return false;
  }
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Ana Sayfa</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="oyun">
        <Icon sf={{ default: "folder", selected: "folder.fill" }} />
        <Label>Vakalar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="gorevler">
        <Icon sf={{ default: "checklist", selected: "checklist" }} />
        <Label>Görevler</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="liderlik">
        <Icon sf={{ default: "trophy", selected: "trophy.fill" }} />
        <Label>Liderlik</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { claimableCount } = useMission();

  return (
    <Tabs
      // @ts-expect-error sceneContainerStyle is a valid RN BottomTab prop at runtime; Expo Router types lag behind
      sceneContainerStyle={{ backgroundColor: "#0F1117" }}
      screenOptions={{
        headerShown: false,
        animation: "fade",
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "dark"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana Sayfa",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <MaterialIcons name="home" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="oyun"
        options={{
          title: "Vakalar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="folder" tintColor={color} size={24} />
            ) : (
              <MaterialIcons name="folder-open" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="paketler"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="gorevler"
        options={{
          title: "Görevler",
          tabBarBadge: claimableCount > 0 ? claimableCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.success, fontSize: 10 },
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="checklist" tintColor={color} size={24} />
            ) : (
              <MaterialIcons name="assignment" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="liderlik"
        options={{
          title: "Liderlik",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="trophy" tintColor={color} size={24} />
            ) : (
              <MaterialIcons name="emoji-events" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <MaterialIcons name="person" size={24} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (tryIsLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
