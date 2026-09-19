import {
  readSettingsFromPrefs,
  rescheduleDailyReminders,
} from "@/utils/daily-reminder-scheduler";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Headless component that arms the daily-reminder schedule at app
 * launch, and re-arms it whenever the app returns to the foreground.
 *
 * This is the ONLY place that schedules reminders implicitly. The
 * hook in Settings only reschedules on explicit user mutation.
 *
 * Why this exists at all:
 *   A fresh install where the user never opens Settings still needs
 *   reminders to fire, and an app left in the background for more
 *   than 7 days needs its schedule topped up on return.
 *
 * Renders nothing. Safe to mount alongside <Stack>.
 */
export function DailyReminderBootstrapper() {
  const db = useSQLiteContext();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const arm = useCallback(async () => {
    try {
      const settings = await readSettingsFromPrefs(db);
      await rescheduleDailyReminders(db, settings);
    } catch (err) {
      // Non-fatal. Reminders are a nice-to-have; a scheduling
      // failure must not affect the rest of the app.
      console.warn("[bootstrapper] arm failed:", err);
    }
  }, [db]);

  useEffect(() => {
    // Cold launch.
    arm();

    // Foreground return. Covers the edge case where the app stayed
    // alive (backgrounded) for more than 7 days without a cold launch
    // — the 7-day schedule would have run out.
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === "active" && prev !== "active") {
        arm();
      }
    });

    return () => sub.remove();
  }, [arm]);

  return null;
}
