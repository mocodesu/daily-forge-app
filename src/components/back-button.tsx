import { SurfaceIcon } from "@/components/themed";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function BackButton({ onPress }: { onPress?: () => void }) {
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <SurfaceIcon name="chevron-back" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.panel,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  buttonPressed: {
    opacity: theme.opacity.pressed,
  },
}));
