// ─────────────────────────────────────────────────────────────
// constants/notifications.ts
// ─────────────────────────────────────────────────────────────

/** Prefix for every daily-reminder notification ID. */
export const DAILY_REMINDER_ID_PREFIX = "daily-reminder-";

/** Number of days to schedule ahead. */
export const DAILY_REMINDER_DAYS_AHEAD = 7;

/** Default reminder time: 7:00 PM local. */
export const DEFAULT_REMINDER_HOUR = 19;
export const DEFAULT_REMINDER_MINUTE = 0;

/**
 * Builds the notification identifier for a given day key.
 * One notification per calendar day, so we can cancel today's specifically
 * when the user finishes early.
 */
export function reminderIdForDay(dayKey: string): string {
  return `${DAILY_REMINDER_ID_PREFIX}${dayKey}`;
}

/** "YYYY-MM-DD" for the given date, matching DayLogic's format. */
export function dayKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Notification copy — same for every day, but warm. */
export const REMINDER_TITLE = "Time to work out";
export const REMINDER_BODY =
  "Your daily exercises are waiting. A few minutes now, a stronger you tomorrow.";
