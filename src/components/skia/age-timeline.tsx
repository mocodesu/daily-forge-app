// ─────────────────────────────────────────────────────────────
// AgeTimeline — horizontal timeline with a marker at your age
//
// A static track with six tick marks (0, 20, 40, 60, 80, 100).
// A marker dot slides smoothly to the user's age whenever it
// changes. The dot has a subtle pulse halo so it reads as live
// even while the user is typing.
//
// Renders nothing at age = 0 (before the user has typed anything).
// ─────────────────────────────────────────────────────────────
import { Canvas, Circle, Group, Line, vec } from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface AgeTimelineProps {
  width: number;
  age: number;
  primaryColor: string;
  illuminationColor: string;
  trackColor: string;
  maxAge?: number;
  tickCount?: number;
}

const AgeTimeline = React.memo(function AgeTimeline({
  width,
  age,
  primaryColor,
  illuminationColor,
  trackColor,
  maxAge = 100,
  tickCount = 6,
}: AgeTimelineProps) {
  const height = 44;
  const padX = 14;
  const midY = height / 2;
  const usable = width - padX * 2;

  const clampedAge = Math.max(0, Math.min(maxAge, age || 0));
  const targetX = padX + (usable * clampedAge) / maxAge;

  const x = useSharedValue(padX);

  useEffect(() => {
    x.value = withTiming(targetX, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetX, x]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);

  const haloR = useDerivedValue(() => 6 + pulse.value * 5);
  const haloOpacity = useDerivedValue(() => 0.35 - pulse.value * 0.25);

  const ticks = useMemo(() => {
    return Array.from({ length: tickCount }, (_, i) => {
      const p = i / (tickCount - 1);
      return { x: padX + usable * p, key: i };
    });
  }, [padX, usable, tickCount]);

  return (
    <Canvas style={{ width, height }}>
      <Line
        p1={vec(padX, midY)}
        p2={vec(width - padX, midY)}
        strokeWidth={2}
        color={trackColor}
        strokeCap="round"
      />

      <Group>
        {ticks.map((t) => (
          <Line
            key={t.key}
            p1={vec(t.x, midY - 5)}
            p2={vec(t.x, midY + 5)}
            strokeWidth={1.5}
            color={trackColor}
            strokeCap="round"
          />
        ))}
      </Group>

      <Circle
        cx={x}
        cy={midY}
        r={haloR}
        color={illuminationColor}
        opacity={haloOpacity}
      />
      <Circle cx={x} cy={midY} r={5} color={primaryColor} />
      <Circle cx={x} cy={midY} r={2.4} color={illuminationColor} />
    </Canvas>
  );
});

export default AgeTimeline;
