import { Field, onboardingInputStyle } from "@/components/onboarding/shared";
import Text from "@/components/text";
import React from "react";
import { TextInput, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export function AgeStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = UnistylesRuntime.getTheme();

  return (
    <View style={styles.step}>
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
            style={onboardingInputStyle(theme)}
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
    paddingTop: theme.spacing.xl,
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
