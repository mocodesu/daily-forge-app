import { HapticPressable } from "@/components/haptic-pressable";
import { ScrollScreen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import Text from "@/components/text";
import {
  OnPrimaryIcon,
  PrimaryIcon,
  ThemedActivityIndicator,
} from "@/components/themed";
import { CompletionsRepo } from "@/repositories/completions-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import type { Exercise } from "@/types/dailyforge";
import { dayKey } from "@/utils/day-key";
import { formatDuration } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export default function ExerciseDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [completedToday, setCompletedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const ex = await ExercisesRepo.getById(db, id);
        if (!mountedRef.current) return;
        setExercise(ex);
        if (ex) {
          const rec = await CompletionsRepo.getForExerciseOnDay(
            db,
            id,
            dayKey(),
          );
          if (!mountedRef.current) return;
          setCompletedToday(!!rec);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        console.warn("[exercise-detail] load failed:", err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  }, [db, id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ThemedActivityIndicator size="large" />
      </View>
    );
  }

  if (!exercise) {
    return (
      <ScrollScreen header={<ScreenHeader />}>
        <View style={styles.notFound}>
          <Text variant="subhead" color="mutedText">
            Exercise not found.
          </Text>
        </View>
      </ScrollScreen>
    );
  }

  const isTimer = exercise.exerciseType === "timer";

  const handleStart = () => {
    router.replace({
      pathname: "/(main)/session/[id]",
      params: { id: exercise.id },
    });
  };

  return (
    <ScrollScreen header={<ScreenHeader />}>
      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <PrimaryIcon name={isTimer ? "timer-outline" : "repeat"} size={13} />
          <Text variant="micro" color="primary">
            {isTimer ? "TIMED" : "REPETITIONS"}
          </Text>
        </View>

        <View
          style={[
            styles.typeBadge,
            exercise.isDaily ? styles.typeBadgeDaily : styles.typeBadgeOneOff,
          ]}
        >
          <Ionicons
            name={exercise.isDaily ? "repeat" : "ellipse-outline"}
            size={13}
            style={exercise.isDaily ? styles.iconPrimary : styles.iconMuted}
          />
          <Text
            variant="micro"
            color={exercise.isDaily ? "primary" : "mutedText"}
          >
            {exercise.isDaily ? "DAILY" : "ONE-OFF"}
          </Text>
        </View>
      </View>

      <Text variant="h1" color="onBackground">
        {exercise.name}
      </Text>

      <View style={styles.chipRow}>
        {exercise.bodyParts.map((part) => (
          <View key={part} style={styles.chip}>
            <Text variant="caption" color="onSurface">
              {part}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.statsRow}>
        <Stat label="Sets" value={String(exercise.sets)} />
        {isTimer ? (
          <>
            <Stat
              label="Per set"
              value={formatDuration(exercise.durationSeconds)}
            />
            <Stat
              label="Work time"
              value={formatDuration(exercise.durationSeconds * exercise.sets)}
            />
          </>
        ) : (
          <>
            <Stat label="Reps per set" value={String(exercise.reps)} />
            <Stat
              label="Total reps"
              value={String(exercise.sets * exercise.reps)}
            />
          </>
        )}
      </View>

      <View style={styles.sessionCard}>
        <View style={styles.sessionLeft}>
          <PrimaryIcon name="timer" size={22} />
          <View style={styles.sessionText}>
            <Text variant="caption" color="mutedText">
              Session timer
            </Text>
            <Text variant="title" color="onSurface">
              {formatDuration(exercise.sessionDurationSeconds)}
            </Text>
          </View>
        </View>
        <Text variant="caption" color="mutedText" style={styles.sessionNote}>
          Cannot be stopped once started
        </Text>
      </View>

      {exercise.notes.trim().length > 0 && (
        <View style={styles.notesCard}>
          <Text variant="caption" color="mutedText">
            Notes
          </Text>
          <Text variant="callout" color="onSurface">
            {exercise.notes}
          </Text>
        </View>
      )}

      <View style={styles.spacer} />

      {completedToday ? (
        <View style={styles.completedRow}>
          <PrimaryIcon name="checkmark-circle" size={20} />
          <Text variant="subheadBold" color="primary">
            Completed today
          </Text>
        </View>
      ) : (
        <HapticPressable
          testID="exercise-start-workout"
          haptic="medium"
          onPress={handleStart}
          style={styles.startButton}
        >
          <OnPrimaryIcon name="play" size={18} />
          <Text variant="subheadBold" color="onPrimary">
            Start Workout
          </Text>
        </HapticPressable>
      )}
    </ScrollScreen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="h2" color="onSurface">
        {value}
      </Text>
      <Text variant="caption" color="mutedText">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  notFound: { alignItems: "center", paddingVertical: theme.spacing.huge },
  badgeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: theme.borderWidth.thin,
  },
  typeBadgeDaily: { borderColor: theme.colors.primary },
  typeBadgeOneOff: { borderColor: theme.colors.mutedText },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
    flexWrap: "wrap",
  },
  stat: { gap: 2 },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: {
      phone: theme.spacing.md,
      tablet: theme.spacing.lg,
    },
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
  },
  sessionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  sessionText: { gap: 2 },
  sessionNote: { flex: 1, textAlign: "right" },
  notesCard: {
    padding: {
      phone: theme.spacing.md,
      tablet: theme.spacing.lg,
    },
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
    gap: theme.spacing.xs,
  },
  spacer: { height: 20 },
  iconPrimary: { color: theme.colors.primary },
  iconMuted: { color: theme.colors.mutedText },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    minHeight: 52,
    backgroundColor: theme.colors.primary,
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
}));
