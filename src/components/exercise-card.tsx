import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { MutedIcon, PrimaryIcon } from "@/components/themed";
import type { Exercise } from "@/types/dailyforge";
import { formatDuration } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export function ExerciseCard({
  exercise,
  isDone,
  onPress,
}: {
  exercise: Exercise;
  isDone: boolean;
  onPress: () => void;
}) {
  // The Unistyles theme is read once, outside of any worklet. Only the
  // color strings we actually need inside the animation are captured.
  const theme = UnistylesRuntime.getTheme();
  const panelColor = theme.colors.panel;
  const primaryColor = theme.colors.primary;
  const onPrimaryColor = theme.colors.onPrimary;

  // ── Shared values ─────────────────────────────────────────
  const pressScale = useSharedValue(1);
  const cardOpacity = useSharedValue(isDone ? 0.6 : 1);
  const doneProgress = useSharedValue(isDone ? 1 : 0);
  const doneCheckScale = useSharedValue(isDone ? 1 : 0);

  // ── Animate on `isDone` transition ────────────────────────
  useEffect(() => {
    if (isDone) {
      // Ring fills in and checkmark springs in
      doneProgress.value = withTiming(1, { duration: 350 });
      doneCheckScale.value = withSpring(1, {
        damping: 10,
        stiffness: 220,
      });
      // Whole card fades slightly, then does a small "pop" and settles
      cardOpacity.value = withTiming(0.6, { duration: 400 });
      pressScale.value = withSequence(
        withTiming(1.02, { duration: 150 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    } else {
      // Reset instantly when going back to active
      doneProgress.value = withTiming(0, { duration: 200 });
      doneCheckScale.value = 0;
      cardOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isDone, cardOpacity, doneProgress, doneCheckScale, pressScale]);

  // ── Press handlers ────────────────────────────────────────
  const handlePressIn = () => {
    pressScale.value = withSpring(0.97, {
      damping: 18,
      stiffness: 320,
    });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, {
      damping: 18,
      stiffness: 320,
    });
  };

  // ── Animated styles ───────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
    opacity: cardOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      doneProgress.value,
      [0, 1],
      [panelColor, primaryColor],
    ),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doneCheckScale.value }],
  }));

  // ── Content ───────────────────────────────────────────────
  const iconName =
    exercise.exerciseType === "timer" ? "timer-outline" : "barbell-outline";
  const summary =
    exercise.exerciseType === "timer"
      ? `${exercise.sets} × ${formatDuration(exercise.durationSeconds)}`
      : `${exercise.sets} × ${exercise.reps} reps`;

  return (
    <Animated.View style={containerStyle}>
      <HapticPressable
        haptic="selection"
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        <Animated.View style={[styles.iconRing, ringStyle]}>
          {isDone ? (
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark" size={20} color={onPrimaryColor} />
            </Animated.View>
          ) : (
            <PrimaryIcon name={iconName as any} size={20} />
          )}
        </Animated.View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="title" color={isDone ? "mutedText" : "onSurface"}>
              {exercise.name}
            </Text>
            {!exercise.isDaily && (
              <View style={styles.pill}>
                <Text variant="micro" color="onSurface">
                  ONE-OFF
                </Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text variant="caption" color="mutedText">
              {summary}
            </Text>
            {exercise.bodyParts.slice(0, 2).map((part) => (
              <View key={part} style={styles.tag}>
                <Text variant="micro" color="mutedText">
                  {part}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <MutedIcon name="chevron-forward" size={18} />
      </HapticPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minHeight: 68,
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: theme.spacing.xxs, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.panel,
  },
  tag: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.panel,
  },
}));
