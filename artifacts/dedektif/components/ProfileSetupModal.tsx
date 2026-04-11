import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { AvatarDisplay, PRESET_AVATARS } from "@/utils/avatarHelpers";
import AvatarPicker from "@/components/AvatarPicker";

interface ProfileSetupModalProps {
  visible: boolean;
  onDone: (name: string, avatar: string) => void;
}

export default function ProfileSetupModal({ visible, onDone }: ProfileSetupModalProps) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0].key);
  const [showPicker, setShowPicker] = useState(false);

  const handleStart = () => {
    Keyboard.dismiss();
    const finalName = name.trim() || "Dedektif";
    setTimeout(() => {
      onDone(finalName, avatar);
    }, 120);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <AvatarPicker
        visible={showPicker}
        value={avatar}
        onChange={setAvatar}
        onClose={() => setShowPicker(false)}
      />
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.primary }]}>Dedektif Kimliğini Oluştur</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Liderlik tablosunda görünecek adın ve avatarın
          </Text>

          <Pressable
            onPress={() => setShowPicker(true)}
            style={[styles.avatarBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
          >
            <AvatarDisplay
              avatar={avatar}
              size={64}
              color={colors.primary}
              backgroundColor="transparent"
            />
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="edit" size={12} color={colors.primaryForeground} />
            </View>
          </Pressable>
          <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
            Avatarını seç
          </Text>

          <View style={[styles.inputWrapper, { borderColor: colors.primary, backgroundColor: colors.background }]}>
            <MaterialIcons name="person" size={18} color={colors.primary} style={{ marginLeft: 12 }} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Dedektif adın..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
          </View>

          <View style={[styles.warningBox, { backgroundColor: "#D4A84314", borderColor: "#D4A84344" }]}>
            <MaterialIcons name="info-outline" size={14} color="#D4A843" />
            <Text style={[styles.warningText, { color: "#D4A84399" }]}>
              Benzersiz bir isim seçin — dedektif adınız bir kez belirlenir ve daha sonra değiştirilemez.
            </Text>
          </View>

          <Pressable
            onPress={handleStart}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>
              Başla!
            </Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 4,
  },
  avatarBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    fontSize: 12,
    marginTop: -4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    width: "100%",
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingRight: 12,
    height: "100%",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
