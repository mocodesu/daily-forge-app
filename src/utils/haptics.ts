import * as Haptics from "expo-haptics";
import { GestureResponderEvent, Platform } from "react-native";

/**
 * ============================================================================
 * HAPTIC FEEDBACK UTILITY
 * ============================================================================
 * Central place for haptic triggers, throttling, and high-level wrappers
 * that keep UI code clean.
 *
 * HOW IT AVOIDS SPAM:
 *   - A built-in throttle (CONFIG.minTriggerIntervalMs) prevents rapid
 *     consecutive triggers from feeling overwhelming.
 *   - The global enable flag (CONFIG.enabled) lets you turn off haptics
 *     across the whole app without touching every call site.
 * ============================================================================
 */

export type HapticType =
  | "selection"
  | "light"
  | "medium"
  | "success"
  | "warning"
  | "error";

const CONFIG = {
  /** Minimum time (ms) between two actual haptic triggers. */
  minTriggerIntervalMs: 40,

  /** Set to `false` to suppress all haptics (e.g. when user disables them). */
  enabled: true,
};

let lastTriggerAt = 0;

const hapticErrorHandler = (error: unknown) => {
  // Downgraded from console.error. Haptics are cosmetic — a device
  // without a haptic engine, or a user who has disabled haptics
  // system-wide, will trip this path harmlessly. Logged at warn so
  // it doesn't pollute error aggregation.
  console.warn("Haptic trigger failed:", error);
};

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
