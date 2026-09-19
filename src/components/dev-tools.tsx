import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { MutedIcon, PrimaryIcon } from "@/components/themed";
import {
  cancelAllScheduledNotifications,
  cancelScheduledByPrefix,
  clearAllHistory,
  completeAllExercisesForToday,
  deleteAllExercises,
  fireTestNotificationNow,
  getDevDaySnapshot,
  getNotificationPermissionStatus,
  listScheduledNotifications,
  recordActivityNow,
  requestNotificationPermission,
  resetCelebrations,
  resetRetention,
  resetTodayCompletions,
  scheduleDevDailyReminderIn,
  scheduleDevRetentionReminderIn,
  scheduleTestNotificationIn,
  seedFiveExercises,
  type DevDaySnapshot,
  type ScheduledNotificationInfo,
} from "@/utils/dev-tools";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

type BusyKey =
  | "seed"
  | "complete"
  | "resetToday"
  | "deleteExercises"
  | "clearHistory"
  | "resetCelebrations"
  | "resetRetention"
  | "recordActivity"
  | "permission"
  | "notifNow"
  | "notif5s"
  | "devDaily"
  | "devRetention"
  | "cancelAll"
  | null;

export function DevTools() {
  if (!__DEV__) return null;
  return <DevToolsInner />;
}

