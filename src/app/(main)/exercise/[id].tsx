import { HapticPressable } from "@/components/haptic-pressable";
import { ScrollScreen } from "@/components/screen";
import Text from "@/components/text";
import { CompletionsRepo } from "@/repositories/completions-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import type { Exercise } from "@/types/dailyforge";
import { dayKey } from "@/utils/day-key";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export default function ExerciseDetailScreen() {
  const { theme } = useUnistyles();
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
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.loading}>
        <Text variant="subhead" color="mutedText">
          Exercise not found.
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="subheadBold" color="primary">
            Go back
          </Text>
        </Pressable>
      </View>
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
    <ScrollScreen>
      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Ionicons
            name={isTimer ? "timer-outline" : "repeat"}
            size={13}
            color={theme.colors.primary}
          />
          <Text variant="micro" color="primary">
            {isTimer ? "TIMED" : "REPETITIONS"}
          </Text>
        </View>

        <View
          style={[
            styles.typeBadge,
            {
              borderColor: exercise.isDaily
                ? theme.colors.primary
                : theme.colors.mutedText,
            },
          ]}
        >
          <Ionicons
            name={exercise.isDaily ? "repeat" : "1-circle-outline"}
            size={13}
            color={
              exercise.isDaily ? theme.colors.primary : theme.colors.mutedText
            }
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
          <View
            key={part}
            style={[
              styles.chip,
              {
                backgroundColor: theme.colors.panel,
                borderColor: theme.colors.panelBorder,
              },
            ]}
          >
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

      <View
        style={[
          styles.sessionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.panelBorder,
          },
        ]}
      >
        <View style={styles.sessionLeft}>
          <Ionicons name="timer" size={22} color={theme.colors.primary} />
          <View style={{ gap: 2 }}>
            <Text variant="caption" color="mutedText">
              Session timer
            </Text>
            <Text variant="title" color="onSurface">
              {formatDuration(exercise.sessionDurationSeconds)}
            </Text>
          </View>
        </View>
        <Text
          variant="caption"
          color="mutedText"
          style={{ flex: 1, textAlign: "right" }}
        >
          Cannot be stopped once started
        </Text>
      </View>

      {exercise.notes.trim().length > 0 && (
        <View
          style={[
            styles.notesCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.panelBorder,
            },
          ]}
        >
          <Text variant="caption" color="mutedText">
            Notes
          </Text>
          <Text variant="callout" color="onSurface">
            {exercise.notes}
          </Text>
        </View>
      )}

      <View style={{ height: 20 }} />

      {completedToday ? (
        <View style={styles.completedRow}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={theme.colors.primary}
          />
          <Text variant="subheadBold" color="primary">
            Completed today
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text variant="subheadBold" color="onSurface">
              Close
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <HapticPressable
            haptic="medium"
            onPress={handleStart}
            style={[
              styles.startButton,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Ionicons name="play" size={18} color={theme.colors.onPrimary} />
            <Text variant="subheadBold" color="onPrimary">
              Start Workout
            </Text>
          </HapticPressable>

          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.notYet}
          >
            <Text variant="subhead" color="mutedText">
              Not yet
            </Text>
          </Pressable>
        </>
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create((theme) => ({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
  },
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
    borderColor: theme.colors.primary,
  },
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
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
  },
  sessionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  notesCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    gap: theme.spacing.xs,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    minHeight: 52,
  },
  notYet: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
}));
