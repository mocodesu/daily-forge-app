import * as Haptics from "expo-haptics";
import { GestureResponderEvent, Platform } from "react-native";

export type HapticType =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

const CONFIG = {
  minTriggerIntervalMs: 40,
  enabled: true,
};

let lastTriggerAt = 0;

const hapticErrorHandler = (error: unknown) => {
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
      case "heavy":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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

export function triggerHapticIf(
  condition: boolean,
  type: HapticType = "selection",
) {
  if (condition) {
    triggerHaptic(type);
  }
}
