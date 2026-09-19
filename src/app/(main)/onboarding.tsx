import { CelebrationBurst } from "@/components/celebration-burst";
import { HapticPressable } from "@/components/haptic-pressable";
import { ScrollScreen } from "@/components/screen";
import Text from "@/components/text";
import { UnitSystemPicker } from "@/components/unit-system-picker";
import { useUnitSystem } from "@/hooks/use-unit-system";
import { UserProfileRepo } from "@/repositories/user-profile-repo";
import type { UserProfile } from "@/types/dailyforge";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

const TOTAL_STEPS = 6;

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const { system, displayToKg } = useUnitSystem();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [heightCmText, setHeightCmText] = useState("");
  const [heightFeetText, setHeightFeetText] = useState("");
  const [heightInchesText, setHeightInchesText] = useState("");
  const [weightText, setWeightText] = useState("");
  const [goalText, setGoalText] = useState("");
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">(
    "idle",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const weightUnit = system === "metric" ? "kg" : "lb";

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return name.trim().length > 0;
      case 2:
        return true;
      case 3: {
        if (system === "metric") {
          const cm = parseFloat(heightCmText);
          return Number.isFinite(cm) && cm >= 120 && cm <= 250;
        }
        const ft = parseInt(heightFeetText, 10);
        const inch = parseFloat(heightInchesText) || 0;
        return (
          Number.isFinite(ft) && ft >= 3 && ft <= 8 && inch >= 0 && inch < 12
        );
      }
      case 4: {
        const w = parseFloat(weightText);
        const g = parseFloat(goalText);
        return Number.isFinite(w) && w > 0 && Number.isFinite(g) && g > 0;
      }
      case 5:
        return true;
      default:
        return false;
    }
  }, [
    step,
    system,
    name,
    heightCmText,
    heightFeetText,
    heightInchesText,
    weightText,
    goalText,
  ]);

  const handleRequestNotifications = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifStatus(status === "granted" ? "granted" : "denied");
    } catch (err) {
      console.warn("[onboarding] notification permission failed", err);
      setNotifStatus("denied");
    }
  }, []);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      let heightCm: number;
      if (system === "metric") {
        heightCm = parseFloat(heightCmText);
      } else {
        const ft = parseInt(heightFeetText, 10);
        const inches = parseFloat(heightInchesText) || 0;
        heightCm = (ft * 12 + inches) * 2.54;
      }

      const weightKg = displayToKg(parseFloat(weightText));
      const goalKg = displayToKg(parseFloat(goalText));

      const profile: UserProfile = {
        id: UserProfileRepo.defaultId,
        displayName: name.trim(),
        startDate: Date.now(),
        initialWeightKg: weightKg,
        goalWeightKg: goalKg,
        initialHeightCm: heightCm,
        initialFrontPhotoUri: null,
        initialSidePhotoUri: null,
      };

      await UserProfileRepo.insert(db, profile);

      // Show the welcome celebration. Navigation to Today happens after
      // the user dismisses it.
      setShowWelcome(true);
    } catch (err) {
      console.error("[onboarding] save failed", err);
      setError("Could not save your profile. Try again.");
      setSaving(false);
    }
  }, [
    system,
    heightCmText,
    heightFeetText,
    heightInchesText,
    weightText,
    goalText,
    name,
    displayToKg,
    db,
  ]);

  const handleWelcomeDismiss = useCallback(() => {
    setShowWelcome(false);
    router.replace("/(main)/(tabs)");
  }, []);

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      setError(null);
    } else {
      handleFinish();
    }
  }, [step, handleFinish]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const placeholderColor = UnistylesRuntime.getTheme().colors.mutedText;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= step ? styles.progressDotActive : styles.progressDotIdle,
            ]}
          />
        ))}
      </View>

      <ScrollScreen safeTop={false}>
        <View style={styles.stepWrapper}>
          {step === 0 && <WelcomeStep />}
          {step === 1 && <NameStep value={name} onChange={setName} />}
          {step === 2 && <UnitsStep />}
          {step === 3 && (
            <HeightStep
              system={system}
              cm={heightCmText}
              feet={heightFeetText}
              inches={heightInchesText}
              onCmChange={setHeightCmText}
              onFeetChange={setHeightFeetText}
              onInchesChange={setHeightInchesText}
              placeholderColor={placeholderColor}
            />
          )}
          {step === 4 && (
            <WeightStep
              unit={weightUnit}
              weight={weightText}
              goal={goalText}
              onWeightChange={setWeightText}
              onGoalChange={setGoalText}
              placeholderColor={placeholderColor}
            />
          )}
          {step === 5 && (
            <NotificationsStep
              status={notifStatus}
              onRequest={handleRequestNotifications}
            />
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={UnistylesRuntime.getTheme().colors.primary}
              />
              <Text variant="caption" color="primary" style={styles.flex}>
                {error}
              </Text>
            </View>
          )}
        </View>
      </ScrollScreen>

      <View style={styles.footer}>
        {step > 0 && (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={styles.backButton}
          >
            <Text variant="subhead" color="mutedText">
              Back
            </Text>
          </Pressable>
        )}
        <View style={styles.flex} />
        <HapticPressable
          haptic="medium"
          onPress={handleNext}
          disabled={!canContinue || saving}
          style={[
            styles.nextButton,
            canContinue && !saving ? styles.nextEnabled : styles.nextDisabled,
          ]}
        >
          <Text
            variant="subheadBold"
            color={canContinue && !saving ? "onPrimary" : "mutedText"}
          >
            {step === TOTAL_STEPS - 1
              ? saving
                ? "Saving…"
                : "Finish"
              : "Continue"}
          </Text>
          {step < TOTAL_STEPS - 1 && canContinue && (
            <Ionicons
              name="arrow-forward"
              size={16}
              color={UnistylesRuntime.getTheme().colors.onPrimary}
            />
          )}
        </HapticPressable>
      </View>

      {/* ── Welcome celebration ────────────────────────── */}
      <CelebrationBurst
        visible={showWelcome}
        streak={0}
        title={`Welcome, ${name.trim() || "friend"}`}
        subtitle="The first day is the hardest. You just started it."
        icon="flame"
        sound="dayComplete"
        onDismiss={handleWelcomeDismiss}
      />
    </KeyboardAvoidingView>
  );
}

