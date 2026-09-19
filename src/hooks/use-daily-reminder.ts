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
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY_ENABLED = "reminder.enabled";
const KEY_HOUR = "reminder.hour";
const KEY_MINUTE = "reminder.minute";

export interface DailyReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULTS: DailyReminderSettings = {
  enabled: true,
  hour: DEFAULT_REMINDER_HOUR,
  minute: DEFAULT_REMINDER_MINUTE,
};

/**
 * Cancels every pending daily-reminder notification.
 * Uses getAllScheduledNotificationsAsync so we don't need to
 * remember individual IDs.
 */
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

/**
 * Schedules DAILY_REMINDER_DAYS_AHEAD one-shot notifications, one per
 * day, at the given time. Days whose reminder time is already in the
 * past are skipped.
 */
async function scheduleUpcoming(hour: number, minute: number): Promise<void> {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < DAILY_REMINDER_DAYS_AHEAD; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    day.setHours(hour, minute, 0, 0);

    // Skip days whose reminder time has already passed.
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

export async function cancelDailyReminderForToday(): Promise<void> {
  const key = dayKeyFromDate(new Date());
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderIdForDay(key));
  } catch {
    // No notification for today scheduled — safe to ignore.
  }
}

/**
 * Ensures notification permission is granted. Returns true if granted.
 * Does NOT prompt — use `requestPermission()` for that.
 */
async function hasPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export function useDailyReminder() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<DailyReminderSettings>(DEFAULTS);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Reschedule based on current settings + permission ─────
  const sync = useCallback(async (s: DailyReminderSettings) => {
    try {
      const granted = await hasPermission();
      if (mountedRef.current) setPermissionGranted(granted);

      // Always cancel existing reminders so we start from a clean slate.
      await cancelAllReminders();

      if (!s.enabled || !granted) {
        return;
      }

      await scheduleUpcoming(s.hour, s.minute);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[daily-reminder] sync failed:", err);
      setLastError(err instanceof Error ? err.message : "Sync failed");
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [enabledRaw, hourRaw, minuteRaw] = await Promise.all([
        PreferencesRepo.get(db, KEY_ENABLED),
        PreferencesRepo.get(db, KEY_HOUR),
        PreferencesRepo.get(db, KEY_MINUTE),
      ]);

      const next: DailyReminderSettings = {
        enabled: enabledRaw === null ? DEFAULTS.enabled : enabledRaw === "1",
        hour: hourRaw !== null ? parseInt(hourRaw, 10) : DEFAULTS.hour,
        minute: minuteRaw !== null ? parseInt(minuteRaw, 10) : DEFAULTS.minute,
      };

      // Sanitize
      if (!Number.isFinite(next.hour) || next.hour < 0 || next.hour > 23) {
        next.hour = DEFAULTS.hour;
      }
      if (
        !Number.isFinite(next.minute) ||
        next.minute < 0 ||
        next.minute > 59
      ) {
        next.minute = DEFAULTS.minute;
      }

      if (!mountedRef.current) return;
      setSettings(next);

      await sync(next);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[daily-reminder] load failed:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [db, sync]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Mutators ──────────────────────────────────────────────
  const setEnabled = useCallback(
    async (enabled: boolean) => {
      const next = { ...settings, enabled };
      setSettings(next);
      try {
        await PreferencesRepo.set(db, KEY_ENABLED, enabled ? "1" : "0");
      } catch (err) {
        console.warn("[daily-reminder] save enabled failed:", err);
      }
      await sync(next);
    },
    [db, settings, sync],
  );

  const setTime = useCallback(
    async (hour: number, minute: number) => {
      const safeHour = Math.max(0, Math.min(23, Math.floor(hour)));
      const safeMinute = Math.max(0, Math.min(59, Math.floor(minute)));
      const next = { ...settings, hour: safeHour, minute: safeMinute };
      setSettings(next);
      try {
        await Promise.all([
          PreferencesRepo.set(db, KEY_HOUR, String(safeHour)),
          PreferencesRepo.set(db, KEY_MINUTE, String(safeMinute)),
        ]);
      } catch (err) {
        console.warn("[daily-reminder] save time failed:", err);
      }
      await sync(next);
    },
    [db, settings, sync],
  );

  /**
   * Cancels today's reminder specifically. Call this from the Today
   * screen when the day is sealed — the user has done their work and
   * doesn't need a reminder.
   */
  /**
   * Prompts for notification permission. Returns whether it was granted.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === "granted";
      if (mountedRef.current) setPermissionGranted(granted);
      await sync(settings);
      return granted;
    } catch (err) {
      console.warn("[daily-reminder] request failed:", err);
      return false;
    }
  }, [settings, sync]);

  return {
    settings,
    permissionGranted,
    loading,
    lastError,
    setEnabled,
    setTime,
    cancelForToday: cancelDailyReminderForToday,
    requestPermission,
    refresh,
  };
}
