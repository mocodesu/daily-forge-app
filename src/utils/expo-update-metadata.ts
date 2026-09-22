import * as Updates from "expo-updates";

import * as Sentry from "@sentry/react-native";

export function handleExpoUpdateMetadata() {
  const manifest = Updates.manifest;

  // `manifest` is null when running in development or when no update
  // metadata is available. Guard before any property access.
  if (!manifest || typeof manifest !== "object") {
    const scope = Sentry.getGlobalScope();
    scope.setTag("expo-update-id", Updates.updateId ?? "unknown");
    scope.setTag("expo-is-embedded-update", Updates.isEmbeddedLaunch);
    scope.setTag("expo-update-debug-url", "not applicable");
    return;
  }

  const metadata =
    "metadata" in manifest && manifest.metadata !== null
      ? manifest.metadata
      : undefined;
  const extra = "extra" in manifest ? manifest.extra : undefined;

  const updateGroup =
    metadata &&
    typeof metadata === "object" &&
    "updateGroup" in metadata &&
    typeof metadata.updateGroup === "string"
      ? metadata.updateGroup
      : undefined;

  const scope = Sentry.getGlobalScope();

  scope.setTag("expo-update-id", Updates.updateId);
  scope.setTag("expo-is-embedded-update", Updates.isEmbeddedLaunch);

  if (updateGroup) {
    scope.setTag("expo-update-group-id", updateGroup);

    const owner = extra?.expoClient?.owner ?? "[account]";
    const slug = extra?.expoClient?.slug ?? "[project]";
    scope.setTag(
      "expo-update-debug-url",
      `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`,
    );
  } else if (Updates.isEmbeddedLaunch) {
    scope.setTag(
      "expo-update-debug-url",
      "not applicable for embedded updates",
    );
  }
}
