import { PreferencesRepo } from "@/repositories/preferences-repo";
import {
  DEFAULT_REMINDER_SETTINGS,
  KEY_ENABLED,
  KEY_HOUR,
  KEY_MINUTE,
  cancelDailyReminderForToday,
  hasPermission,
  readSettingsFromPrefs,
  rescheduleDailyReminders,
  type DailyReminderSettings,
} from "@/utils/daily-reminder-scheduler";
import * as Notifications from "expo-notifications";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

// Re-exported for backwards compatibility — Fix 5 imports this
// from the hook and that should keep working.
export { cancelDailyReminderForToday };
export type { DailyReminderSettings };

/**
 * Read/write access to the daily-reminder preference, plus the
 * mutators the Settings editor needs.
 *
 * This hook does NOT schedule anything on mount. Scheduling is owned
 * by the bootstrapper (see `DailyReminderBootstrapper`), which calls
 * into `utils/daily-reminder-scheduler` on cold launch and on
 * foreground return. Mutations here trigger an explicit reschedule.
 */
export function useDailyReminder() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<DailyReminderSettings>(
    DEFAULT_REMINDER_SETTINGS,
  );
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

  // ── Read-only refresh. No scheduling side-effect. ────────
  const refresh = useCallback(async () => {
    try {
      const [next, granted] = await Promise.all([
        readSettingsFromPrefs(db),
        hasPermission(),
      ]);
      if (!mountedRef.current) return;
      setSettings(next);
      setPermissionGranted(granted);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[daily-reminder] refresh failed:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Mutators — each one explicitly reschedules ───────────
  const setEnabled = useCallback(
    async (enabled: boolean) => {
      const next = { ...settings, enabled };
      setSettings(next);
      try {
        await PreferencesRepo.set(db, KEY_ENABLED, enabled ? "1" : "0");
        await rescheduleDailyReminders(db, next);
        setLastError(null);
      } catch (err) {
        console.warn("[daily-reminder] save enabled failed:", err);
        setLastError(err instanceof Error ? err.message : "Save failed");
      }
    },
    [db, settings],
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
        await rescheduleDailyReminders(db, next);
        setLastError(null);
      } catch (err) {
        console.warn("[daily-reminder] save time failed:", err);
        setLastError(err instanceof Error ? err.message : "Save failed");
      }
    },
    [db, settings],
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === "granted";
      if (mountedRef.current) setPermissionGranted(granted);
      await rescheduleDailyReminders(db, settings);
      return granted;
    } catch (err) {
      console.warn("[daily-reminder] request failed:", err);
      return false;
    }
  }, [db, settings]);

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
