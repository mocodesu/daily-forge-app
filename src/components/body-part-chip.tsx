import Text from "@/components/text";
import type { BodyPart } from "@/types/dailyforge";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

/** SF Material icon per body part. Falls back to a generic dumbbell. */
const ICONS: Record<BodyPart, keyof typeof Ionicons.glyphMap> = {
  Chest: "fitness-outline",
  Back: "body-outline",
  Shoulders: "body-outline",
  Arms: "barbell-outline",
  Core: "ellipse-outline",
  Legs: "walk-outline",
  Glutes: "walk-outline",
  "Full Body": "accessibility-outline",
  Cardio: "heart-outline",
};

export function BodyPartChip({
  part,
  selected,
  onPress,
}: {
  part: BodyPart;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.panel,
          borderColor: selected
            ? theme.colors.primary
            : theme.colors.panelBorder,
        },
      ]}
      hitSlop={6}
    >
      <Ionicons
        name={selected ? "checkmark" : ICONS[part]}
        size={14}
        color={selected ? theme.colors.onPrimary : theme.colors.mutedText}
      />
      <Text variant="subhead" color={selected ? "onPrimary" : "onSurface"}>
        {part}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: theme.borderWidth.thin,
  },
}));
