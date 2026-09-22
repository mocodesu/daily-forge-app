import { StreakDemoRing } from "@/components/skia";
import Text from "@/components/text";
import React, { useState } from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const RING_SIZE = 200;

export function StreaksStep() {
  const { theme } = useUnistyles();
  const [day, setDay] = useState(1);

  return (
    <View style={styles.step}>
      <View style={styles.animationWrap}>
        <StreakDemoRing
          size={RING_SIZE}
          strokeWidth={13}
          trackColor={theme.colors.panelBorder}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
          outlineColor={theme.colors.mutedText}
          completeColor={theme.colors.active}
          onDayChange={setDay}
        />

        <View style={styles.centerOverlay} pointerEvents="none">
          <Text variant="display" color="onSurface" style={styles.dayNumber}>
            {day}
          </Text>

          <Text variant="subhead" color="mutedText" style={styles.daysLabel}>
            of 7 days
          </Text>
        </View>
      </View>

      <Text variant="h1" color="onBackground" style={styles.title}>
        Your streak is your commitment
      </Text>

      <Text variant="callout" color="mutedText" style={styles.body}>
        Seal each day with your voice, and the ring fills. Miss a day, and it
        resets.
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
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },

  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },

  dayNumber: {
    fontSize: Math.round(RING_SIZE * 0.29),
    lineHeight: Math.round(RING_SIZE * 0.31),
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },

  daysLabel: {
    marginTop: 5,
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
    marginTop: theme.spacing.xs,
  },
}));
