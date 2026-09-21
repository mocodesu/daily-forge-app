import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  SweepGradient,
  vec,
} from "@shopify/react-native-skia";
import React, { useCallback, useEffect, useMemo } from "react";
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export const STREAK_DEMO_SEGMENT_COUNT = 7;

const FILL_MS = 5200;
const COMPLETE_HOLD_MS = 1200;
const RESET_MS = 500;

const CHECKPOINT_SIZE = 4.5;
const CHECKPOINT_STROKE = 1.5;

interface StreakDemoRingProps {
  size: number;
  strokeWidth: number;
  trackColor: string;
  primaryColor: string;
  illuminationColor: string;
  completeColor: string;
  outlineColor: string;
  onDayChange?: (day: number) => void;
}

const StreakDemoRing = React.memo(function StreakDemoRing({
  size,
  strokeWidth,
  trackColor,
  primaryColor,
  illuminationColor,
  completeColor,
  outlineColor,
  onDayChange,
}: StreakDemoRingProps) {
  const center = useMemo(() => vec(size / 2, size / 2), [size]);

  /**
   * The actual ring radius.
   *
   * A little inset keeps the ring visually balanced inside
   * the 200px canvas.
   */
  const radius = useMemo(
    () => size / 2 - strokeWidth / 2 - 8,
    [size, strokeWidth],
  );

  const bounds = useMemo(
    () => ({
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    }),
    [center, radius],
  );

  /**
   * The arc starts at 12 o'clock and travels clockwise.
   */
  const arcPath = useMemo(() => {
    const builder = Skia.PathBuilder.Make();

    builder.addArc(bounds, -90, 360);

    return builder.build();
  }, [bounds]);

  const progress = useSharedValue(0);

  /**
   * Small pulse used only during completion.
   */
  const completion = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: FILL_MS,
          easing: Easing.inOut(Easing.cubic),
        }),

        withTiming(1, {
          duration: COMPLETE_HOLD_MS,
        }),

        withTiming(0, {
          duration: RESET_MS,
          easing: Easing.in(Easing.cubic),
        }),
      ),
      -1,
      false,
    );

    completion.value = withRepeat(
      withSequence(
        withTiming(0, {
          duration: FILL_MS,
        }),

        withTiming(1, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        }),

        withTiming(0, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
        }),

        withTiming(0, {
          duration: COMPLETE_HOLD_MS - 740,
        }),

        withTiming(0, {
          duration: RESET_MS,
        }),
      ),
      -1,
      false,
    );
  }, [completion, progress]);

  const handleDayChange = useCallback(
    (day: number) => {
      onDayChange?.(day);
    },
    [onDayChange],
  );

  /**
   * Only send a JS callback when the displayed day actually changes.
   */
  useAnimatedReaction(
    () => {
      if (progress.value >= 0.999) {
        return STREAK_DEMO_SEGMENT_COUNT;
      }

      return Math.min(
        STREAK_DEMO_SEGMENT_COUNT,
        Math.max(1, Math.ceil(progress.value * STREAK_DEMO_SEGMENT_COUNT)),
      );
    },
    (current, previous) => {
      if (current !== previous) {
        runOnJS(handleDayChange)(current);
      }
    },
  );

  /**
   * Keep the gradient restrained.
   *
   * The previous version had too much contrast between colors,
   * which is what made the ring look neon.
   */
  const gradientColors = useMemo(
    () => [primaryColor, illuminationColor, primaryColor],
    [primaryColor, illuminationColor],
  );

  /**
   * Checkpoints are placed slightly outside the ring.
   *
   * This is the biggest visual correction compared to the
   * previous version.
   */
  const checkpoints = useMemo(
    () =>
      Array.from({ length: STREAK_DEMO_SEGMENT_COUNT }, (_, index) => {
        const progressPoint = (index + 1) / STREAK_DEMO_SEGMENT_COUNT;

        const angle = -Math.PI / 2 + progressPoint * Math.PI * 2;

        const checkpointRadius = radius + strokeWidth * 0.78;

        return {
          cx: center.x + checkpointRadius * Math.cos(angle),

          cy: center.y + checkpointRadius * Math.sin(angle),

          progressPoint,
        };
      }),
    [center, radius, strokeWidth],
  );

  const canvasStyle = useMemo(
    () => ({
      width: size,
      height: size,
    }),
    [size],
  );

  return (
    <Canvas style={canvasStyle}>
      {/* =========================================================
          TRACK
          ========================================================= */}

      <Path
        path={arcPath}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        color={trackColor}
        opacity={0.22}
      />

      {/* =========================================================
          SUBTLE INNER TRACK
          Adds a little depth without adding visual noise.
          ========================================================= */}

      <Path
        path={arcPath}
        style="stroke"
        strokeWidth={2}
        strokeCap="round"
        color={trackColor}
        opacity={0.12}
      />

      {/* =========================================================
          ACTIVE ARC
          ========================================================= */}

      <Path
        path={arcPath}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
        start={0}
        end={progress}
      >
        <SweepGradient
          c={center}
          colors={gradientColors}
          positions={[0, 0.5, 1]}
        />
      </Path>

      {/* =========================================================
          LEADING EDGE
          ========================================================= */}

      <ProgressHead
        center={center}
        radius={radius}
        progress={progress}
        primaryColor={primaryColor}
        illuminationColor={illuminationColor}
      />

      {/* =========================================================
          CHECKPOINTS
          ========================================================= */}

      {checkpoints.map((checkpoint, index) => (
        <Checkpoint
          key={index}
          cx={checkpoint.cx}
          cy={checkpoint.cy}
          progressPoint={checkpoint.progressPoint}
          progress={progress}
          completion={completion}
          outlineColor={outlineColor}
          activeColor={illuminationColor}
          completeColor={completeColor}
          trackColor={trackColor}
        />
      ))}
    </Canvas>
  );
});

