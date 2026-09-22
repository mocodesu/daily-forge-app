import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { MutedIcon, PrimaryIcon, ThemedSwitch } from "@/components/themed";
import { useDailyReminder } from "@/hooks/use-daily-reminder";
import React from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/** Presets the user can tap to jump to a common time. */
const TIME_PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: "6:00 AM", hour: 6, minute: 0 },
  { label: "7:00 AM", hour: 7, minute: 0 },
  { label: "8:00 AM", hour: 8, minute: 0 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "6:00 PM", hour: 18, minute: 0 },
  { label: "7:00 PM", hour: 19, minute: 0 },
  { label: "8:00 PM", hour: 20, minute: 0 },
  { label: "9:00 PM", hour: 21, minute: 0 },
];

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  const m = minute.toString().padStart(2, "0");
  return `${h12}:${m} ${suffix}`;
}

export function DailyReminderEditor() {
  const {
    settings,
    permissionGranted,
    loading,
    lastError,
    setEnabled,
    setTime,
    requestPermission,
  } = useDailyReminder();

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <Text variant="caption" color="mutedText">
          Loading…
        </Text>
      </View>
    );
  }

  const isSameTime = (h: number, m: number) =>
    settings.hour === h && settings.minute === m;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="subheadBold" color="onSurface">
          Daily reminder
        </Text>
        <Text variant="caption" color="mutedText">
          Get a nudge at a time you choose, so you never miss a day.
        </Text>
      </View>

      {/* ── Enable toggle ──────────────────────────────── */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <Text variant="subheadBold" color="onSurface">
            Remind me every day
          </Text>
          <Text variant="caption" color="mutedText">
            {settings.enabled
              ? `At ${formatTime(settings.hour, settings.minute)}`
              : "Off"}
          </Text>
        </View>
        <ThemedSwitch value={settings.enabled} onValueChange={setEnabled} />
      </View>

      {/* ── Time presets ───────────────────────────────── */}
      {settings.enabled && (
        <View style={styles.pillRow}>
          {TIME_PRESETS.map((preset) => {
            const selected = isSameTime(preset.hour, preset.minute);
            return (
              <Pressable
                key={preset.label}
                onPress={() => setTime(preset.hour, preset.minute)}
                style={[
                  styles.pill,
                  selected ? styles.pillSelected : styles.pillIdle,
                ]}
              >
                <Text
                  variant="caption"
                  color={selected ? "onPrimary" : "onSurface"}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── Permission banner ──────────────────────────── */}
      {settings.enabled && !permissionGranted && (
        <View style={styles.permissionBanner}>
          <PrimaryIcon name="notifications-off-outline" size={18} />
          <View style={styles.permissionBody}>
            <Text variant="caption" color="onSurface">
              Notifications are disabled. Enable them to receive your reminder.
            </Text>
            <View style={styles.permissionActions}>
              <HapticPressable
                haptic="medium"
                onPress={async () => {
                  const granted = await requestPermission();
                  if (!granted) {
                    Linking.openSettings();
                  }
                }}
                style={styles.permissionButton}
              >
                <Text variant="caption" color="onPrimary">
                  Enable
                </Text>
              </HapticPressable>
              <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
                <Text variant="caption" color="primary">
                  Open Settings
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ── Error row ──────────────────────────────────── */}
      {lastError && (
        <View style={styles.errorRow}>
          <PrimaryIcon name="alert-circle-outline" size={14} />
          <Text variant="caption" color="primary" style={styles.helpText}>
            {lastError}
          </Text>
        </View>
      )}

      {/* ── Helper text ────────────────────────────────── */}
      <View style={styles.helpRow}>
        <MutedIcon
          name={
            Platform.OS === "ios"
              ? "information-circle-outline"
              : "information-circle"
          }
          size={14}
        />
        <Text variant="caption" color="mutedText" style={styles.helpText}>
          Skipped automatically if you've already completed the day.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.spacing.sm },
  header: { gap: theme.spacing.xxs },
  loadingRow: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  toggleText: { flex: 1, gap: 2 },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    borderWidth: theme.borderWidth.thin,
    minHeight: 36,
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

  permissionBanner: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.panel,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
  },
  permissionBody: { flex: 1, gap: theme.spacing.xs },
  permissionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  permissionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primary,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  helpText: { flex: 1 },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xxs,
  },
}));
