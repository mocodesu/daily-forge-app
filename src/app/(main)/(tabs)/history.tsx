import { ScrollScreen } from "@/components/screen";
import Text from "@/components/text";
import { HISTORY_WINDOW_DAYS } from "@/constants/dailyforge";
import type { DayProgress } from "@/utils/history";
import { computeHistory } from "@/utils/history";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

/** Content max width mirrored from Screen. */
const MAX_CONTENT_WIDTH = 640;
/** Horizontal screen padding mirrored from theme.layout.screenPaddingH. */
const H_PADDING = 15;
/** Gap between grid cells. */
const CELL_GAP = 12;
/** Minimum cell size in points. */
const MIN_CELL = 64;
/** Maximum cell size in points — bigger looks silly on wide screens. */
const MAX_CELL = 84;

export default function HistoryScreen() {
  const { theme } = useUnistyles();
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();

  const [days, setDays] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Compute responsive cell size ─────────────────────────
  const available = Math.min(width, MAX_CONTENT_WIDTH) - H_PADDING * 2;

  // Try a range of columns from widest-fits down to smallest-allowed,
  // and pick the largest cell size that still fits.
  const columns = (() => {
    let best = 3;
    for (let cols = 8; cols >= 3; cols--) {
      const cell = Math.floor((available - (cols - 1) * CELL_GAP) / cols);
      if (cell >= MIN_CELL) {
        best = cols;
        break;
      }
    }
    return best;
  })();

  const cellSize = Math.min(
    MAX_CELL,
    Math.floor((available - (columns - 1) * CELL_GAP) / columns),
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const result = await computeHistory(db, HISTORY_WINDOW_DAYS);
          if (!cancelled) setDays(result);
        } catch (err) {
          console.warn("[history] load failed:", err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const completeDays = days.filter(
    (d) => d.total > 0 && d.completed === d.total,
  ).length;
  const attemptedDays = days.filter((d) => d.total > 0).length;

  return (
    <ScrollScreen>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h1" color="onBackground">
            History
          </Text>
          <Text variant="subhead" color="mutedText">
            Last {HISTORY_WINDOW_DAYS} days — tap a circle for details
          </Text>
        </View>

        <View style={styles.summaryBadge}>
          <Text variant="title" color="onSurface">
            {completeDays}/{attemptedDays}
          </Text>
          <Text variant="caption" color="mutedText">
            days complete
          </Text>
        </View>
      </View>

      <View style={[styles.grid, { gap: CELL_GAP }]}>
        {days.map((day) => (
          <DayCircle
            key={day.dayKey}
            day={day}
            size={cellSize}
            onPress={() => {
              if (day.total > 0) {
                router.push({
                  pathname: "/(main)/day/[dayKey]",
                  params: { dayKey: day.dayKey },
                });
              }
            }}
          />
        ))}
      </View>
    </ScrollScreen>
  );
}

function DayCircle({
  day,
  size,
  onPress,
}: {
  day: DayProgress;
  size: number;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();

  const progress = day.total > 0 ? day.completed / day.total : 0;
  const dayNumber = String(day.date.getDate());
  const percent = Math.round(progress * 100);

  const ringColor =
    day.total === 0 ? theme.colors.panelBorder : theme.colors.primary;

  const isComplete = day.total > 0 && progress >= 1;
  const fontSize = Math.round(size * 0.34);

  return (
    <Pressable
      onPress={onPress}
      disabled={day.total === 0}
      style={[styles.cell, { width: size }]}
    >
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
            borderWidth: isComplete ? 3 : 2,
            backgroundColor: isComplete
              ? theme.colors.primary
              : theme.colors.surface,
          },
        ]}
      >
        <Text
          variant="title"
          color={isComplete ? "onPrimary" : "onSurface"}
          style={{ fontSize, lineHeight: fontSize * 1.15 }}
        >
          {dayNumber}
        </Text>
      </View>

      <Text variant="caption" color="mutedText" numberOfLines={1}>
        {day.total === 0
          ? "rest"
          : `${percent}% · ${day.completed}/${day.total}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  summaryBadge: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minWidth: 72,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  cell: {
    alignItems: "center",
    gap: 4,
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
}));
