// ─────────────────────────────────────────────────────────────
// hooks/use-theme-preference.tsx
// ─────────────────────────────────────────────────────────────
import { ThemePrefValue } from "@/types";
import { createContext, useContext } from "react";

export const ThemePrefContext = createContext<ThemePrefValue | null>(null);

export function useThemePreference(): ThemePrefValue {
  const ctx = useContext(ThemePrefContext);
  if (!ctx) {
    throw new Error(
      "useThemePreference must be used inside <ThemePreferenceProvider>",
    );
  }
  return ctx;
}
