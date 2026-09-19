import { ConfigContext, ExpoConfig } from "expo/config";
import {
  DEFAULT_DARK_BACKGROUND_COLOR,
  DEFAULT_LIGHT_BACKGROUND_COLOR,
  DEFAULT_PRIMARY_COLOR,
} from "./src/theme/color-schemes.ts";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Project constants
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PROJECT_SLUG = "dailyforge";
const OWNER = "mocodesu";
const EAS_PROJECT_ID = "d18d3158-865c-4d55-bcf7-b8988716c4ca";

/**
 * App identity
 */
const APP_NAME = "Daily Forge";
const BUNDLE_IDENTIFIER = `com.${OWNER}.${PROJECT_SLUG}`;
const PACKAGE_NAME = `com.${OWNER}.${PROJECT_SLUG}`;
const SCHEME = PROJECT_SLUG;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Brand colors
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Keep native/build-time colors here.
 * Your Unistyles theme can import these same values so there is one source
 * of truth for the application's brand colors.
 */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Assets
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ICON = "./assets/images/icon.jpeg";

const ADAPTIVE_ICON = {
  backgroundColor: DEFAULT_PRIMARY_COLOR,
  foregroundImage: ICON,
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Environments
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ENVIRONMENTS = {
  development: {
    name: `${APP_NAME} Development`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    scheme: `${SCHEME}-dev`,
  },

  preview: {
    name: `${APP_NAME} Preview`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
    packageName: `${PACKAGE_NAME}.preview`,
    scheme: `${SCHEME}-preview`,
  },

  production: {
    name: APP_NAME,
    bundleIdentifier: BUNDLE_IDENTIFIER,
    packageName: PACKAGE_NAME,
    scheme: SCHEME,
  },
} as const;

type AppEnvironment = keyof typeof ENVIRONMENTS;

/**
 * Use APP_ENV locally and EAS_BUILD_PROFILE during EAS builds. Expo config
 * commands without a selected build profile use the development defaults.
 */
const getAppEnvironment = (): AppEnvironment => {
  const value =
    process.env.APP_ENV ?? process.env.EAS_BUILD_PROFILE ?? "development";

  if (!(value in ENVIRONMENTS)) {
    throw new Error(
      `Invalid APP_ENV "${value}". Expected one of: ${Object.keys(
        ENVIRONMENTS,
      ).join(", ")}`,
    );
  }

  return value as AppEnvironment;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Expo configuration
 * ─────────────────────────────────────────────────────────────────────────────
 */

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = getAppEnvironment();
  const environment = ENVIRONMENTS[appEnv];

  const isDevelopment = appEnv === "development";
  const isProduction = appEnv === "production";

  console.log(`⚙️ Building app for environment: ${appEnv}`);

  return {
    ...config,

    /**
     * App identity
     */
    name: environment.name,
    version: "1.0.0",
    slug: PROJECT_SLUG,
    owner: OWNER,
    scheme: environment.scheme,

    orientation: "default",

    description: "A starter application",

    /**
     * App icon
     */
    icon: ICON,

    /**
     * iOS
     */
    ios: {
      ...config.ios,

      supportsTablet: true,
      bundleIdentifier: environment.bundleIdentifier,

      icon: "./assets/forgeApp.icon",
    },

    /**
     * Android
     */
    android: {
      ...config.android,

      package: environment.packageName,

      adaptiveIcon: ADAPTIVE_ICON,

      softwareKeyboardLayoutMode: "pan",
    },

    /**
     * EAS Update
     *
     * Production receives OTA updates.
     * Development/preview builds do not use EAS Update.
     */
    ...(isProduction
      ? {
          updates: {
            enabled: true,
            url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
            enableBsdiffPatchSupport: true,
            assetPatternsToBeBundled: [
              "assets/images/**/*",
              "assets/sounds/**/*",
            ],
          },
        }
      : {
          updates: {
            enabled: false,
          },
        }),

    /**
     * Native runtime compatibility.
     */
    runtimeVersion: "1.0.0",

    /**
     * EAS project configuration.
     */
    extra: {
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },

    /**
     * Expo plugins
     */
    plugins: [
      [
        "expo-splash-screen",
        {
          image: ICON,
          imageWidth: 76,
          backgroundColor: DEFAULT_LIGHT_BACKGROUND_COLOR,

          dark: {
            image: ICON,
            backgroundColor: DEFAULT_DARK_BACKGROUND_COLOR,
          },
        },
      ],

      [
        "expo-dev-client",
        {
          launchMode: "most-recent",

          /**
           * Development client launch URLs.
           *
           * localhost works when the development client is running on the
           * same machine/context. Android emulator uses 10.0.2.2 to reach
           * the host machine.
           */
          defaultLaunchURL: "http://localhost:8081",

          android: {
            defaultLaunchURL: "http://10.0.2.2:8081",
          },
        },
      ],

      [
        "react-native-edge-to-edge",
        {
          android: {
            parentTheme: "Light",
            enforceNavigationBarContrast: false,
          },
        },
      ],
      [
        "./plugins/customize-android",
        {
          primaryColor: DEFAULT_PRIMARY_COLOR,
        },
      ],
      [
        "expo-speech-recognition",
        {
          microphonePermission:
            "DailyForge needs the microphone for your voice oath.",
          speechRecognitionPermission:
            "DailyForge uses speech recognition to verify your oath.",
          androidSpeechServicePackages: [
            "com.google.android.as",
            "com.google.android.googlequicksearchbox",
            "com.google.android.tts",
          ],
        },
      ],

      "./plugins/scroll-bar-android",
      "expo-router",
      "expo-font",
      "expo-sqlite",
      "expo-sharing",
      "expo-audio",
      "expo-asset",
    ],

    /**
     * Experimental features
     */
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
