import Text from "@/components/text";
import { UnitSystemPicker } from "@/components/unit-system-picker";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function UnitsStep() {
  return (
    <View style={styles.step}>
      <Text variant="h2" color="onBackground" style={styles.title}>
        Which units do you use?
      </Text>
      <Text variant="callout" color="mutedText" style={styles.body}>
        You can change this later in Settings.
      </Text>
      <View style={styles.pickerWrap}>
        <UnitSystemPicker />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  step: {
    alignItems: "center",
    width: "100%",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.4,
    maxWidth: 340,
  },
  body: {
    textAlign: "center",
    maxWidth: 320,
  },
  pickerWrap: {
    width: "100%",
    maxWidth: 400,
    marginTop: theme.spacing.md,
  },
}));
