import { Field, onboardingStyles } from "@/components/onboarding/shared";
import { AgeTimeline } from "@/components/skia";
import Text from "@/components/text";
import React from "react";
import { TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const TIMELINE_WIDTH = 260;

export function AgeStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { theme } = useUnistyles();

  const age = parseInt(value, 10) || 0;

  return (
    <View style={styles.step}>
      <View style={styles.animationWrap}>
        <AgeTimeline
          width={TIMELINE_WIDTH}
          age={age}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
          trackColor={theme.colors.panelBorder}
        />
        <View style={styles.timelineLabels} pointerEvents="none">
          <Text variant="micro" color="mutedText">
            0
          </Text>
          <Text variant="micro" color="mutedText">
            100
          </Text>
        </View>
      </View>

      <Text variant="h2" color="onBackground" style={styles.title}>
        How old are you?
      </Text>

      <View style={styles.fieldWrap}>
        <Field label="Age" hint="Valid range: 13 – 120">
          <TextInput
            testID="onboarding-age-input"
            value={value}
            onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 30"
            placeholderTextColor={theme.colors.mutedText}
            keyboardType="number-pad"
            autoFocus
            returnKeyType="done"
            style={onboardingStyles.input}
          />
        </Field>
      </View>

      <Text variant="caption" color="mutedText" style={styles.body}>
        Age helps us interpret your BMI for the right age group. Stays on your
        device.
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
    width: TIMELINE_WIDTH,
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  timelineLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: TIMELINE_WIDTH,
    paddingHorizontal: 12,
    marginTop: -4,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.4,
    maxWidth: 320,
  },
  fieldWrap: {
    width: "100%",
    maxWidth: 400,
    marginTop: theme.spacing.xs,
  },
  body: {
    textAlign: "center",
    maxWidth: 320,
    marginTop: theme.spacing.xs,
  },
}));
