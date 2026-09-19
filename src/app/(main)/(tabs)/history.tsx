import { DayCircle } from "@/components/day-circle";
import { ErrorState } from "@/components/error-state";
import { ScrollScreen } from "@/components/screen";
import Text from "@/components/text";
import { HISTORY_WINDOW_DAYS } from "@/constants/dailyforge";
import { useTargetDays } from "@/hooks/use-target-days";
import type { DayProgress } from "@/utils/history";
import { computeHistory } from "@/utils/history";
import { calculateStreak } from "@/utils/streak";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

// History-grid geometry. The horizontal padding and max content width
// come from the theme (see `theme.layout`) so this screen can't drift
// out of sync with the rest of the app.
const CELL_GAP = 12;
const MIN_CELL = 64;
const MAX_CELL = 84;

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const { targetDays } = useTargetDays();

  const [days, setDays] = useState<DayProgress[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const theme = UnistylesRuntime.getTheme();

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const available =
    Math.min(width, theme.layout.contentMaxWidth) -
    theme.layout.screenPaddingH * 2;

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, streakResult] = await Promise.all([
        computeHistory(db, HISTORY_WINDOW_DAYS),
        calculateStreak(db),
      ]);
      if (!mountedRef.current) return;
      setDays(result);
      // calculateStreak returns a StreakResult object with
      // `streak`, `frozenKeys`, `freezeBalance`, etc. Extract the
      // number — otherwise <Text> tries to render the object.
      setStreak(streakResult.streak);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[history] load failed:", err);
      setError(err instanceof Error ? err.message : "Could not load history.");
    } finally {
      if (mountedRef.current) setLoading(false);
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
        <ActivityIndicator
          color={UnistylesRuntime.getTheme().colors.primary}
          size="large"
        />
      </View>
    );
  }

  if (error) {
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

  const remaining = Math.max(0, targetDays - streak);
  const statusText =
    streak === 0
      ? `Target: ${targetDays} days. Start your streak today.`
      : streak >= targetDays
        ? `You've hit your ${targetDays}-day target. Well done.`
        : `You have ${remaining} day${remaining === 1 ? "" : "s"} to go.`;

  return (
    <ScrollScreen>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="caption" color="mutedText" numberOfLines={2}>
            {statusText}
          </Text>
        </View>
        <View style={styles.summaryBadge}>
          <Text variant="title" color="onSurface">
            {streak}/{targetDays}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    minHeight: 40,
  },
  headerLeft: {
    flex: 1,
    justifyContent: "center",
  },
  summaryBadge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minHeight: 40,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
}));