function DevToolsInner() {
  const db = useSQLiteContext();
  const [snapshot, setSnapshot] = useState<DevDaySnapshot | null>(null);
  const [busy, setBusy] = useState<BusyKey>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [permission, setPermission] = useState<string>("—");
  const [scheduled, setScheduled] = useState<ScheduledNotificationInfo[]>([]);
  const [showScheduled, setShowScheduled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, p, list] = await Promise.all([
        getDevDaySnapshot(db),
        getNotificationPermissionStatus(),
        listScheduledNotifications(),
      ]);
      setSnapshot(s);
      setPermission(p);
      setScheduled(list);
    } catch (err) {
      console.warn("[dev-tools] snapshot failed:", err);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3500);
  };

  // ── Wrap every action so busy + refresh + error handling is uniform ──
  const run = async (
    key: BusyKey,
    work: () => Promise<void>,
    successMsg?: string,
  ) => {
    setBusy(key);
    try {
      await work();
      if (successMsg) flash(successMsg);
      await refresh();
    } catch (err) {
      console.error(`[dev-tools] ${key} failed:`, err);
      flash(`${key} failed. Check console.`);
    } finally {
      setBusy(null);
    }
  };

  // ── Action handlers ─────────────────────────────────────────
  const handleSeed = () =>
    run("seed", async () => {
      const n = await seedFiveExercises(db);
      flash(
        n === 0
          ? "All 5 seed exercises already exist."
          : `Seeded ${n} exercise${n === 1 ? "" : "s"}.`,
      );
    });

  const handleComplete = () =>
    run("complete", async () => {
      const n = await completeAllExercisesForToday(db);
      flash(
        n === 0
          ? "Nothing to complete."
          : `Completed ${n} exercise${n === 1 ? "" : "s"}.`,
      );
    });

  const handleResetToday = () => {
    Alert.alert(
      "Reset today?",
      "Clears today's completions, day lock, and swear. Nothing else is touched.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () =>
            run("resetToday", async () => {
              await resetTodayCompletions(db);
              flash("Today cleared.");
            }),
        },
      ],
    );
  };

  const handleDeleteExercises = () => {
    Alert.alert(
      "Delete all exercises?",
      "Removes every exercise and their completion history. Cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () =>
            run("deleteExercises", async () => {
              await deleteAllExercises(db);
              flash("All exercises deleted.");
            }),
        },
      ],
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear all history?",
      "Removes every completion record. Exercises and preferences stay.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () =>
            run("clearHistory", async () => {
              await clearAllHistory(db);
              flash("History cleared.");
            }),
        },
      ],
    );
  };

  const handleResetCelebrations = () =>
    run(
      "resetCelebrations",
      async () => {
        await resetCelebrations(db);
        flash("Celebrations reset.");
      },
      "Celebrations reset.",
    );

  const handleResetRetention = () =>
    run(
      "resetRetention",
      async () => {
        await resetRetention();
        flash("Retention state cleared.");
      },
      "Retention state cleared.",
    );

  const handleRecordActivity = () =>
    run(
      "recordActivity",
      async () => {
        await recordActivityNow();
        flash("Activity recorded. Retention timer reset.");
      },
      "Activity recorded.",
    );

  const handleRequestPermission = () =>
    run("permission", async () => {
      const granted = await requestNotificationPermission();
      flash(
        granted ? "Notification permission granted." : "Permission denied.",
      );
    });

  const handleNotifNow = () =>
    run(
      "notifNow",
      async () => {
        await fireTestNotificationNow();
        flash("Immediate notification fired.");
      },
      "Fired immediately.",
    );

  const handleNotif5s = () =>
    run(
      "notif5s",
      async () => {
        await scheduleTestNotificationIn(5);
        flash("Test notification scheduled for 5s from now.");
      },
      "Scheduled (+5s).",
    );

  const handleDevDaily = () =>
    run(
      "devDaily",
      async () => {
        await scheduleDevDailyReminderIn(1);
        flash("DEV daily reminder scheduled for 1 min from now.");
      },
      "DEV daily reminder scheduled (+1 min).",
    );

  const handleDevRetention = () =>
    run(
      "devRetention",
      async () => {
        await scheduleDevRetentionReminderIn(1);
        flash("DEV retention reminder scheduled for 1 min from now.");
      },
      "DEV retention scheduled (+1 min).",
    );

  const handleCancelAll = () => {
    Alert.alert(
      "Cancel all scheduled notifications?",
      "Removes every pending notification (daily reminders, retention, tests).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Cancel All",
          style: "destructive",
          onPress: () =>
            run("cancelAll", async () => {
              await cancelAllScheduledNotifications();
              flash("All scheduled notifications cancelled.");
            }),
        },
      ],
    );
  };

  const handleCancelDaily = () =>
    run(
      "cancelAll",
      async () => {
        const n = await cancelScheduledByPrefix("daily-reminder-");
        flash(`Cancelled ${n} daily reminder${n === 1 ? "" : "s"}.`);
      },
      "Daily reminders cancelled.",
    );

  const handleCancelRetention = () =>
    run(
      "cancelAll",
      async () => {
        const n = await cancelScheduledByPrefix("retention-reminder-");
        flash(`Cancelled ${n} retention reminder${n === 1 ? "" : "s"}.`);
      },
      "Retention reminders cancelled.",
    );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <PrimaryIcon name="construct-outline" size={18} />
        <Text variant="subheadBold" color="onSurface">
          Dev Tools
        </Text>
        <View style={styles.flex} />
        <Pressable onPress={refresh} hitSlop={10}>
          <MutedIcon name="refresh" size={16} />
        </Pressable>
        <Text variant="caption" color="mutedText">
          DEV ONLY
        </Text>
      </View>

      {/* ── Snapshot ────────────────────────────────────── */}
      {snapshot && (
        <View style={styles.pillRow}>
          <Pill
            label="Today"
            value={`${snapshot.completedToday}/${snapshot.exercisesToday}`}
          />
          <Pill label="Locked" value={snapshot.isLocked ? "yes" : "no"} />
          <Pill label="Swore" value={snapshot.sworeToday ? "yes" : "no"} />
          <Pill
            label="Celebrated"
            value={
              snapshot.celebratedTargets.length === 0
                ? "none"
                : snapshot.celebratedTargets.join(",")
            }
          />
          <Pill label="Total ex" value={String(snapshot.totalExercises)} />
          <Pill label="Completions" value={String(snapshot.totalCompletions)} />
          <Pill label="Notif" value={permission} />
          <Pill label="Scheduled" value={String(scheduled.length)} />
        </View>
      )}

      {/* ── Notifications ───────────────────────────────── */}
      <SectionHeader icon="notifications-outline" title="Notifications" />

      <DevButton
        icon="shield-checkmark-outline"
        label={busy === "permission" ? "Requesting…" : "Request Permission"}
        subtitle="Asks for notification permission if not already granted"
        onPress={handleRequestPermission}
        busy={busy === "permission"}
        disabled={busy !== null}
      />

      <DevButton
        icon="flash-outline"
        label={busy === "notifNow" ? "Firing…" : "Fire Notification Now"}
        subtitle="Immediate notification, no scheduling delay"
        onPress={handleNotifNow}
        busy={busy === "notifNow"}
        disabled={busy !== null}
      />

      <DevButton
        icon="time-outline"
        label={busy === "notif5s" ? "Scheduling…" : "Test Notification (+5s)"}
        subtitle="Schedules a notification 5 seconds from now"
        onPress={handleNotif5s}
        busy={busy === "notif5s"}
        disabled={busy !== null}
      />

      <DevButton
        icon="list-outline"
        label={showScheduled ? "Hide Scheduled" : "View Scheduled"}
        subtitle={`${scheduled.length} pending notification${scheduled.length === 1 ? "" : "s"}`}
        onPress={() => setShowScheduled((v) => !v)}
        busy={false}
        disabled={false}
      />

      {showScheduled && (
        <View style={styles.scheduledList}>
          {scheduled.length === 0 ? (
            <Text variant="caption" color="mutedText">
              Nothing scheduled.
            </Text>
          ) : (
            scheduled.map((n) => (
              <View key={n.identifier} style={styles.scheduledRow}>
                <Text
                  variant="caption"
                  color="onSurface"
                  style={styles.monoText}
                  numberOfLines={1}
                >
                  {n.identifier}
                </Text>
                <Text variant="caption" color="mutedText" numberOfLines={1}>
                  {n.title}
                </Text>
                <Text variant="caption" color="mutedText">
                  {n.triggerDate ? n.triggerDate.toLocaleString() : "immediate"}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      <DevButton
        icon="close-circle-outline"
        label="Cancel All Scheduled"
        subtitle="Wipes every pending notification"
        onPress={handleCancelAll}
        busy={busy === "cancelAll"}
        disabled={busy !== null}
        destructive
      />

      {/* ── Daily Reminder ──────────────────────────────── */}
      <SectionHeader icon="alarm-outline" title="Daily Reminder" />

      <DevButton
        icon="alarm-outline"
        label={busy === "devDaily" ? "Scheduling…" : "DEV: Schedule +1 min"}
        subtitle="Simulates a daily reminder firing 1 minute from now"
        onPress={handleDevDaily}
        busy={busy === "devDaily"}
        disabled={busy !== null}
      />

      <DevButton
        icon="trash-outline"
        label="Cancel Daily Reminders"
        subtitle="Cancels notifications with prefix 'daily-reminder-'"
        onPress={handleCancelDaily}
        busy={false}
        disabled={busy !== null}
      />

      {/* ── Retention Reminder ──────────────────────────── */}
      <SectionHeader icon="repeat-outline" title="Retention Reminder" />

      {snapshot && (
        <View style={styles.pillRow}>
          <Pill
            label="Last activity"
            value={
              snapshot.retentionLastActivityAt === 0
                ? "never"
                : new Date(
                    snapshot.retentionLastActivityAt,
                  ).toLocaleTimeString()
            }
          />
          <Pill
            label="Pending"
            value={String(snapshot.retentionPendingIds.length)}
          />
        </View>
      )}

      <DevButton
        icon="repeat-outline"
        label={busy === "devRetention" ? "Scheduling…" : "DEV: Schedule +1 min"}
        subtitle="Simulates a retention reminder firing 1 minute from now"
        onPress={handleDevRetention}
        busy={busy === "devRetention"}
        disabled={busy !== null}
      />

      <DevButton
        icon="checkmark-done-outline"
        label={busy === "recordActivity" ? "Recording…" : "Record Activity Now"}
        subtitle="Resets the retention timer as if you completed something"
        onPress={handleRecordActivity}
        busy={busy === "recordActivity"}
        disabled={busy !== null}
      />

      <DevButton
        icon="refresh-outline"
        label={
          busy === "resetRetention" ? "Resetting…" : "Reset Retention State"
        }
        subtitle="Clears lastActivityAt and cancels pending retention reminders"
        onPress={handleResetRetention}
        busy={busy === "resetRetention"}
        disabled={busy !== null}
        destructive
      />

      <DevButton
        icon="close-circle-outline"
        label="Cancel Retention Reminders"
        subtitle="Cancels notifications with prefix 'retention-reminder-'"
        onPress={handleCancelRetention}
        busy={false}
        disabled={busy !== null}
      />

      {/* ── Celebrations ────────────────────────────────── */}
      <SectionHeader icon="trophy-outline" title="Celebrations" />

      <DevButton
        icon="trophy-outline"
        label={
          busy === "resetCelebrations" ? "Resetting…" : "Reset Celebrations"
        }
        subtitle="Re-enables the grand celebration for targets you've already hit"
        onPress={handleResetCelebrations}
        busy={busy === "resetCelebrations"}
        disabled={busy !== null}
        destructive
      />

      {/* ── Exercises ───────────────────────────────────── */}
      <SectionHeader icon="barbell-outline" title="Exercises" />

      <DevButton
        icon="add-circle-outline"
        label={busy === "seed" ? "Seeding…" : "Seed 5 Exercises"}
        subtitle="Push-ups, Plank, Squats, Superman, Jumping Jacks"
        onPress={handleSeed}
        busy={busy === "seed"}
        disabled={busy !== null}
      />

      <DevButton
        icon="flash-outline"
        label={busy === "complete" ? "Completing…" : "Complete All Today"}
        subtitle="Marks every exercise due today as done"
        onPress={handleComplete}
        busy={busy === "complete"}
        disabled={busy !== null}
      />

      <DevButton
        icon="trash-outline"
        label={
          busy === "deleteExercises" ? "Deleting…" : "Delete All Exercises"
        }
        subtitle="Removes every exercise and its history"
        onPress={handleDeleteExercises}
        busy={busy === "deleteExercises"}
        disabled={busy !== null}
        destructive
      />

      {/* ── Confetti Lab ────────────────────────────────── */}
      <SectionHeader icon="sparkles-outline" title="Celebrations" />

      <DevButton
        icon="sparkles-outline"
        label="Open Confetti Lab"
        subtitle="Fire CelebrationBurst and GrandCelebration on demand"
        onPress={() => router.push("/(main)/dev/confetti-lab")}
        busy={false}
        disabled={busy !== null}
      />

      {/* ── Data ────────────────────────────────────────── */}
      <SectionHeader icon="server-outline" title="Data" />

      <DevButton
        icon="refresh-outline"
        label={busy === "resetToday" ? "Resetting…" : "Reset Today"}
        subtitle="Clears today's completions, lock, and swear only"
        onPress={handleResetToday}
        busy={busy === "resetToday"}
        disabled={busy !== null}
        destructive
      />

      <DevButton
        icon="close-circle-outline"
        label={busy === "clearHistory" ? "Clearing…" : "Clear All History"}
        subtitle="Wipes every completion record. Exercises stay."
        onPress={handleClearHistory}
        busy={busy === "clearHistory"}
        disabled={busy !== null}
        destructive
      />

      {/* ── Status ──────────────────────────────────────── */}
      {status && (
        <View style={styles.statusRow}>
          <MutedIcon name="information-circle-outline" size={14} />
          <Text variant="caption" color="mutedText" style={styles.flex}>
            {status}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Small components
// ─────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <PrimaryIcon name={icon} size={14} />
      <Text variant="micro" color="primary">
        {title.toUpperCase()}
      </Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text variant="caption" color="mutedText">
        {label}
      </Text>
      <Text variant="subheadBold" color="onSurface" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function DevButton({
  icon,
  label,
  subtitle,
  onPress,
  busy,
  disabled,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
  destructive?: boolean;
}) {
  return (
    <HapticPressable
      haptic={destructive ? "heavy" : "medium"}
      onPress={onPress}
      disabled={disabled}
      style={[styles.row, disabled && !busy && styles.rowDisabled]}
    >
      <View style={styles.rowIcon}>
        {busy ? (
          <ActivityIndicator
            size="small"
            color={UnistylesRuntime.getTheme().colors.primary}
          />
        ) : (
          <Ionicons
            name={icon}
            size={20}
            style={destructive ? styles.iconDestructive : styles.iconPrimary}
          />
        )}
      </View>
      <View style={styles.rowBody}>
        <Text
          variant="subheadBold"
          color={destructive ? "primary" : "onSurface"}
        >
          {label}
        </Text>
        <Text variant="caption" color="mutedText" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </HapticPressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.panelBorder,
    marginLeft: theme.spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.panel,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    maxWidth: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.panel,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minHeight: 68,
  },
  rowDisabled: { opacity: 0.5 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  rowBody: { flex: 1, gap: 2, minWidth: 0 },
  iconPrimary: { color: theme.colors.primary },
  iconDestructive: { color: theme.colors.primary },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  scheduledList: {
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.panel,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  scheduledRow: {
    gap: 2,
    paddingVertical: 4,
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.panelBorder,
  },
  monoText: {
    fontFamily: "Courier",
    fontSize: 11,
  },
}));
