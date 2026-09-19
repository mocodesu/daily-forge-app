import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/**
 * Shared failure surface for screens whose data load can fail.
 * Deliberately minimal — icon, headline, one-line reason, retry.
 * Matches the visual language of the other state containers
 * (EmptyState, LockedState) so a broken load doesn't look like a
 * different app.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this screen. Try again in a moment.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.container}>
      <PrimaryIcon name="alert-circle-outline" size={56} />

      <Text variant="h2" color="onBackground" style={styles.title}>
        {title}
      </Text>

      <Text variant="subhead" color="mutedText" style={styles.body}>
        {message}
      </Text>

      {onRetry && (
        <HapticPressable
          haptic="medium"
          onPress={onRetry}
          style={styles.button}
        >
          <Text variant="subheadBold" color="onPrimary">
            Try again
          </Text>
        </HapticPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.huge,
    gap: theme.spacing.sm,
  },
  title: { textAlign: "center" },
  body: {
    textAlign: "center",
    maxWidth: 320,
    paddingHorizontal: theme.spacing.md,
  },
  button: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
}));
