import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState } from "react-native";

/**
 * Sets the app icon badge to `remaining` — the number of exercises still
 * to be done today. Automatically clears to 0 when remaining is 0, and
 * re-applies on foreground return in case the OS cleared it.
 *
 * Non-critical: every call is wrapped in a catch so a badge failure
 * never affects the rest of the app.
 *
 * iOS: works everywhere.
 * Android: support depends on the launcher. Most modern launchers respect
 *          badge numbers when the notification permission is granted.
 * Web:   no-op.
 */
export function useAppBadge(remaining: number) {
  useEffect(() => {
    const safe = Math.max(0, Math.floor(remaining));

    const apply = () => {
      Notifications.setBadgeCountAsync(safe).catch(() => {
        // Badge is cosmetic. Ignore.
      });
    };

    apply();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") apply();
    });

    return () => {
      sub.remove();
    };
  }, [remaining]);
}
