import React from "react";
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

/**
 * Maximum content width. On phones this has no effect. On tablets, desktop
 * web, and landscape phones it keeps lines of text readable and prevents
 * cards from stretching to absurd widths.
 */
const MAX_CONTENT_WIDTH = 640;

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  /**
   * When true (default), applies horizontal screen padding and centers the
   * content within MAX_CONTENT_WIDTH. Set false for edge-to-edge layouts.
   */
  padded?: boolean;
  /**
   * When true, applies top padding to clear the safe area and the back
   * button row. Defaults to true for screens without a native header.
   */
  safeTop?: boolean;
}

export function Screen({
  children,
  style,
  padded = true,
  safeTop = true,
  ...rest
}: ScreenProps) {
  return (
    <View style={[styles.root, padded && styles.paddedRoot, style]} {...rest}>
      <View
        style={[
          styles.content,
          safeTop && styles.contentWithSafeTop,
          styles.contentWithSafeBottom,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

interface ScrollScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  padded?: boolean;
  safeTop?: boolean;
}

export function ScrollScreen({
  children,
  style,
  contentContainerStyle,
  padded = true,
  safeTop = true,
  keyboardShouldPersistTaps = "handled",
  ...rest
}: ScrollScreenProps) {
  return (
    <ScrollView
      style={[styles.root, style]}
      contentContainerStyle={[
        styles.scrollContent,
        padded && styles.paddedRoot,
        safeTop && styles.scrollContentWithSafeTop,
        styles.scrollContentWithSafeBottom,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...rest}
    >
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  paddedRoot: {
    paddingHorizontal: theme.layout.screenPaddingH,
  },

  // ScrollView content container
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentWithSafeTop: {
    paddingTop: rt.insets.top + theme.spacing.lg,
  },
  scrollContentWithSafeBottom: {
    paddingBottom: rt.insets.bottom + theme.spacing.giant,
  },

  // Inner content wrapper — centers on wide screens
  content: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    gap: theme.spacing.lg,
  },
  contentWithSafeTop: {
    paddingTop: rt.insets.top + theme.spacing.lg,
  },
  contentWithSafeBottom: {
    paddingBottom: rt.insets.bottom + theme.spacing.giant,
  },
}));
