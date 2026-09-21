import { AppLottie } from "@/components/lottie";
import Text from "@/components/text";
import { APP_NAME } from "@/constants";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

const FLAME_SOURCE = require("@/assets/animations/loop-flame.json");

export function WelcomeStep() {
  return (
    <View style={styles.step}>
      <View style={styles.animationWrap}>
        <AppLottie source={FLAME_SOURCE} size={160} loop speed={1} />
      </View>

      <Text variant="h1" color="onBackground" style={styles.title}>
        Welcome to {APP_NAME}
      </Text>

      <Text variant="callout" color="mutedText" style={styles.lead}>
        One set of exercises. Every day. No edits, no excuses.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  step: {
    alignItems: "center",
    width: "100%",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  animationWrap: {
    height: 180,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.6,
    marginBottom: theme.spacing.xs,
  },
  lead: {
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 22,
  },
  sub: {
    textAlign: "center",
    maxWidth: 320,
    marginTop: theme.spacing.xs,
  },
}));
