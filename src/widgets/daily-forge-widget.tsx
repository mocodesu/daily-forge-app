"use no memo";

// ─────────────────────────────────────────────────────────────
// DailyForgeWidget — the Android home screen widget layout
//
// Layout (top to bottom):
//   1. Brand + streak badge
//   2. Headline status text
//   3. Segmented progress bar (one pill per exercise)
//   4. Optional "Hi {name}" footer
//
// The 'use no memo' directive disables React Compiler for this
// file.
// ─────────────────────────────────────────────────────────────
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetTheme } from "./widget-types";

export interface DailyForgeWidgetProps {
  streak: number;
  completed: number;
  total: number;
  isSealed: boolean;
  displayName: string;
  theme: WidgetTheme;
}

/**
 * Number of pills to render in the progress bar.
 *
 * Below this cap, one pill per exercise gives an exact reading.
 * Above it, the pills are proportional — a smooth approximation
 * that avoids cramming 30 tiny segments into a 2×2 widget.
 */
const MAX_SEGMENTS = 10;

export function DailyForgeWidget({
  streak,
  completed,
  total,
  isSealed,
  displayName,
  theme,
}: DailyForgeWidgetProps) {
  const headlineText = (() => {
    if (isSealed) return "Sealed today";
    if (total === 0) return "No exercises yet";
    return `${completed} of ${total} done`;
  })();

  const headlineColor = isSealed ? theme.active : theme.text;

  // Progress segments. Rendered only when there's something to
  // show. The cap keeps the pill width reasonable on small widgets.
  const showSegments = total > 0 && !isSealed;
  const segmentCount = Math.min(total, MAX_SEGMENTS);
  const filledCount = showSegments
    ? Math.min(segmentCount, Math.round((completed / total) * segmentCount))
    : 0;

  const hasName = displayName.trim().length > 0;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
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
      {/* ── Row 1: brand + streak ─────────────────────────── */}
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

      {/* ── Row 2: headline ───────────────────────────────── */}
      <TextWidget
        text={headlineText}
        style={{
          fontSize: 18,
          color: headlineColor,
          marginTop: 8,
        }}
      />

      {/* ── Row 3: segmented progress bar ─────────────────── */}
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

      {/* ── Row 4: name (optional) ────────────────────────── */}
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
