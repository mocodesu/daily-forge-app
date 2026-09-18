// ─────────────────────────────────────────────────────────────
// components/Text.tsx — Unistyles v3, no legacy
// ─────────────────────────────────────────────────────────────
import React, { FC } from "react";
import { Text as RNText, TextProps, TextStyle } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { AppTheme } from "../../unistyles";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

/** Every typography token in the theme is a valid variant. */
type Variant = keyof AppTheme["typography"];

/** Every color token in the theme, plus static one-offs. */
type ThemeColorKey = keyof AppTheme["colors"];
type StaticColor = "white" | "black" | "muted" | "disabled";
type ColorVariant = ThemeColorKey | StaticColor;

interface CustomTextProps extends TextProps {
  variant?: Variant;
  /** Explicit font family (e.g. "Inter-Bold"). Wins over weight props. */
  fontFamily?: string;
  /** Weight overrides — respect system fonts too. */
  bold?: boolean;
  semibold?: boolean;
  medium?: boolean;
  light?: boolean;
  /** Hard overrides — win over the variant token. */
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: TextStyle["textAlign"];
  textTransform?: TextStyle["textTransform"];
  /** Any theme color token, or 'white' | 'black' | 'muted' | 'disabled'. */
  color?: ColorVariant;
  opacity?: number;
  underline?: boolean;
  strikethrough?: boolean;
  italic?: boolean;
  truncate?: boolean;
  maxLines?: number;
}

// ─────────────────────────────────────────────────────────────
// FONT FAMILIES
// Fill in PostScript names when you add custom fonts.
// Leave `undefined` to use the system font + fontWeight.
// ─────────────────────────────────────────────────────────────
const FONT_FAMILIES: Record<string, string | undefined> = {
  light: undefined,
  regular: undefined,
  medium: undefined,
  semibold: undefined,
  bold: undefined,
};

const SYSTEM_WEIGHT: Record<string, TextStyle["fontWeight"]> = {
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

const STATIC_COLOR_MAP: Partial<Record<StaticColor, string>> = {
  white: "#FFFFFF",
  black: "#000000",
};

const DEFAULT_VARIANT: Variant = "body";
const DEFAULT_COLOR: ColorVariant = "onBackground";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const resolveWeightKey = (
  bold?: boolean,
  semibold?: boolean,
  medium?: boolean,
  light?: boolean,
): keyof typeof FONT_FAMILIES | null => {
  if (bold) return "bold";
  if (semibold) return "semibold";
  if (medium) return "medium";
  if (light) return "light";
  return null;
};

// ─────────────────────────────────────────────────────────────
// STYLES — v3: module scope, dynamic functions, bound to theme.
// The Babel plugin parses this at build time and drives updates
// through the ShadowTree — no re-renders, no useUnistyles.
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  base: {},

  /** Bound typography style for any theme token. */
  typography: (variant: Variant) => theme.typography[variant],

  /** Bound color style for any theme color token. */
  themeColor: (key: ThemeColorKey) => ({
    color: theme.colors[key] ?? theme.colors.onBackground,
  }),

  /** Predefined color + opacity states. */
  muted: {
    color: theme.colors.mutedText,
    opacity: theme.opacity.muted,
  },
  disabled: {
    color: theme.colors.mutedText,
    opacity: theme.opacity.disabled,
  },
}));

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

const Text: FC<CustomTextProps> = ({
  variant = DEFAULT_VARIANT,
  fontFamily,
  bold,
  semibold,
  medium,
  light,
  fontSize,
  lineHeight,
  letterSpacing,
  textAlign = "left",
  textTransform = "none",
  color = DEFAULT_COLOR,
  opacity = 1,
  underline,
  strikethrough,
  italic,
  truncate,
  maxLines,
  style,
  children,
  ...props
}) => {
  // ── Font resolution ─────────────────────────────────────
  const weightKey = resolveWeightKey(bold, semibold, medium, light);
  let resolvedFamily: string | undefined;
  let resolvedWeight: TextStyle["fontWeight"] | undefined;

  if (fontFamily) {
    resolvedFamily = fontFamily;
  } else if (weightKey) {
    const custom = FONT_FAMILIES[weightKey];
    if (custom) resolvedFamily = custom;
    else resolvedWeight = SYSTEM_WEIGHT[weightKey];
  }

  // ── Color classification ────────────────────────────────
  const isStatic = color === "white" || color === "black";
  const staticColor = isStatic
    ? STATIC_COLOR_MAP[color as StaticColor]
    : undefined;

  const isMuted = color === "muted";
  const isDisabled = color === "disabled";
  const isThemed = !isStatic && !isMuted && !isDisabled;

  // ── Decoration ──────────────────────────────────────────
  let textDecorationLine: TextStyle["textDecorationLine"] = "none";
  if (underline && strikethrough) textDecorationLine = "underline line-through";
  else if (underline) textDecorationLine = "underline";
  else if (strikethrough) textDecorationLine = "line-through";

  // ── Per-instance override style ─────────────────────────
  const overrideStyle: TextStyle = {
    ...(fontSize !== undefined && { fontSize }),
    ...(lineHeight !== undefined && { lineHeight }),
    ...(letterSpacing !== undefined && { letterSpacing }),
    ...(resolvedFamily && { fontFamily: resolvedFamily }),
    ...(resolvedWeight && { fontWeight: resolvedWeight }),
    ...(staticColor && { color: staticColor }),
    // Opacity: honored for themed/static colors; multiplied for muted/disabled
    ...(isThemed || isStatic ? { opacity } : {}),
    ...(isMuted ? { opacity: opacity * 0.6 } : {}),
    ...(isDisabled ? { opacity: opacity * 0.4 } : {}),
    textAlign,
    textTransform,
    fontStyle: italic ? "italic" : "normal",
    textDecorationLine,
  };

  // ── Truncation ──────────────────────────────────────────
  const truncationProps = truncate
    ? { numberOfLines: 1, ellipsizeMode: "tail" as const }
    : maxLines !== undefined
      ? { numberOfLines: maxLines }
      : {};

  // ── Style array (v3: never spread — always array) ───────
  const composedStyle = [
    styles.base,
    styles.typography(variant),
    isThemed ? styles.themeColor(color as ThemeColorKey) : undefined,
    isMuted ? styles.muted : undefined,
    isDisabled ? styles.disabled : undefined,
    overrideStyle,
    style,
  ];

  return (
    <RNText style={composedStyle} {...truncationProps} {...props}>
      {children}
    </RNText>
  );
};

export default Text;
export type { ColorVariant, CustomTextProps, ThemeColorKey, Variant };
