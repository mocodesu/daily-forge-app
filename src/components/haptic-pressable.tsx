import { Pressable, PressableProps } from "react-native";
import { HapticType, withHaptic } from "../utils/haptics";

type HapticPressableProps = PressableProps & {
  haptic?: HapticType;
};

export function HapticPressable({
  haptic = "selection",
  onPress,
  ...props
}: HapticPressableProps) {
  return <Pressable {...props} onPress={withHaptic(onPress, haptic)} />;
}
