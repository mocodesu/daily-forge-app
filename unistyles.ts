// ─────────────────────────────────────────────────────────────
// theme/index.ts
// ─────────────────────────────────────────────────────────────
import { getStoredValues, saveSecurely } from "@/store/storage";
import {
  APP_COLOR_SCHEMES,
  AppColorSchemeId,
  DEFAULT_SCHEME_ID,
} from "@/theme/color-schemes";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

// ═══════════════════════════════════════════════════════════
//  BASE UNIT
// ═══════════════════════════════════════════════════════════
export const BASE_GAP = 4;

// ═══════════════════════════════════════════════════════════
//  COLOR SCHEME RESOLUTION
// ═══════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────
// MMKV keys for theme persistence
//
// These are the single source of truth. The ThemePreferenceProvider
// reads and writes these exact keys — do NOT duplicate them there.
// ─────────────────────────────────────────────────────────────
export const COLOR_SCHEME_STORAGE_KEY = "app-color-scheme";
export const COLOR_MODE_STORAGE_KEY = "app-color-mode";

const resolveColorScheme = (schemeId: AppColorSchemeId = DEFAULT_SCHEME_ID) =>
  APP_COLOR_SCHEMES.find((scheme) => scheme.id === schemeId) ??
  APP_COLOR_SCHEMES.find((scheme) => scheme.id === DEFAULT_SCHEME_ID)!;

export const createLightColors = (
  schemeId: AppColorSchemeId = DEFAULT_SCHEME_ID,
) => resolveColorScheme(schemeId).tokens.light;

export const createDarkColors = (
  schemeId: AppColorSchemeId = DEFAULT_SCHEME_ID,
) => resolveColorScheme(schemeId).tokens.dark;

export const getStoredAppColorScheme = (): AppColorSchemeId => {
  try {
    const storedValues = getStoredValues([COLOR_SCHEME_STORAGE_KEY]);
    const schemeId = storedValues[COLOR_SCHEME_STORAGE_KEY];
    if (schemeId && APP_COLOR_SCHEMES.some((s) => s.id === schemeId)) {
      return schemeId as AppColorSchemeId;
    }
  } catch {}
  return DEFAULT_SCHEME_ID;
};

const initialScheme = getStoredAppColorScheme();

export const Colors = createLightColors(initialScheme);
export const DarkColors = createDarkColors(initialScheme);

export const applyAppColorScheme = (
  schemeId: AppColorSchemeId = DEFAULT_SCHEME_ID,
) => {
  const lightColors = createLightColors(schemeId);
  const darkColors = createDarkColors(schemeId);

  UnistylesRuntime.updateTheme("light", (theme) => ({
    ...theme,
    colors: lightColors,
    isDark: false,
  }));
  UnistylesRuntime.updateTheme("dark", (theme) => ({
    ...theme,
    colors: darkColors,
    isDark: true,
  }));

  UnistylesRuntime.setRootViewBackgroundColor(
    UnistylesRuntime.themeName === "light"
      ? lightColors.background
      : darkColors.background,
  );
};

export const saveAppColorScheme = (schemeId: AppColorSchemeId) => {
  try {
    saveSecurely([{ key: COLOR_SCHEME_STORAGE_KEY, value: schemeId }]);
  } catch {}
};

// ═══════════════════════════════════════════════════════════
//  PRIMITIVE TOKENS
// ═══════════════════════════════════════════════════════════

// ── SPACING ────────────────────────────────────────────────
// 5-anchored rhythm. Prefer the named scale over raw numbers.
//   xxs 2.5   — hairline gaps inside chips / segmented controls
//   xs  5     — tight stack (icon + label)
//   sm  7.5   — list item internal padding
//   md  10    — default gap between related items
//   lg  15    — section internal padding, screen H padding
//   xl  20    — gap between sections
//   xxl 25    — large section gap
//   ...
export const SPACE = {
  none: 0,
  xxs: BASE_GAP * 0.5, //  2.5
  xs: BASE_GAP * 1, //  5
  sm: BASE_GAP * 1.5, //  7.5
  md: BASE_GAP * 2, // 10
  lg: BASE_GAP * 3, // 15
  xl: BASE_GAP * 4, // 20
  xxl: BASE_GAP * 5, // 25
  xxxl: BASE_GAP * 6, // 30
  huge: BASE_GAP * 8, // 40
  giant: BASE_GAP * 10, // 50
} as const;

// ── RADII ──────────────────────────────────────────────────
export const RADII = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

// ── BORDER WIDTH ───────────────────────────────────────────
export const BORDER = {
  none: 0,
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  thick: 2,
  heavy: 3,
} as const;