function WelcomeStep() {
  return (
    <View style={styles.step}>
      <Ionicons
        name="flame"
        size={72}
        color={UnistylesRuntime.getTheme().colors.primary}
      />
      <Text variant="h1" color="onBackground" style={styles.stepTitle}>
        Welcome to DailyForge
      </Text>
      <Text variant="callout" color="mutedText" style={styles.stepBody}>
        One set of exercises. Every day. No edits, no excuses.
      </Text>
      <Text variant="subhead" color="mutedText" style={styles.stepBody}>
        A few quick questions so we can set things up. Takes about 30 seconds.
      </Text>
    </View>
  );
}

function NameStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.step}>
      <Text variant="h2" color="onBackground" style={styles.stepTitle}>
        What should we call you?
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Your name"
        placeholderTextColor={UnistylesRuntime.getTheme().colors.mutedText}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        style={styles.input}
      />
    </View>
  );
}

function UnitsStep() {
  return (
    <View style={styles.step}>
      <Text variant="h2" color="onBackground" style={styles.stepTitle}>
        Which units do you use?
      </Text>
      <Text variant="callout" color="mutedText" style={styles.stepBody}>
        You can change this later in Settings.
      </Text>
      <View style={styles.fullWidth}>
        <UnitSystemPicker />
      </View>
    </View>
  );
}

function HeightStep({
  system,
  cm,
  feet,
  inches,
  onCmChange,
  onFeetChange,
  onInchesChange,
  placeholderColor,
}: {
  system: "metric" | "imperial";
  cm: string;
  feet: string;
  inches: string;
  onCmChange: (v: string) => void;
  onFeetChange: (v: string) => void;
  onInchesChange: (v: string) => void;
  placeholderColor: string;
}) {
  return (
    <View style={styles.step}>
      <Text variant="h2" color="onBackground" style={styles.stepTitle}>
        How tall are you?
      </Text>

      {system === "metric" ? (
        <TextInput
          value={cm}
          onChangeText={(v) => onCmChange(v.replace(/[^0-9.]/g, ""))}
          placeholder="Height in cm (e.g. 175)"
          placeholderTextColor={placeholderColor}
          keyboardType="decimal-pad"
          autoFocus
          style={styles.input}
        />
      ) : (
        <View style={styles.twoCol}>
          <TextInput
            value={feet}
            onChangeText={(v) => onFeetChange(v.replace(/[^0-9]/g, ""))}
            placeholder="ft"
            placeholderTextColor={placeholderColor}
            keyboardType="number-pad"
            autoFocus
            style={[styles.input, styles.flex]}
          />
          <TextInput
            value={inches}
            onChangeText={(v) => onInchesChange(v.replace(/[^0-9.]/g, ""))}
            placeholder="in"
            placeholderTextColor={placeholderColor}
            keyboardType="decimal-pad"
            style={[styles.input, styles.flex]}
          />
        </View>
      )}

      <Text variant="caption" color="mutedText" style={styles.stepBody}>
        {system === "metric"
          ? "Valid range: 120 – 250 cm"
          : "Valid range: 3'0\" – 8'0\""}
      </Text>
    </View>
  );
}

