/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],

  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets|react-native-unistyles|react-native-mmkv|react-native-edge-to-edge|react-native-fast-confetti|react-native-gesture-handler|react-native-nitro-modules|react-native-safe-area-context|react-native-screens))",
  ],

  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  moduleNameMapper: {
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/__mocks__/**",
  ],

  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
    "**/src/utils/format.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/utils/swear-matcher.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/utils/day-key.ts": {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    "**/src/utils/celebrations.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/utils/streak.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/utils/history.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/utils/weekly-recap.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/utils/backup.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/repositories/preferences-repo.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/repositories/user-profile-repo.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/repositories/day-locks-repo.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/repositories/swears-repo.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/repositories/exercises-repo.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/repositories/completions-repo.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/repositories/milestones-repo.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/repositories/frozen-days-repo.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/repositories/data-management-repo.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    "**/src/hooks/use-day-state.ts": {
      statements: 85,
      branches: 85,
      functions: 90,
      lines: 85,
    },
    "**/src/hooks/use-milestone.ts": {
      statements: 90,
      branches: 80,
      functions: 100,
      lines: 90,
    },
  },
};
