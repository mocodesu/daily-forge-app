import Text from "@/components/text";
import type { BodyPart } from "@/types/dailyforge";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

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
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
    >
      <Ionicons
        name={selected ? "checkmark" : ICONS[part]}
        size={14}
        style={selected ? styles.iconSelected : styles.iconIdle}
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
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipIdle: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
  },
  iconSelected: { color: theme.colors.onPrimary },
  iconIdle: { color: theme.colors.mutedText },
}));
