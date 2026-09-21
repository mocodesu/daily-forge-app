// ─────────────────────────────────────────────────────────────
// StreakRing — filled-ring geometry, no clipping, pronounced
//
// Two modes:
//   DEMO   — loops or plays once; day-dots light as the arc
//            sweeps past them. Used in onboarding.
//   REAL   — pass a `value` (0..1) and the ring animates to it
//            once, then holds. Day-dots hidden. Used on History.
//
// Filled ring geometry (outer circle minus inner circle) via
// PathOp.Difference. Filled shapes have no stroke caps and so
// cannot clip at any progress value.
// ─────────────────────────────────────────────────────────────
import {
  Canvas,
  Circle,
  Group,
  Path,
  PathOp,
  Skia,
  SweepGradient,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import {
  Easing,
  interpolate,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface StreakRingProps {
  size: number;
  strokeWidth: number;
  trackColor: string;
  primaryColor: string;
  illuminationColor: string;
  dayCount?: number;
  loop?: boolean;
  /** Real progress value, 0..1. Enables real mode. */
  value?: number;
}

const LEAD_TRAIL = 0.14;

const StreakRing = React.memo(function StreakRing({
  size,
  strokeWidth,
  trackColor,
  primaryColor,
  illuminationColor,
  dayCount = 7,
  loop = true,
  value,
}: StreakRingProps) {
  const isRealMode = value !== undefined;

  const pad = strokeWidth;
  const contentSize = size - pad * 2;
  const outerRadius = contentSize / 2;
  const innerRadius = outerRadius - strokeWidth;
  const midRadius = (outerRadius + innerRadius) / 2;
  const center = useMemo(() => vec(size / 2, size / 2), [size]);

  const ringBody = useMemo(() => {
    const outer = Skia.Path.Circle(size / 2, size / 2, outerRadius);
    const inner = Skia.Path.Circle(size / 2, size / 2, innerRadius);
    return Skia.Path.MakeFromOp(outer, inner, PathOp.Difference);
  }, [size, outerRadius, innerRadius]);

  const arcPath = useMemo(
    () =>
      Skia.PathBuilder.Make()
        .addOval({
          x: pad + strokeWidth / 2,
          y: pad + strokeWidth / 2,
          width: contentSize - strokeWidth,
          height: contentSize - strokeWidth,
        })
        .build(),
    [pad, strokeWidth, contentSize],
  );

  const dotRadius = strokeWidth * 0.42;
  const dots = useMemo(() => {
    if (isRealMode) return [];
    return Array.from({ length: dayCount }, (_, i) => {
      const angle = (i / dayCount) * Math.PI * 2 - Math.PI / 2;
      return {
        cx: size / 2 + midRadius * Math.cos(angle),
        cy: size / 2 + midRadius * Math.sin(angle),
      };
    });
  }, [size, midRadius, dayCount, isRealMode]);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (value !== undefined) {
      progress.value = withTiming(value, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }
    const anim = withTiming(1, {
      duration: 3600,
      easing: Easing.inOut(Easing.cubic),
    });
    progress.value = loop ? withRepeat(anim, -1, true) : anim;
  }, [value, loop, progress]);

  const leadStart = useDerivedValue(() =>
    Math.max(0, progress.value - LEAD_TRAIL),
  );
  const leadOpacity = useDerivedValue(() =>
    interpolate(progress.value, [0, LEAD_TRAIL, 1], [0, 1, 1]),
  );

  const canvasStyle = useMemo(() => ({ width: size, height: size }), [size]);

  const sweepColors = useMemo(
    () => [
      primaryColor,
      illuminationColor,
      primaryColor,
      illuminationColor,
      primaryColor,
    ],
    [primaryColor, illuminationColor],
  );

  return (
    <Canvas style={canvasStyle}>
      {ringBody && (
        <Path path={ringBody} style="fill" color={trackColor} opacity={0.75} />
      )}

      <Path
        path={arcPath}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="butt"
        start={0}
        end={progress}
      >
        <SweepGradient
          c={center}
          colors={sweepColors}
          positions={[0, 0.25, 0.5, 0.75, 1]}
        />
      </Path>

      <Group opacity={leadOpacity}>
        <Path
          path={arcPath}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="butt"
          start={leadStart}
          end={progress}
          color={illuminationColor}
        />
      </Group>

      {!isRealMode && (
        <Group>
          {dots.map((dot, i) => (
            <DayDot
              key={i}
              cx={dot.cx}
              cy={dot.cy}
              r={dotRadius}
              litAt={(i + 1) / (dayCount + 1)}
              progress={progress}
              illuminationColor={illuminationColor}
              trackColor={trackColor}
            />
          ))}
        </Group>
      )}
    </Canvas>
  );
});

const DayDot = React.memo(function DayDot({
  cx,
  cy,
  r,
  litAt,
  progress,
  illuminationColor,
  trackColor,
}: {
  cx: number;
  cy: number;
  r: number;
  litAt: number;
  progress: { value: number };
  illuminationColor: string;
  trackColor: string;
}) {
  const window = 0.08;

  const dotColor = useDerivedValue(() =>
    progress.value >= litAt ? illuminationColor : trackColor,
  );

  const animatedR = useDerivedValue(() =>
    interpolate(
      progress.value,
      [litAt - window, litAt, litAt + window],
      [r, r * 1.35, r * 1.15],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );

  const haloR = useDerivedValue(() => {
    const d = Math.abs(progress.value - litAt);
    if (d > window) return 0;
    return r * (2.4 - (d / window) * 1.4);
  });

  const haloOpacity = useDerivedValue(() => {
    const d = Math.abs(progress.value - litAt);
    if (d > window) return 0;
    return 0.6 * (1 - d / window);
  });

  return (
    <Group>
      <Circle
        cx={cx}
        cy={cy}
        r={haloR}
        color={illuminationColor}
        opacity={haloOpacity}
      />
      <Circle cx={cx} cy={cy} r={animatedR} color={dotColor} />
    </Group>
  );
});

export default StreakRing;
