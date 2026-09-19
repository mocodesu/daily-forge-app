import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import React from "react";
import { Modal, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function DayCompletePrompt({
  visible,
  exerciseCount,
  onAddMore,
  onDone,
}: {
  visible: boolean;
  exerciseCount: number;
  onAddMore: () => void;
  onDone: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onAddMore}
    >
      <Pressable style={styles.backdrop} onPress={onAddMore}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <PrimaryIcon name="checkmark-circle" size={56} />

          <Text variant="h2" color="onSurface" style={styles.title}>
            Day complete!
          </Text>

          <Text variant="callout" color="mutedText" style={styles.body}>
            You finished all {exerciseCount} exercise
            {exerciseCount === 1 ? "" : "s"}. Ready to call it a day?
          </Text>

          <Text variant="caption" color="mutedText" style={styles.sub}>
            Rest is part of the plan. Come back tomorrow.
          </Text>

          <View style={styles.actions}>
            <Pressable onPress={onAddMore} style={styles.secondary}>
              <Text variant="subheadBold" color="onSurface">
                Add more
              </Text>
            </Pressable>

            <HapticPressable
              haptic="medium"
              onPress={onDone}
              style={styles.primary}
            >
              <Text variant="subheadBold" color="onPrimary">
                I'm done for today
              </Text>
            </HapticPressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.layout.screenPaddingH,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
    borderRadius: theme.radii.lg,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
  },
  title: { textAlign: "center", marginTop: theme.spacing.sm },
  body: { textAlign: "center", paddingHorizontal: theme.spacing.md },
  sub: { textAlign: "center" },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    width: "100%",
  },
  secondary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  primary: {
    flex: 1.4,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
  },
}));
