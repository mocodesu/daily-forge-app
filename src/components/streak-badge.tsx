import Text from "@/components/text";
import { MutedIcon, PrimaryIcon } from "@/components/themed";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export function StreakBadge({
  streak,
  freezeBalance,
  pulseKey = 0,
}: {
  streak: number;
  /** Number of freezes remaining this month. Pass undefined to hide. */
  freezeBalance?: number;
  pulseKey?: number;
}) {
  const theme = UnistylesRuntime.getTheme();

  const pillScale = useSharedValue(1);
  const flameScale = useSharedValue(1);

  const prevPulseKeyRef = useRef(pulseKey);

  useEffect(() => {
    if (pulseKey === prevPulseKeyRef.current) return;
    prevPulseKeyRef.current = pulseKey;

    pillScale.value = withSequence(
      withTiming(1.08, { duration: 180 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
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
  const showFreeze = freezeBalance !== undefined && freezeBalance > 0;

  return (
    <Animated.View style={[styles.badge, pillStyle]}>
      <View style={styles.segment}>
        <Animated.View style={flameStyle}>
          {isActive ? (
            <PrimaryIcon name="flame" size={18} />
          ) : (
            <MutedIcon name="flame" size={18} />
          )}
        </Animated.View>
        <Text variant="title" color={isActive ? "onSurface" : "mutedText"}>
          {streak}
        </Text>
      </View>

      {showFreeze && (
        <>
          <View style={styles.divider} />
          <View style={styles.segment}>
            <PrimaryIcon name="snow" size={14} />
            <Text variant="subheadBold" color="primary">
              {freezeBalance}
            </Text>
          </View>
        </>
      )}
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
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: theme.colors.panelBorder,
  },
}));
