import { CelebrationBurst } from "@/components/celebration-burst";
import {
  Footer,
  ProgressDots,
  StepContainer,
} from "@/components/onboarding/shared";
import {
  AgeStep,
  BodyStep,
  NameStep,
  NotificationsStep,
  OathsStep,
  PhotosStep,
  StreaksStep,
  SummaryStep,
  UnitsStep,
  WelcomeStep,
} from "@/components/onboarding/steps";
import {
  canContinueFromStep,
  INITIAL_ONBOARDING_DATA,
  type OnboardingData,
} from "@/components/onboarding/types";
import { ScrollScreen } from "@/components/screen";
import { useUnitSystem } from "@/hooks/use-unit-system";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { UserProfileRepo } from "@/repositories/user-profile-repo";
import type { UserProfile } from "@/types/dailyforge";
import {
  KEY_ENABLED,
  readSettingsFromPrefs,
  rescheduleDailyReminders,
} from "@/utils/daily-reminder-scheduler";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { StyleSheet } from "react-native-unistyles";

const TOTAL_STEPS = 10;

// Which steps get vertically centered in the available space. Hero
// and payoff screens benefit from centering; data-entry screens
// read better anchored near the top with the input right below
// the question.
const CENTERED_STEPS = new Set([0, 1, 2, 9]);

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const { system, displayToKg } = useUnitSystem();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const update = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const { status, canAskAgain } =
          await Notifications.getPermissionsAsync();
        if (status === "granted") {
          update("notifStatus", "granted");
        } else if (status === "denied" && !canAskAgain) {
          update("notifStatus", "denied");
        }
      } catch (err) {
        console.warn("[onboarding] notification status read failed", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canContinue = useMemo(
    () => canContinueFromStep(step, data, system),
    [step, data, system],
  );

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      let heightCm: number;
      if (system === "metric") {
        heightCm = parseFloat(data.heightCmText);
      } else {
        const ft = parseInt(data.heightFeetText, 10);
        const inches = parseFloat(data.heightInchesText) || 0;
        heightCm = (ft * 12 + inches) * 2.54;
      }

      const weightKg = displayToKg(parseFloat(data.weightText));
      const goalKg = displayToKg(parseFloat(data.goalText));
      const age = parseInt(data.ageText, 10);

      const profile: UserProfile = {
        id: UserProfileRepo.defaultId,
        displayName: data.name.trim(),
        age: Number.isFinite(age) ? age : null,
        startDate: Date.now(),
        initialWeightKg: weightKg,
        goalWeightKg: goalKg,
        initialHeightCm: heightCm,
        initialFrontPhotoUri: data.frontPhotoUri,
        initialSidePhotoUri: data.sidePhotoUri,
      };

      await UserProfileRepo.insert(db, profile);

      const optedIn = data.notifStatus === "granted";
      try {
        await PreferencesRepo.set(db, KEY_ENABLED, optedIn ? "1" : "0");
      } catch (err) {
        console.warn("[onboarding] persist reminder.enabled failed:", err);
      }

      if (optedIn) {
        try {
          const settings = await readSettingsFromPrefs(db);
          await rescheduleDailyReminders(db, { ...settings, enabled: true });
        } catch (err) {
          console.warn("[onboarding] arm reminders failed:", err);
        }
      }

      setSaving(false);
      setShowWelcome(true);
    } catch (err) {
      console.error("[onboarding] save failed", err);
      setError("Could not save your profile. Try again.");
      setSaving(false);
    }
  }, [system, data, displayToKg, db]);

  const handleNext = useCallback(() => {
    Keyboard.dismiss();
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      setError(null);
    } else {
      handleFinish();
    }
  }, [step, handleFinish]);

  const handleWelcomeDismiss = useCallback(() => {
    setShowWelcome(false);
    setSaving(false);
    router.replace("/(main)/(tabs)");
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ProgressDots total={TOTAL_STEPS} current={step} />

      <ScrollScreen safeTop={false}>
        <StepContainer centered={CENTERED_STEPS.has(step)}>
          {step === 0 && <WelcomeStep />}
          {step === 1 && <StreaksStep />}
          {step === 2 && <OathsStep />}
          {step === 3 && (
            <NameStep value={data.name} onChange={(v) => update("name", v)} />
          )}
          {step === 4 && (
            <AgeStep
              value={data.ageText}
              onChange={(v) => update("ageText", v)}
            />
          )}
          {step === 5 && <UnitsStep />}
          {step === 6 && (
            <BodyStep
              system={system}
              heightCm={data.heightCmText}
              heightFeet={data.heightFeetText}
              heightInches={data.heightInchesText}
              weight={data.weightText}
              goal={data.goalText}
              onHeightCm={(v) => update("heightCmText", v)}
              onHeightFeet={(v) => update("heightFeetText", v)}
              onHeightInches={(v) => update("heightInchesText", v)}
              onWeight={(v) => update("weightText", v)}
              onGoal={(v) => update("goalText", v)}
            />
          )}
          {step === 7 && (
            <PhotosStep
              frontUri={data.frontPhotoUri}
              sideUri={data.sidePhotoUri}
              onFront={(uri) => update("frontPhotoUri", uri)}
              onSide={(uri) => update("sidePhotoUri", uri)}
            />
          )}
          {step === 8 && (
            <NotificationsStep
              status={data.notifStatus}
              onStatusChange={(s) => update("notifStatus", s)}
            />
          )}
          {step === 9 && <SummaryStep data={data} system={system} />}
        </StepContainer>
      </ScrollScreen>

      <Footer
        step={step}
        total={TOTAL_STEPS}
        canContinue={canContinue}
        saving={saving}
        error={error}
        onBack={handleBack}
        onNext={handleNext}
      />

      <CelebrationBurst
        visible={showWelcome}
        streak={0}
        title={`Welcome, ${data.name.trim() || "friend"}`}
        subtitle="The first day is the hardest. You just started it."
        icon="flame"
        sound="dayComplete"
        onDismiss={handleWelcomeDismiss}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
}));
