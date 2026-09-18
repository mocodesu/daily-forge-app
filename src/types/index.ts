import { AppColorSchemeId } from "@/theme/color-schemes";

export type ThemeMode = "system" | "light" | "dark";
export interface ThemePrefValue {
  schemeId: AppColorSchemeId;
  mode: ThemeMode;
  hydrated: boolean;
  selectScheme: (id: AppColorSchemeId) => Promise<void>;
  selectMode: (mode: ThemeMode) => Promise<void>;
}
