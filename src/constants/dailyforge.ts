// ─────────────────────────────────────────────────────────────
// constants/dailyforge.ts — domain constants
// ─────────────────────────────────────────────────────────────

/** Default number of exercises the user must configure for a day to count. */
export const DEFAULT_MINIMUM_EXERCISES = 5;

/** Preset options shown in the Settings minimum picker. */
export const MINIMUM_EXERCISES_OPTIONS = [1, 3, 5, 7, 10] as const;

/** Hard bounds for a custom minimum value. */
export const MINIMUM_EXERCISES_RANGE = { min: 1, max: 30 } as const;

/** How many days the history grid displays. */
export const HISTORY_WINDOW_DAYS = 30;

/** Default streak target in days. User can override in Settings. */
export const DEFAULT_TARGET_DAYS = 30;

/** Preset options shown in the Settings target picker. */
export const TARGET_DAYS_OPTIONS = [30, 60, 90, 100] as const;

/** How many freezes the user gets per calendar month. */
export const DEFAULT_MONTHLY_FREEZES = 2;

/** Max number of days the auto-freeze scan looks back. */
export const MAX_FREEZE_LOOKBACK_DAYS = 30;
