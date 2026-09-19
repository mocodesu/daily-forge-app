import {
  APP_COLOR_SCHEMES,
  DEFAULT_SCHEME_ID,
  type AppColorSchemeId,
} from "@/theme/color-schemes";
import {
  COLOR_MODE_STORAGE_KEY,
  COLOR_SCHEME_STORAGE_KEY,
  createDarkColors,
  createLightColors,
} from "../../unistyles";

import { ThemePrefContext } from "@/hooks/use-theme-preference";
import { getStoredValues, saveSecurely } from "@/store/storage";
import { ThemeMode } from "@/types";
import React, {
  useCallback,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { UnistylesRuntime } from "react-native-unistyles";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function readStoredScheme(): AppColorSchemeId {
  try {
    const { [COLOR_SCHEME_STORAGE_KEY]: raw } = getStoredValues([
      COLOR_SCHEME_STORAGE_KEY,
    ]);
    if (raw && APP_COLOR_SCHEMES.some((s) => s.id === raw)) {
      return raw as AppColorSchemeId;
    }
  } catch {
    // Non-fatal — fall through to default.
  }
  return DEFAULT_SCHEME_ID;
}

function readStoredMode(): ThemeMode {
  try {
    const { [COLOR_MODE_STORAGE_KEY]: raw } = getStoredValues([
      COLOR_MODE_STORAGE_KEY,
    ]);
    if (isThemeMode(raw)) return raw;
  } catch {
    // Non-fatal — fall through to default.
  }
  return "system";
}

/**
 * Applies the scheme colors + mode to Unistyles globally. Pure
 * side-effect — no React state involved.
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

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  // MMKV is synchronous — read state directly in the initializer.
  // This is what removes the cold-start flash: the very first render
  // already knows the correct scheme and mode.
  const [schemeId, setSchemeId] = useState<AppColorSchemeId>(readStoredScheme);
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);

  // Apply on first render, before children paint.
  // useLayoutEffect fires synchronously after commit but before paint,
  // so no frame is ever shown with the wrong theme.
  useLayoutEffect(() => {
    applyTheme(schemeId, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectScheme = useCallback(
    async (sid: AppColorSchemeId) => {
      setSchemeId(sid);
      applyTheme(sid, mode);
      try {
        saveSecurely([{ key: COLOR_SCHEME_STORAGE_KEY, value: sid }]);
      } catch (err) {
        console.warn("[theme] persist scheme failed:", err);
      }
    },
    [mode],
  );

  const selectMode = useCallback(
    async (m: ThemeMode) => {
      setMode(m);
      applyTheme(schemeId, m);
      try {
        saveSecurely([{ key: COLOR_MODE_STORAGE_KEY, value: m }]);
      } catch (err) {
        console.warn("[theme] persist mode failed:", err);
      }
    },
    [schemeId],
  );

  return (
    <ThemePrefContext.Provider
      value={{ schemeId, mode, hydrated: true, selectScheme, selectMode }}
    >
      {children}
    </ThemePrefContext.Provider>
  );
}
