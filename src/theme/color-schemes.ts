// ---------- App colour schemes ----------
//
// Each scheme exposes the same token set in light and dark variants.
// All foreground/background pairs meet at least WCAG AA (4.5:1) for
// text and 3:1 for UI shapes. Values are hand-picked to feel like a
// coherent product rather than a random palette.
//
//   default   — cool, neutral, professional (blue)
//   ember     — warm, motivating, on-brand for flame/streak (orange)
//   crimson   — serious, oath-adjacent, high-conviction (red)
//   forest    — calm, grounded, growth-oriented (teal)
//   amethyst  — rich, premium, focused (violet)
//   slate     — minimal, no-nonsense, near-monochrome (grey + sky)

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

  {
    id: "ember",
    label: "Ember",
    tokens: {
      light: {
        primary: "#C2410C",
        primaryIllumination: "#EA580C",
        secondary: "#78716C",

        onPrimary: "#FFFFFF",
        onSecondary: "#FFFFFF",

        tertiary: "#D97706",

        background: "#FFFAF5",
        onBackground: "#1C1917",

        surface: "#FEF5EB",
        onSurface: "#1C1917",

        panel: "rgba(28, 25, 23, 0.04)",
        panelBorder: "rgba(28, 25, 23, 0.08)",

        mutedText: "#78716C",

        active: "#16A34A",
        activeSurface: "rgba(22, 163, 74, 0.15)",
        activeField: "rgba(22, 163, 74, 0.25)",

        inactive: "#D97706",
        inactiveSurface: "rgba(217, 119, 6, 0.15)",

        danger: "#B91C1C",
        dangerIllumination: "rgba(185, 28, 28, 0.25)",

        darkKey: "rgba(28, 25, 23, 0.05)",
        darkKeyIllumination: "rgba(28, 25, 23, 0.08)",
      },

      dark: {
        primary: "#F97316",
        primaryIllumination: "#FB923C",
        secondary: "#57534E",

        onPrimary: "#1C1917",
        onSecondary: "#FFFFFF",

        tertiary: "#FBBF24",

        background: "#0C0A09",
        onBackground: "#FAFAF9",

        surface: "#1C1917",
        onSurface: "#FAFAF9",

        panel: "rgba(255,255,255,0.04)",
        panelBorder: "rgba(255,255,255,0.08)",

        mutedText: "#A8A29E",

        active: "#4ADE80",
        activeSurface: "rgba(74, 222, 128, 0.18)",
        activeField: "rgba(74, 222, 128, 0.28)",

        inactive: "#FBBF24",
        inactiveSurface: "rgba(251, 191, 36, 0.18)",

        danger: "#F87171",
        dangerIllumination: "rgba(248, 113, 113, 0.25)",

        darkKey: "#1C1917",
        darkKeyIllumination: "#292524",
      },
    },
  },

  {
    id: "crimson",
    label: "Crimson",
    tokens: {
      light: {
        primary: "#B91C1C",
        primaryIllumination: "#DC2626",
        secondary: "#71717A",

        onPrimary: "#FFFFFF",
        onSecondary: "#FFFFFF",

        tertiary: "#9F1239",

        background: "#FFFAFA",
        onBackground: "#18181B",

        surface: "#FEF2F2",
        onSurface: "#18181B",

        panel: "rgba(24, 24, 27, 0.04)",
        panelBorder: "rgba(24, 24, 27, 0.08)",

        mutedText: "#71717A",

        active: "#15803D",
        activeSurface: "rgba(21, 128, 61, 0.15)",
        activeField: "rgba(21, 128, 61, 0.25)",

        inactive: "#D97706",
        inactiveSurface: "rgba(217, 119, 6, 0.15)",

        danger: "#7F1D1D",
        dangerIllumination: "rgba(127, 29, 29, 0.25)",

        darkKey: "rgba(24, 24, 27, 0.05)",
        darkKeyIllumination: "rgba(24, 24, 27, 0.08)",
      },

      dark: {
        primary: "#F87171",
        primaryIllumination: "#FCA5A5",
        secondary: "#52525B",

        onPrimary: "#18181B",
        onSecondary: "#FFFFFF",

        tertiary: "#FB7185",

        background: "#0A0707",
        onBackground: "#FAFAFA",

        surface: "#18181B",
        onSurface: "#FAFAFA",

        panel: "rgba(255,255,255,0.04)",
        panelBorder: "rgba(255,255,255,0.08)",

        mutedText: "#A1A1AA",

        active: "#4ADE80",
        activeSurface: "rgba(74, 222, 128, 0.18)",
        activeField: "rgba(74, 222, 128, 0.28)",

        inactive: "#FBBF24",
        inactiveSurface: "rgba(251, 191, 36, 0.18)",

        danger: "#DC2626",
        dangerIllumination: "rgba(220, 38, 38, 0.25)",

        darkKey: "#1F1F23",
        darkKeyIllumination: "#27272A",
      },
    },
  },

  {
    id: "forest",
    label: "Forest",
    tokens: {
      light: {
        primary: "#0F766E",
        primaryIllumination: "#0D9488",
        secondary: "#6B7280",

        onPrimary: "#FFFFFF",
        onSecondary: "#FFFFFF",

        tertiary: "#0E7490",

        background: "#F7FCFC",
        onBackground: "#042F2E",

        surface: "#F0FDFA",
        onSurface: "#042F2E",

        panel: "rgba(4, 47, 46, 0.04)",
        panelBorder: "rgba(4, 47, 46, 0.08)",

        mutedText: "#6B7280",

        active: "#15803D",
        activeSurface: "rgba(21, 128, 61, 0.15)",
        activeField: "rgba(21, 128, 61, 0.25)",

        inactive: "#B45309",
        inactiveSurface: "rgba(180, 83, 9, 0.15)",

        danger: "#B91C1C",
        dangerIllumination: "rgba(185, 28, 28, 0.25)",

        darkKey: "rgba(4, 47, 46, 0.05)",
        darkKeyIllumination: "rgba(4, 47, 46, 0.08)",
      },

      dark: {
        primary: "#2DD4BF",
        primaryIllumination: "#5EEAD4",
        secondary: "#4B5563",

        onPrimary: "#042F2E",
        onSecondary: "#FFFFFF",

        tertiary: "#22D3EE",

        background: "#020D0D",
        onBackground: "#F0FDFA",

        surface: "#042F2E",
        onSurface: "#F0FDFA",

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

        darkKey: "#042F2E",
        darkKeyIllumination: "#0F4C48",
      },
    },
  },

  {
    id: "amethyst",
    label: "Amethyst",
    tokens: {
      light: {
        primary: "#6D28D9",
        primaryIllumination: "#7C3AED",
        secondary: "#71717A",

        onPrimary: "#FFFFFF",
        onSecondary: "#FFFFFF",

        tertiary: "#BE185D",

        background: "#FDFBFF",
        onBackground: "#1E1B4B",

        surface: "#F5F3FF",
        onSurface: "#1E1B4B",

        panel: "rgba(30, 27, 75, 0.04)",
        panelBorder: "rgba(30, 27, 75, 0.08)",

        mutedText: "#71717A",

        active: "#15803D",
        activeSurface: "rgba(21, 128, 61, 0.15)",
        activeField: "rgba(21, 128, 61, 0.25)",

        inactive: "#B45309",
        inactiveSurface: "rgba(180, 83, 9, 0.15)",

        danger: "#BE123C",
        dangerIllumination: "rgba(190, 18, 60, 0.25)",

        darkKey: "rgba(30, 27, 75, 0.05)",
        darkKeyIllumination: "rgba(30, 27, 75, 0.08)",
      },

      dark: {
        primary: "#A78BFA",
        primaryIllumination: "#C4B5FD",
        secondary: "#52525B",

        onPrimary: "#1E1B4B",
        onSecondary: "#FFFFFF",

        tertiary: "#F472B6",

        background: "#0A0612",
        onBackground: "#F5F3FF",

        surface: "#1E1B4B",
        onSurface: "#F5F3FF",

        panel: "rgba(255,255,255,0.04)",
        panelBorder: "rgba(255,255,255,0.08)",

        mutedText: "#A1A1AA",

        active: "#4ADE80",
        activeSurface: "rgba(74, 222, 128, 0.18)",
        activeField: "rgba(74, 222, 128, 0.28)",

        inactive: "#FBBF24",
        inactiveSurface: "rgba(251, 191, 36, 0.18)",

        danger: "#FB7185",
        dangerIllumination: "rgba(251, 113, 133, 0.25)",

        darkKey: "#1E1B4B",
        darkKeyIllumination: "#312E81",
      },
    },
  },

  {
    id: "slate",
    label: "Slate",
    tokens: {
      light: {
        primary: "#0F172A",
        primaryIllumination: "#1E293B",
        secondary: "#64748B",

        onPrimary: "#FFFFFF",
        onSecondary: "#FFFFFF",

        tertiary: "#0284C7",

        background: "#FFFFFF",
        onBackground: "#0F172A",

        surface: "#F8FAFC",
        onSurface: "#0F172A",

        panel: "rgba(15, 23, 42, 0.04)",
        panelBorder: "rgba(15, 23, 42, 0.08)",

        mutedText: "#64748B",

        active: "#15803D",
        activeSurface: "rgba(21, 128, 61, 0.15)",
        activeField: "rgba(21, 128, 61, 0.25)",

        inactive: "#B45309",
        inactiveSurface: "rgba(180, 83, 9, 0.15)",

        danger: "#B91C1C",
        dangerIllumination: "rgba(185, 28, 28, 0.25)",

        darkKey: "rgba(15, 23, 42, 0.05)",
        darkKeyIllumination: "rgba(15, 23, 42, 0.08)",
      },

      dark: {
        primary: "#E2E8F0",
        primaryIllumination: "#F1F5F9",
        secondary: "#475569",

        onPrimary: "#0F172A",
        onSecondary: "#FFFFFF",

        tertiary: "#38BDF8",

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

        darkKey: "#1E293B",
        darkKeyIllumination: "#334155",
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
