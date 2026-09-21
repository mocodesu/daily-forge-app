// ─────────────────────────────────────────────────────────────
// Widget handler registration
//
// This file exists purely for its side effect. It must be
// imported before expo-router/entry so the widget's headless
// task handler is registered before the router boots.
//
// Do not add other exports or logic here — anything that runs
// on module load belongs in this file only if it must run
// before the router starts.
// ─────────────────────────────────────────────────────────────
import { registerWidgetTaskHandler } from "react-native-android-widget";
import { widgetTaskHandler } from "./widget-task-handler";

registerWidgetTaskHandler(widgetTaskHandler);
