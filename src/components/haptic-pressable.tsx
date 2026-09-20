import { Pressable, PressableProps } from "react-native";
import { HapticType, withHaptic } from "../utils/haptics";

type HapticPressableProps = PressableProps & {
  haptic?: HapticType;
};

export function HapticPressable({
  haptic = "selection",
  onPress,
  accessibilityRole = "button",
  accessible = true,
  ...props
}: HapticPressableProps) {
  return (
    <Pressable
      {...props}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      onPress={withHaptic(onPress, haptic)}
    />
  );
}
