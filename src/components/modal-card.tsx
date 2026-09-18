import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  type ModalProps,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewProps,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

interface ModalCardProps extends Omit<ModalProps, "children" | "transparent"> {
  visible: boolean;
  onRequestClose?: () => void;
  /** When true, tapping the backdrop dismisses. Defaults to true. */
  dismissOnBackdrop?: boolean;
  /** Optional footer pinned to the bottom of the card. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Max width for the card. Defaults to 460. */
  maxWidth?: number;
  /** ScrollView props if you want to customize the inner scroll. */
  scrollProps?: ScrollViewProps;
}

export function ModalCard({
  visible,
  onRequestClose,
  dismissOnBackdrop = true,
  footer,
  children,
  maxWidth = 460,
  scrollProps,
  ...rest
}: ModalCardProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
      {...rest}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={dismissOnBackdrop ? onRequestClose : undefined}
        >
          <Pressable
            style={[styles.card, { maxWidth }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              {...scrollProps}
            >
              {children}
            </ScrollView>
            {footer && <View style={styles.footer}>{footer}</View>}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  flex: { flex: 1 },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    // Respect safe areas on every edge so the card never touches a notch
    // or the home indicator on small devices.
    paddingTop: rt.insets.top + theme.spacing.lg,
    paddingBottom: rt.insets.bottom + theme.spacing.lg,
    paddingHorizontal: theme.layout.screenPaddingH,
  },

  card: {
    width: "100%",
    maxHeight: "100%",
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    overflow: "hidden",
  },

  scrollContent: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.panelBorder,
  },
}));
