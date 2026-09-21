// ─────────────────────────────────────────────────────────────
// App entry
//
// Order matters here. The widget handler registration MUST run
// before expo-router/entry boots the router, because the widget's
// headless task loads this bundle in a context that has no UI.
// If the router boots first, it tries to render a root component
// into a headless context and the registration never runs.
//
// Import evaluation order in ES modules is top-to-bottom, so
// putting the widget registration first guarantees it fires
// before the router starts.
// ─────────────────────────────────────────────────────────────
import "./src/widgets/register-widget-handler";

import "expo-router/entry";
import "./unistyles";
