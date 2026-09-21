// ─────────────────────────────────────────────────────────────
// StreakProgressCard — the History screen's hero visual
//
// The ring is two-tone:
//   • Track        — theme.colors.panelBorder (subtle, always visible)
//   • Progress arc — theme.colors.primary (the filled portion)
//
// The number counts up from 0 to `streak` in sync with the ring
// fill. When streak >= targetDays, the ring crossfades to a
// green check circle.
// ─────────────────────────────────────────────────────────────
import Text from "@/components/text";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

/**
 * Ring keypaths. See steps/streaks.tsx for the inspection script.
 * Swap the two colors below if the effect comes out inverted.
 */
const RING_TRACK_KEYPATHS = ["White.Ellipse 1.Stroke 1"];
const RING_PROGRESS_KEYPATHS = ["White.Ellipse 2.Stroke 1"];

const RING_DURATION = 1200;
const CHECK_DELAY = RING_DURATION + 80;
const CHECK_DURATION = 420;

interface StreakProgressCardProps {
  streak: number;
  targetDays: number;
  /** Diameter of the ring. Default 140. */
  size?: number;
}

export function StreakProgressCard({
  streak,
  targetDays,
  size = 140,
}: StreakProgressCardProps) {
  const { theme } = useUnistyles();

  const reached = streak >= targetDays;
  const remaining = Math.max(0, targetDays - streak);
  const progress = targetDays > 0 ? Math.min(streak / targetDays, 1) : 0;

  // ── Count-up number ───────────────────────────────────────
  const animatedStreak = useSharedValue(0);
  const [displayStreak, setDisplayStreak] = useState(0);

  useEffect(() => {
    animatedStreak.value = withTiming(streak, {
      duration: RING_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [streak, animatedStreak]);

  useAnimatedReaction(
    () => Math.round(animatedStreak.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplayStreak)(current);
      }
    },
  );

  // ── Ring / check crossfade ────────────────────────────────
  const ringOpacity = useSharedValue(reached ? 0 : 1);
  const checkOpacity = useSharedValue(reached ? 1 : 0);
  const checkScale = useSharedValue(reached ? 1 : 0);

  useEffect(() => {
    if (reached) {
      ringOpacity.value = withTiming(0, { duration: 300 });
      checkOpacity.value = withDelay(
        CHECK_DELAY,
        withTiming(1, { duration: CHECK_DURATION }),
      );
      checkScale.value = withDelay(
        CHECK_DELAY,
        withSpring(1, { damping: 11, stiffness: 180 }),
      );
    } else {
      ringOpacity.value = withTiming(1, { duration: 300 });
      checkOpacity.value = withTiming(0, { duration: 200 });
      checkScale.value = 0;
    }
  }, [reached, ringOpacity, checkOpacity, checkScale]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const numberFontSize = Math.round(size * 0.32);

  return (
    <View testID="streak-progress-card" style={styles.card}>
      <View style={[styles.ringWrap, { width: size, height: size }]}>
        {/* Ring layer — two-tone: dark track + primary arc */}
        <Animated.View style={[styles.absoluteFill, ringStyle]}></Animated.View>

        {/* Count-up number */}
        <Animated.View style={[styles.center, ringStyle]} pointerEvents="none">
          <Text
            variant="display"
            color="onSurface"
            style={[
              styles.number,
              {
                fontSize: numberFontSize,
                lineHeight: numberFontSize * 1.1,
              },
            ]}
          >
            {displayStreak}
          </Text>
          <Text variant="caption" color="mutedText">
            of {targetDays} days
          </Text>
        </Animated.View>

        {/* Completion check */}
        <Animated.View style={[styles.center, checkStyle]} pointerEvents="none">
          <View
            style={[
              styles.checkCircle,
              {
                width: size * 0.72,
                height: size * 0.72,
                borderRadius: (size * 0.72) / 2,
                backgroundColor: theme.colors.active,
              },
            ]}
          >
            <Ionicons
              name="checkmark-sharp"
              size={size * 0.42}
              color="#FFFFFF"
            />
          </View>
        </Animated.View>
      </View>

      <Text
        variant={reached ? "subheadBold" : "subhead"}
        color={reached ? "primary" : "mutedText"}
        style={styles.footer}
      >
        {reached
          ? "Target reached"
          : streak === 0
            ? "Start your streak today"
            : `${remaining} day${remaining === 1 ? "" : "s"} to go`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  checkCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  number: {
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  footer: {
    textAlign: "center",
  },
}));
