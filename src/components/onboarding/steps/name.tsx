import { Field, onboardingInputStyle } from "@/components/onboarding/shared";
import { SignatureLine } from "@/components/skia";
import Text from "@/components/text";
import React from "react";
import { TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const SIG_WIDTH = 220;

export function NameStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.step}>
      <View style={styles.animationWrap}>
        <SignatureLine
          width={SIG_WIDTH}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
        />
      </View>

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
    width: SIG_WIDTH,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
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
