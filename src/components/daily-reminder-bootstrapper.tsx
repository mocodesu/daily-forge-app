import { useDailyReminder } from "@/hooks/use-daily-reminder";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Headless component that arms the daily reminder schedule at app
 * launch, and re-arms it whenever the app returns to the foreground.
 *
 * Why this exists:
 *   The full `useDailyReminder` hook is mounted inside the Settings
 *   editor. Without a second mount at app root, a fresh install where
 *   the user never opens Settings would never schedule any reminders,
 *   and an app left open for more than 7 days would run out of
 *   scheduled days.
 *
 *   Both instances use the same preference keys and deterministic
 *   notification IDs (daily-reminder-YYYY-MM-DD), so running the sync
 *   twice is idempotent — the second call cancels and re-schedules the
 *   same set.
 *
 * Renders nothing. Safe to mount alongside <Stack> inside the
 * SQLiteProvider tree.
 */
export function DailyReminderBootstrapper() {
  const { refresh } = useDailyReminder();

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      // Re-arm on return from background. Covers the edge case where
      // the app stayed alive (backgrounded) for over 7 days without a
      // cold launch — the 7-day schedule would have run out.
      if (next === "active" && prev !== "active") {
        refresh().catch(() => {
          // Non-fatal. Reminders are a nice-to-have; failing here
          // must not affect the rest of the app.
        });
      }
    });

    return () => sub.remove();
  }, [refresh]);

  return null;
}
