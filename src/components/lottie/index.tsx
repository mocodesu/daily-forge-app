// ─────────────────────────────────────────────────────────────
// Lottie wrappers
//
// IMPORTANT — why we use `.json` and not `.lottie`:
//
//   colorFilters does not work reliably on Android with the
//   `.lottie` (dotLottie) format. This is a documented library
//   limitation: "Changing color of layers: NOTE: This feature may
//   not work properly on Android."
//
//   The `.json` format supports colorFilters for solid Fill/Stroke
//   paints on both iOS and Android when paired with
//   `renderMode="SOFTWARE"`. Gradient paints still need to be
//   exported as theme variants or redesigned as solid paints.
//
// Three ways to theme an animation:
//
//   1. Single-color, wildcard:    color="..." (paints every layer)
//   2. Single-color, explicit:    color="..." + colorFilterKeypaths={[...]}
//   3. Multi-color, explicit:     colorFilters={[{ keypaths: [...], color: "..." }, ...]}
//
// For anything with more than one distinct color, use (3).
// ─────────────────────────────────────────────────────────────
import LottieView, { type LottieViewProps } from "lottie-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// ─────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────

/**
 * Maps a set of Lottie keypaths to a specific color.
 * Keypaths are dot-separated layer/group/shape paths that you can
 * inspect by walking the JSON (see the inspection script in the
 * project's docs or run one via Node).
 */
export interface ColorFilterGroup {
  keypaths: string[];
  color: string;
}

/**
 * Normalizes the two supported APIs into the shape LottieView
 * expects. Multi-group `colorFilters` takes precedence; otherwise
 * the single-color path is used.
 */
function resolveColorFilters(
  colorFilters: ColorFilterGroup[] | undefined,
  color: string | undefined,
  colorFilterKeypaths: string[] | undefined,
): { keypath: string; color: string }[] | undefined {
  if (colorFilters && colorFilters.length > 0) {
    return colorFilters.flatMap((group) =>
      group.keypaths.map((keypath) => ({
        keypath,
        color: group.color,
      })),
    );
  }
  if (color && colorFilterKeypaths && colorFilterKeypaths.length > 0) {
    return colorFilterKeypaths.map((keypath) => ({ keypath, color }));
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────
// AppLottie
// ─────────────────────────────────────────────────────────────
interface AppLottieProps {
  source: LottieViewProps["source"];
  size?: number;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;

  /**
   * Multi-color theming. Prefer this when the animation has more
   * than one visually distinct region (e.g. a ring with a dark
   * track plus a primary-colored progress arc).
   */
  colorFilters?: ColorFilterGroup[];

  /**
   * Single-color convenience. When set, remaps every matching
   * solid Fill/Stroke paint to this color. Combined with
   * `colorFilterKeypaths` to target specific layers, or used alone
   * to attempt a wildcard paint.
   *
   * @deprecated Prefer `colorFilters` for anything with more than
   * one color. Kept for backward compatibility.
   */
  color?: string;

  /**
   * Explicit keypaths for the single-color path. If omitted and
   * `color` is set, the wildcard `["**"]` is used.
   *
   * @deprecated Prefer `colorFilters`.
   */
  colorFilterKeypaths?: string[];

  style?: ViewStyle;
}

export function AppLottie({
  source,
  size,
  width,
  height,
  autoPlay = true,
  loop = true,
  speed = 1,
  colorFilters,
  color,
  colorFilterKeypaths = ["**"],
  style,
}: AppLottieProps) {
  const ref = useRef<LottieView>(null);

  const resolvedWidth = width ?? size ?? 200;
  const resolvedHeight = height ?? size ?? 200;

  const resolvedFilters = useMemo(
    () => resolveColorFilters(colorFilters, color, colorFilterKeypaths),
    [colorFilters, color, colorFilterKeypaths],
  );

  useEffect(() => {
    if (!autoPlay) return;
    ref.current?.reset();
    ref.current?.play();
  }, [autoPlay, source]);

  return (
    <View style={[styles.wrap, style]}>
      <LottieView
        ref={ref}
        source={source}
        autoPlay={false}
        loop={loop}
        speed={speed}
        colorFilters={resolvedFilters}
        // SOFTWARE render mode is required for colorFilters to
        // apply on Android. AUTOMATIC (the default) picks hardware
        // rendering for some animations, which drops the filter
        // silently.
        renderMode={resolvedFilters ? "SOFTWARE" : "AUTOMATIC"}
        style={{ width: resolvedWidth, height: resolvedHeight }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ProgressLottie
// ─────────────────────────────────────────────────────────────
const AnimatedLottieView = Reanimated.createAnimatedComponent(
  LottieView,
) as React.ComponentType<
  React.ComponentProps<typeof LottieView> & {
    animatedProps?: ReturnType<typeof useAnimatedProps>;
  }
>;

interface ProgressLottieProps {
  source: LottieViewProps["source"];
  /** 0..1. Animates smoothly to each new value. */
  progress: number;
  size?: number;
  width?: number;
  height?: number;
  /** Duration of the transition, ms. Default 1200. */
  duration?: number;

  /** See AppLottie. */
  colorFilters?: ColorFilterGroup[];
  /** @deprecated Prefer `colorFilters`. */
  color?: string;
  /** @deprecated Prefer `colorFilters`. */
  colorFilterKeypaths?: string[];

  style?: ViewStyle;
}

export function ProgressLottie({
  source,
  progress,
  size,
  width,
  height,
  duration = 1200,
  colorFilters,
  color,
  colorFilterKeypaths = ["**"],
  style,
}: ProgressLottieProps) {
  const resolvedWidth = width ?? size ?? 200;
  const resolvedHeight = height ?? size ?? 200;

  const clamped = Math.max(0, Math.min(1, progress));

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(clamped, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, duration, animatedProgress]);

  const animatedProps = useAnimatedProps(
    () =>
      ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress: animatedProgress.value,
      }) as any,
  );

  const resolvedFilters = useMemo(
    () => resolveColorFilters(colorFilters, color, colorFilterKeypaths),
    [colorFilters, color, colorFilterKeypaths],
  );

  return (
    <View style={[styles.wrap, style]}>
      <AnimatedLottieView
        source={source}
        autoPlay={false}
        loop={false}
        colorFilters={resolvedFilters}
        renderMode={resolvedFilters ? "SOFTWARE" : "AUTOMATIC"}
        animatedProps={animatedProps}
        style={{ width: resolvedWidth, height: resolvedHeight }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
