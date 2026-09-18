import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { CompletionsRepo } from "@/repositories/completions-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import type { Exercise } from "@/types/dailyforge";
import { dayKey, randomUUID } from "@/utils/day-key";
import { trackUserActivity } from "@/utils/retention-reminder";
import { playSound } from "@/utils/sounds";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, usePreventRemove } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export default function SessionScreen() {
  const { theme, rt } = useUnistyles();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const startedAtRef = useRef(0);
  const endDateRef = useRef(0);
  const lastTickRef = useRef(-1);
  const popFiredRef = useRef(false);
  const initRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  usePreventRemove(!finished && !loading, () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  });

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      const ex = await ExercisesRepo.getById(db, id);
      if (!mountedRef.current) return;
      if (!ex) {
        setLoading(false);
        return;
      }
      const now = Date.now();
      startedAtRef.current = now;
      endDateRef.current = now + ex.sessionDurationSeconds * 1000;
      lastTickRef.current = ex.sessionDurationSeconds;
      setExercise(ex);
      setRemaining(ex.sessionDurationSeconds);
      setLoading(false);
    })();
  }, [db, id]);

  useEffect(() => {
    if (loading || !exercise) return;

    if (!popFiredRef.current) {
      popFiredRef.current = true;
      playSound("pop");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const interval = setInterval(() => {
      const r = Math.max(
        0,
        Math.ceil((endDateRef.current - Date.now()) / 1000),
      );
      setRemaining(r);

      const prev = lastTickRef.current;
      if (r !== prev) {
        lastTickRef.current = r;
        if (r > 0 && prev > 0) {
          playSound("tick");
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [loading, exercise]);

  useEffect(() => {
    if (loading || !exercise) return;
    if (remaining === 0 && !finished) {
      setFinished(true);
      playSound("glass");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [loading, exercise, remaining, finished]);

  const handleMarkDone = async () => {
    if (!exercise || saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      await CompletionsRepo.insert(db, {
        id: randomUUID(),
        exerciseId: exercise.id,
        dayKey: dayKey(),
        startedAt: startedAtRef.current,
        completedAt: now,
      });
      await trackUserActivity();
      router.back();
    } catch (err) {
      console.error("[session] mark-done failed:", err);
      setSaving(false);
    }
  };

  const handleDevSkip = () => {
    if (!__DEV__) return;
    endDateRef.current = Date.now();
    setRemaining(0);
  };

  if (loading || !exercise) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const total = Math.max(exercise.sessionDurationSeconds, 1);
  const progress = 1 - remaining / total;

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: rt.insets.top + theme.spacing.huge,
          paddingBottom: rt.insets.bottom + theme.spacing.huge,
        },
      ]}
    >
      <View style={styles.titleBlock}>
        <View style={styles.eyebrow}>
          <Ionicons
            name={
              exercise.exerciseType === "timer"
                ? "timer-outline"
                : "barbell-outline"
            }
            size={16}
            color={theme.colors.primary}
          />
          <Text variant="micro" color="primary">
            {exercise.exerciseType === "timer" ? "HOLD" : "WORKOUT"}
          </Text>
        </View>
        <Text variant="h1" color="onBackground" style={styles.name}>
          {exercise.name}
        </Text>
      </View>

      <View style={styles.countdownBlock}>
        <Text
          variant="display"
          color={finished ? "primary" : "onBackground"}
          style={styles.countdown}
        >
          {formatMMSS(remaining)}
        </Text>
        <Text variant="subhead" color="mutedText">
          {finished ? "Complete!" : "remaining"}
        </Text>
        <View style={[styles.track, { backgroundColor: theme.colors.panel }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.setsBlock}>
        <Text variant="callout" color="mutedText">
          {exercise.exerciseType === "timer"
            ? `${exercise.sets} sets × ${formatDuration(
                exercise.durationSeconds,
              )} hold`
            : `${exercise.sets} sets × ${exercise.reps} reps`}
        </Text>
      </View>

      <View style={styles.actions}>
        {finished ? (
          <HapticPressable
            haptic="medium"
            onPress={handleMarkDone}
            disabled={saving}
            style={[styles.markDone, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.onPrimary}
            />
            <Text variant="subheadBold" color="onPrimary">
              {saving ? "Saving…" : "Mark Done"}
            </Text>
          </HapticPressable>
        ) : (
          <View style={styles.lockedNotice}>
            <Ionicons
              name="lock-closed"
              size={14}
              color={theme.colors.mutedText}
            />
            <Text variant="caption" color="mutedText">
              This timer cannot be stopped.
            </Text>
          </View>
        )}

        {__DEV__ && !finished && (
          <Pressable
            onPress={handleDevSkip}
            hitSlop={12}
            style={styles.devSkip}
          >
            <Text variant="caption" color="mutedText">
              [dev] skip
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.layout.screenPaddingH,
    alignItems: "center",
    justifyContent: "space-between",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  titleBlock: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: { textAlign: "center" },
  countdownBlock: {
    alignItems: "center",
    gap: theme.spacing.md,
    width: "100%",
  },
  countdown: {
    fontSize: 84,
    lineHeight: 92,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  track: {
    width: "80%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: theme.spacing.md,
  },
  fill: { height: "100%", borderRadius: 4 },
  setsBlock: { alignItems: "center" },
  actions: {
    alignItems: "center",
    gap: theme.spacing.md,
    width: "100%",
  },
  markDone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.giant,
    borderRadius: theme.radii.md,
    minHeight: 56,
    minWidth: 240,
  },
  lockedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  devSkip: { paddingVertical: theme.spacing.sm },
}));
