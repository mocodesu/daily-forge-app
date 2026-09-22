import { BackButton } from "@/components/back-button";
import Text from "@/components/text";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

interface ScreenHeaderProps {
  /** Screen title shown next to the back button. */
  title?: string;
  /** Optional subtitle below the title. */
  subtitle?: string;
  /** Optional element on the right (e.g. a small action). */
  right?: React.ReactNode;
  /** Override the default back behavior. */
  onBack?: () => void;
  /** Hide the back button — useful for root-level screens. */
  hideBack?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
  hideBack = false,
}: ScreenHeaderProps) {
  const hasText = !!title || !!subtitle;

  return (
    <View style={styles.row}>
      {!hideBack ? (
        <BackButton onPress={onBack} />
      ) : (
        <View style={styles.spacer} />
      )}

      {hasText && (
        <View style={styles.titleBlock}>
          {title && (
            <Text variant="title" color="onBackground" numberOfLines={1}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text variant="caption" color="mutedText" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      )}

      <View style={styles.flex} />

      {right}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    minHeight: 44,
  },
  flex: { flex: 1 },
  spacer: {
    width: 40,
    height: 40,
  },
  titleBlock: {
    flexShrink: 1,
    gap: 1,
  },
}));
