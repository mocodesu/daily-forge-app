import { Field, onboardingInputStyle } from "@/components/onboarding/shared";
import Text from "@/components/text";
import React from "react";
import { TextInput, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export function NameStep({
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
        What should we call you?
      </Text>

      <View style={styles.fieldWrap}>
        <Field label="Your name">
          <TextInput
            testID="onboarding-name-input"
            value={value}
            onChangeText={onChange}
            placeholder="First name or nickname"
            placeholderTextColor={theme.colors.mutedText}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            style={onboardingInputStyle(theme)}
          />
        </Field>
      </View>

      <Text variant="caption" color="mutedText" style={styles.body}>
        Only used to greet you on the Today screen. Stays on your device.
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
    // Extra top padding so the input never crowds the progress
    // dots when the keyboard is up and the KAV shifts the layout.
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
