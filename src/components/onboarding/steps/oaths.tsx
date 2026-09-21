import { VoiceWave } from "@/components/skia";
import Text from "@/components/text";
import React from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const WAVE_SIZE = 220;

export function OathsStep() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.step}>
      <View style={styles.animationWrap}>
        <VoiceWave
          size={WAVE_SIZE}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
        />
      </View>

      <Text variant="h1" color="onBackground" style={styles.title}>
        Seal each day with your voice
      </Text>

      <Text variant="callout" color="mutedText" style={styles.body}>
        When your exercises are done, say your oath out loud. The app listens —
        not to record you, but to hear you commit.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  step: {
    alignItems: "center",
    width: "100%",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  animationWrap: {
    width: WAVE_SIZE,
    height: WAVE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.6,
    maxWidth: 340,
  },
  body: {
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
