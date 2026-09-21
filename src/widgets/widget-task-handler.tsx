"use no memo";

import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { DailyForgeMediumWidget } from "./daily-forge-medium-widget";
import { DailyForgeWidget } from "./daily-forge-widget";
import { readCachedWidgetData } from "./widget-cache";

const nameToWidget = {
  DailyForge: DailyForgeWidget,
  DailyForgeMedium: DailyForgeMediumWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget =
    nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget];

  if (!Widget) return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const data = readCachedWidgetData();
      props.renderWidget(
        <Widget
          dayKey={data.dayKey}
          streak={data.streak}
          completed={data.completed}
          total={data.total}
          isSealed={data.isSealed}
          canSeal={data.canSeal}
          displayName={data.displayName}
          deepLinkScheme={data.deepLinkScheme}
          theme={data.theme}
        />,
      );
      break;
    }

    case "WIDGET_DELETED":
    case "WIDGET_CLICK":
    default:
      break;
  }
}
