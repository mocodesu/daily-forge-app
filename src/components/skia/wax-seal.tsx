// ─────────────────────────────────────────────────────────────
// WaxSeal — themed wax impression with drop + glow pulse
//
// The seal is four overlapping circles of slightly different
// radii and offsets, producing an irregular organic edge without
// path math.
//
// Timeline (2.9s loop):
//   0.00 – 0.30  seal falls with a growing shadow
//   0.30 – 0.45  impact squash + bounce
//   0.45 – 0.60  seal settles, impression ring appears
//   0.60 – 0.95  glow shockwave radiates outward and fades
//   0.95 – 1.00  brief pause, loop resets
//
// All colors are props so the caller can theme this to the app's
// accent. Defaults preserve the traditional red wax look.
// ─────────────────────────────────────────────────────────────
import {
  Canvas,
  Circle,
  Group,
  RadialGradient,
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

interface WaxSealProps {
  size: number;
  /** Deep wax color — the outer edge. */
  waxColor?: string;
  /** Lighter wax color — highlight and inner ring. */
  waxHighlight?: string;
  /** The page behind the seal. */
  surfaceColor: string;
}

const WaxSeal = React.memo(function WaxSeal({
  size,
  waxColor = "#B91C1C",
  waxHighlight = "#F87171",
  surfaceColor,
}: WaxSealProps) {
  const center = useMemo(() => vec(size / 2, size / 2), [size]);
  const canvasStyle = useMemo(() => ({ width: size, height: size }), [size]);

  const baseR = size * 0.22;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2900,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      false,
    );
  }, [progress]);

  const sealY = useDerivedValue(() =>
    interpolate(progress.value, [0, 0.3, 0.45, 1], [-size * 0.5, 0, 0, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const sealScaleX = useDerivedValue(() =>
    interpolate(
      progress.value,
      [0, 0.28, 0.32, 0.42, 0.55, 1],
      [1, 1, 1.18, 0.94, 1, 1],
    ),
  );

  const sealScaleY = useDerivedValue(() =>
    interpolate(
      progress.value,
      [0, 0.28, 0.32, 0.42, 0.55, 1],
      [1, 1, 0.82, 1.06, 1, 1],
    ),
  );

  const sealOpacity = useDerivedValue(() =>
    interpolate(progress.value, [0, 0.15, 1], [0, 1, 1], {
      extrapolateLeft: "clamp",
    }),
  );

  const impressionScale = useDerivedValue(() =>
    interpolate(progress.value, [0.3, 0.55, 1], [0.9, 1.05, 1.05], {
      extrapolateLeft: "clamp",
    }),
  );

  const impressionOpacity = useDerivedValue(() =>
    interpolate(progress.value, [0.3, 0.55, 1], [0, 0.35, 0.35], {
      extrapolateLeft: "clamp",
    }),
  );

  const shockScale = useDerivedValue(() =>
    interpolate(progress.value, [0.6, 1], [1, 3.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const shockOpacity = useDerivedValue(() =>
    interpolate(progress.value, [0.6, 0.72, 0.95, 1], [0, 0.7, 0.15, 0]),
  );

  const sealTransform = useDerivedValue(() => [
    { translateY: sealY.value },
    { scaleX: sealScaleX.value },
    { scaleY: sealScaleY.value },
  ]);

  const impressionTransform = useDerivedValue(() => [
    { scale: impressionScale.value },
  ]);

  const shockTransform = useDerivedValue(() => [{ scale: shockScale.value }]);

  const lobes = [
    { dx: 0, dy: -0.06, r: 1.0 },
    { dx: 0.07, dy: 0.04, r: 0.92 },
    { dx: -0.06, dy: 0.05, r: 0.95 },
    { dx: 0.02, dy: 0.07, r: 0.88 },
  ];

  return (
    <Canvas style={canvasStyle}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size * 0.46}
        color={surfaceColor}
        opacity={0.25}
      />

      <Group transform={shockTransform} origin={center} opacity={shockOpacity}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={baseR}
          style="stroke"
          strokeWidth={size * 0.015}
          color={waxHighlight}
        />
      </Group>

      <Group
        transform={impressionTransform}
        origin={center}
        opacity={impressionOpacity}
      >
        <Circle cx={size / 2} cy={size / 2} r={baseR * 1.08} color={waxColor} />
      </Group>

      <Group transform={sealTransform} origin={center} opacity={sealOpacity}>
        <Circle
          cx={size / 2}
          cy={size / 2 + baseR * 0.08}
          r={baseR * 1.02}
          color="#000000"
          opacity={0.22}
        />

        {lobes.map((lobe, i) => (
          <Circle
            key={i}
            cx={size / 2 + lobe.dx * baseR}
            cy={size / 2 + lobe.dy * baseR}
            r={baseR * lobe.r}
          >
            <RadialGradient
              c={vec(size / 2 - baseR * 0.25, size / 2 - baseR * 0.25)}
              r={baseR * 1.6}
              colors={[waxHighlight, waxColor]}
              positions={[0.1, 1]}
            />
          </Circle>
        ))}

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={baseR * 0.68}
          style="stroke"
          strokeWidth={size * 0.008}
          color={waxHighlight}
          opacity={0.55}
        />

        <Circle
          cx={size / 2 - baseR * 0.4}
          cy={size / 2 - baseR * 0.42}
          r={baseR * 0.18}
          color="#FFFFFF"
          opacity={0.35}
        />
      </Group>
    </Canvas>
  );
});

export default WaxSeal;
