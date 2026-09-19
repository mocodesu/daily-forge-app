// ─────────────────────────────────────────────────────────────
// utils/daily-reminder-scheduler.ts
//
// Pure, non-React scheduler for daily reminders.
//
// This is the single source of truth for "what is currently
// scheduled". Both the bootstrapper (cold launch + foreground)
// and the useDailyReminder hook (explicit mutations) call into
// here — nothing else cancels or schedules reminders.
//
// All reschedules are serialized through a promise chain so two
// concurrent callers can't cancel each other's schedules.
// ─────────────────────────────────────────────────────────────
import {
  DAILY_REMINDER_DAYS_AHEAD,
  DAILY_REMINDER_ID_PREFIX,
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  REMINDER_BODY,
  REMINDER_TITLE,
  dayKeyFromDate,
  reminderIdForDay,
} from "@/constants/notifications";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import * as Notifications from "expo-notifications";
import type { SQLiteDatabase } from "expo-sqlite";

// ─── Storage keys ────────────────────────────────────────────
export const KEY_ENABLED = "reminder.enabled";
export const KEY_HOUR = "reminder.hour";
export const KEY_MINUTE = "reminder.minute";

// ─── Public types ────────────────────────────────────────────
export interface DailyReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER_SETTINGS: DailyReminderSettings = {
  enabled: true,
  hour: DEFAULT_REMINDER_HOUR,
  minute: DEFAULT_REMINDER_MINUTE,
};

// ─────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────

async function cancelAllReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(DAILY_REMINDER_ID_PREFIX))
        .map((n) =>
          Notifications.cancelScheduledNotificationAsync(n.identifier).catch(
            () => undefined,
          ),
        ),
    );
  } catch (err) {
    console.warn("[daily-reminder] cancel all failed:", err);
  }
}

async function scheduleUpcoming(hour: number, minute: number): Promise<void> {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < DAILY_REMINDER_DAYS_AHEAD; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    day.setHours(hour, minute, 0, 0);

    if (day <= now) continue;

    const dayKey = dayKeyFromDate(day);
    const id = reminderIdForDay(dayKey);

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: REMINDER_TITLE,
          body: REMINDER_BODY,
          sound: true,
          data: { type: "daily-reminder", dayKey },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: day,
        },
      });
    } catch (err) {
      console.warn(`[daily-reminder] schedule ${dayKey} failed:`, err);
    }
  }
}

export async function hasPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function readSettingsFromPrefs(
  db: SQLiteDatabase,
): Promise<DailyReminderSettings> {
  const [enabledRaw, hourRaw, minuteRaw] = await Promise.all([
    PreferencesRepo.get(db, KEY_ENABLED),
    PreferencesRepo.get(db, KEY_HOUR),
    PreferencesRepo.get(db, KEY_MINUTE),
  ]);

  const next: DailyReminderSettings = {
    enabled:
      enabledRaw === null
        ? DEFAULT_REMINDER_SETTINGS.enabled
        : enabledRaw === "1",
    hour:
      hourRaw !== null ? parseInt(hourRaw, 10) : DEFAULT_REMINDER_SETTINGS.hour,
    minute:
      minuteRaw !== null
        ? parseInt(minuteRaw, 10)
        : DEFAULT_REMINDER_SETTINGS.minute,
  };

  if (!Number.isFinite(next.hour) || next.hour < 0 || next.hour > 23) {
    next.hour = DEFAULT_REMINDER_SETTINGS.hour;
  }
  if (!Number.isFinite(next.minute) || next.minute < 0 || next.minute > 59) {
    next.minute = DEFAULT_REMINDER_SETTINGS.minute;
  }

  return next;
}

// ─────────────────────────────────────────────────────────────
// Serialized reschedule
//
// Every call queues behind whatever is already in flight, so two
// callers (e.g. the bootstrapper arming on cold launch and the
// editor saving a new time) can't cancel each other's work.
// Last-writer-wins: the most recent settings are what end up scheduled.
// ─────────────────────────────────────────────────────────────

let chain: Promise<void> = Promise.resolve();

async function doReschedule(
  db: SQLiteDatabase,
  settings: DailyReminderSettings,
): Promise<void> {
  const granted = await hasPermission();
  await cancelAllReminders();
  if (settings.enabled && granted) {
    await scheduleUpcoming(settings.hour, settings.minute);
  }
  // `db` is unused inside this function today, but keep the
  // parameter so future versions can read/write per-user state.
  void db;
}

export function rescheduleDailyReminders(
  db: SQLiteDatabase,
  settings: DailyReminderSettings,
): Promise<void> {
  const result = chain.then(() => doReschedule(db, settings));
  // Keep `chain` always resolved so a rejection doesn't kill
  // subsequent reschedules. The real promise (with real errors)
  // is what we return to the caller.
  chain = result.catch(() => undefined);
  return result;
}

// ─────────────────────────────────────────────────────────────
// Cancel for today — used when the user seals the day.
// ─────────────────────────────────────────────────────────────
export async function cancelDailyReminderForToday(): Promise<void> {
  const key = dayKeyFromDate(new Date());
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderIdForDay(key));
  } catch {
    // No notification for today scheduled — safe to ignore.
  }
}
