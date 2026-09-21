import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

// ─────────────────────────────────────────────────────────────
// ProgressDots
//
// More breathing room above and below than the previous version.
// The dots themselves are one pixel taller so they register as a
// real indicator rather than a hairline.
// ─────────────────────────────────────────────────────────────
export function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <View testID="onboarding-progress" style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i <= current ? dotStyles.dotActive : dotStyles.dotIdle,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create((theme, rt) => ({
  row: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: rt.insets.top + theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  dotActive: { backgroundColor: theme.colors.primary },
  dotIdle: { backgroundColor: theme.colors.panelBorder },
}));

// ─────────────────────────────────────────────────────────────
// StepContainer
//
// Two modes:
//   centered  — grows to fill available space and centers content
//               vertically. Used for hero / instructional screens.
//   anchored  — natural height, generous top padding so content
//               never crowds the progress dots. Used for data
//               entry screens where the input needs to sit just
//               below the question, not float in the middle.
// ─────────────────────────────────────────────────────────────
export function StepContainer({
  children,
  centered = true,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <View style={[stepStyles.wrapper, centered && stepStyles.centered]}>
      {children}
    </View>
  );
}

const stepStyles = StyleSheet.create((theme) => ({
  wrapper: {
    width: "100%",
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xxl,
  },
}));

// ─────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────
export function Footer({
  step,
  total,
  canContinue,
  saving,
  error,
  onBack,
  onNext,
}: {
  step: number;
  total: number;
  canContinue: boolean;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const isLast = step === total - 1;
  const isFirst = step === 0;
  const disabled = !canContinue || saving;

  return (
    <View style={footerStyles.footer}>
      {error && (
        <View style={footerStyles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={UnistylesRuntime.getTheme().colors.primary}
          />
          <Text variant="caption" color="primary" style={footerStyles.flex}>
            {error}
          </Text>
        </View>
      )}

      <View style={footerStyles.row}>
        {!isFirst && (
          <Pressable
            testID="onboarding-back"
            onPress={onBack}
            hitSlop={12}
            style={footerStyles.back}
          >
            <Text variant="subhead" color="mutedText">
              Back
            </Text>
          </Pressable>
        )}
        <View style={footerStyles.flex} />
        <HapticPressable
          testID="onboarding-continue"
          accessibilityState={{ disabled }}
          haptic="medium"
          onPress={onNext}
          disabled={disabled}
          style={[
            footerStyles.next,
            disabled ? footerStyles.nextDisabled : footerStyles.nextEnabled,
          ]}
        >
          <Text
            variant="subheadBold"
            color={disabled ? "mutedText" : "onPrimary"}
          >
            {isLast ? (saving ? "Saving…" : "Finish") : "Continue"}
          </Text>
          {!isLast && canContinue && (
            <Ionicons
              name="arrow-forward"
              size={16}
              color={UnistylesRuntime.getTheme().colors.onPrimary}
            />
          )}
        </HapticPressable>
      </View>
    </View>
  );
}

const footerStyles = StyleSheet.create((theme, rt) => ({
  footer: {
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.lg,
    paddingBottom: rt.insets.bottom + theme.spacing.xl,
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.panelBorder,
    gap: theme.spacing.sm,
  },
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  back: {
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  next: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    minHeight: 52,
    minWidth: 140,
  },
  nextEnabled: { backgroundColor: theme.colors.primary },
  nextDisabled: { backgroundColor: theme.colors.panelBorder },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.panel,
  },
}));

// ─────────────────────────────────────────────────────────────
// Field + input style helper
// ─────────────────────────────────────────────────────────────
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <View style={fieldStyles.field}>
      <Text variant="footnote" color="mutedText" style={fieldStyles.label}>
        {label}
      </Text>
      {children}
      {hint && (
        <Text variant="caption" color="mutedText" style={fieldStyles.hint}>
          {hint}
        </Text>
      )}
    </View>
  );
}

const fieldStyles = StyleSheet.create((theme) => ({
  field: { gap: theme.spacing.xs, width: "100%" },
  label: {
    paddingHorizontal: theme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  hint: { paddingHorizontal: theme.spacing.xs },
}));

export const onboardingInputStyle = (
  theme: ReturnType<typeof UnistylesRuntime.getTheme>,
) => ({
  width: "100%" as const,
  borderRadius: theme.radii.md,
  borderWidth: theme.borderWidth.thin,
  paddingHorizontal: theme.spacing.lg,
  paddingVertical: theme.spacing.md,
  fontSize: 17,
  minHeight: 56,
  textAlign: "center" as const,
  color: theme.colors.onSurface,
  borderColor: theme.colors.panelBorder,
  backgroundColor: theme.colors.panel,
});
