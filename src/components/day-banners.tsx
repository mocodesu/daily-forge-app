import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function MinimumNotMetBanner({
  count,
  minimum,
  onAdd,
}: {
  count: number;
  minimum: number;
  onAdd: () => void;
}) {
  const remaining = Math.max(0, minimum - count);

  return (
    <View style={styles.banner}>
      <PrimaryIcon name="warning-outline" size={22} />

      <View style={styles.body}>
        <Text variant="subheadBold" color="onSurface">
          Add {remaining} more exercise{remaining === 1 ? "" : "s"}
        </Text>
        <Text variant="caption" color="mutedText">
          You need at least {minimum} exercises per day.
        </Text>
      </View>

      <HapticPressable haptic="medium" onPress={onAdd} style={styles.action}>
        <Text variant="caption" color="onPrimary">
          Add
        </Text>
      </HapticPressable>
    </View>
  );
}

export function AllDoneBanner({ onLock }: { onLock: () => void }) {
  return (
    <View style={styles.banner}>
      <PrimaryIcon name="checkmark-circle" size={22} />

      <View style={styles.body}>
        <Text variant="subheadBold" color="onSurface">
          All exercises done!
        </Text>
        <Text variant="caption" color="mutedText">
          Lock the day when you're ready.
        </Text>
      </View>

      <HapticPressable haptic="medium" onPress={onLock} style={styles.action}>
        <Text variant="caption" color="onPrimary">
          I'm done
        </Text>
      </HapticPressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.primary,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  action: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primary,
  },
}));
