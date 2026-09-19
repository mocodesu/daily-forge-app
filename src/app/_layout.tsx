import { DailyReminderBootstrapper } from "@/components/daily-reminder-bootstrapper";
import { ThemePreferenceProvider } from "@/components/theme-preferences-provider";
import ThemedSystemBars from "@/components/themed-system-bars";
import { APP_NAME } from "@/constants";
import { initializeDatabase } from "@/db/client";
import { useRetentionReminders } from "@/hooks/use-retention-reminders";
import { handleExpoUpdateMetadata } from "@/utils/expo-update-metadata";
import { initializeUpdateChannel } from "@/utils/retention-reminder";
import { initSounds } from "@/utils/sounds";
import * as Sentry from "@sentry/react-native";
import * as Notifications from "expo-notifications";
import { Stack, useNavigationContainerRef } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { useEffect } from "react";
import { Dimensions, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native-unistyles";
import { navigationIntegration, sentryConfig } from "../../sentry.config";

// ─────────────────────────────────────────────────────────────
// Device-class detection — computed once at module load
//
// iOS: Platform.isPad is synchronous and authoritative — including
//      iPad mini, which has a portrait width of 744pt (below the
//      768 breakpoint other libraries use).
//
// Android: no synchronous "is tablet" API. The shorter dimension at
// launch is a reliable proxy — phones never exceed ~450pt in their
// shorter dimension, tablets never fall below ~700pt. Using min()
// means a tablet held in landscape at launch is still detected.
// ─────────────────────────────────────────────────────────────
const IS_TABLET = (() => {
  if (Platform.OS === "ios") return Platform.isPad;
  const { width, height } = Dimensions.get("window");
  return Math.min(width, height) >= 768;
})();

Sentry.init(sentryConfig);
handleExpoUpdateMetadata();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  initialRouteName: "(main)/(tabs)",
};

const RootLayout = () => {
  useRetentionReminders();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    initializeUpdateChannel().catch((error) => {
      console.error("Failed to set up the update notification channel:", error);
    });

    initSounds().catch((err) => {
      console.warn("[app] sounds init failed:", err);
    });

    if (navigationRef?.current) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SQLiteProvider
        databaseName={`${APP_NAME}.db`}
        onInit={initializeDatabase}
      >
        <ThemePreferenceProvider>
          {/* Headless. Arms the daily reminder schedule on cold launch
              and on return from a long background stretch. */}
          <DailyReminderBootstrapper />

          <Stack
            screenOptions={{
              headerShown: false,
              // Phones are portrait-only. Tablets rotate freely.
              // Enforced by react-native-screens via the `orientation`
              // option — the recommended path per the Expo docs.
              orientation: IS_TABLET ? "all" : "portrait_up",
            }}
          >
            <Stack.Screen name="(main)/(tabs)" />
            <Stack.Screen
              name="(main)/onboarding"
              options={{
                presentation: "fullScreenModal",
                animation: "fade",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="(main)/create-exercise"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="(main)/exercise/[id]"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                sheetAllowedDetents: [0.75, 1.0],
              }}
            />
            <Stack.Screen
              name="(main)/session/[id]"
              options={{
                presentation: "fullScreenModal",
                animation: "fade",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="(main)/day/[dayKey]"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="(main)/data-management"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="(main)/dev/confetti-lab"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="(main)/weekly-recap"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
          </Stack>
          <ThemedSystemBars />
        </ThemePreferenceProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  container: { flex: 1 },
});
