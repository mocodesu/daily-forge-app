import Text from "@/components/text";
import { useUnitSystem, type UnitSystem } from "@/hooks/use-unit-system";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

const OPTIONS: {
  key: UnitSystem;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "metric", label: "Metric", detail: "kg · cm", icon: "globe-outline" },
  {
    key: "imperial",
    label: "Imperial",
    detail: "lb · ft/in",
    icon: "globe-outline",
  },
];

export function UnitSystemPicker() {
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
              testID={`units-${opt.key}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setSystem(opt.key)}
              style={[
                styles.option,
                selected ? styles.optionSelected : styles.optionIdle,
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                style={selected ? styles.iconSelected : styles.iconIdle}
              />
              <View style={styles.optionText}>
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
  container: { gap: theme.spacing.sm },
  header: { gap: theme.spacing.xxs },
  row: { flexDirection: "row", gap: theme.spacing.sm },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.panel,
  },
  optionIdle: {
    borderColor: theme.colors.panelBorder,
    backgroundColor: "transparent",
  },
  iconSelected: { color: theme.colors.primary },
  iconIdle: { color: theme.colors.mutedText },
  optionText: { gap: 2 },
}));
