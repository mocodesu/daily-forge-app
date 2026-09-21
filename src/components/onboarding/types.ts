// ─────────────────────────────────────────────────────────────
// Onboarding data model + per-step validation
// ─────────────────────────────────────────────────────────────

export type UnitSystem = "metric" | "imperial";

export interface OnboardingData {
  name: string;
  ageText: string;
  heightCmText: string;
  heightFeetText: string;
  heightInchesText: string;
  weightText: string;
  goalText: string;
  notifStatus: "idle" | "granted" | "denied";
  frontPhotoUri: string | null;
  sidePhotoUri: string | null;
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  name: "",
  ageText: "",
  heightCmText: "",
  heightFeetText: "",
  heightInchesText: "",
  weightText: "",
  goalText: "",
  notifStatus: "idle",
  frontPhotoUri: null,
  sidePhotoUri: null,
};

// ─────────────────────────────────────────────────────────────
// Shared numeric guards
// ─────────────────────────────────────────────────────────────
const isFiniteInRange = (n: number, min: number, max: number): boolean =>
  Number.isFinite(n) && n >= min && n <= max;

const isPositiveFinite = (n: number): boolean => Number.isFinite(n) && n > 0;

function isValidMetricHeight(text: string): boolean {
  return isFiniteInRange(parseFloat(text), 120, 250);
}

function isValidImperialHeight(feetText: string, inchesText: string): boolean {
  const ft = parseInt(feetText, 10);
  const inch = parseFloat(inchesText) || 0;
  return Number.isFinite(ft) && ft >= 3 && ft <= 8 && inch >= 0 && inch < 12;
}

// ─────────────────────────────────────────────────────────────
// Per-step validation
//
// Each step index maps to one entry. The orchestrator calls
// `canContinueFromStep` on every render to gate the footer button.
// ─────────────────────────────────────────────────────────────
export function canContinueFromStep(
  step: number,
  data: OnboardingData,
  system: UnitSystem,
): boolean {
  switch (step) {
    // Welcome, Streaks, Oaths — informational, always advanceable
    case 0:
    case 1:
    case 2:
      return true;

    // Name — non-empty after trim
    case 3:
      return data.name.trim().length > 0;

    // Age — 13 to 120
    case 4: {
      const age = parseInt(data.ageText, 10);
      return isFiniteInRange(age, 13, 120);
    }

    // Units — always advanceable
    case 5:
      return true;

    // Body — height + weight + goal all valid
    case 6: {
      const heightValid =
        system === "metric"
          ? isValidMetricHeight(data.heightCmText)
          : isValidImperialHeight(data.heightFeetText, data.heightInchesText);
      const weightValid = isPositiveFinite(parseFloat(data.weightText));
      const goalValid = isPositiveFinite(parseFloat(data.goalText));
      return heightValid && weightValid && goalValid;
    }

    // Photos — skippable
    case 7:
      return true;

    // Notifications — skippable
    case 8:
      return true;

    // Summary — the "Finish" button
    case 9:
      return true;

    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────
// BMI helpers
//
// Standard adult BMI. We collect age to reference later (for
// context and future features), but the BMI formula itself is the
// same for every adult.
// ─────────────────────────────────────────────────────────────
export function computeBMI(weightKg: number, heightCm: number): number | null {
  if (!isPositiveFinite(weightKg) || !isPositiveFinite(heightCm)) {
    return null;
  }
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}
