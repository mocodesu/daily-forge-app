import { useEffect } from "react";

import {
  ensureRetentionReminderChannelAsync,
  initializeRetentionReminders,
} from "@/utils/retention-reminder";

/**
 * Call this once near the root of your app (e.g. in your root layout or App
 * component) to:
 *   1. Create the Android notification channel up front, instead of
 *      waiting for the first reminder to be scheduled.
 *   2. Re-apply any previously scheduled reminder sequence, so it survives
 *      app updates, device restarts, or the app being killed and reopened.
 *
 * This does NOT request notification permission. Permission is only
 * requested the first time `trackUserActivity()` runs, so users aren't
 * prompted before they've actually done anything in the app.
 *
 * Usage:
 *   function RootLayout() {
 *     useRetentionReminders();
 *     return <Slot />;
 *   }
 */
export const useRetentionReminders = () => {
  useEffect(() => {
    let isActive = true;

    const setup = async () => {
      try {
        await ensureRetentionReminderChannelAsync();
        if (!isActive) {
          return;
        }
        await initializeRetentionReminders();
      } catch (error) {
        console.error("Failed to set up retention reminders:", error);
      }
    };

    setup();

    return () => {
      isActive = false;
    };
  }, []);
};