function WeightStep({
  unit,
  weight,
  goal,
  onWeightChange,
  onGoalChange,
  placeholderColor,
}: {
  unit: string;
  weight: string;
  goal: string;
  onWeightChange: (v: string) => void;
  onGoalChange: (v: string) => void;
  placeholderColor: string;
}) {
  return (
    <View style={styles.step}>
      <Text variant="h2" color="onBackground" style={styles.stepTitle}>
        Your weight
      </Text>

      <View style={styles.weightStack}>
        <View>
          <Text variant="caption" color="mutedText" style={styles.fieldLabel}>
            Starting weight ({unit})
          </Text>
          <TextInput
            value={weight}
            onChangeText={(v) => onWeightChange(v.replace(/[^0-9.]/g, ""))}
            placeholder={`e.g. ${unit === "kg" ? "75" : "165"}`}
            placeholderTextColor={placeholderColor}
            keyboardType="decimal-pad"
            autoFocus
            style={styles.input}
          />
        </View>

        <View>
          <Text variant="caption" color="mutedText" style={styles.fieldLabel}>
            Goal weight ({unit})
          </Text>
          <TextInput
            value={goal}
            onChangeText={(v) => onGoalChange(v.replace(/[^0-9.]/g, ""))}
            placeholder={`e.g. ${unit === "kg" ? "70" : "155"}`}
            placeholderTextColor={placeholderColor}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
      </View>

      <Text variant="caption" color="mutedText" style={styles.stepBody}>
        These are private. They never leave your device.
      </Text>
    </View>
  );
}

function NotificationsStep({
  status,
  onRequest,
}: {
  status: "idle" | "granted" | "denied";
  onRequest: () => void;
}) {
  const theme = UnistylesRuntime.getTheme();

  const cta =
    status === "granted"
      ? {
          icon: "checkmark-circle" as const,
          text: "Notifications are on.",
        }
      : status === "denied"
        ? {
            icon: "notifications-off-outline" as const,
            text: "Notifications are off. You can enable them later in Settings.",
          }
        : {
            icon: "notifications-outline" as const,
            text: "Enable Notifications",
          };

  return (
    <View style={styles.step}>
      <Ionicons name="notifications" size={56} color={theme.colors.primary} />
      <Text variant="h2" color="onBackground" style={styles.stepTitle}>
        Stay on track
      </Text>
      <Text variant="callout" color="mutedText" style={styles.stepBody}>
        DailyForge sends one gentle reminder a day — at a time you choose — when
        your exercises aren't done yet.
      </Text>
      <Text variant="subhead" color="mutedText" style={styles.stepBody}>
        No spam. No marketing. Just a nudge.
      </Text>

      {status === "idle" ? (
        <HapticPressable
          haptic="medium"
          onPress={onRequest}
          style={styles.notifButton}
        >
          <Ionicons name={cta.icon} size={18} color={theme.colors.onPrimary} />
          <Text variant="subheadBold" color="onPrimary">
            {cta.text}
          </Text>
        </HapticPressable>
      ) : (
        <View style={styles.notifStatusRow}>
          <Ionicons name={cta.icon} size={20} color={theme.colors.primary} />
          <Text variant="subhead" color="onSurface" style={styles.flex}>
            {cta.text}
          </Text>
        </View>
      )}

      <Text variant="caption" color="mutedText" style={styles.stepBody}>
        {status === "idle"
          ? "You can skip this and enable notifications later."
          : "Tap Continue to finish setup."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  fullWidth: { width: "100%" },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: rt.insets.top + theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  progressDot: { flex: 1, height: 3, borderRadius: 2 },
  progressDotActive: { backgroundColor: theme.colors.primary },
  progressDotIdle: { backgroundColor: theme.colors.panelBorder },
  stepWrapper: { gap: theme.spacing.lg, alignItems: "center" },
  step: {
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    width: "100%",
  },
  stepTitle: { textAlign: "center", marginTop: theme.spacing.sm },
  stepBody: {
    textAlign: "center",
    paddingHorizontal: theme.spacing.md,
    maxWidth: 380,
  },
  fieldLabel: { marginBottom: 4 },
  input: {
    width: "100%",
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 17,
    minHeight: 52,
    textAlign: "center",
    color: theme.colors.onSurface,
    borderColor: theme.colors.panelBorder,
    backgroundColor: theme.colors.panel,
  },
  twoCol: {
    flexDirection: "row",
    gap: theme.spacing.md,
    width: "100%",
  },
  weightStack: { width: "100%", gap: 12 },
  notifButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    minHeight: 52,
    minWidth: 240,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
  },
  notifStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.panel,
    maxWidth: 400,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.panel,
    width: "100%",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.md,
    paddingBottom: rt.insets.bottom + theme.spacing.lg,
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.panelBorder,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  nextButton: {
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
}));
