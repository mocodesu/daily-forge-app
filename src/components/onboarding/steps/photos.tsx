import { PhotoFrames } from "@/components/skia";
import Text from "@/components/text";
import { APP_NAME } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const FRAMES_WIDTH = 220;

export function PhotosStep({
  frontUri,
  sideUri,
  onFront,
  onSide,
}: {
  frontUri: string | null;
  sideUri: string | null;
  onFront: (uri: string | null) => void;
  onSide: (uri: string | null) => void;
}) {
  const { theme } = useUnistyles();

  const handleTap = (_which: "front" | "side") => {
    // Placeholder — Step E wires the picker.
  };

  return (
    <View style={styles.step}>
      <View style={styles.animationWrap}>
        <PhotoFrames
          width={FRAMES_WIDTH}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
        />
      </View>

      <Text variant="h2" color="onBackground" style={styles.title}>
        Your before photos
      </Text>

      <Text variant="callout" color="mutedText" style={styles.body}>
        Take two photos today. When you reach your goal, {APP_NAME} will show
        you the comparison side by side.
      </Text>

      <View style={styles.slots}>
        <PhotoSlot
          testID="onboarding-photos-front"
          label="Front"
          uri={frontUri}
          onPress={() => handleTap("front")}
        />
        <PhotoSlot
          testID="onboarding-photos-side"
          label="Side"
          uri={sideUri}
          onPress={() => handleTap("side")}
        />
      </View>

      <Pressable testID="onboarding-photos-skip" hitSlop={12}>
        <Text variant="caption" color="primary">
          Do this later
        </Text>
      </Pressable>
    </View>
  );
}

function PhotoSlot({
  testID,
  label,
  uri,
  onPress,
}: {
  testID: string;
  label: string;
  uri: string | null;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.slot}
    >
      <Ionicons
        name="camera-outline"
        size={32}
        color={theme.colors.mutedText}
      />
      <Text variant="subhead" color="mutedText">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  step: {
    alignItems: "center",
    width: "100%",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  animationWrap: {
    width: FRAMES_WIDTH,
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.4,
    maxWidth: 340,
  },
  body: {
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 22,
  },
  slots: {
    flexDirection: "row",
    gap: theme.spacing.md,
    width: "100%",
    maxWidth: 400,
    marginTop: theme.spacing.sm,
  },
  slot: {
    flex: 1,
    aspectRatio: 3 / 4,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thick,
    borderStyle: "dashed",
    borderColor: theme.colors.panelBorder,
    backgroundColor: theme.colors.panel,
  },
}));
