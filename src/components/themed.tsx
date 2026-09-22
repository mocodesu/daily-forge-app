import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Switch, TextInput } from "react-native";
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

/** ActivityIndicator tinted with the primary accent colour. */
export const ThemedActivityIndicator = withUnistyles(
  ActivityIndicator,
  (theme) => ({ color: theme.colors.primary }),
);

/** ActivityIndicator tinted with the muted text colour. */
export const MutedActivityIndicator = withUnistyles(
  ActivityIndicator,
  (theme) => ({ color: theme.colors.mutedText }),
);

/**
 * TextInput with a themed placeholder colour.
 *
 * Everything else — value, onChangeText, keyboard type, style — is
 * still owned by the caller and passed through as normal props. Only
 * `placeholderTextColor` needs the shadow-tree path here.
 */
export const ThemedTextInput = withUnistyles(TextInput, (theme) => ({
  placeholderTextColor: theme.colors.mutedText,
}));

/**
 * Switch with themed track and thumb colours. Used anywhere the app
 * exposes a boolean preference toggle.
 */
export const ThemedSwitch = withUnistyles(Switch, (theme) => ({
  trackColor: {
    false: theme.colors.panelBorder,
    true: theme.colors.primary,
  },
  thumbColor: theme.colors.surface,
}));
