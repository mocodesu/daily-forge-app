// ─────────────────────────────────────────────────────────────
// StreakProgressCard — the History screen's hero visual
//
// Three visual states:
//   • In progress (streak < target)
//       — two-tone ring, count-up number, /target fraction, percent pill
//   • Just complete (streak >= target, on mount)
//       — ring fills, then crossfades to a green check
//   • Already complete (streak >= target on subsequent visits)
//       — same crossfade, but the ring animation is instant
//
// The center reads as a fraction: "12 / 30". The percent pill
// below reinforces the same number the ring is drawing.
// ─────────────────────────────────────────────────────────────
import { StreakRing } from "@/components/skia";
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
  const percent = Math.round(progress * 100);

  const strokeWidth = size < 160 ? 10 : 14;

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

  return (
    <View testID="streak-progress-card" style={styles.card}>
      <View style={[styles.ringWrap, { width: size, height: size }]}>
        <Animated.View style={[styles.absoluteFill, ringStyle]}>
          <StreakRing
            size={size}
            strokeWidth={strokeWidth}
            trackColor={theme.colors.panelBorder}
            primaryColor={theme.colors.primary}
            illuminationColor={theme.colors.primaryIllumination}
            value={progress}
          />
        </Animated.View>

        {/* Fraction overlay — numerator big, denominator small,
            separated by a slash. Both sit on the same baseline so
            the eye reads "12 / 30" as one number. */}
        <Animated.View style={[styles.center, ringStyle]} pointerEvents="none">
          <View style={styles.fractionRow}>
            <Text
              variant="display"
              color="onSurface"
              style={styles.streakNumber(size)}
            >
              {displayStreak}
            </Text>
            <View style={styles.denominatorBlock}>
              <Text
                variant="caption"
                color="mutedText"
                style={styles.slash(size)}
              >
                /
              </Text>
              <Text
                variant="subheadBold"
                color="mutedText"
                style={styles.target(size)}
              >
                {targetDays}
              </Text>
            </View>
          </View>
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

      {/* Percent pill + status message. The pill makes the target
          progress explicit without requiring the user to compute
          anything from the fraction. Hidden on completion so the
          footer reads clean. */}
      {!reached && (
        <View
          style={[styles.percentPill, { borderColor: theme.colors.primary }]}
        >
          <Text variant="caption" color="primary">
            {percent}% to target
          </Text>
        </View>
      )}

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
  },
  fractionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  streakNumber: (size: number) => ({
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"] as const,
    fontSize: Math.round(size * 0.3),
    lineHeight: Math.round(size * 0.3) * 1.05,
  }),
  denominatorBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  slash: (size: number) => ({
    fontVariant: ["tabular-nums"] as const,
    fontSize: Math.round(size * 0.14) * 1.4,
    lineHeight: Math.round(size * 0.14) * 1.3,
  }),
  target: (size: number) => ({
    fontVariant: ["tabular-nums"] as const,
    fontSize: Math.round(size * 0.14),
    lineHeight: Math.round(size * 0.14) * 1.2,
  }),
  checkCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  percentPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    borderWidth: theme.borderWidth.thin,
    marginTop: -theme.spacing.xs,
  },
  footer: {
    textAlign: "center",
  },
}));
