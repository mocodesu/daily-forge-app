import { DayCircle } from "@/components/day-circle";
import { ErrorState } from "@/components/error-state";
import { HapticPressable } from "@/components/haptic-pressable";
import { ScrollScreen } from "@/components/screen";
import { StreakProgressCard } from "@/components/streak-progress";
import Text from "@/components/text";
import {
  MutedIcon,
  PrimaryIcon,
  ThemedActivityIndicator,
} from "@/components/themed";
import { HISTORY_WINDOW_DAYS } from "@/constants/dailyforge";
import { useTargetDays } from "@/hooks/use-target-days";
import type { DayProgress } from "@/utils/history";
import { computeHistory, dayProgressEqual } from "@/utils/history";
import { calculateStreak } from "@/utils/streak";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

// ─────────────────────────────────────────────────────────────
// History-grid geometry.
// ─────────────────────────────────────────────────────────────
const CELL_GAP = 12;
const MIN_CELL_PHONE = 64;
const MAX_CELL_PHONE = 84;
const MIN_CELL_TABLET = 72;
const MAX_CELL_TABLET = 104;

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const { targetDays } = useTargetDays();

  // Read the breakpoint directly from the runtime. This is NOT a
  // hook — it does not subscribe to theme or runtime changes, so
  // the screen will not re-render when the theme changes.
  const breakpoint = UnistylesRuntime.breakpoint;
  const isTablet = breakpoint === "tablet" || breakpoint === "largeTablet";

  const [days, setDays] = useState<DayProgress[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  // Tracks whether the first successful load has happened. Used to
  // distinguish the initial mount (which shows the loading spinner)
  // from subsequent focus refreshes (which must not unmount the grid).
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setLoading(true);

    try {
      const [result, streakResult] = await Promise.all([
        computeHistory(db, HISTORY_WINDOW_DAYS),
        calculateStreak(db),
      ]);
      if (!mountedRef.current) return;

      hasLoadedRef.current = true;
      setError(null);

      // Preserve referential equality when nothing has changed.
      // Without this, every focus creates new DayProgress objects
      // and forces a full re-render of every DayCircle in the grid.
      setDays((prev) => {
        if (
          prev.length === result.length &&
          prev.every((d, i) => dayProgressEqual(d, result[i]))
        ) {
          return prev;
        }
        return result;
      });

      setStreak(streakResult.streak);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[history] load failed:", err);
      setError(err instanceof Error ? err.message : "Could not load history.");
    } finally {
      if (isInitialLoad && mountedRef.current) setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ThemedActivityIndicator size="large" />
      </View>
    );
  }

  // Only show the full-screen error when we have no data to fall
  // back to. A failed background refresh after a successful load
  // should keep the existing grid visible.
  if (error && days.length === 0) {
    return (
      <ScrollScreen>
        <ErrorState
          title="Couldn't load history"
          message={error}
          onRetry={load}
        />
      </ScrollScreen>
    );
  }

  const theme = UnistylesRuntime.getTheme();
  const contentMax = isTablet
    ? theme.layout.contentMaxWidthTablet
    : theme.layout.contentMaxWidth;
  const minCell = isTablet ? MIN_CELL_TABLET : MIN_CELL_PHONE;
  const maxCell = isTablet ? MAX_CELL_TABLET : MAX_CELL_PHONE;

  const available =
    Math.min(width, contentMax) - theme.layout.screenPaddingH * 2;

  const columns = (() => {
    const maxCols = isTablet ? 10 : 8;
    let best = 3;
    for (let cols = maxCols; cols >= 3; cols--) {
      const cell = Math.floor((available - (cols - 1) * CELL_GAP) / cols);
      if (cell >= minCell) {
        best = cols;
        break;
      }
    }
    return best;
  })();

  const cellSize = Math.min(
    maxCell,
    Math.floor((available - (columns - 1) * CELL_GAP) / columns),
  );

  const ringSize = isTablet ? 180 : 140;

  return (
    <ScrollScreen>
      {/* ── Streak progress ring ──────────────────────── */}
      <StreakProgressCard
        streak={streak}
        targetDays={targetDays}
        size={ringSize}
      />

      {/* ── Weekly recap entry point ──────────────────── */}
      <HapticPressable
        testID="history-weekly-recap"
        haptic="light"
        onPress={() => router.push("/(main)/weekly-recap")}
        style={styles.recapButton}
      >
        <View style={styles.recapIcon}>
          <PrimaryIcon name="calendar-outline" size={20} />
        </View>
        <View style={styles.recapBody}>
          <Text variant="subheadBold" color="onSurface">
            This week
          </Text>
          <Text variant="caption" color="mutedText">
            A snapshot of the last 7 days
          </Text>
        </View>
        <MutedIcon name="chevron-forward" size={18} />
      </HapticPressable>

      <View style={[styles.grid, { gap: CELL_GAP }]}>
        {days.map((day) => (
          <DayCircle
            key={day.dayKey}
            day={day}
            size={cellSize}
            onPress={() => {
              if (day.total > 0 || day.isFrozen) {
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

const styles = StyleSheet.create((theme) => ({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  recapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minHeight: 64,
  },
  recapIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.panel,
  },
  recapBody: { flex: 1, gap: 2, minWidth: 0 },
}));
