"use no memo";

// ─────────────────────────────────────────────────────────────
// Widget refresh helpers
//
//   refreshDailyWidget(db) — full refresh: re-query SQLite, cache,
//                            request widget update.
//
//   syncWidgetTheme()      — theme-only refresh. No SQLite.
//
// File extension MUST be .tsx because the renderWidget callbacks
// contain JSX.
// ─────────────────────────────────────────────────────────────
import type { SQLiteDatabase } from "expo-sqlite";
import { requestWidgetUpdate } from "react-native-android-widget";
import { DailyForgeWidget } from "./daily-forge-widget";
import { cacheWidgetData, readCachedWidgetData } from "./widget-cache";
import { fetchWidgetData, readWidgetTheme } from "./widget-data";
import type { WidgetData } from "./widget-types";

async function requestDailyWidgetUpdate(data: WidgetData): Promise<void> {
  await requestWidgetUpdate({
    widgetName: "DailyForge",
    renderWidget: () => (
      <DailyForgeWidget
        streak={data.streak}
        completed={data.completed}
        total={data.total}
        isSealed={data.isSealed}
        displayName={data.displayName}
        theme={data.theme}
      />
    ),
    widgetNotFound: () => {
      // No widget on the home screen. Not an error.
    },
  });
}

export async function refreshDailyWidget(db: SQLiteDatabase): Promise<void> {
  try {
    const data = await fetchWidgetData(db);
    cacheWidgetData(data);
    await requestDailyWidgetUpdate(data);
  } catch (err) {
    console.warn("[widget] refresh failed:", err);
  }
}

export async function syncWidgetTheme(): Promise<void> {
  try {
    const cached = readCachedWidgetData();
    const theme = readWidgetTheme();
    const next: WidgetData = { ...cached, theme };
    cacheWidgetData(next);
    await requestDailyWidgetUpdate(next);
  } catch (err) {
    console.warn("[widget] theme sync failed:", err);
  }
}
