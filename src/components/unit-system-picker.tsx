import Text from "@/components/text";
import { useUnitSystem, type UnitSystem } from "@/hooks/use-unit-system";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const OPTIONS: {
  key: UnitSystem;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "metric",
    label: "Metric",
    detail: "kg · cm",
    icon: "globe-outline",
  },
  {
    key: "imperial",
    label: "Imperial",
    detail: "lb · ft/in",
    icon: "globe-outline",
  },
];

export function UnitSystemPicker() {
  const { theme } = useUnistyles();
  const { system, setSystem } = useUnitSystem();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="subheadBold" color="onSurface">
          Units
        </Text>
        <Text variant="caption" color="mutedText">
          How weight and height are displayed across the app.
        </Text>
      </View>

      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const selected = system === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setSystem(opt.key)}
              style={[
                styles.option,
                {
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.panelBorder,
                  backgroundColor: selected
                    ? theme.colors.panel
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                color={selected ? theme.colors.primary : theme.colors.mutedText}
              />
              <View style={{ gap: 2 }}>
                <Text
                  variant="subheadBold"
                  color={selected ? "primary" : "onSurface"}
                >
                  {opt.label}
                </Text>
                <Text variant="caption" color="mutedText">
                  {opt.detail}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing.sm,
  },
  header: {
    gap: theme.spacing.xxs,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
  },
}));
