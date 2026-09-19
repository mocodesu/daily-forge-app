import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { MutedIcon, PrimaryIcon } from "@/components/themed";
import {
  completeAllExercisesForToday,
  getDevDaySnapshot,
  resetCelebrations,
  resetTodayCompletions,
  seedFiveExercises,
  type DevDaySnapshot,
} from "@/utils/dev-tools";
import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function DevTools() {
  if (!__DEV__) return null;
  return <DevToolsInner />;
}

function DevToolsInner() {
  const db = useSQLiteContext();
  const [snapshot, setSnapshot] = useState<DevDaySnapshot | null>(null);
  const [busy, setBusy] = useState<
    "seed" | "complete" | "reset" | "celebration" | null
  >(null);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await getDevDaySnapshot(db);
      setSnapshot(s);
    } catch (err) {
      console.warn("[dev-tools] snapshot failed:", err);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSeed = async () => {
    setBusy("seed");
    try {
      const inserted = await seedFiveExercises(db);
      if (inserted === 0) {
        flash("All 5 seed exercises already exist.");
      } else {
        flash(`Seeded ${inserted} exercise${inserted === 1 ? "" : "s"}.`);
      }
      await refresh();
    } catch (err) {
      console.error("[dev-tools] seed failed:", err);
      flash("Seed failed. Check the console.");
    } finally {
      setBusy(null);
    }
  };

  const handleCompleteAll = async () => {
    setBusy("complete");
    try {
      const created = await completeAllExercisesForToday(db);
      if (created === 0) {
        flash("Nothing to complete — either no exercises or all done.");
      } else {
        flash(`Completed ${created} exercise${created === 1 ? "" : "s"}.`);
      }
      await refresh();
    } catch (err) {
      console.error("[dev-tools] complete failed:", err);
      flash("Complete failed. Check the console.");
    } finally {
      setBusy(null);
    }
  };

  const performReset = async () => {
    setBusy("reset");
    try {
      await resetTodayCompletions(db);
      flash("Today's completions, lock, and swear cleared.");
      await refresh();
    } catch (err) {
      console.error("[dev-tools] reset failed:", err);
      flash("Reset failed. Check the console.");
    } finally {
      setBusy(null);
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset today?",
      "Clears every completion for today, plus today's day lock and swear. Exercises, history, preferences, and streak-from-previous-days are untouched.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset Today", style: "destructive", onPress: performReset },
      ],
    );
  };

  const performResetCelebrations = async () => {
    setBusy("celebration");
    try {
      await resetCelebrations(db);
      flash(
        "Celebrations reset. The grand celebration will fire next time the target is hit.",
      );
      await refresh();
    } catch (err) {
      console.error("[dev-tools] celebration reset failed:", err);
      flash("Reset failed. Check the console.");
    } finally {
      setBusy(null);
    }
  };

  const handleResetCelebrations = () => {
    Alert.alert(
      "Reset celebrations?",
      "The grand celebration will fire again the next time you reach your target streak. Your streak, completions, and history are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Celebrations",
          style: "destructive",
          onPress: performResetCelebrations,
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <PrimaryIcon name="construct-outline" size={18} />
        <Text variant="subheadBold" color="onSurface">
          Dev Tools
        </Text>
        <View style={styles.flex} />
        <Text variant="caption" color="mutedText">
          DEV ONLY
        </Text>
      </View>

      {snapshot && (
        <View style={styles.snapshotRow}>
          <SnapshotPill
            label="Today"
            value={`${snapshot.completedToday}/${snapshot.exercisesToday}`}
          />
          <SnapshotPill
            label="Locked"
            value={snapshot.isLocked ? "yes" : "no"}
          />
          <SnapshotPill
            label="Swore"
            value={snapshot.sworeToday ? "yes" : "no"}
          />
          <SnapshotPill
            label="Celebrated"
            value={
              snapshot.celebratedTargets.length === 0
                ? "none"
                : snapshot.celebratedTargets.join(", ")
            }
          />
        </View>
      )}

      <DevButton
        icon="add-circle-outline"
        label={busy === "seed" ? "Seeding…" : "Seed 5 Exercises"}
        subtitle="Inserts Push-ups, Plank, Squats, Superman, Jumping Jacks"
        onPress={handleSeed}
        busy={busy === "seed"}
        disabled={busy !== null}
      />

      <DevButton
        icon="flash-outline"
        label={busy === "complete" ? "Completing…" : "Complete All Today"}
        subtitle="Marks every exercise due today as done, with realistic durations"
        onPress={handleCompleteAll}
        busy={busy === "complete"}
        disabled={busy !== null}
      />

      <DevButton
        icon="refresh-outline"
        label={busy === "reset" ? "Resetting…" : "Reset Today"}
        subtitle="Clears today's completions, day lock, and swear. Nothing else."
        onPress={handleReset}
        busy={busy === "reset"}
        disabled={busy !== null}
        destructive
      />

      <DevButton
        icon="trophy-outline"
        label={busy === "celebration" ? "Resetting…" : "Reset Celebrations"}
        subtitle="Re-enables grand celebrations for every target you've hit"
        onPress={handleResetCelebrations}
        busy={busy === "celebration"}
        disabled={busy !== null}
        destructive
      />

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

function SnapshotPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text variant="caption" color="mutedText">
        {label}
      </Text>
      <Text variant="subheadBold" color="onSurface">
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
          <ActivityIndicator size="small" color="unstyled" />
        ) : (
          <Ionicons name={icon} size={20} style={styles.iconPrimary} />
        )}
      </View>
      <View style={styles.rowBody}>
        <Text variant="subheadBold" color="onSurface">
          {label}
        </Text>
        <Text variant="caption" color="mutedText" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </HapticPressable>
  );
}

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
  snapshotRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.panel,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
}));
