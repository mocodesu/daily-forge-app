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
          strokeWidth={16}
          trackColor={theme.colors.panelBorder}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
          onDayChange={setDay}
        />

        <View style={styles.centerOverlay} pointerEvents="none">
          <Text variant="display" color="onSurface" style={styles.dayNumber}>
            {day}
          </Text>
          <Text variant="subhead" color="mutedText">
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

function Rule({ text }: { text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.bullet} />
      <Text variant="subhead" color="onSurface" style={styles.ruleText}>
        {text}
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
    marginBottom: theme.spacing.md,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dayNumber: {
    fontSize: Math.round(RING_SIZE * 0.28),
    lineHeight: Math.round(RING_SIZE * 0.32),
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
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
  rules: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    maxWidth: 360,
    width: "100%",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  ruleText: {
    flex: 1,
  },
}));
