// ─────────────────────────────────────────────────────────────
// BMIGauge — horizontal gauge with a marker at the current BMI
//
// Five colored bands from BMI 15 to 40:
//   15–18.5  underweight  (blue)
//   18.5–25  normal       (green)
//   25–30    overweight   (amber)
//   30–35    obese I      (orange)
//   35–40+   obese II+    (red)
//
// The marker is drawn at x=0 and moved into place with a Group
// transform, so the shared value never has to be passed into
// vec(). That's the standard pattern for "make a static shape
// follow an animated value" in Skia.
// ─────────────────────────────────────────────────────────────
import { Canvas, Group, Line, Rect, vec } from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface BMIGaugeProps {
  width: number;
  bmi: number;
  markerColor: string;
}

const MIN_BMI = 15;
const MAX_BMI = 40;
const SEGMENTS: { max: number; color: string }[] = [
  { max: 18.5, color: "#60A5FA" },
  { max: 25, color: "#22C55E" },
  { max: 30, color: "#F59E0B" },
  { max: 35, color: "#F97316" },
  { max: 40, color: "#EF4444" },
];

const BMIGauge = React.memo(function BMIGauge({
  width,
  bmi,
  markerColor,
}: BMIGaugeProps) {
  const height = 28;
  const barHeight = 12;
  const barY = height - barHeight;

  const clamped = Math.max(MIN_BMI, Math.min(MAX_BMI, bmi || MIN_BMI));
  const targetX = ((clamped - MIN_BMI) / (MAX_BMI - MIN_BMI)) * width;

  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(targetX, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetX, x]);

  const bars = useMemo(() => {
    return SEGMENTS.map((seg, i) => {
      const startBmi = i === 0 ? MIN_BMI : SEGMENTS[i - 1].max;
      const endBmi = seg.max;
      const x0 = ((startBmi - MIN_BMI) / (MAX_BMI - MIN_BMI)) * width;
      const x1 = ((endBmi - MIN_BMI) / (MAX_BMI - MIN_BMI)) * width;
      return { x: x0, w: x1 - x0, color: seg.color, key: i };
    });
  }, [width]);

  const markerOpacity = useDerivedValue(() => (bmi > 0 ? 1 : 0));

  // Static vecs — never animate these. The Group transform moves
  // the marker instead.
  const p1 = useMemo(() => vec(0, barY - 6), [barY]);
  const p2 = useMemo(() => vec(0, barY + barHeight + 4), [barY]);

  const markerTransform = useDerivedValue(() => [{ translateX: x.value }]);

  return (
    <Canvas style={{ width, height }}>
      <Group>
        {bars.map((b) => (
          <Rect
            key={b.key}
            x={b.x}
            y={barY}
            width={b.w}
            height={barHeight}
            color={b.color}
            opacity={0.75}
          />
        ))}
      </Group>

      <Group opacity={markerOpacity}>
        <Group transform={markerTransform}>
          <Line
            p1={p1}
            p2={p2}
            strokeWidth={2}
            color={markerColor}
            strokeCap="round"
          />
        </Group>
      </Group>
    </Canvas>
  );
});

export default BMIGauge;
