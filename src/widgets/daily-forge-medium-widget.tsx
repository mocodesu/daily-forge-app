"use no memo";

// ─────────────────────────────────────────────────────────────
// DailyForgeMediumWidget — the 4×2 Android home screen widget
//
// The widget library does not support `opacity` or `alignSelf`
// style properties. Transparency is expressed through hex-with-
// alpha colors via `withAlpha`, and horizontal left-alignment is
// done by wrapping children in a row FlexWidget.
// ─────────────────────────────────────────────────────────────
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { withAlpha, type WidgetTheme } from "./widget-types";

export interface DailyForgeMediumWidgetProps {
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

const MAX_SEGMENTS = 12;

const MILESTONE_LABELS: Record<number, string> = {
  7: "One week strong",
  14: "Two weeks running",
  30: "One month sealed",
  60: "Two months strong",
  90: "Three months running",
  100: "One hundred days",
  180: "Half a year",
  365: "One year strong",
};

const MILESTONE_SUBTEXT: Record<number, string> = {
  7: "The first week is the hardest.",
  14: "Two weeks is where habit begins.",
  30: "A month of showing up.",
  60: "Two months, no excuses.",
  90: "Three months of commitment.",
  100: "A hundred days of showing up.",
  180: "Half a year of consistency.",
  365: "A full year of showing up.",
};

function computeTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DailyForgeMediumWidget({
  dayKey,
  streak,
  completed,
  total,
  isSealed,
  canSeal,
  displayName,
  deepLinkScheme,
  theme,
}: DailyForgeMediumWidgetProps) {
  const todayUri = deepLinkScheme ? `${deepLinkScheme}://` : null;
  const historyUri = deepLinkScheme ? `${deepLinkScheme}://history` : null;
  const sealUri = deepLinkScheme ? `${deepLinkScheme}://?seal=1` : null;

  const streakPanelClick = historyUri
    ? {
        clickAction: "OPEN_URI" as const,
        clickActionData: { uri: historyUri },
      }
    : { clickAction: "OPEN_APP" as const };

  const rightColumnClick = todayUri
    ? {
        clickAction: "OPEN_URI" as const,
        clickActionData: { uri: todayUri },
      }
    : { clickAction: "OPEN_APP" as const };

  const sealClick = sealUri
    ? {
        clickAction: "OPEN_URI" as const,
        clickActionData: { uri: sealUri },
      }
    : { clickAction: "OPEN_APP" as const };

  const isStale = dayKey !== computeTodayKey() && dayKey !== "";
  const isMilestone = streak in MILESTONE_LABELS;

  // ── New day state ─────────────────────────────────────────
  if (isStale) {
    return (
      <FlexWidget
        {...rightColumnClick}
        style={{
          height: "match_parent",
          width: "match_parent",
          flexDirection: "row",
          padding: 16,
          backgroundColor: theme.surface,
          borderRadius: 16,
          alignItems: "center",
        }}
      >
        <FlexWidget
          {...streakPanelClick}
          style={{
            width: 96,
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <FlexWidget
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TextWidget text="🔥" style={{ fontSize: 20, marginRight: 4 }} />
            <TextWidget
              text={`${streak}`}
              style={{
                fontSize: 40,
                fontWeight: "bold",
                color: theme.primary,
              }}
            />
          </FlexWidget>
          <TextWidget
            text="day streak"
            style={{
              fontSize: 11,
              color: theme.textMuted,
              marginTop: 4,
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            width: 1,
            height: 80,
            backgroundColor: theme.track,
            marginLeft: 12,
            marginRight: 12,
          }}
        />

        <FlexWidget
          style={{
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <TextWidget
            text="A new day"
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: theme.text,
            }}
          />
          <TextWidget
            text={
              total > 0 ? `${total} exercises waiting` : "Open the app to begin"
            }
            style={{
              fontSize: 12,
              color: theme.textMuted,
              marginTop: 6,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── Milestone state ───────────────────────────────────────
  if (isMilestone) {
    return (
      <FlexWidget
        {...(historyUri
          ? {
              clickAction: "OPEN_URI" as const,
              clickActionData: { uri: historyUri },
            }
          : { clickAction: "OPEN_APP" as const })}
        style={{
          height: "match_parent",
          width: "match_parent",
          flexDirection: "row",
          padding: 20,
          backgroundColor: theme.primary,
          borderRadius: 16,
          alignItems: "center",
        }}
      >
        <FlexWidget
          style={{
            width: 120,
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TextWidget text="✨" style={{ fontSize: 22 }} />
          <FlexWidget
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 2,
            }}
          >
            <TextWidget text="🔥" style={{ fontSize: 26, marginRight: 4 }} />
            <TextWidget
              text={`${streak}`}
              style={{
                fontSize: 48,
                fontWeight: "bold",
                color: theme.onPrimary,
              }}
            />
          </FlexWidget>
          <TextWidget
            text="days in a row"
            style={{
              fontSize: 11,
              color: withAlpha(String(theme.onPrimary), 0.85),
              marginTop: 2,
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            width: 1,
            height: 80,
            backgroundColor: withAlpha(String(theme.onPrimary), 0.25),
            marginLeft: 16,
            marginRight: 16,
          }}
        />

        <FlexWidget
          style={{
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <TextWidget
            text={MILESTONE_LABELS[streak]}
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: theme.onPrimary,
            }}
          />
          <TextWidget
            text={MILESTONE_SUBTEXT[streak]}
            style={{
              fontSize: 12,
              color: withAlpha(String(theme.onPrimary), 0.85),
              marginTop: 6,
            }}
          />
        </FlexWidget>
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
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        padding: 16,
        backgroundColor: theme.surface,
        borderRadius: 16,
      }}
    >
      <FlexWidget
        {...streakPanelClick}
        style={{
          width: 96,
          height: "match_parent",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextWidget text="🔥" style={{ fontSize: 20, marginRight: 4 }} />
          <TextWidget
            text={`${streak}`}
            style={{
              fontSize: 40,
              fontWeight: "bold",
              color: theme.primary,
            }}
          />
        </FlexWidget>
        <TextWidget
          text="day streak"
          style={{
            fontSize: 11,
            color: theme.textMuted,
            marginTop: 4,
          }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 1,
          height: "match_parent",
          backgroundColor: theme.track,
          marginLeft: 12,
          marginRight: 12,
        }}
      />

      <FlexWidget
        {...rightColumnClick}
        style={{
          flex: 1,
          height: "match_parent",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <FlexWidget
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "match_parent",
          }}
        >
          <TextWidget
            text="Daily Forge"
            style={{ fontSize: 11, color: theme.textMuted }}
          />
          {hasName && (
            <TextWidget
              text={`Hi ${displayName}`}
              style={{ fontSize: 11, color: theme.textMuted }}
            />
          )}
        </FlexWidget>

        <TextWidget
          text={headlineText}
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: headlineColor,
            marginTop: 6,
          }}
        />

        {showSegments && (
          <FlexWidget
            style={{
              flexDirection: "row",
              width: "match_parent",
              height: 8,
              marginTop: 10,
            }}
          >
            {Array.from({ length: segmentCount }).map((_, i) => (
              <FlexWidget
                key={i}
                style={{
                  flex: 1,
                  height: 8,
                  backgroundColor:
                    i < filledCount ? theme.primary : theme.track,
                  borderRadius: 4,
                  marginLeft: i > 0 ? 4 : 0,
                }}
              />
            ))}
          </FlexWidget>
        )}

        {/* Seal button — wrapped in a row so it left-aligns without
            needing `alignSelf`, which the widget library doesn't
            support. */}
        {canSeal && (
          <FlexWidget
            style={{
              flexDirection: "row",
              width: "match_parent",
              marginTop: 10,
            }}
          >
            <FlexWidget
              {...sealClick}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: theme.primary,
              }}
            >
              <TextWidget
                text="Seal the day"
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: theme.onPrimary,
                }}
              />
            </FlexWidget>
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
