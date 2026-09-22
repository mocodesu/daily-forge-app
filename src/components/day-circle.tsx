import Text from "@/components/text";
import type { DayProgress } from "@/utils/history";
import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  LinearGradient,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  StyleSheet,
  UnistylesRuntime,
  withUnistyles,
} from "react-native-unistyles";

// Wrapped with withUnistyles so the colour updates via the Shadow
// Tree without re-rendering the whole DayCircle component.
const ThemedIonicons = withUnistyles(Ionicons, (theme) => ({
  color: theme.colors.primary,
}));

export function DayCircle({
  day,
  size,
  onPress,
}: {
  day: DayProgress;
  size: number;
  onPress: () => void;
}) {
  const theme = UnistylesRuntime.getTheme();

  const isFrozen = day.isFrozen;
  const isInactive = !isFrozen && day.total === 0;
  const isSealed = day.isSealed;

  const rawProgress =
    day.total > 0 ? Math.min(day.completed / day.total, 1) : 0;
  const targetProgress = isSealed ? 1 : rawProgress;
  const isComplete = !isInactive && !isFrozen && targetProgress >= 1;

  const strokeWidth = Math.max(3, Math.round(size * 0.09));
  const pad = strokeWidth / 2 + 1;

  const ringPath = useMemo(
    () =>
      Skia.PathBuilder.Make()
        .addOval({
          x: pad,
          y: pad,
          width: size - pad * 2,
          height: size - pad * 2,
        })
        .build(),
    [size, pad],
  );

  const animatedProgress = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const mountOpacity = useSharedValue(0);
  const mountTranslateY = useSharedValue(6);

  // Mount-only entry animation. Staggered by how recent the day is
  // so the grid "assembles" from today outward. This must NOT depend
  // on `day.date` — otherwise a background refresh that produces a
  // new Date object would replay the animation on every render.
  useEffect(() => {
    const daysAgo = Math.abs(
      Math.round(
        (Date.now() - new Date(day.date).setHours(0, 0, 0, 0)) /
          (24 * 60 * 60 * 1000),
      ),
    );
    const delay = Math.min(daysAgo, 12) * 30;
    mountOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    mountTranslateY.value = withDelay(delay, withTiming(0, { duration: 300 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    animatedProgress.value = withTiming(targetProgress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetProgress, animatedProgress]);

  const handlePressIn = () => {
    if (isInactive) return;
    pressScale.value = withSpring(0.94, { damping: 16, stiffness: 320 });
  };

  const handlePressOut = () => {
    if (isInactive) return;
    pressScale.value = withSpring(1, { damping: 16, stiffness: 320 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: mountOpacity.value,
    transform: [
      { translateY: mountTranslateY.value },
      { scale: pressScale.value },
    ],
  }));

  const trackColor = isFrozen ? theme.colors.primary : theme.colors.panelBorder;
  const trackOpacity = isInactive ? 0.3 : isFrozen ? 0.55 : 0.5;

  const arcColors: [string, string] = isComplete
    ? [theme.colors.active, theme.colors.active]
    : [theme.colors.primary, theme.colors.primaryIllumination];

  const centerContent = (() => {
    if (isFrozen) {
      return <ThemedIonicons name="snow" size={Math.round(size * 0.42)} />;
    }
    if (isComplete) {
      return (
        <ThemedIonicons
          name="checkmark"
          size={Math.round(size * 0.42)}
          color={theme.colors.active}
        />
      );
    }
    return (
      <Text
        variant="title"
        color={isInactive ? "mutedText" : "onSurface"}
        style={styles.dayNumber(size)}
      >
        {day.date.getDate()}
      </Text>
    );
  })();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isInactive}
      style={[styles.cell, { width: size }]}
    >
      <Animated.View style={containerStyle}>
        <View style={{ width: size, height: size }}>
          <Canvas style={{ width: size, height: size }}>
            <Path
              path={ringPath}
              style="stroke"
              strokeWidth={strokeWidth}
              color={trackColor}
              opacity={trackOpacity}
            />

            {targetProgress > 0 && !isFrozen && (
              <Path
                path={ringPath}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeCap="round"
                start={0}
                end={animatedProgress}
              >
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(size, size)}
                  colors={arcColors}
                />
              </Path>
            )}
          </Canvas>

          <View style={styles.centerOverlay} pointerEvents="none">
            {centerContent}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  cell: {
    alignItems: "center",
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: (size: number) => ({
    fontSize: Math.round(size * 0.38),
    lineHeight: Math.round(size * 0.44),
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"] as const,
  }),
}));
