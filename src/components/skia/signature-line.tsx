// ─────────────────────────────────────────────────────────────
// SignatureLine — a hand-drawn signature that draws left-to-right
//
// A single flowing bezier curve, drawn once on mount over ~1.4s.
// A small bright "nib" travels with the leading edge, then fades
// at the end. Faint track behind so the full extent is visible
// even at 0% progress.
//
// Reads as "signing your name" — which is what the Name step is
// asking for.
// ─────────────────────────────────────────────────────────────
import { Canvas, Circle, Path, Skia } from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

interface SignatureLineProps {
  width: number;
  height?: number;
  primaryColor: string;
  illuminationColor: string;
}

const SignatureLine = React.memo(function SignatureLine({
  width,
  height = 44,
  primaryColor,
  illuminationColor,
}: SignatureLineProps) {
  const path = useMemo(() => {
    const p = Skia.PathBuilder.Make();
    const midY = height / 2;
    const amp = height * 0.3;
    p.moveTo(6, midY + amp * 0.3);
    p.cubicTo(
      width * 0.12,
      midY - amp,
      width * 0.22,
      midY + amp * 0.8,
      width * 0.34,
      midY - amp * 0.5,
    );
    p.cubicTo(
      width * 0.46,
      midY - amp * 1.3,
      width * 0.56,
      midY + amp * 0.9,
      width * 0.68,
      midY - amp * 0.3,
    );
    p.cubicTo(
      width * 0.78,
      midY + amp * 0.8,
      width * 0.86,
      midY - amp * 0.6,
      width - 6,
      midY + amp * 0.1,
    );
    return p.build();
  }, [width, height]);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      150,
      withTiming(1, {
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
  }, [progress]);

  const nibX = useDerivedValue(() => 6 + (width - 12) * progress.value);
  const nibOpacity = useDerivedValue(() => {
    const p = progress.value;
    if (p < 0.02 || p > 0.98) return 0;
    return 1;
  });

  return (
    <Canvas style={{ width, height }}>
      <Path
        path={path}
        style="stroke"
        strokeWidth={2.5}
        strokeCap="round"
        color={primaryColor}
        opacity={0.14}
      />
      <Path
        path={path}
        style="stroke"
        strokeWidth={2.5}
        strokeCap="round"
        color={primaryColor}
        start={0}
        end={progress}
      />
      <Circle
        cx={nibX}
        cy={height / 2}
        r={4}
        color={illuminationColor}
        opacity={nibOpacity}
      />
    </Canvas>
  );
});

export default SignatureLine;
