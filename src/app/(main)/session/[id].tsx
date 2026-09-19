import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import { CompletionsRepo } from "@/repositories/completions-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import type { Exercise } from "@/types/dailyforge";
import { dayKey, randomUUID } from "@/utils/day-key";
import { trackUserActivity } from "@/utils/retention-reminder";
import { playSound } from "@/utils/sounds";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { usePreventRemove } from "expo-router/build/react-navigation";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Animated, {
  Easing as ReanimatedEasing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

// ─────────────────────────────────────────────────────────────
// Ring geometry (module constants, captured by worklets)
// ─────────────────────────────────────────────────────────────

const RING_SIZE = 280;
const RING_STROKE = 16;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_CENTER = RING_SIZE / 2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function SessionScreen() {
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
  const ringAnimationStartedRef = useRef(false);

  // ── Reanimated shared values ──────────────────────────────
  const progress = useSharedValue(0);
  const completion = useSharedValue(0);

  // Colors read once, captured by the worklet below.
  const theme = UnistylesRuntime.getTheme();
  const primaryColor = theme.colors.primary;
  const trackColor = theme.colors.panel;
  const successColor = theme.colors.active;

  // ── Lifecycle guards ──────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  usePreventRemove(!finished && !loading, () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  });

  // ── Load exercise metadata (does NOT start the ring) ──────
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

  // ── Start the ring animation AFTER the SVG has mounted ────
  //
  // This effect runs the first time `loading` flips to false and
  // `exercise` is set — which is exactly when the <AnimatedCircle>
  // enters the tree. Starting the animation here guarantees the
  // shared value has a subscriber from frame one.
  useEffect(() => {
    if (loading || !exercise) return;
    if (ringAnimationStartedRef.current) return;
    ringAnimationStartedRef.current = true;

    const duration = Math.max(exercise.sessionDurationSeconds * 1000, 500);

    progress.value = withTiming(1, {
      duration,
      easing: ReanimatedEasing.linear,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, exercise]);

  // ── Countdown ticker ──────────────────────────────────────
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

  // ── Completion ────────────────────────────────────────────
  useEffect(() => {
    if (loading || !exercise) return;
    if (remaining === 0 && !finished) {
      setFinished(true);
      playSound("glass");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completion.value = withSpring(1, { damping: 12, stiffness: 160 });
    }
  }, [loading, exercise, remaining, finished, completion]);

  // ── Handlers ──────────────────────────────────────────────
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
    progress.value = withTiming(1, { duration: 200 });
  };

  // ── Animated props ────────────────────────────────────────
  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
    stroke: interpolateColor(
      completion.value,
      [0, 1],
      [primaryColor, successColor],
    ),
  }));

  const countdownStyle = useAnimatedStyle(() => ({
    opacity: 1 - completion.value,
    transform: [{ scale: 1 - completion.value * 0.2 }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: completion.value,
    transform: [{ scale: completion.value }],
  }));

  const remainingLabelStyle = useAnimatedStyle(() => ({
    opacity: 1 - completion.value,
  }));

  const completeLabelStyle = useAnimatedStyle(() => ({
    opacity: completion.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: completion.value,
    transform: [{ translateY: (1 - completion.value) * 24 }],
  }));

  // ── Render ────────────────────────────────────────────────
  if (loading || !exercise) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          color={UnistylesRuntime.getTheme().colors.primary}
          size="large"
        />
      </View>
    );
  }

  const isTimer = exercise.exerciseType === "timer";

  return (
    <View style={styles.screen}>
      <View style={styles.titleBlock}>
        <View style={styles.eyebrow}>
          <PrimaryIcon
            name={isTimer ? "timer-outline" : "barbell-outline"}
            size={16}
          />
          <Text variant="micro" color="primary">
            {isTimer ? "HOLD" : "WORKOUT"}
          </Text>
        </View>
        <Text variant="h1" color="onBackground" style={styles.name}>
          {exercise.name}
        </Text>
      </View>

      <View style={styles.ringContainer}>
        <Svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        >
          <Circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            stroke={trackColor}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE}
            animatedProps={ringAnimatedProps}
            transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          />
        </Svg>

        <View style={styles.ringCenter} pointerEvents="none">
          <Animated.View style={[styles.countdownWrap, countdownStyle]}>
            <Text
              variant="display"
              color="onBackground"
              style={styles.countdownText}
            >
              {formatMMSS(remaining)}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.checkWrap, checkStyle]}>
            <Ionicons name="checkmark" size={96} color={successColor} />
          </Animated.View>
        </View>
      </View>

      <View style={styles.labelRow}>
        <Animated.View style={[styles.labelWrap, remainingLabelStyle]}>
          <Text variant="subhead" color="mutedText">
            remaining
          </Text>
        </Animated.View>
        <Animated.View style={[styles.labelWrap, completeLabelStyle]}>
          <Text variant="subheadBold" color="active">
            Complete!
          </Text>
        </Animated.View>
      </View>

      <View style={styles.setsBlock}>
        <Text variant="callout" color="mutedText">
          {isTimer
            ? `${exercise.sets} sets × ${formatDuration(
                exercise.durationSeconds,
              )} hold`
            : `${exercise.sets} sets × ${exercise.reps} reps`}
        </Text>
      </View>

      <View style={styles.actions}>
        {finished ? (
          <Animated.View style={[styles.buttonWrap, buttonStyle]}>
            <HapticPressable
              haptic="medium"
              onPress={handleMarkDone}
              disabled={saving}
              style={styles.markDone}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={UnistylesRuntime.getTheme().colors.onPrimary}
              />
              <Text variant="subheadBold" color="onPrimary">
                {saving ? "Saving…" : "Mark Done"}
              </Text>
            </HapticPressable>
          </Animated.View>
        ) : (
          <View style={styles.lockedNotice}>
            <Ionicons name="lock-closed" size={14} style={styles.iconMuted} />
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

// ─────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: rt.insets.top + theme.spacing.huge,
    paddingBottom: rt.insets.bottom + theme.spacing.huge,
    alignItems: "center",
    justifyContent: "space-between",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },

  titleBlock: { alignItems: "center", gap: theme.spacing.xs },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { textAlign: "center" },

  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownText: {
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  checkWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  labelRow: {
    alignItems: "center",
    justifyContent: "center",
    height: 24,
    width: "100%",
  },
  labelWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  setsBlock: { alignItems: "center" },

  actions: {
    alignItems: "center",
    gap: theme.spacing.md,
    width: "100%",
    minHeight: 80,
    justifyContent: "flex-end",
  },
  buttonWrap: { width: "100%", alignItems: "center" },
  iconMuted: { color: theme.colors.mutedText },
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
    backgroundColor: theme.colors.primary,
  },
  lockedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  devSkip: { paddingVertical: theme.spacing.sm },
}));
