// ─────────────────────────────────────────────────────────────
// Widget types + defaults
//
// The `import type` below is erased at build time — no runtime
// cost, does not pull the widget library into the headless JS
// context. Safe for widget-cache.ts to import from here.
// ─────────────────────────────────────────────────────────────
import type { ColorProp } from "react-native-android-widget";

export interface WidgetTheme {
  surface: ColorProp;
  text: ColorProp;
  textMuted: ColorProp;
  primary: ColorProp;
  active: ColorProp;
  track: ColorProp;
  onPrimary: ColorProp;
}

export interface WidgetData {
  dayKey: string;
  streak: number;
  completed: number;
  total: number;
  isSealed: boolean;
  canSeal: boolean;
  displayName: string;
  deepLinkScheme: string;
  theme: WidgetTheme;
}

export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  surface: "#0F172A",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  primary: "#3B82F6",
  active: "#4ADE80",
  track: "#FFFFFF14",
  onPrimary: "#FFFFFF",
};

export const DEFAULT_WIDGET_DATA: WidgetData = {
  dayKey: "",
  streak: 0,
  completed: 0,
  total: 0,
  isSealed: false,
  canSeal: false,
  displayName: "",
  deepLinkScheme: "",
  theme: DEFAULT_WIDGET_THEME,
};

// ─────────────────────────────────────────────────────────────
// Color helpers
//
// Widget style types accept a narrower set of color formats than
// React Native proper. In particular, `rgba(...)` strings are not
// accepted by ColorProp — only `#RRGGBB` and `#RRGGBBAA`.
//
// `withAlpha` converts any accepted RN color string to a hex8
// equivalent, or passes it through unchanged if it's already hex.
// ─────────────────────────────────────────────────────────────
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    if (color.length === 9) return color;
    if (color.length === 7) {
      const a = Math.round(alpha * 255)
        .toString(16)
        .padStart(2, "0");
      return `${color}${a}`.toUpperCase();
    }
    return color;
  }

  const match = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (!match) return color;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  const baseAlpha = match[4] !== undefined ? parseFloat(match[4]) : 1;
  const finalAlpha = Math.round(baseAlpha * alpha * 255);

  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}${hex(finalAlpha)}`.toUpperCase();
}

/** Normalizes any RN color string to hex8. Useful for ColorProp. */
export function toWidgetColor(color: string): ColorProp {
  return withAlpha(color, 1) as ColorProp;
}
