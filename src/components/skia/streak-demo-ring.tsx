// ─────────────────────────────────────────────────────────────
// StreakDemoRing — clean continuous fill with day markers
//
// One continuous arc fills 0 → 100% over 5s, then holds for 1.2s
// before looping. Seven day markers sit evenly around the
// circumference; each one flips from track color to accent color
// the moment the arc passes it. Nothing else animates.
//
// Design decisions, informed by the previous version looking busy:
//   • No segments. A single continuous arc reads as "the ring is
//     filling" without introducing gaps that read as stutter.
//   • No travelling dot. The arc's leading edge is already the
//     visual focus; a second moving element competed with it.
//   • No glow overlays. Segment flashes added noise without
//     adding meaning — the marker color flip is the only signal
//     the user needs.
//   • No per-segment sweep gradients. One gradient across the
//     whole ring, same as the History screen.
//   • Markers do not scale or pulse. They just flip color.
//     Subtle > busy.
// ─────────────────────────────────────────────────────────────
import {
  Canvas,
  Circle,
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

const FILL_MS = 5000;
const HOLD_MS = 1200;

interface StreakDemoRingProps {
  size: number;
  strokeWidth: number;
  trackColor: string;
  primaryColor: string;
  illuminationColor: string;
  /** Fires as the current day advances, 1 through 7. */
  onDayChange?: (day: number) => void;
}

const StreakDemoRing = React.memo(function StreakDemoRing({
  size,
  strokeWidth,
  trackColor,
  primaryColor,
  illuminationColor,
  onDayChange,
}: StreakDemoRingProps) {
  const pad = strokeWidth;
  const radius = (size - pad * 2) / 2;
  const center = useMemo(() => vec(size / 2, size / 2), [size]);

  const arcPath = useMemo(
    () =>
      Skia.PathBuilder.Make()
        .addOval({
          x: pad + strokeWidth / 2,
          y: pad + strokeWidth / 2,
          width: size - pad * 2 - strokeWidth,
          height: size - pad * 2 - strokeWidth,
        })
        .build(),
    [pad, strokeWidth, size],
  );

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: FILL_MS,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(1, { duration: HOLD_MS }),
        // Instant snap back to 0 for a clean loop.
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [progress]);

  const handleDayChange = useCallback(
    (d: number) => onDayChange?.(d),
    [onDayChange],
  );

  useAnimatedReaction(
    () =>
      Math.min(
        STREAK_DEMO_SEGMENT_COUNT,
        Math.max(1, Math.ceil(progress.value * STREAK_DEMO_SEGMENT_COUNT)),
      ),
    (curr, prev) => {
      if (curr !== prev) runOnJS(handleDayChange)(curr);
    },
  );

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

  // Day marker positions. Marker i sits at (i+1)/7 around the
  // circle from the top, so it lights when the arc passes it.
  const markerRadius = strokeWidth * 0.5;
  const markers = useMemo(
    () =>
      Array.from({ length: STREAK_DEMO_SEGMENT_COUNT }, (_, i) => {
        const litAt = (i + 1) / STREAK_DEMO_SEGMENT_COUNT;
        const angle = litAt * Math.PI * 2 - Math.PI / 2;
        return {
          cx: size / 2 + radius * Math.cos(angle),
          cy: size / 2 + radius * Math.sin(angle),
          litAt,
        };
      }),
    [size, radius],
  );

  const canvasStyle = useMemo(() => ({ width: size, height: size }), [size]);

  return (
    <Canvas style={canvasStyle}>
      {/* Track — full ring, subdued */}
      <Path
        path={arcPath}
        style="stroke"
        strokeWidth={strokeWidth}
        color={trackColor}
        opacity={0.4}
      />

      {/* Filled arc — one continuous gradient, same language as
          the History ring. `strokeCap: "butt"` so nothing
          protrudes past the arc endpoints. */}
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

      {/* Day markers — flip color when the arc passes them.
          No size animation, no glow, no halo. */}
      {markers.map((m, i) => (
        <DayMarker
          key={i}
          cx={m.cx}
          cy={m.cy}
          r={markerRadius}
          litAt={m.litAt}
          progress={progress}
          trackColor={trackColor}
          illuminationColor={illuminationColor}
        />
      ))}
    </Canvas>
  );
});

// ─────────────────────────────────────────────────────────────
// DayMarker — a single dot that changes color once the arc
// passes it. That's the entire behavior.
// ─────────────────────────────────────────────────────────────
function DayMarker({
  cx,
  cy,
  r,
  litAt,
  progress,
  trackColor,
  illuminationColor,
}: {
  cx: number;
  cy: number;
  r: number;
  litAt: number;
  progress: { value: number };
  trackColor: string;
  illuminationColor: string;
}) {
  const fillColor = useDerivedValue(() =>
    progress.value >= litAt ? illuminationColor : trackColor,
  );

  return <Circle cx={cx} cy={cy} r={r} color={fillColor} />;
}

export default StreakDemoRing;
