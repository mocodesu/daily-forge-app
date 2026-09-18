import Text from "@/components/text";
import { HISTORY_WINDOW_DAYS } from "@/constants/dailyforge";
import type { DayProgress } from "@/utils/history";
import { computeHistory } from "@/utils/history";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const CELL_SIZE = 72;

export default function HistoryScreen() {
  const { theme } = useUnistyles();
  const db = useSQLiteContext();
  const [days, setDays] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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

      <View style={styles.grid}>
        {days.map((day) => (
          <DayCircle
            key={day.dayKey}
            day={day}
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
    </ScrollView>
  );
}

function DayCircle({
  day,
  onPress,
}: {
  day: DayProgress;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();

  const progress = day.total > 0 ? day.completed / day.total : 0;
  const dayNumber = String(day.date.getDate());
  const percent = Math.round(progress * 100);

  const ringColor = (() => {
    if (day.total === 0) return theme.colors.panelBorder;
    if (progress >= 1) return theme.colors.primary;
    if (progress >= 0.6) return theme.colors.primary;
    if (progress > 0) return theme.colors.primary;
    return theme.colors.panelBorder;
  })();

  return (
    <Pressable onPress={onPress} style={styles.cell} disabled={day.total === 0}>
      <View
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            backgroundColor:
              progress >= 1 ? theme.colors.primary : theme.colors.surface,
          },
        ]}
      >
        <Text variant="title" color={progress >= 1 ? "onPrimary" : "onSurface"}>
          {dayNumber}
        </Text>
      </View>

      <Text variant="caption" color="mutedText">
        {day.total === 0
          ? "rest"
          : `${percent}% · ${day.completed}/${day.total}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingTop: rt.insets.top + theme.spacing.lg,
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingBottom: theme.spacing.giant,
    gap: theme.spacing.lg,
  },
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
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    justifyContent: "flex-start",
  },
  cell: {
    alignItems: "center",
    gap: 4,
  },
  ring: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
}));
