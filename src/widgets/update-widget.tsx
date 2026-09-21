"use no memo";

import type { SQLiteDatabase } from "expo-sqlite";
import { requestWidgetUpdate } from "react-native-android-widget";
import { DailyForgeMediumWidget } from "./daily-forge-medium-widget";
import { DailyForgeWidget } from "./daily-forge-widget";
import { cacheWidgetData, readCachedWidgetData } from "./widget-cache";
import { fetchWidgetData, readWidgetTheme } from "./widget-data";
import type { WidgetData } from "./widget-types";

const WIDGET_NAMES = ["DailyForge", "DailyForgeMedium"] as const;

async function requestWidgetUpdateForName(
  name: (typeof WIDGET_NAMES)[number],
  data: WidgetData,
): Promise<void> {
  await requestWidgetUpdate({
    widgetName: name,
    renderWidget: () => {
      const props = {
        dayKey: data.dayKey,
        streak: data.streak,
        completed: data.completed,
        total: data.total,
        isSealed: data.isSealed,
        canSeal: data.canSeal,
        displayName: data.displayName,
        deepLinkScheme: data.deepLinkScheme,
        theme: data.theme,
      };
      if (name === "DailyForgeMedium") {
        return <DailyForgeMediumWidget {...props} />;
      }
      return <DailyForgeWidget {...props} />;
    },
    widgetNotFound: () => {
      // Fine.
    },
  });
}

async function requestAllUpdates(data: WidgetData): Promise<void> {
  for (const name of WIDGET_NAMES) {
    await requestWidgetUpdateForName(name, data);
  }
}

export async function refreshDailyWidget(db: SQLiteDatabase): Promise<void> {
  try {
    const data = await fetchWidgetData(db);
    cacheWidgetData(data);
    await requestAllUpdates(data);
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
    await requestAllUpdates(next);
  } catch (err) {
    console.warn("[widget] theme sync failed:", err);
  }
}
