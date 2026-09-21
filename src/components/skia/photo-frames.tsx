// ─────────────────────────────────────────────────────────────
// PhotoFrames — two dashed frames glide in and connect
//
// Two dashed rectangles enter from opposite sides, settle into
// place over ~700ms, then a soft connecting line draws between
// them with a sparkle at the midpoint.
//
// The parent renders the actual photo capture UI below. This
// animation is purely a header illustration.
// ─────────────────────────────────────────────────────────────
import {
  Canvas,
  Circle,
  Group,
  Path,
  RoundedRect,
  Skia,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import {
  Easing,
  interpolate,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface PhotoFramesProps {
  width: number;
  height?: number;
  primaryColor: string;
  illuminationColor: string;
}

const FRAME_W = 52;
const FRAME_H = 68;
const FRAME_GAP = 20;

const PhotoFrames = React.memo(function PhotoFrames({
  width,
  height = 90,
  primaryColor,
  illuminationColor,
}: PhotoFramesProps) {
  const cx = width / 2;
  const cy = height / 2;

  const leftTargetX = cx - FRAME_GAP / 2 - FRAME_W;
  const rightTargetX = cx + FRAME_GAP / 2;

  const leftOffset = useSharedValue(-FRAME_W * 1.6);
  const rightOffset = useSharedValue(FRAME_W * 1.6);
  const lineProgress = useSharedValue(0);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    leftOffset.value = withDelay(
      100,
      withTiming(0, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      }),
    );
    rightOffset.value = withDelay(
      100,
      withTiming(0, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      }),
    );
    lineProgress.value = withDelay(
      700,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );
    sparkle.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [leftOffset, rightOffset, lineProgress, sparkle]);

  const leftX = useDerivedValue(() => leftTargetX + leftOffset.value);
  const rightX = useDerivedValue(() => rightTargetX + rightOffset.value);

  const sparkleR = useDerivedValue(() => 3 + sparkle.value * 6);
  const sparkleOpacity = useDerivedValue(() =>
    interpolate(sparkle.value, [0, 1], [0.4, 0.15]),
  );

  // Connecting line between the two frames, drawn when they land.
  const linePath = useMemo(() => {
    const p = Skia.PathBuilder.Make();
    p.moveTo(leftTargetX + FRAME_W, cy);
    p.lineTo(rightTargetX, cy);
    return p.build();
  }, [leftTargetX, rightTargetX, cy]);

  return (
    <Canvas style={{ width, height }}>
      {/* Left frame */}
      <Group transform={[{ translateX: leftOffset.value }]}>
        <RoundedRect
          x={leftTargetX}
          y={cy - FRAME_H / 2}
          width={FRAME_W}
          height={FRAME_H}
          r={8}
          color={primaryColor}
          opacity={0.14}
          style="stroke"
          strokeWidth={2}
        />
      </Group>

      {/* Right frame */}
      <Group transform={[{ translateX: rightOffset.value }]}>
        <RoundedRect
          x={rightTargetX}
          y={cy - FRAME_H / 2}
          width={FRAME_W}
          height={FRAME_H}
          r={8}
          color={primaryColor}
          opacity={0.14}
          style="stroke"
          strokeWidth={2}
        />
      </Group>

      {/* Connecting line */}
      <Path
        path={linePath}
        style="stroke"
        strokeWidth={1.5}
        strokeCap="round"
        color={illuminationColor}
        start={0}
        end={lineProgress}
      />

      {/* Sparkle at the midpoint */}
      <Circle
        cx={cx}
        cy={cy}
        r={sparkleR}
        color={illuminationColor}
        opacity={sparkleOpacity}
      />
      <Circle cx={cx} cy={cy} r={2} color={illuminationColor} />
    </Canvas>
  );
});

export default PhotoFrames;
