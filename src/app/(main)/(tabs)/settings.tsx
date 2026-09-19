import { ScrollScreen } from "@/components/screen";
import { SwearPhraseEditor } from "@/components/swear-phrase-editor";
import Text from "@/components/text";
import { MutedIcon, PrimaryIcon } from "@/components/themed";
import { UnitSystemPicker } from "@/components/unit-system-picker";
import { TARGET_DAYS_OPTIONS } from "@/constants/dailyforge";
import { useTargetDays } from "@/hooks/use-target-days";
import { useThemePreference } from "@/hooks/use-theme-preference";
import {
  APP_COLOR_SCHEMES,
  type AppColorSchemeId,
} from "@/theme/color-schemes";
import { ThemeMode } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { router } from "expo-router";
import React, { useState } from "react";
import { Linking, Pressable, TextInput, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

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
  const { schemeId, mode, selectScheme, selectMode } = useThemePreference();
  const { targetDays, setTargetDays } = useTargetDays();

  const [customText, setCustomText] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const appVersion = Application.nativeApplicationVersion ?? "—";
  const buildVersion = Application.nativeBuildVersion ?? "—";

  const handleCustomSave = () => {
    const parsed = parseInt(customText, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      setTargetDays(parsed);
      setCustomText("");
      setShowCustom(false);
    }
  };

  return (
    <ScrollScreen>
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
                    style={selected ? styles.iconPrimary : styles.iconSurface}
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

      <View style={styles.card}>
        <Text variant="title" color="onSurface">
          Streak Target
        </Text>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text variant="subheadBold" color="onSurface">
              Goal
            </Text>
            <Text variant="caption" color="mutedText">
              How many consecutive days do you want to commit to?
            </Text>
          </View>

          <View style={styles.pillRow}>
            {TARGET_DAYS_OPTIONS.map((n) => {
              const selected = targetDays === n && !showCustom;
              return (
                <Pressable
                  key={n}
                  onPress={() => {
                    setShowCustom(false);
                    setTargetDays(n);
                  }}
                  style={[
                    styles.pill,
                    selected ? styles.pillSelected : styles.pillIdle,
                  ]}
                >
                  <Text
                    variant="subheadBold"
                    color={selected ? "onPrimary" : "onSurface"}
                  >
                    {n}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setShowCustom((v) => !v)}
              style={[
                styles.pill,
                showCustom ? styles.pillSelected : styles.pillIdle,
              ]}
            >
              <Text
                variant="subheadBold"
                color={showCustom ? "onPrimary" : "onSurface"}
              >
                Custom
              </Text>
            </Pressable>
          </View>

          {showCustom && (
            <View style={styles.customRow}>
              <TextInput
                value={customText}
                onChangeText={(v) => setCustomText(v.replace(/[^0-9]/g, ""))}
                placeholder={String(targetDays)}
                placeholderTextColor={
                  UnistylesRuntime.getTheme().colors.mutedText
                }
                keyboardType="number-pad"
                style={styles.customInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCustomSave}
              />
              <Pressable
                onPress={handleCustomSave}
                disabled={!customText}
                style={[
                  styles.customSave,
                  customText
                    ? styles.customSaveEnabled
                    : styles.customSaveDisabled,
                ]}
              >
                <Text
                  variant="subheadBold"
                  color={customText ? "onPrimary" : "mutedText"}
                >
                  Save
                </Text>
              </Pressable>
            </View>
          )}

          <Text variant="caption" color="mutedText">
            Current target: {targetDays} days
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text variant="title" color="onSurface">
          Units
        </Text>
        <UnitSystemPicker />
      </View>

      <View style={styles.card}>
        <Text variant="title" color="onSurface">
          Swear
        </Text>
        <SwearPhraseEditor />
      </View>

      <View style={styles.card}>
        <Text variant="title" color="onSurface">
          Data
        </Text>

        <Pressable
          onPress={() => router.push("/(main)/data-management")}
          style={({ pressed }) => [styles.dataRow, pressed && styles.pressed]}
        >
          <View style={styles.dataRowIcon}>
            <PrimaryIcon name="server-outline" size={20} />
          </View>
          <View style={styles.dataRowBody}>
            <Text variant="subheadBold" color="onSurface">
              Manage Data
            </Text>
            <Text variant="caption" color="mutedText">
              Export, import, or wipe everything
            </Text>
          </View>
          <MutedIcon name="chevron-forward" size={18} />
        </Pressable>
      </View>

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
          <PrimaryIcon name="chevron-forward" size={16} />
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL("https://example.com/terms")}
          hitSlop={8}
          style={({ pressed }) => [styles.aboutLink, pressed && styles.pressed]}
        >
          <Text variant="subhead" color="primary">
            Terms of service
          </Text>
          <PrimaryIcon name="chevron-forward" size={16} />
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

  themeRow: { flexDirection: "row", gap: theme.spacing.sm },
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

  iconPrimary: { color: theme.colors.primary },
  iconSurface: { color: theme.colors.onSurface },

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

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    borderWidth: theme.borderWidth.thin,
    minHeight: 40,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillIdle: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
  },
  customRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  customInput: {
    flex: 1,
    borderRadius: theme.radii.sm,
    borderWidth: theme.borderWidth.thin,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 17,
    minHeight: 44,
    textAlign: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
    color: theme.colors.onSurface,
  },
  customSave: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  customSaveEnabled: { backgroundColor: theme.colors.primary },
  customSaveDisabled: { backgroundColor: theme.colors.panelBorder },

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
    backgroundColor: theme.colors.panel,
  },
  dataRowBody: { flex: 1, gap: 2, minWidth: 0 },

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
