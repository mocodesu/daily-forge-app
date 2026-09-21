import {
  readSettingsFromPrefs,
  rescheduleDailyReminders,
} from "@/utils/daily-reminder-scheduler";
import { refreshDailyWidget } from "@/widgets/update-widget";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

export function DailyReminderBootstrapper() {
  const db = useSQLiteContext();
  const appStateRef = useRef<AppStateStatus>(
    (AppState.currentState ?? "active") as AppStateStatus,
  );

  const arm = useCallback(async () => {
    try {
      const settings = await readSettingsFromPrefs(db);
      await rescheduleDailyReminders(db, settings);
    } catch (err) {
      console.warn("[bootstrapper] arm failed:", err);
    }
  }, [db]);

  const refreshWidget = useCallback(async () => {
    try {
      await refreshDailyWidget(db);
    } catch (err) {
      console.warn("[bootstrapper] widget refresh failed:", err);
    }
  }, [db]);

  useEffect(() => {
    arm();
    refreshWidget();

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === "active" && prev !== "active") {
        arm();
        refreshWidget();
      }
    });

    return () => sub.remove();
  }, [arm, refreshWidget]);

  return null;
}
