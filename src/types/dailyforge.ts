// ─────────────────────────────────────────────────────────────
// types/dailyforge.ts — domain types for DailyForge
// ─────────────────────────────────────────────────────────────

/** Rep-based or timed. Matches ExerciseType on the macOS side. */
export type ExerciseType = "reps" | "timer";

/** Canonical body-part list. Order is preserved for display. */
export const BODY_PARTS = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Core",
  "Legs",
  "Glutes",
  "Full Body",
  "Cardio",
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];

export interface Exercise {
  id: string;
  name: string;
  bodyParts: BodyPart[];
  exerciseType: ExerciseType;
  /** meaningful only when exerciseType === "reps" */
  reps: number;
  sets: number;
  /** per-set duration in seconds (timer type only) */
  durationSeconds: number;
  /** total workout window in seconds — all types */
  sessionDurationSeconds: number;
  /** repeat every day? */
  isDaily: boolean;
  notes: string;
  createdAt: number; // epoch ms
  sortIndex: number;
}

export interface CompletionRecord {
  id: string;
  exerciseId: string;
  /** "YYYY-MM-DD" — stable calendar-day bucket */
  dayKey: string;
  /** when the user tapped Start Workout */
  startedAt: number | null;
  completedAt: number;
}

export interface DayLock {
  id: string;
  dayKey: string;
  lockedAt: number;
}

export interface DailySwear {
  id: string;
  dayKey: string;
  swornAt: number;
  transcript: string;
  matchedPhrase: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  startDate: number;
  /** always stored in kg regardless of display unit */
  initialWeightKg: number;
  goalWeightKg: number;
  /** always stored in cm regardless of display unit */
  initialHeightCm: number;
  /** file:// URIs on the device, or null if none */
  initialFrontPhotoUri: string | null;
  initialSidePhotoUri: string | null;
}

export interface Milestone {
  id: string;
  /** The streak value that unlocked this milestone: 30, 60, 90, ... */
  day: number;
  unlockedAt: number;
  completedAt: number | null;
  /** kg, or null if not yet recorded */
  currentWeightKg: number | null;
  userNotes: string;
  aiSummary: string | null;
}