// ── OPACITY ────────────────────────────────────────────────
export const OPACITY = {
  disabled: 0.4,
  pressed: 0.7,
  muted: 0.6,
  faint: 0.15,
  overlay: 0.5,
  full: 1,
} as const;

// ── DURATION (ms) ──────────────────────────────────────────
export const DURATION = {
  instant: 80,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;

// ── ICON SIZES ─────────────────────────────────────────────
export const ICON = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ── TYPOGRAPHY ─────────────────────────────────────────────
// Body text follows iOS HIG (17/22 @ -0.2). Display levels
// step up in weight, size, and negative tracking.
//
// If you later want an editorial feel (NYT Cooking / Pestle),
// swap only the `fontFamily` on display…h3 with a serif
// (Fraunces, Lora, Playfair Display). Body stays system sans.
const SYSTEM = undefined as string | undefined; // SF Pro (iOS) / Roboto (Android)

export const TYPE = {
  display: {
    fontFamily: SYSTEM,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.4,
    fontWeight: "700",
  },
  h1: {
    fontFamily: SYSTEM,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    fontWeight: "700",
  },
  h2: {
    fontFamily: SYSTEM,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontWeight: "600",
  },
  h3: {
    fontFamily: SYSTEM,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.2,
    fontWeight: "600",
  },
  title: {
    fontFamily: SYSTEM,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontWeight: "600",
  },
  body: {
    fontFamily: SYSTEM,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontWeight: "400",
  },
  bodyBold: {
    fontFamily: SYSTEM,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontWeight: "600",
  },
  callout: {
    fontFamily: SYSTEM,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    fontWeight: "400",
  },
  subhead: {
    fontFamily: SYSTEM,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontWeight: "400",
  },
  subheadBold: {
    fontFamily: SYSTEM,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontWeight: "600",
  },
  footnote: {
    fontFamily: SYSTEM,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    fontWeight: "400",
  },
  caption: {
    fontFamily: SYSTEM,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: "400",
  },
  micro: {
    fontFamily: SYSTEM,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.6,
    fontWeight: "600",
  },
  // ── Cooking-mode specific ────────────────────────────────
  cookingStep: {
    fontFamily: SYSTEM,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
    fontWeight: "500",
  },
  cookingTimer: {
    fontFamily: SYSTEM,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.5,
    fontWeight: "200",
  },
} as const;

// ── ELEVATION ──────────────────────────────────────────────
// Cross-platform: iOS reads shadow*, Android reads elevation
// (RN 0.71+ maps shadow* → elevation on Android automatically).
// In dark mode, lean on `surface` lightness; shadows are soft.
export const ELEVATION = {
  none: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// ── LAYOUT ─────────────────────────────────────────────────
export const LAYOUT = {
  screenPaddingH: SPACE.lg, // 15
  screenPaddingV: SPACE.md, // 10
  cardPadding: SPACE.md, // 10
  sectionGap: SPACE.xl, // 20
  listGap: SPACE.md, // 10
  contentMaxWidth: 640, // matches the width screens have shipped with
  hitSlop: SPACE.sm, // 7.5
  minTouchTarget: 44, // iOS HIG
} as const;

// ═══════════════════════════════════════════════════════════
//  THEME OBJECTS
// ═══════════════════════════════════════════════════════════
const commonTokens = {
  gap: (v: number) => v * BASE_GAP,
  paddingHorizontal: LAYOUT.screenPaddingH,

  spacing: {
    ...SPACE,
  },
  radii: {
    ...RADII,
  },
  borderWidth: BORDER,
  opacity: OPACITY,
  duration: DURATION,
  iconSize: ICON,
  typography: TYPE,
  elevation: ELEVATION,
  layout: LAYOUT,
} as const;

const lightTheme = { isDark: false, colors: Colors, ...commonTokens } as const;
const darkTheme = {
  isDark: true,
  colors: DarkColors,
  ...commonTokens,
} as const;

const appThemes = {
  light: lightTheme,
  dark: darkTheme,
};

const breakpoints = {
  phone: 0,
  largePhone: 400,
  tablet: 768,
} as const;

type AppThemes = typeof appThemes;
type AppBreakpoints = typeof breakpoints;

declare module "react-native-unistyles" {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  settings: {
    adaptiveThemes: true,
    nativeBreakpointsMode: "pixels",
    CSSVars: true,
  },
  themes: appThemes,
  breakpoints,
});

// ═══════════════════════════════════════════════════════════
//  PUBLIC TYPES
// ═══════════════════════════════════════════════════════════
export type AppTheme = typeof lightTheme;
export type AppColorTokens = typeof Colors;
export type AppTypographyToken = keyof typeof TYPE;
export type AppSpaceToken = keyof typeof SPACE;
export type AppRadiusToken = keyof typeof RADII;
export type AppElevationToken = keyof typeof ELEVATION;
