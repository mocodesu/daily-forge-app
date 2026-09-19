import { ScrollScreen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import Text from "@/components/text";
import { MutedIcon } from "@/components/themed";
import { useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

interface RecordRow {
  id: string;
  exercise_id: string;
  exercise_name: string | null;
  is_daily: number | null;
  started_at: number | null;
  completed_at: number;
}

export default function DayDetailScreen() {
  const db = useSQLiteContext();
  const { dayKey } = useLocalSearchParams<{ dayKey: string }>();
  const { width } = useWindowDimensions();

  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await db.getAllAsync<RecordRow>(
          `SELECT
            c.id,
            c.exercise_id,
            e.name AS exercise_name,
            e.is_daily,
            c.started_at,
            c.completed_at
           FROM completion_records c
           LEFT JOIN exercises e ON e.id = c.exercise_id
           WHERE c.day_key = ?
           ORDER BY c.completed_at ASC`,
          dayKey,
        );
        setRecords(rows);
      } catch (err) {
        console.warn("[day-detail] load failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, dayKey]);

  const firstStart = records
    .map((r) => r.started_at)
    .filter((v): v is number => v !== null)
    .sort()[0];
  const lastCompletion = records
    .map((r) => r.completed_at)
    .sort()
    .at(-1);

  const totalWallClock =
    firstStart && lastCompletion ? lastCompletion - firstStart : null;

  const totalWorkTime = records.reduce((sum, r) => {
    if (r.started_at === null) return sum;
    return sum + (r.completed_at - r.started_at);
  }, 0);

  const totalBreakTime =
    totalWallClock !== null
      ? Math.max(0, totalWallClock - totalWorkTime)
      : null;

  const hasStartTimes = records.some((r) => r.started_at !== null);
  const stackCards = width < 380;

  const dateLabel = (() => {
    try {
      const [y, m, d] = dayKey.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dayKey;
    }
  })();

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

  return (
    <ScrollScreen
      header={
        <ScreenHeader
          title={dateLabel}
          subtitle={`${records.length} exercise${
            records.length === 1 ? "" : "s"
          } completed`}
        />
      }
    >
      <View style={styles.section}>
        <Text variant="subheadBold" color="onSurface">
          Session summary
        </Text>

        <View style={[styles.summaryRow, stackCards && styles.summaryRowStack]}>
          <SummaryCard
            title="Total time"
            value={totalWallClock !== null ? formatLong(totalWallClock) : "—"}
            subtitle={hasStartTimes ? "start → finish" : "no start times"}
          />
          <SummaryCard
            title="Work time"
            value={formatLong(totalWorkTime)}
            subtitle="sum of sessions"
          />
          <SummaryCard
            title="Break time"
            value={totalBreakTime !== null ? formatLong(totalBreakTime) : "—"}
            subtitle="between exercises"
          />
        </View>

        {hasStartTimes && firstStart && lastCompletion && (
          <View style={styles.timeRangeRow}>
            <TimePill label="Started" ms={firstStart} />
            <MutedIcon name="arrow-forward" size={14} />
            <TimePill label="Finished" ms={lastCompletion} />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="subheadBold" color="onSurface">
          Per-exercise breakdown
        </Text>

        {records.length === 0 ? (
          <Text variant="callout" color="mutedText">
            No exercises were completed on this day.
          </Text>
        ) : (
          <View style={styles.recordList}>
            {records.map((record, index) => (
              <RecordRow key={record.id} record={record} index={index + 1} />
            ))}
          </View>
        )}
      </View>
    </ScrollScreen>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text variant="caption" color="mutedText">
        {title}
      </Text>
      <Text variant="title" color="onSurface">
        {value}
      </Text>
      <Text variant="caption" color="mutedText" numberOfLines={2}>
        {subtitle}
      </Text>
    </View>
  );
}

function TimePill({ label, ms }: { label: string; ms: number }) {
  return (
    <View style={styles.timePill}>
      <Text variant="caption" color="mutedText">
        {label}
      </Text>
      <Text variant="subheadBold" color="onSurface">
        {formatTime(ms)}
      </Text>
    </View>
  );
}

function RecordRow({ record, index }: { record: RecordRow; index: number }) {
  const duration =
    record.started_at !== null ? record.completed_at - record.started_at : null;

  return (
    <View style={styles.recordCard}>
      <View style={styles.indexCircle}>
        <Text variant="caption" color="onPrimary">
          {index}
        </Text>
      </View>

      <View style={styles.recordBody}>
        <View style={styles.recordTitleRow}>
          <Text variant="subheadBold" color="onSurface" numberOfLines={1}>
            {record.exercise_name ?? "Deleted exercise"}
          </Text>
          {record.is_daily === 0 && (
            <View style={styles.oneOffPill}>
              <Text variant="micro" color="mutedText">
                ONE-OFF
              </Text>
            </View>
          )}
        </View>

        {record.started_at !== null ? (
          <Text variant="caption" color="mutedText" numberOfLines={2}>
            {formatTime(record.started_at)} → {formatTime(record.completed_at)}
          </Text>
        ) : (
          <Text variant="caption" color="mutedText" numberOfLines={2}>
            Completed {formatTime(record.completed_at)} (no start time)
          </Text>
        )}
      </View>

      <Text
        variant="subheadBold"
        color={duration !== null ? "primary" : "mutedText"}
      >
        {duration !== null ? formatLong(duration) : "—"}
      </Text>
    </View>
  );
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLong(ms: number): string {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total}s`;
  if (total < 3600) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const styles = StyleSheet.create((theme) => ({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  section: { gap: theme.spacing.sm },
  summaryRow: { flexDirection: "row", gap: theme.spacing.sm },
  summaryRowStack: { flexDirection: "column" },
  summaryCard: {
    flex: 1,
    gap: 2,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minHeight: 82,
  },
  timeRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    flexWrap: "wrap",
  },
  timePill: {
    gap: 2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.panel,
  },
  recordList: { gap: theme.spacing.sm },
  recordCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minHeight: 68,
  },
  indexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  recordBody: { flex: 1, gap: 2, minWidth: 0 },
  recordTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  oneOffPill: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 1,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.panel,
  },
}));
