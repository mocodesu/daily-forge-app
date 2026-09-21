import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import React, { useCallback } from "react";
import { View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export function NotificationsStep({
  status,
  onStatusChange,
}: {
  status: "idle" | "granted" | "denied";
  onStatusChange: (status: "idle" | "granted" | "denied") => void;
}) {
  const theme = UnistylesRuntime.getTheme();

  const handleRequest = useCallback(async () => {
    try {
      const { status: result } = await Notifications.requestPermissionsAsync();
      onStatusChange(result === "granted" ? "granted" : "denied");
    } catch (err) {
      console.warn("[onboarding] notification permission failed", err);
      onStatusChange("denied");
    }
  }, [onStatusChange]);

  const cta =
    status === "granted"
      ? {
          icon: "checkmark-circle" as const,
          text: "Notifications are on.",
        }
      : status === "denied"
        ? {
            icon: "notifications-off-outline" as const,
            text: "Notifications are off. You can enable them later in Settings.",
          }
        : {
            icon: "notifications-outline" as const,
            text: "Enable Notifications",
          };

  return (
    <View style={styles.step}>
      <View style={styles.iconWrap}>
        <Ionicons name="notifications" size={64} color={theme.colors.primary} />
      </View>

      <Text variant="h2" color="onBackground" style={styles.title}>
        Stay on track
      </Text>

      <Text variant="callout" color="mutedText" style={styles.body}>
        DailyForge sends one gentle reminder a day — at a time you choose — when
        your exercises aren't done yet.
      </Text>

      <Text variant="subhead" color="mutedText" style={styles.sub}>
        No spam. No marketing. Just a nudge.
      </Text>

      {status === "idle" ? (
        <HapticPressable
          testID="onboarding-notif-enable"
          haptic="medium"
          onPress={handleRequest}
          style={styles.notifButton}
        >
          <Ionicons name={cta.icon} size={18} color={theme.colors.onPrimary} />
          <Text variant="subheadBold" color="onPrimary">
            {cta.text}
          </Text>
        </HapticPressable>
      ) : (
        <View style={styles.statusRow}>
          <Ionicons name={cta.icon} size={20} color={theme.colors.primary} />
          <Text variant="subhead" color="onSurface" style={styles.flex}>
            {cta.text}
          </Text>
        </View>
      )}

      <Text variant="caption" color="mutedText" style={styles.sub}>
        {status === "idle"
          ? "You can skip this and enable notifications later."
          : "Tap Continue to finish setup."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  step: {
    alignItems: "center",
    width: "100%",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  flex: { flex: 1 },
  iconWrap: {
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.4,
    maxWidth: 320,
  },
  body: {
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 22,
  },
  sub: {
    textAlign: "center",
    maxWidth: 320,
  },
  notifButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    minHeight: 52,
    minWidth: 240,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.panel,
    maxWidth: 400,
    marginTop: theme.spacing.sm,
  },
}));
