import React from "react";
import {
  Platform,
  ScrollView,
  type ScrollViewProps,
  StatusBar,
  View,
  type ViewProps,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

/**
 * Maximum content width. On phones this has no effect. On tablets, desktop
 * web, and landscape phones it keeps lines of text readable and prevents
 * cards from stretching to absurd widths.
 */
const MAX_CONTENT_WIDTH = 640;

/**
 * Returns the actual top inset for the current screen.
 *
 * Why the fallback: when React Navigation presents a screen with
 * `presentation: "modal"` on Android, it opens a separate activity window
 * that draws behind the status bar. Unistyles' runtime reports insets from
 * the root activity, which comes back as 0 in that window — so we fall back
 * to the OS-level StatusBar.currentHeight, which is always correct.
 */
function resolveTopInset(rtTop: number): number {
  if (Platform.OS !== "android") return rtTop;
  const systemTop = StatusBar.currentHeight ?? 0;
  return Math.max(rtTop, systemTop);
}

/** Bottom inset needs no fallback — Unistyles reports it correctly everywhere. */
function resolveBottomInset(rtBottom: number): number {
  return rtBottom;
}

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
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
  /**
   * Optional header rendered above the scroll area. It's fixed — doesn't
   * scroll with the content — and automatically respects the top safe area,
   * including inside Android modals.
   */
  header?: React.ReactNode;
}

export function ScrollScreen({
  children,
  style,
  contentContainerStyle,
  padded = true,
  safeTop = true,
  header,
  keyboardShouldPersistTaps = "handled",
  ...rest
}: ScrollScreenProps) {
  const hasHeader = header !== undefined && header !== null;

  return (
    <View style={styles.root}>
      {hasHeader && (
        <View style={styles.headerOuter}>
          <View style={styles.headerInner}>{header}</View>
        </View>
      )}

      <ScrollView
        style={[styles.root, style]}
        contentContainerStyle={[
          styles.scrollContent,
          padded && styles.paddedRoot,
          !hasHeader && safeTop && styles.scrollContentWithSafeTop,
          hasHeader && styles.scrollContentWithHeader,
          styles.scrollContentWithSafeBottom,
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...rest}
      >
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => {
  const topInset = resolveTopInset(rt.insets.top);
  const bottomInset = resolveBottomInset(rt.insets.bottom);

  return {
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    paddedRoot: {
      paddingHorizontal: theme.layout.screenPaddingH,
    },

    // Fixed header — sits above the ScrollView and clears the status bar
    headerOuter: {
      paddingHorizontal: theme.layout.screenPaddingH,
      paddingTop: topInset + theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerInner: {
      width: "100%",
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: "center",
    },

    // ScrollView content container
    scrollContent: {
      flexGrow: 1,
    },
    scrollContentWithSafeTop: {
      paddingTop: topInset + theme.spacing.lg,
    },
    scrollContentWithHeader: {
      paddingTop: theme.spacing.lg,
    },
    scrollContentWithSafeBottom: {
      paddingBottom: bottomInset + theme.spacing.giant,
    },

    // Inner content wrapper — centers on wide screens
    content: {
      width: "100%",
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: "center",
      gap: theme.spacing.lg,
    },
    contentWithSafeTop: {
      paddingTop: topInset + theme.spacing.lg,
    },
    contentWithSafeBottom: {
      paddingBottom: bottomInset + theme.spacing.giant,
    },
  };
});
