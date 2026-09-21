"use no memo";

import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { DailyForgeWidget } from "./daily-forge-widget";
import { readCachedWidgetData } from "./widget-cache";

const nameToWidget = {
  DailyForge: DailyForgeWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget =
    nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget];

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const data = readCachedWidgetData();
      props.renderWidget(
        <Widget
          streak={data.streak}
          completed={data.completed}
          total={data.total}
          isSealed={data.isSealed}
          displayName={data.displayName}
          theme={data.theme}
        />,
      );
      break;
    }

    case "WIDGET_DELETED":
      break;

    case "WIDGET_CLICK":
      break;

    default:
      break;
  }
}
