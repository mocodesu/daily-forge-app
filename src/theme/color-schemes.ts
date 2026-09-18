// ---------- Single colour scheme definition ----------
export const APP_COLOR_SCHEMES = [
  {
    id: "default",
    label: "Default",
    tokens: {
      light: {
        primary: "#2563EB",
        primaryIllumination: "#3B82F6",
        secondary: "#64748B",

        onPrimary: "#FFFFFF",
        onSecondary: "#FFFFFF",

        tertiary: "#8B5CF6",

        background: "#FFFFFF",
        onBackground: "#0F172A",

        surface: "#F8FAFC",
        onSurface: "#0F172A",

        panel: "rgba(15, 23, 42, 0.04)",
        panelBorder: "rgba(15, 23, 42, 0.08)",

        mutedText: "#64748B",

        active: "#22C55E",
        activeSurface: "rgba(34, 197, 94, 0.15)",
        activeField: "rgba(34, 197, 94, 0.25)",

        inactive: "#F59E0B",
        inactiveSurface: "rgba(245, 158, 11, 0.15)",

        danger: "#EF4444",
        dangerIllumination: "rgba(239, 68, 68, 0.25)",

        darkKey: "rgba(15, 23, 42, 0.05)",
        darkKeyIllumination: "rgba(15, 23, 42, 0.08)",
      },

      dark: {
        primary: "#3B82F6",
        primaryIllumination: "#60A5FA",
        secondary: "#475569",

        onPrimary: "#FFFFFF",
        onSecondary: "#FFFFFF",

        tertiary: "#A78BFA",

        background: "#020617",
        onBackground: "#F8FAFC",

        surface: "#0F172A",
        onSurface: "#F8FAFC",

        panel: "rgba(255,255,255,0.04)",
        panelBorder: "rgba(255,255,255,0.08)",

        mutedText: "#94A3B8",

        active: "#4ADE80",
        activeSurface: "rgba(74, 222, 128, 0.18)",
        activeField: "rgba(74, 222, 128, 0.28)",

        inactive: "#FBBF24",
        inactiveSurface: "rgba(251, 191, 36, 0.18)",

        danger: "#F87171",
        dangerIllumination: "rgba(248, 113, 113, 0.25)",

        darkKey: "#111827",
        darkKeyIllumination: "#1E293B",
      },
    },
  },
] as const;

export type AppColorScheme = (typeof APP_COLOR_SCHEMES)[number];
export type AppColorSchemeId = AppColorScheme["id"];

export const DEFAULT_SCHEME_ID: AppColorSchemeId = APP_COLOR_SCHEMES[0].id;

export const DEFAULT_APP_COLOR_SCHEME = APP_COLOR_SCHEMES[0];

export const DEFAULT_LIGHT_COLORS = DEFAULT_APP_COLOR_SCHEME.tokens.light;

export const DEFAULT_DARK_COLORS = DEFAULT_APP_COLOR_SCHEME.tokens.dark;

export const DEFAULT_PRIMARY_COLOR = DEFAULT_LIGHT_COLORS.primary;

export const DEFAULT_DARK_PRIMARY_COLOR = DEFAULT_DARK_COLORS.primary;

export const DEFAULT_DARK_BACKGROUND_COLOR = DEFAULT_DARK_COLORS.background;

export const DEFAULT_LIGHT_BACKGROUND_COLOR = DEFAULT_LIGHT_COLORS.background;
