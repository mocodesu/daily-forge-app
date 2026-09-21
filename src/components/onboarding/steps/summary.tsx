import {
  bmiCategory,
  computeBMI,
  type OnboardingData,
  type UnitSystem,
} from "@/components/onboarding/types";
import Text from "@/components/text";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

const STAGGER_MS = 120;

export function SummaryStep({
  data,
  system,
}: {
  data: OnboardingData;
  system: UnitSystem;
}) {
  const heightCm = (() => {
    if (system === "metric") return parseFloat(data.heightCmText);
    const ft = parseInt(data.heightFeetText, 10);
    const inch = parseFloat(data.heightInchesText) || 0;
    return (ft * 12 + inch) * 2.54;
  })();

  const weightKg = (() => {
    const w = parseFloat(data.weightText);
    return system === "metric" ? w : w / 2.2046226218;
  })();

  const bmi = computeBMI(weightKg, heightCm);

  const rows = [
    { label: "Name", value: data.name.trim() || "—" },
    { label: "Age", value: data.ageText || "—" },
    {
      label: "Height",
      value: Number.isFinite(heightCm) ? `${Math.round(heightCm)} cm` : "—",
    },
    {
      label: "Starting weight",
      value: Number.isFinite(weightKg) ? `${weightKg.toFixed(1)} kg` : "—",
    },
    {
      label: "BMI",
      value: bmi !== null ? `${bmi.toFixed(1)} (${bmiCategory(bmi)})` : "—",
    },
    {
      label: "Photos",
      value: data.frontPhotoUri || data.sidePhotoUri ? "Captured" : "Skipped",
    },
    {
      label: "Notifications",
      value: data.notifStatus === "granted" ? "On" : "Off",
    },
  ];

  return (
    <View style={styles.step}>
      <Text variant="h1" color="onBackground" style={styles.title}>
        You're ready, {data.name.trim() || "friend"}.
      </Text>
      <Text variant="callout" color="mutedText" style={styles.body}>
        Here's everything we saved.
      </Text>

      <View testID="onboarding-summary-card" style={styles.card}>
        {rows.map((row, i) => (
          <SummaryRow
            key={row.label}
            label={row.label}
            value={row.value}
            index={i}
          />
        ))}
      </View>

      <Text variant="caption" color="mutedText" style={styles.body}>
        You can change any of this in Settings.
      </Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const delay = index * STAGGER_MS;
    opacity.value = withDelay(delay, withTiming(1, { duration: 320 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 320 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.row, style]}>
      <Text variant="footnote" color="mutedText" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="subheadBold" color="onSurface" style={styles.rowValue}>
        {value}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  step: {
    alignItems: "center",
    width: "100%",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.6,
    maxWidth: 360,
  },
  body: {
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 22,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 28,
  },
  rowLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  rowValue: {
    textAlign: "right",
    flexShrink: 1,
    marginLeft: theme.spacing.md,
  },
}));
