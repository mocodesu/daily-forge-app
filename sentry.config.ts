import { isRunningInExpoGo } from "expo";

import * as Sentry from "@sentry/react-native";

// Single navigation integration, shared between init and the root layout.
// _layout.tsx imports this and calls registerNavigationContainer on it —
// do NOT create a second instance there.
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

export const sentryConfig = {
  enableAutoSessionTracking: true,
  attachStacktrace: true,
  attachScreenshot: true,
  enableAutoPerformanceTracing: true,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  dsn: "https://bffc41a855007f7d91382c1e465089d1@o4505758870863872.ingest.us.sentry.io/4511819296538629",
  sendDefaultPii: true,
  integrations: [
    Sentry.mobileReplayIntegration({
      maskAllText: false,
      maskAllImages: false,
      maskAllVectors: false,
      enableExperimentalViewRenderer: true,
      enableFastViewRendering: true,
    }),

    Sentry.feedbackIntegration(),
    navigationIntegration,
  ],
  spotlight: __DEV__,
};
