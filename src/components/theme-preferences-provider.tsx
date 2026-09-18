import {
  APP_COLOR_SCHEMES,
  DEFAULT_SCHEME_ID,
  type AppColorSchemeId,
} from "@/theme/color-schemes";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { UnistylesRuntime, useUnistyles } from "react-native-unistyles";

import { ThemePrefContext } from "@/hooks/use-theme-preference";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { ThemeMode } from "@/types";
import { createDarkColors, createLightColors } from "../../unistyles";

const KEY_SCHEME = "theme.scheme";
const KEY_MODE = "theme.mode";

/**
 * Applies the scheme colors + mode to Unistyles globally.
 * Pure side-effect — no React state involved.
 */
function applyTheme(schemeId: AppColorSchemeId, mode: ThemeMode) {
  const light = createLightColors(schemeId);
  const dark = createDarkColors(schemeId);

  UnistylesRuntime.updateTheme("light", (theme) => ({
    ...theme,
    colors: light,
    isDark: false,
  }));
  UnistylesRuntime.updateTheme("dark", (theme) => ({
    ...theme,
    colors: dark,
    isDark: true,
  }));

  if (mode === "system") {
    UnistylesRuntime.setAdaptiveThemes(true);
  } else {
    UnistylesRuntime.setAdaptiveThemes(false);
    UnistylesRuntime.setTheme(mode);
  }

  UnistylesRuntime.setRootViewBackgroundColor(
    UnistylesRuntime.themeName === "light" ? light.background : dark.background,
  );
}

/** Minimal splash using the currently-configured theme (Saffron default). */
function ThemeSplash() {
  const { theme } = useUnistyles();
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [schemeId, setSchemeId] = useState<AppColorSchemeId>(DEFAULT_SCHEME_ID);
  const [mode, setMode] = useState<ThemeMode>("system");
  const [hydrated, setHydrated] = useState(false);

  // ── Hydrate from SQLite on mount ────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [storedScheme, storedMode] = await Promise.all([
          PreferencesRepo.get(db, KEY_SCHEME),
          PreferencesRepo.get(db, KEY_MODE),
        ]);

        const sid: AppColorSchemeId =
          (storedScheme &&
            APP_COLOR_SCHEMES.some((s) => s.id === storedScheme) &&
            (storedScheme as AppColorSchemeId)) ||
          DEFAULT_SCHEME_ID;

        const m: ThemeMode =
          storedMode === "light" ||
          storedMode === "dark" ||
          storedMode === "system"
            ? storedMode
            : "system";

        setSchemeId(sid);
        setMode(m);
        applyTheme(sid, m);
      } catch (err) {
        console.warn("[theme] hydration failed:", err);
      } finally {
        setHydrated(true);
      }
    })();
  }, [db]);

  const selectScheme = useCallback(
    async (sid: AppColorSchemeId) => {
      setSchemeId(sid);
      applyTheme(sid, mode);
      try {
        await PreferencesRepo.set(db, KEY_SCHEME, sid);
      } catch (err) {
        console.warn("[theme] persist scheme failed:", err);
      }
    },
    [db, mode],
  );

  const selectMode = useCallback(
    async (m: ThemeMode) => {
      setMode(m);
      applyTheme(schemeId, m);
      try {
        await PreferencesRepo.set(db, KEY_MODE, m);
      } catch (err) {
        console.warn("[theme] persist mode failed:", err);
      }
    },
    [db, schemeId],
  );

  // ── Gate rendering until hydrated ───────────────────────
  if (!hydrated) {
    return <ThemeSplash />;
  }

  return (
    <ThemePrefContext.Provider
      value={{ schemeId, mode, hydrated, selectScheme, selectMode }}
    >
      {children}
    </ThemePrefContext.Provider>
  );
}
