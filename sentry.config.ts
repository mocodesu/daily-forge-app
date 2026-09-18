import { isRunningInExpoGo } from "expo";

import * as Sentry from "@sentry/react-native";

// Define your navigation integration
const navigationIntegration = Sentry.reactNavigationIntegration({
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
  // Configure Session Replay
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
