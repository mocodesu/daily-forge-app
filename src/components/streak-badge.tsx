import Text from "@/components/text";
import { MutedIcon, PrimaryIcon } from "@/components/themed";
import React, { useEffect, useRef } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

/**
 * The streak pill in the Today header. Pulses only when the parent
 * increments `pulseKey` — the streak value itself never triggers an
 * animation. This lets the parent defer the pulse until after the
 * celebration sequence has finished.
 */
export function StreakBadge({
  streak,
  pulseKey = 0,
}: {
  streak: number;
  pulseKey?: number;
}) {
  const pillScale = useSharedValue(1);
  const flameScale = useSharedValue(1);

  // Track the previous pulse key so we only fire on genuine changes.
  const prevPulseKeyRef = useRef(pulseKey);

  useEffect(() => {
    if (pulseKey === prevPulseKeyRef.current) return;
    prevPulseKeyRef.current = pulseKey;

    // Pill: quick scale up, spring back.
    pillScale.value = withSequence(
      withTiming(1.08, { duration: 180 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );

    // Flame: starts 80ms later, goes higher, springs back with a
    // slightly bouncier landing so it reads as a secondary beat.
    flameScale.value = withDelay(
      80,
      withSequence(
        withTiming(1.35, { duration: 220 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      ),
    );
  }, [pulseKey, pillScale, flameScale]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }));

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const isActive = streak > 0;

  return (
    <Animated.View style={[styles.badge, pillStyle]}>
      <Animated.View style={flameStyle}>
        {isActive ? (
          <PrimaryIcon name="flame" size={20} />
        ) : (
          <MutedIcon name="flame" size={20} />
        )}
      </Animated.View>
      <Text variant="title" color={isActive ? "onSurface" : "mutedText"}>
        {streak}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minHeight: 40,
  },
}));
