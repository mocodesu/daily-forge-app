import * as Haptics from "expo-haptics";
import { GestureResponderEvent, Platform } from "react-native";

/**
 * ============================================================================
 * HAPTIC FEEDBACK UTILITY — reusable template
 * ============================================================================
 * Provides a central place for haptic triggers, throttling, and high-level
 * wrappers that keep your UI code clean.  Nothing project-specific – drop
 * this file in and customise the sections below.
 *
 * WHAT TO CUSTOMIZE (search for "CUSTOMIZE"):
 *   1. CONFIG                        – throttle interval, global enable/disable
 *   2. hapticErrorHandler()          – how to handle (or ignore) haptic failures
 *
 * HOW TO WIRE IT UP:
 *   - Call `triggerHaptic()` directly in callbacks.
 *   - Use `withHaptic(handler, 'light')` to wrap any `onPress` and get
 *     haptic + your logic with zero extra boilerplate.
 *   - Drop `<HapticPressable>` anywhere you would use `<Pressable>` – it
 *     adds a `haptic` prop with a sensible default.
 *
 * HOW IT AVOIDS SPAM:
 *   - A built‑in throttle (CONFIG.minTriggerIntervalMs) prevents rapid
 *     consecutive triggers from feeling overwhelming.
 *   - The global enable flag (CONFIG.enabled) lets you turn off haptics
 *     across the whole app (e.g. accessibility setting) without touching
 *     every call site.
 * ============================================================================
 */

export type HapticType =
  | "selection"
  | "light"
  | "medium"
  | "success"
  | "warning"
  | "error";

// ---------------------------------------------------------------------------
// CUSTOMIZE #1: adjust the throttle interval or disable haptics globally.
// ---------------------------------------------------------------------------
const CONFIG = {
  /** Minimum time (ms) between two actual haptic triggers. */
  minTriggerIntervalMs: 40,

  /** Set to `false` to suppress all haptics (e.g. when user disables them). */
  enabled: true,
};

let lastTriggerAt = 0;

// ---------------------------------------------------------------------------
// CUSTOMIZE #2: change how haptic failures are logged or reported.
// For example, you might send the error to a crash-reporting service.
// ---------------------------------------------------------------------------
const hapticErrorHandler = (error: unknown) => {
  console.error("Haptic trigger failed:", error);
};

// ---------------------------------------------------------------------------

export function triggerHaptic(type: HapticType = "selection") {
  if (Platform.OS === "web" || !CONFIG.enabled) return;

  const now = Date.now();
  if (now - lastTriggerAt < CONFIG.minTriggerIntervalMs) return;
  lastTriggerAt = now;

  (async () => {
    switch (type) {
      case "selection":
        await Haptics.selectionAsync();
        break;
      case "light":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "success":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        break;
      case "warning":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        break;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  })().catch(hapticErrorHandler);
}

/**
 * Wrap any press callback with haptic feedback.
 */
type PressHandler = ((event: GestureResponderEvent) => void) | null | undefined;

export function withHaptic(
  callback: PressHandler,
  type: HapticType = "selection",
): (event: GestureResponderEvent) => void {
  return (event) => {
    triggerHaptic(type);
    callback?.(event);
  };
}

/**
 * Fire haptic only if a condition is true.
 */
export function triggerHapticIf(
  condition: boolean,
  type: HapticType = "selection",
) {
  if (condition) {
    triggerHaptic(type);
  }
}

/**
 * 
 * <Pressable
  onPress={withHaptic(() => {
    navigation.navigate("Settings");
  })}
/>

type HapticPressableProps = PressableProps & {
  haptic?: HapticType;
};

export function HapticPressable({
  haptic = "selection",
  onPress,
  ...props
}: HapticPressableProps) {
  return (
    <Pressable
      {...props}
      onPress={withHaptic(onPress, haptic)}
    />
  );
}

<HapticPressable
  haptic="light"
  onPress={handlePress}
>
  ...
</HapticPressable>

  triggerHapticIf(isEnabled, "medium");
 */
