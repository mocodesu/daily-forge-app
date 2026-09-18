// ─────────────────────────────────────────────────────────────
// components/themed-system-bars.tsx
// ─────────────────────────────────────────────────────────────
import { SystemBars } from "react-native-edge-to-edge";
import { useUnistyles } from "react-native-unistyles";

/**
 * Status + navigation bar colors, driven by the active Unistyles theme.
 *
 * Lives as its own component so it re-renders whenever `rt.themeName`
 * changes. The root layout cannot reliably re-render on theme changes
 * because it is the component that initializes the themes.
 *
 * react-native-edge-to-edge semantics:
 *   style="light" → WHITE icons  → for DARK backgrounds
 *   style="dark"  → DARK icons   → for LIGHT backgrounds
 */
export default function ThemedSystemBars() {
  const { rt } = useUnistyles();
  const style = rt.themeName === "dark" ? "light" : "dark";
  return <SystemBars style={style} />;
}
