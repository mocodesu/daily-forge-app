// ─────────────────────────────────────────────────────────────
// NotificationPulse — concentric rings pulsing outward
//
// Three staggered rings expand from a center point and fade. The
// parent overlays an Ionicons bell in the middle using an absolute
// positioned View — easier and cleaner than drawing the bell shape
// in Skia.
//
// The rhythm is a continuous ~2.2s loop with the rings offset by
// a third of the cycle so it never looks synchronized.
// ─────────────────────────────────────────────────────────────
import { Canvas, Circle } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import {
  Easing,
  interpolate,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface NotificationPulseProps {
  size: number;
  primaryColor: string;
  illuminationColor: string;
}

const NotificationPulse = React.memo(function NotificationPulse({
  size,
  primaryColor,
  illuminationColor,
}: NotificationPulseProps) {
  const center = size / 2;
  const baseR = size * 0.12;

  return (
    <Canvas style={{ width: size, height: size }}>
      <PulseRing
        center={center}
        baseR={baseR}
        maxR={size * 0.46}
        color={illuminationColor}
        duration={2200}
        delay={0}
      />
      <PulseRing
        center={center}
        baseR={baseR}
        maxR={size * 0.46}
        color={illuminationColor}
        duration={2200}
        delay={733}
      />
      <PulseRing
        center={center}
        baseR={baseR}
        maxR={size * 0.46}
        color={illuminationColor}
        duration={2200}
        delay={1466}
      />

      {/* Solid center dot under the bell icon overlay */}
      <Circle cx={center} cy={center} r={baseR * 0.85} color={primaryColor} />
    </Canvas>
  );
});

function PulseRing({
  center,
  baseR,
  maxR,
  color,
  duration,
  delay,
}: {
  center: number;
  baseR: number;
  maxR: number;
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

  const r = useDerivedValue(() => interpolate(t.value, [0, 1], [baseR, maxR]));
  const opacity = useDerivedValue(() =>
    interpolate(t.value, [0, 0.15, 0.7, 1], [0, 0.6, 0.2, 0]),
  );

  return (
    <Circle
      cx={center}
      cy={center}
      r={r}
      style="stroke"
      strokeWidth={1.6}
      color={color}
      opacity={opacity}
    />
  );
}

export default NotificationPulse;
