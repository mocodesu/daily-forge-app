// ─────────────────────────────────────────────────────────────
// Widget data fetcher
//
// Called FROM the main app context, passing the app's own SQLite
// handle. The widget's headless context never calls this — it
// reads from the MMKV cache instead.
// ─────────────────────────────────────────────────────────────
import { CompletionsRepo } from "@/repositories/completions-repo";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { UserProfileRepo } from "@/repositories/user-profile-repo";
import { getStoredValues } from "@/store/storage";
import { APP_COLOR_SCHEMES, DEFAULT_SCHEME_ID } from "@/theme/color-schemes";
import { dayEndMs, dayKey, dayStartMs } from "@/utils/day-key";
import { calculateStreak } from "@/utils/streak";
import type { SQLiteDatabase } from "expo-sqlite";
import { Appearance } from "react-native";
import {
  COLOR_MODE_STORAGE_KEY,
  COLOR_SCHEME_STORAGE_KEY,
} from "../../unistyles";
import {
  DEFAULT_WIDGET_DATA,
  type WidgetData,
  type WidgetTheme,
} from "./widget-types";

// ─────────────────────────────────────────────────────────────
// Theme resolution
// ─────────────────────────────────────────────────────────────
function readWidgetTheme(): WidgetTheme {
  const {
    [COLOR_SCHEME_STORAGE_KEY]: schemeRaw,
    [COLOR_MODE_STORAGE_KEY]: modeRaw,
  } = getStoredValues([COLOR_SCHEME_STORAGE_KEY, COLOR_MODE_STORAGE_KEY]);

  const schemeId =
    typeof schemeRaw === "string" &&
    APP_COLOR_SCHEMES.some((s) => s.id === schemeRaw)
      ? schemeRaw
      : DEFAULT_SCHEME_ID;

  const mode: "light" | "dark" | "system" =
    modeRaw === "light" || modeRaw === "dark" ? modeRaw : "system";

  const resolvedMode: "light" | "dark" =
    mode === "system" ? (Appearance.getColorScheme() ?? "light") : mode;

  const scheme = APP_COLOR_SCHEMES.find((s) => s.id === schemeId)!;
  const tokens =
    resolvedMode === "dark" ? scheme.tokens.dark : scheme.tokens.light;

  return {
    surface: tokens.surface,
    text: tokens.onSurface,
    textMuted: tokens.mutedText,
    primary: tokens.primary,
    active: tokens.active,
    track: tokens.panelBorder,
  };
}

// ─────────────────────────────────────────────────────────────
// Data fetch
// ─────────────────────────────────────────────────────────────
export async function fetchWidgetData(db: SQLiteDatabase): Promise<WidgetData> {
  try {
    const now = new Date();
    const key = dayKey(now);
    const startMs = dayStartMs(now);
    const endMs = dayEndMs(now);

    const [exercises, completions, isLocked, streakResult, profile] =
      await Promise.all([
        ExercisesRepo.getActiveForDay(db, startMs, endMs),
        CompletionsRepo.getForDay(db, key),
        DayLocksRepo.isLocked(db, key),
        calculateStreak(db),
        UserProfileRepo.get(db),
      ]);

    const completedIds = new Set(completions.map((r) => r.exerciseId));
    const completed = exercises.filter((e) => completedIds.has(e.id)).length;

    return {
      streak: streakResult.streak,
      completed,
      total: exercises.length,
      isSealed: isLocked,
      displayName: profile?.displayName ?? "",
      theme: readWidgetTheme(),
    };
  } catch (err) {
    console.warn("[widget] data fetch failed:", err);
    return { ...DEFAULT_WIDGET_DATA, theme: readWidgetTheme() };
  }
}

/** Re-exported for the theme-sync path. */
export { readWidgetTheme };
