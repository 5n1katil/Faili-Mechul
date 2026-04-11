import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useMission } from "@/context/MissionContext";

function NativeTabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -4,
        right: -6,
        backgroundColor: "#4CAF50",
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 3,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800", lineHeight: 10 }}>
        {count > 9 ? "9+" : count}
      </Text>
    </View>
  );
}

function NativeTabLayout() {
  const { claimableCount } = useMission();
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
        <View style={{ position: "relative" }}>
          <Icon sf={{ default: "checklist", selected: "checklist" }} />
          <NativeTabBadge count={claimableCount} />
        </View>
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
      screenOptions={{
        headerShown: false,
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
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
