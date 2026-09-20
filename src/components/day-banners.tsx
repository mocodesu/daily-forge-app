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
  const noun = remaining === 1 ? "exercise" : "exercises";

  return (
    <View testID="minimum-not-met-banner" style={styles.banner}>
      <PrimaryIcon name="lock-closed-outline" size={22} />

      <View style={styles.body}>
        <Text variant="subheadBold" color="onSurface">
          {count} of {minimum} exercises set up
        </Text>
        <Text variant="caption" color="mutedText">
          Add {remaining} more {noun} to be able to seal the day. Sealing
          requires at least {minimum} exercises.
        </Text>
      </View>

      <HapticPressable
        testID="minimum-not-met-add"
        haptic="medium"
        onPress={onAdd}
        style={styles.action}
      >
        <Text variant="caption" color="onPrimary">
          Add {remaining}
        </Text>
      </HapticPressable>
    </View>
  );
}

export function AllDoneBanner({ onLock }: { onLock: () => void }) {
  return (
    <View testID="all-done-banner" style={styles.banner}>
      <PrimaryIcon name="checkmark-circle" size={22} />

      <View style={styles.body}>
        <Text variant="subheadBold" color="onSurface">
          All exercises done
        </Text>
        <Text variant="caption" color="mutedText">
          Seal the day with your oath when you're ready.
        </Text>
      </View>

      <HapticPressable
        testID="all-done-seal"
        haptic="medium"
        onPress={onLock}
        style={styles.action}
      >
        <Text variant="caption" color="onPrimary">
          Seal the day
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
