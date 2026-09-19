import Text from "@/components/text";
import type { DayProgress } from "@/utils/history";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

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

  const progress = day.total > 0 ? day.completed / day.total : 0;
  const dayNumber = String(day.date.getDate());
  const percent = Math.round(progress * 100);

  const isFrozen = day.isFrozen;
  const isInactive = !isFrozen && day.total === 0;
  const isComplete = !isFrozen && !isInactive && progress >= 1;

  const fontSize = Math.round(size * 0.34);
  const borderWidth = isComplete ? 3 : 2;

  const pressScale = useSharedValue(1);
  const mountOpacity = useSharedValue(0);
  const mountTranslateY = useSharedValue(8);

  React.useEffect(() => {
    const staggerIndex = Math.min(
      Math.abs(
        Math.round(
          (Date.now() - new Date(day.date).setHours(0, 0, 0, 0)) /
            (24 * 60 * 60 * 1000),
        ),
      ),
      12,
    );
    const delay = staggerIndex * 30;

    mountOpacity.value = withDelay(delay, withTiming(1, { duration: 320 }));
    mountTranslateY.value = withDelay(delay, withTiming(0, { duration: 320 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!isComplete) return;
    const timer = setTimeout(() => {
      pressScale.value = withSequence(
        withTiming(1.06, { duration: 220 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  const handlePressIn = () => {
    if (isInactive) return;
    pressScale.value = withSpring(0.92, {
      damping: 16,
      stiffness: 320,
    });
  };

  const handlePressOut = () => {
    if (isInactive) return;
    pressScale.value = withSpring(1, {
      damping: 16,
      stiffness: 320,
    });
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: mountOpacity.value,
    transform: [
      { translateY: mountTranslateY.value },
      { scale: pressScale.value },
    ],
  }));

  // Ring color and background by state
  const ringColor = isFrozen
    ? theme.colors.primary
    : isInactive
      ? theme.colors.panelBorder
      : theme.colors.primary;

  const ringBackground = isComplete
    ? theme.colors.primary
    : isFrozen
      ? theme.colors.panel
      : theme.colors.surface;

  // Caption
  const caption = isFrozen
    ? "freeze"
    : isInactive
      ? "rest"
      : `${percent}% · ${day.completed}/${day.total}`;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isInactive}
      style={[styles.cell, { width: size }]}
    >
      <Animated.View style={[styles.cellInner, containerStyle]}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: ringColor,
              borderWidth,
              backgroundColor: ringBackground,
            },
            isInactive && styles.ringInactive,
            isFrozen && styles.ringFrozen,
          ]}
        >
          {isFrozen ? (
            <Ionicons
              name="snow"
              size={Math.round(size * 0.42)}
              color={theme.colors.primary}
            />
          ) : (
            <Text
              variant="title"
              color={
                isComplete
                  ? "onPrimary"
                  : isInactive
                    ? "mutedText"
                    : "onSurface"
              }
              style={{ fontSize, lineHeight: fontSize * 1.15 }}
            >
              {dayNumber}
            </Text>
          )}
        </Animated.View>

        <Text
          variant="caption"
          color={isFrozen ? "primary" : "mutedText"}
          style={[styles.caption, isInactive && styles.captionInactive]}
          numberOfLines={1}
        >
          {caption}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  cell: {
    alignItems: "center",
  },
  cellInner: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  ringInactive: {
    opacity: 0.5,
  },
  ringFrozen: {
    borderStyle: "dashed",
    borderWidth: 2,
  },
  caption: {
    textAlign: "center",
    alignSelf: "stretch",
  },
  captionInactive: {
    opacity: 0.5,
  },
}));
