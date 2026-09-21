// ─────────────────────────────────────────────────────────────
// Widget data cache
// ─────────────────────────────────────────────────────────────
import { storage } from "@/store/storage";
import { DEFAULT_WIDGET_DATA, type WidgetData } from "./widget-types";

const CACHE_KEY = "widget.daily";

export function cacheWidgetData(data: WidgetData): void {
  try {
    storage.set(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[widget] cache write failed:", err);
  }
}

export function readCachedWidgetData(): WidgetData {
  try {
    const raw = storage.getString(CACHE_KEY);
    if (!raw) return DEFAULT_WIDGET_DATA;

    const parsed = JSON.parse(raw) as Partial<WidgetData>;
    const theme = parsed.theme ?? DEFAULT_WIDGET_DATA.theme;

    return {
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      completed: typeof parsed.completed === "number" ? parsed.completed : 0,
      total: typeof parsed.total === "number" ? parsed.total : 0,
      isSealed: parsed.isSealed === true,
      displayName:
        typeof parsed.displayName === "string" ? parsed.displayName : "",
      theme: {
        surface: theme.surface ?? DEFAULT_WIDGET_DATA.theme.surface,
        text: theme.text ?? DEFAULT_WIDGET_DATA.theme.text,
        textMuted: theme.textMuted ?? DEFAULT_WIDGET_DATA.theme.textMuted,
        primary: theme.primary ?? DEFAULT_WIDGET_DATA.theme.primary,
        active: theme.active ?? DEFAULT_WIDGET_DATA.theme.active,
        track: theme.track ?? DEFAULT_WIDGET_DATA.theme.track,
      },
    };
  } catch (err) {
    console.warn("[widget] cache read failed:", err);
    return DEFAULT_WIDGET_DATA;
  }
}
