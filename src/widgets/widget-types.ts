// ─────────────────────────────────────────────────────────────
// Widget types + defaults
//
// Deliberately has zero imports. widget-cache.ts imports from
// here, and widget-cache.ts runs inside the widget's headless JS
// context. Any transitive import from this file would drag that
// module's side effects into the widget context.
// ─────────────────────────────────────────────────────────────

export interface WidgetTheme {
  /** The widget container's background color. */
  surface: string;
  /** Primary text color on surface. */
  text: string;
  /** Subdued text (label, secondary copy). */
  textMuted: string;
  /** Accent — the streak number, and filled progress segments. */
  primary: string;
  /** Success green — used for the sealed state. */
  active: string;
  /** Empty segment background. */
  track: string;
}

export interface WidgetData {
  streak: number;
  completed: number;
  total: number;
  isSealed: boolean;
  /** User's display name from onboarding. Empty string if unknown. */
  displayName: string;
  theme: WidgetTheme;
}

/** Matches the app's default dark theme. Used before the first real fetch. */
export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  surface: "#0F172A",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  primary: "#3B82F6",
  active: "#4ADE80",
  track: "rgba(255,255,255,0.08)",
};

export const DEFAULT_WIDGET_DATA: WidgetData = {
  streak: 0,
  completed: 0,
  total: 0,
  isSealed: false,
  displayName: "",
  theme: DEFAULT_WIDGET_THEME,
};
