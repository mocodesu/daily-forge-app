import { ScrollScreen } from "@/components/screen";
import { SwearPhraseEditor } from "@/components/swear-phrase-editor";
import Text from "@/components/text";
import { UnitSystemPicker } from "@/components/unit-system-picker";
import { useThemePreference } from "@/hooks/use-theme-preference";
import {
  APP_COLOR_SCHEMES,
  type AppColorSchemeId,
} from "@/theme/color-schemes";
import { ThemeMode } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { router } from "expo-router";
import React from "react";
import { Linking, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const THEME_MODES: {
  key: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "system", label: "System", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon" },
];

export default function SettingsScreen() {
  const { theme } = useUnistyles();

  const { schemeId, mode, selectScheme, selectMode } = useThemePreference();

  const appVersion = Application.nativeApplicationVersion ?? "—";
  const buildVersion = Application.nativeBuildVersion ?? "—";

  return (
    <ScrollScreen>
      <Text variant="h2" color="onBackground">
        Settings
      </Text>

      {/* ── Appearance ────────────────────────────────── */}
      <View style={styles.card}>
        <Text variant="title" color="onSurface">
          Appearance
        </Text>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text variant="subheadBold" color="onSurface">
              App Color
            </Text>
            <Text variant="caption" color="mutedText">
              Choose your accent color scheme
            </Text>
          </View>

          <View style={styles.accentSwatchRow}>
            {APP_COLOR_SCHEMES.map((scheme) => {
              const selected = scheme.id === schemeId;
              return (
                <Pressable
                  key={scheme.id}
                  style={styles.accentSwatchWrapper}
                  onPress={() => selectScheme(scheme.id as AppColorSchemeId)}
                  accessibilityRole="button"
                  accessibilityLabel={scheme.label}
                  accessibilityState={{ selected }}
                  hitSlop={6}
                >
                  <View
                    style={[
                      styles.accentSwatch,
                      { backgroundColor: scheme.tokens.light.primary },
                      selected && styles.accentSwatchSelected,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text variant="subheadBold" color="onSurface">
              Theme Mode
            </Text>
            <Text variant="caption" color="mutedText">
              Choose how the app looks
            </Text>
          </View>

          <View style={styles.themeRow}>
            {THEME_MODES.map((m) => {
              const selected = mode === m.key;
              return (
                <Pressable
                  key={m.key}
                  style={[
                    styles.themeOption,
                    selected && styles.themeOptionSelected,
                  ]}
                  onPress={() => selectMode(m.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Ionicons
                    name={m.icon}
                    size={22}
                    color={
                      selected ? theme.colors.primary : theme.colors.onSurface
                    }
                  />
                  <Text
                    variant="subhead"
                    color={selected ? "primary" : "onSurface"}
                  >
                    {m.label}
                  </Text>
                  <View
                    style={[
                      styles.themeRadioDot,
                      selected && styles.themeRadioDotSelected,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── Units ─────────────────────────────────────── */}
      <View style={styles.card}>
        <Text variant="title" color="onSurface">
          Units
        </Text>
        <UnitSystemPicker />
      </View>

      {/* ── Swear ─────────────────────────────────────── */}
      <View style={styles.card}>
        <Text variant="title" color="onSurface">
          Swear
        </Text>
        <SwearPhraseEditor />
      </View>

      {/* ── Data ──────────────────────────────────────── */}
      <View style={styles.card}>
        <Text variant="title" color="onSurface">
          Data
        </Text>

        <Pressable
          onPress={() => router.push("/(main)/data-management")}
          style={({ pressed }) => [styles.dataRow, pressed && styles.pressed]}
        >
          <View
            style={[
              styles.dataRowIcon,
              { backgroundColor: theme.colors.panel },
            ]}
          >
            <Ionicons
              name="server-outline"
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subheadBold" color="onSurface">
              Manage Data
            </Text>
            <Text variant="caption" color="mutedText">
              Export, import, or wipe everything
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.mutedText}
          />
        </Pressable>
      </View>

      {/* ── About ─────────────────────────────────────── */}
      <View style={styles.card}>
        <Text variant="title" color="onSurface">
          About
        </Text>

        <View style={styles.aboutRow}>
          <Text variant="subhead" color="mutedText">
            Version
          </Text>
          <Text variant="subheadBold" color="onSurface">
            {appVersion}
          </Text>
        </View>

        <View style={styles.aboutRow}>
          <Text variant="subhead" color="mutedText">
            Build
          </Text>
          <Text variant="subheadBold" color="onSurface">
            {buildVersion}
          </Text>
        </View>

        <View style={styles.aboutRow}>
          <Text variant="subhead" color="mutedText">
            Made with ❤️ by
          </Text>
          <Text variant="subheadBold" color="onSurface">
            Mocodesu
          </Text>
        </View>

        <Pressable
          onPress={() => Linking.openURL("https://example.com/privacy")}
          hitSlop={8}
          style={({ pressed }) => [styles.aboutLink, pressed && styles.pressed]}
        >
          <Text variant="subhead" color="primary">
            Privacy policy
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.primary}
          />
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL("https://example.com/terms")}
          hitSlop={8}
          style={({ pressed }) => [styles.aboutLink, pressed && styles.pressed]}
        >
          <Text variant="subhead" color="primary">
            Terms of service
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.primary}
          />
        </Pressable>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    gap: theme.spacing.md,
  },
  pressed: { opacity: theme.opacity.pressed },

  sectionBlock: { gap: theme.spacing.sm },
  sectionHeader: { gap: theme.spacing.xxs },
  divider: { height: 1, backgroundColor: theme.colors.panelBorder },

  themeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  themeOption: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.panelBorder,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
    minHeight: 68,
  },
  themeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.panel,
  },
  themeRadioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.panelBorder,
    marginTop: 2,
  },
  themeRadioDotSelected: { backgroundColor: theme.colors.primary },

  accentSwatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  accentSwatchWrapper: { alignItems: "center" },
  accentSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  accentSwatchSelected: { borderColor: theme.colors.onSurface },

  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    minHeight: 44,
  },
  dataRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 28,
  },
  aboutLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
}));