interface ProgressHeadProps {
  center: ReturnType<typeof vec>;
  radius: number;
  progress: { value: number };
  primaryColor: string;
  illuminationColor: string;
}

function ProgressHead({
  center,
  radius,
  progress,
  primaryColor,
  illuminationColor,
}: ProgressHeadProps) {
  const position = useDerivedValue(() => {
    const angle = -Math.PI / 2 + progress.value * Math.PI * 2;

    return {
      x: center.x + radius * Math.cos(angle),

      y: center.y + radius * Math.sin(angle),
    };
  });

  const opacity = useDerivedValue(() => {
    if (progress.value <= 0.015 || progress.value >= 0.995) {
      return 0;
    }

    return 1;
  });

  return (
    <Group>
      {/* Very small soft halo */}
      <Circle
        c={position}
        r={7}
        color={illuminationColor}
        opacity={0.18 * opacity.value}
      >
        <BlurMask blur={5} style="normal" />
      </Circle>

      {/* Main head */}
      <Circle c={position} r={4} color={illuminationColor} opacity={opacity} />

      {/* Tiny bright center */}
      <Circle c={position} r={1.6} color={primaryColor} opacity={opacity} />
    </Group>
  );
}

interface CheckpointProps {
  cx: number;
  cy: number;
  progressPoint: number;
  progress: { value: number };
  completion: { value: number };
  outlineColor: string;
  activeColor: string;
  completeColor: string;
  trackColor: string;
}

function Checkpoint({
  cx,
  cy,
  progressPoint,
  progress,
  completion,
  outlineColor,
  activeColor,
  completeColor,
  trackColor,
}: CheckpointProps) {
  /**
   * How far through the activation window we are.
   */
  const activation = useDerivedValue(() => {
    const window = 0.035;
    const start = progressPoint - window;

    if (progress.value <= start) {
      return 0;
    }

    if (progress.value >= progressPoint) {
      return 1;
    }

    return (progress.value - start) / window;
  });

  /**
   * Completed marker.
   */
  const completed = useDerivedValue(() => progress.value >= 0.999);

  /**
   * Tiny scale pop when a day is earned.
   *
   * Importantly, this is tiny.
   *
   * 0.9 → 1.04 → 1.0
   *
   * rather than the previous giant bubble effect.
   */
  const scale = useDerivedValue(() => {
    if (completed.value) {
      return 1 + completion.value * 0.08;
    }

    const t = activation.value;

    if (t <= 0) {
      return 0.9;
    }

    if (t < 0.6) {
      return 0.9 + (t / 0.6) * 0.14;
    }

    return 1.04 - ((t - 0.6) / 0.4) * 0.04;
  });

  const radius = useDerivedValue(() => CHECKPOINT_SIZE * scale.value);

  const strokeColor = useDerivedValue(() => {
    if (completed.value) {
      return completeColor;
    }

    if (activation.value >= 1) {
      return activeColor;
    }

    return outlineColor;
  });

  const fillColor = useDerivedValue(() => {
    if (completed.value) {
      return completeColor;
    }

    return activeColor;
  });

  const strokeOpacity = useDerivedValue(() => {
    if (completed.value) {
      return 0.95;
    }

    if (activation.value > 0) {
      return 0.75 + activation.value * 0.25;
    }

    return 0.48;
  });

  const fillOpacity = useDerivedValue(() => {
    if (completed.value) {
      return 1;
    }

    return activation.value;
  });

  return (
    <Group>
      {/* Soft completed pulse */}
      <Circle
        cx={cx}
        cy={cy}
        r={useDerivedValue(() => radius.value + 2)}
        color={fillColor}
        opacity={useDerivedValue(() => {
          if (!completed.value) {
            return 0;
          }

          return completion.value * 0.16;
        })}
      >
        <BlurMask blur={3} style="normal" />
      </Circle>

      {/* Hollow checkpoint */}
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        style="stroke"
        strokeWidth={CHECKPOINT_STROKE}
        color={strokeColor}
        opacity={strokeOpacity}
      />

      {/* Earned center */}
      <Circle
        cx={cx}
        cy={cy}
        r={useDerivedValue(() =>
          Math.max(0, radius.value - CHECKPOINT_STROKE * 0.85),
        )}
        color={fillColor}
        opacity={fillOpacity}
      />

      {/* Tiny center cut/highlight */}
      <Circle
        cx={cx}
        cy={cy}
        r={useDerivedValue(() => Math.max(0, radius.value * 0.24))}
        color={trackColor}
        opacity={useDerivedValue(() => {
          if (activation.value <= 0) {
            return 0;
          }

          return 0.12 + activation.value * 0.12;
        })}
      />
    </Group>
  );
}

export default StreakDemoRing;
