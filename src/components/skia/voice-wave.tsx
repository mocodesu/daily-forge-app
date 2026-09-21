// ─────────────────────────────────────────────────────────────
// VoiceWave — animated sound-wave visual for onboarding
//
// Reanimated 4 auto-captures dependencies for useDerivedValue.
// Passing an explicit dependencies array is a web-only feature
// and triggers a warning on native. Removed here.
// ─────────────────────────────────────────────────────────────
import { Canvas, Circle, Group, Path, Skia } from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import {
  Easing,
  interpolate,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface VoiceWaveProps {
  size: number;
  primaryColor: string;
  illuminationColor: string;
}

const VoiceWave = React.memo(function VoiceWave({
  size,
  primaryColor,
  illuminationColor,
}: VoiceWaveProps) {
  const centerY = size / 2;
  const maxAmplitude = size * 0.11;

  const driver = useSharedValue(0);

  useEffect(() => {
    driver.value = withRepeat(
      withTiming(1, {
        duration: 2400,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [driver]);

  const bgWavePath = useDerivedValue(() => {
    "worklet";
    const path = Skia.PathBuilder.Make();
    const N = 72;
    const stepX = size / N;
    const t = driver.value * Math.PI * 2 + 1.2;

    for (let i = 0; i <= N; i++) {
      const x = i * stepX;
      const centered = i / N - 0.5;
      const env = Math.exp(-(centered * centered) / 0.02);
      const y = centerY + maxAmplitude * env * Math.sin(t + i * 0.32);
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    return path.build();
  });

  const fgWavePath = useDerivedValue(() => {
    "worklet";
    const path = Skia.PathBuilder.Make();
    const N = 72;
    const stepX = size / N;
    const t = driver.value * Math.PI * 2;

    for (let i = 0; i <= N; i++) {
      const x = i * stepX;
      const centered = i / N - 0.5;
      const env = Math.exp(-(centered * centered) / 0.02);
      const y = centerY + maxAmplitude * env * Math.sin(t + i * 0.4);
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    return path.build();
  });

  const canvasStyle = useMemo(() => ({ width: size, height: size }), [size]);

  return (
    <Canvas style={canvasStyle}>
      <Pulse size={size} color={illuminationColor} duration={2000} delay={0} />
      <Pulse
        size={size}
        color={illuminationColor}
        duration={2000}
        delay={666}
      />
      <Pulse
        size={size}
        color={illuminationColor}
        duration={2000}
        delay={1333}
      />

      <Path
        path={bgWavePath}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
        color={primaryColor}
        opacity={0.35}
      />

      <Path
        path={fgWavePath}
        style="stroke"
        strokeWidth={2.2}
        strokeCap="round"
        color={illuminationColor}
      />

      <Group>
        <Circle
          cx={size / 2}
          cy={centerY}
          r={size * 0.035}
          color={illuminationColor}
          opacity={0.35}
        />
        <Circle
          cx={size / 2}
          cy={centerY}
          r={size * 0.014}
          color={primaryColor}
        />
      </Group>
    </Canvas>
  );
});

function Pulse({
  size,
  color,
  duration,
  delay,
}: {
  size: number;
  color: string;
  duration: number;
  delay: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.out(Easing.cubic),
        }),
        -1,
        false,
      ),
    );
  }, [t, duration, delay]);

  const r = useDerivedValue(() =>
    interpolate(t.value, [0, 1], [size * 0.12, size * 0.46]),
  );

  const opacity = useDerivedValue(() =>
    interpolate(t.value, [0, 0.2, 0.7, 1], [0, 0.5, 0.2, 0]),
  );

  return (
    <Circle
      cx={size / 2}
      cy={size / 2}
      r={r}
      style="stroke"
      strokeWidth={1.4}
      color={color}
      opacity={opacity}
    />
  );
}

export default VoiceWave;
