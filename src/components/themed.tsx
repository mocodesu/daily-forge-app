import { Ionicons } from "@expo/vector-icons";
import { withUnistyles } from "react-native-unistyles";

/**
 * These wrappers exist for the narrow set of components that take colour
 * as a *prop* rather than through a `style` object. Wrapping them with
 * `withUnistyles` is the documented approach — only this leaf re-renders
 * when the theme changes, not the entire screen tree.
 *
 * For anything that accepts a `style` prop (View, Text, Pressable, etc.),
 * use StyleSheet.create((theme, rt) => ...) directly. It's faster and
 * doesn't require a wrapper.
 */

/** Ionicons with the primary accent colour. */
export const PrimaryIcon = withUnistyles(Ionicons, (theme) => ({
  color: theme.colors.primary,
}));

/** Ionicons with the muted text colour. */
export const MutedIcon = withUnistyles(Ionicons, (theme) => ({
  color: theme.colors.mutedText,
}));

/** Ionicons with the on-surface colour (default body text). */
export const SurfaceIcon = withUnistyles(Ionicons, (theme) => ({
  color: theme.colors.onSurface,
}));

/** Ionicons with the on-primary colour (for use inside filled buttons). */
export const OnPrimaryIcon = withUnistyles(Ionicons, (theme) => ({
  color: theme.colors.onPrimary,
}));
