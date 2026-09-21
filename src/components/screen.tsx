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

function resolveTopInset(rtTop: number): number {
  if (Platform.OS !== "android") return rtTop;
  const systemTop = StatusBar.currentHeight ?? 0;
  return Math.max(rtTop, systemTop);
}

function resolveBottomInset(rtBottom: number): number {
  return rtBottom;
}

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  safeTop?: boolean;
  wide?: boolean;
}

export function Screen({
  children,
  style,
  padded = true,
  safeTop = true,
  wide = false,
  ...rest
}: ScreenProps) {
  return (
    <View style={[styles.root, padded && styles.paddedRoot, style]} {...rest}>
      <View
        style={[
          styles.content,
          wide && styles.contentWide,
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
  header?: React.ReactNode;
  wide?: boolean;
}

export function ScrollScreen({
  children,
  style,
  contentContainerStyle,
  padded = true,
  safeTop = true,
  header,
  keyboardShouldPersistTaps = "handled",
  wide = false,
  ...rest
}: ScrollScreenProps) {
  const hasHeader = header !== undefined && header !== null;

  return (
    <View style={styles.root}>
      {hasHeader && (
        <View style={styles.headerOuter}>
          <View style={[styles.headerInner, wide && styles.headerInnerWide]}>
            {header}
          </View>
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
        <View style={[styles.content, wide && styles.contentWide]}>
          {children}
        </View>
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

    headerOuter: {
      paddingHorizontal: theme.layout.screenPaddingH,
      paddingTop: topInset + theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerInner: {
      width: "100%",
      maxWidth: {
        phone: theme.layout.contentMaxWidth,
        tablet: theme.layout.contentMaxWidthTablet,
      },
      alignSelf: "center",
    },
    headerInnerWide: {
      maxWidth: {
        phone: theme.layout.contentMaxWidth,
        tablet: theme.layout.contentMaxWidthWide,
      },
    },

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

    content: {
      width: "100%",
      maxWidth: {
        phone: theme.layout.contentMaxWidth,
        tablet: theme.layout.contentMaxWidthTablet,
      },
      alignSelf: "center",
      gap: theme.spacing.lg,
      // This is the fix. Without `flexGrow`, a `flex: 1` child has
      // nothing to grow into, so `justifyContent: "center"` on the
      // onboarding step container becomes a no-op.
      flexGrow: 1,
    },
    contentWide: {
      maxWidth: {
        phone: theme.layout.contentMaxWidth,
        tablet: theme.layout.contentMaxWidthWide,
      },
    },
    contentWithSafeTop: {
      paddingTop: topInset + theme.spacing.lg,
    },
    contentWithSafeBottom: {
      paddingBottom: bottomInset + theme.spacing.giant,
    },
  };
});
