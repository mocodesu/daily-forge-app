// ─────────────────────────────────────────────────────────────
// constants/dailyforge.ts — domain constants
// ─────────────────────────────────────────────────────────────

/** Minimum number of exercises required before a day can be locked. */
export const MIN_EXERCISES_PER_DAY = 5;

/** How many days the history grid displays. */
export const HISTORY_WINDOW_DAYS = 30;

/** Default streak target in days. User can override in Settings. */
export const DEFAULT_TARGET_DAYS = 30;

/** Preset options shown in the Settings target picker. */
export const TARGET_DAYS_OPTIONS = [30, 60, 90, 100] as const;
