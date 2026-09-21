import { Field, onboardingInputStyle } from "@/components/onboarding/shared";
import {
  bmiCategory,
  computeBMI,
  type UnitSystem,
} from "@/components/onboarding/types";
import Text from "@/components/text";
import React, { useMemo } from "react";
import { TextInput, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export function BodyStep({
  system,
  heightCm,
  heightFeet,
  heightInches,
  weight,
  goal,
  onHeightCm,
  onHeightFeet,
  onHeightInches,
  onWeight,
  onGoal,
}: {
  system: UnitSystem;
  heightCm: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  goal: string;
  onHeightCm: (v: string) => void;
  onHeightFeet: (v: string) => void;
  onHeightInches: (v: string) => void;
  onWeight: (v: string) => void;
  onGoal: (v: string) => void;
}) {
  const theme = UnistylesRuntime.getTheme();

  const bmi = useMemo(() => {
    let heightCmNum: number;
    if (system === "metric") {
      heightCmNum = parseFloat(heightCm);
    } else {
      const ft = parseInt(heightFeet, 10);
      const inch = parseFloat(heightInches) || 0;
      if (!Number.isFinite(ft)) return null;
      heightCmNum = (ft * 12 + inch) * 2.54;
    }

    const weightKg = (() => {
      const w = parseFloat(weight);
      if (!Number.isFinite(w)) return NaN;
      return system === "metric" ? w : w / 2.2046226218;
    })();

    return computeBMI(weightKg, heightCmNum);
  }, [system, heightCm, heightFeet, heightInches, weight]);

  const weightUnit = system === "metric" ? "kg" : "lb";

  return (
    <View style={styles.step}>
      <Text variant="h2" color="onBackground" style={styles.title}>
        Your starting stats
      </Text>

      <View style={styles.fields}>
        {system === "metric" ? (
          <Field label="Height (cm)" hint="Valid range: 120 – 250 cm">
            <TextInput
              testID="onboarding-height-cm"
              value={heightCm}
              onChangeText={(v) => onHeightCm(v.replace(/[^0-9.]/g, ""))}
              placeholder="e.g. 175"
              placeholderTextColor={theme.colors.mutedText}
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={onboardingInputStyle(theme)}
            />
          </Field>
        ) : (
          <Field label="Height" hint="Valid range: 3'0&quot; – 8'0&quot;">
            <View style={styles.twoCol}>
              <TextInput
                testID="onboarding-height-ft"
                value={heightFeet}
                onChangeText={(v) => onHeightFeet(v.replace(/[^0-9]/g, ""))}
                placeholder="ft"
                placeholderTextColor={theme.colors.mutedText}
                keyboardType="number-pad"
                style={[onboardingInputStyle(theme), styles.flex]}
              />
              <TextInput
                testID="onboarding-height-in"
                value={heightInches}
                onChangeText={(v) => onHeightInches(v.replace(/[^0-9.]/g, ""))}
                placeholder="in"
                placeholderTextColor={theme.colors.mutedText}
                keyboardType="decimal-pad"
                style={[onboardingInputStyle(theme), styles.flex]}
              />
            </View>
          </Field>
        )}

        <Field label={`Starting weight (${weightUnit})`}>
          <TextInput
            testID="onboarding-weight"
            value={weight}
            onChangeText={(v) => onWeight(v.replace(/[^0-9.]/g, ""))}
            placeholder={system === "metric" ? "e.g. 75" : "e.g. 165"}
            placeholderTextColor={theme.colors.mutedText}
            keyboardType="decimal-pad"
            returnKeyType="done"
            style={onboardingInputStyle(theme)}
          />
        </Field>

        <Field label={`Goal weight (${weightUnit})`}>
          <TextInput
            testID="onboarding-goal"
            value={goal}
            onChangeText={(v) => onGoal(v.replace(/[^0-9.]/g, ""))}
            placeholder={system === "metric" ? "e.g. 70" : "e.g. 155"}
            placeholderTextColor={theme.colors.mutedText}
            keyboardType="decimal-pad"
            returnKeyType="done"
            style={onboardingInputStyle(theme)}
          />
        </Field>

        {bmi !== null && (
          <View testID="onboarding-bmi-preview" style={styles.bmiCard}>
            <Text variant="caption" color="mutedText">
              Your BMI
            </Text>
            <View style={styles.bmiRow}>
              <Text variant="display" color="onSurface" style={styles.bmiValue}>
                {bmi.toFixed(1)}
              </Text>
              <View style={styles.bmiCategoryChip}>
                <Text variant="caption" color="primary">
                  {bmiCategory(bmi)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <Text variant="caption" color="mutedText" style={styles.body}>
        These are private. They never leave your device.
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
  flex: { flex: 1 },
  twoCol: {
    flexDirection: "row",
    gap: theme.spacing.md,
    width: "100%",
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.4,
    maxWidth: 340,
  },
  fields: {
    width: "100%",
    maxWidth: 400,
    gap: theme.spacing.lg,
    marginTop: theme.spacing.xs,
  },
  body: {
    textAlign: "center",
    maxWidth: 320,
  },
  bmiCard: {
    width: "100%",
    alignItems: "center",
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.panel,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    marginTop: theme.spacing.xs,
  },
  bmiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  bmiValue: {
    letterSpacing: -1,
  },
  bmiCategoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
  },
}));
