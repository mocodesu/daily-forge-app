"use no memo";

// ─────────────────────────────────────────────────────────────
// DailyForgeWidget — the 2×2 Android home screen widget
//
// Note: the widget library does not support the `opacity` style
// property. Transparency is expressed via hex-with-alpha colors
// through the `withAlpha` helper.
// ─────────────────────────────────────────────────────────────
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { withAlpha, type WidgetTheme } from "./widget-types";

export interface DailyForgeWidgetProps {
  dayKey: string;
  streak: number;
  completed: number;
  total: number;
  isSealed: boolean;
  canSeal: boolean;
  displayName: string;
  deepLinkScheme: string;
  theme: WidgetTheme;
}

const MAX_SEGMENTS = 10;

const MILESTONES = new Set([7, 14, 30, 60, 90, 100, 180, 365]);

function computeTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DailyForgeWidget({
  dayKey,
  streak,
  completed,
  total,
  isSealed,
  canSeal,
  displayName,
  deepLinkScheme,
  theme,
}: DailyForgeWidgetProps) {
  const todayUri = deepLinkScheme ? `${deepLinkScheme}://` : null;

  const clickProps = todayUri
    ? {
        clickAction: "OPEN_URI" as const,
        clickActionData: { uri: todayUri },
      }
    : { clickAction: "OPEN_APP" as const };

  const isStale = dayKey !== computeTodayKey() && dayKey !== "";
  const isMilestone = MILESTONES.has(streak);

  // ── New day state ─────────────────────────────────────────
  if (isStale) {
    return (
      <FlexWidget
        {...clickProps}
        style={{
          height: "match_parent",
          width: "match_parent",
          flexDirection: "column",
          justifyContent: "center",
          padding: 16,
          backgroundColor: theme.surface,
          borderRadius: 16,
        }}
      >
        <FlexWidget
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            width: "match_parent",
          }}
        >
          <TextWidget
            text="Daily Forge"
            style={{ fontSize: 13, color: theme.textMuted }}
          />
          <TextWidget
            text={`🔥 ${streak}`}
            style={{ fontSize: 13, color: theme.primary }}
          />
        </FlexWidget>

        <TextWidget
          text="Ready for today"
          style={{
            fontSize: 18,
            color: theme.text,
            marginTop: 8,
          }}
        />

        <TextWidget
          text={total > 0 ? `0 of ${total} waiting` : "Open the app to begin"}
          style={{
            fontSize: 12,
            color: theme.textMuted,
            marginTop: 6,
          }}
        />
      </FlexWidget>
    );
  }

  // ── Milestone state ───────────────────────────────────────
  if (isMilestone) {
    return (
      <FlexWidget
        {...clickProps}
        style={{
          height: "match_parent",
          width: "match_parent",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
          backgroundColor: theme.primary,
          borderRadius: 16,
        }}
      >
        <TextWidget text="✨" style={{ fontSize: 22 }} />

        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <TextWidget text="🔥" style={{ fontSize: 24, marginRight: 4 }} />
          <TextWidget
            text={`${streak}`}
            style={{
              fontSize: 44,
              fontWeight: "bold",
              color: theme.onPrimary,
            }}
          />
        </FlexWidget>

        <TextWidget
          text="days in a row"
          style={{
            fontSize: 12,
            color: withAlpha(String(theme.onPrimary), 0.85),
            marginTop: 4,
          }}
        />
      </FlexWidget>
    );
  }

  // ── Normal state ──────────────────────────────────────────
  const headlineText = (() => {
    if (isSealed) return "Sealed today";
    if (canSeal) return "All done";
    if (total === 0) return "No exercises yet";
    return `${completed} of ${total} done`;
  })();

  const headlineColor = isSealed
    ? theme.active
    : canSeal
      ? theme.primary
      : theme.text;

  const showSegments = total > 0 && !isSealed && !canSeal;
  const segmentCount = Math.min(total, MAX_SEGMENTS);
  const filledCount = showSegments
    ? Math.min(segmentCount, Math.round((completed / total) * segmentCount))
    : 0;

  const hasName = displayName.trim().length > 0;

  return (
    <FlexWidget
      {...clickProps}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "center",
        padding: 16,
        backgroundColor: theme.surface,
        borderRadius: 16,
      }}
    >
      <FlexWidget
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: "match_parent",
        }}
      >
        <TextWidget
          text="Daily Forge"
          style={{ fontSize: 13, color: theme.textMuted }}
        />
        <TextWidget
          text={`🔥 ${streak}`}
          style={{ fontSize: 13, color: theme.primary }}
        />
      </FlexWidget>

      <TextWidget
        text={headlineText}
        style={{
          fontSize: 18,
          color: headlineColor,
          marginTop: 8,
        }}
      />

      {showSegments && (
        <FlexWidget
          style={{
            flexDirection: "row",
            width: "match_parent",
            height: 6,
            marginTop: 10,
          }}
        >
          {Array.from({ length: segmentCount }).map((_, i) => (
            <FlexWidget
              key={i}
              style={{
                flex: 1,
                height: 6,
                backgroundColor: i < filledCount ? theme.primary : theme.track,
                borderRadius: 3,
                marginLeft: i > 0 ? 4 : 0,
              }}
            />
          ))}
        </FlexWidget>
      )}

      {hasName && (
        <TextWidget
          text={`Hi ${displayName}`}
          style={{
            fontSize: 11,
            color: theme.textMuted,
            marginTop: 10,
          }}
        />
      )}
    </FlexWidget>
  );
}
