import { ErrorState } from "@/components/error-state";
import { HapticPressable } from "@/components/haptic-pressable";
import { ScrollScreen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import { formatLongDuration } from "@/utils/format";
import {
  computeWeeklyRecap,
  formatWeeklyRecapShareText,
  type DayRecap,
  type WeeklyRecap,
} from "@/utils/weekly-recap";
import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Share, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

// ─────────────────────────────────────────────────────────────
// Weekly Recap
//
// A retrospective screen: what the user did in the last 7 days.
// Designed to be the emotional payoff moment that the daily
// experience doesn't provide on its own.
//
// Entry point: the "This week" button on the History screen.
// ─────────────────────────────────────────────────────────────

export default function WeeklyRecapScreen() {
  const db = useSQLiteContext();

  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await computeWeeklyRecap(db);
      if (!mountedRef.current) return;
      setRecap(result);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[weekly-recap] load failed:", err);
      setError(err instanceof Error ? err.message : "Could not load recap.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const handleShare = useCallback(async () => {
    if (!recap || sharing) return;
    setSharing(true);
    try {
      await Share.share({
        message: formatWeeklyRecapShareText(recap),
      });
    } catch (err) {
      // Share-dialog dismissal surfaces as an error on some platforms;
      // it's not worth showing the user.
      console.warn("[weekly-recap] share failed:", err);
    } finally {
      setSharing(false);
    }
  }, [recap, sharing]);

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

  if (error || !recap) {
    return (
      <ScrollScreen header={<ScreenHeader title="This week" />}>
        <ErrorState
          title="Couldn't load your week"
          message={error ?? "Try again in a moment."}
          onRetry={load}
        />
      </ScrollScreen>
    );
  }

  const range = `${recap.weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${recap.weekEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;

  const headline = buildHeadline(recap);
  const subline = buildSubline(recap);

  return (
    <ScrollScreen header={<ScreenHeader title="This week" />}>
      {/* ── Headline ───────────────────────────────────── */}
      <View style={styles.heroBlock}>
        <Text variant="caption" color="mutedText">
          {range}
        </Text>
        <Text variant="h1" color="onBackground" style={styles.headline}>
          {headline}
        </Text>
        <Text variant="callout" color="mutedText" style={styles.subline}>
          {subline}
        </Text>
      </View>

      {/* ── 7-day strip ─────────────────────────────────── */}
      <View style={styles.stripCard}>
        <View style={styles.strip}>
          {recap.days.map((day, i) => (
            <DayChip key={day.dayKey} day={day} index={i} />
          ))}
        </View>
      </View>

      {/* ── Two big stats ───────────────────────────────── */}
      <View style={styles.statsRow}>
        <BigStat
          icon="flame"
          label="Streak"
          value={`${recap.streakNow}`}
          unit={recap.streakNow === 1 ? "day" : "days"}
        />
        <BigStat
          icon="time-outline"
          label="Work time"
          value={
            recap.totalWorkMs > 0 ? formatLongDuration(recap.totalWorkMs) : "—"
          }
          unit={recap.totalWorkMs > 0 ? "this week" : "no sessions logged"}
        />
      </View>

      {/* ── Breakdown ───────────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="subheadBold" color="onSurface">
          Day by day
        </Text>
        <View style={styles.list}>
          {recap.days.map((day) => (
            <DayRow key={day.dayKey} day={day} />
          ))}
        </View>
      </View>

      {/* ── Share ───────────────────────────────────────── */}
      <HapticPressable
        haptic="medium"
        onPress={handleShare}
        disabled={sharing}
        style={styles.shareButton}
      >
        <Ionicons
          name="share-outline"
          size={18}
          color={UnistylesRuntime.getTheme().colors.onPrimary}
        />
        <Text variant="subheadBold" color="onPrimary">
          {sharing ? "Sharing…" : "Share my week"}
        </Text>
      </HapticPressable>
    </ScrollScreen>
  );
}

// ─────────────────────────────────────────────────────────────
// Headline / subline text
// ─────────────────────────────────────────────────────────────

function buildHeadline(recap: WeeklyRecap): string {
  const { daysSealed, daysFrozen, daysRest } = recap;
  const activeDays = 7 - daysRest;

  if (activeDays === 0) return "A quiet week";
  if (daysSealed === 7) return "A perfect week";
  if (daysSealed >= 5) return `You sealed ${daysSealed} of 7 days`;
  if (daysSealed >= 3) return `${daysSealed} days sealed`;
  if (daysSealed >= 1) {
    return `You sealed ${daysSealed} day${daysSealed === 1 ? "" : "s"}`;
  }
  if (daysFrozen >= 1) return "A week you kept alive";
  return "A fresh start";
}

function buildSubline(recap: WeeklyRecap): string {
  const { daysSealed, daysFrozen, daysMissed, daysRest } = recap;

  if (daysSealed === 7) {
    return "Every single day. This is what consistency looks like.";
  }

  const parts: string[] = [];
  if (daysSealed > 0) parts.push(`${daysSealed} sealed`);
  if (daysFrozen > 0) parts.push(`${daysFrozen} frozen`);
  if (daysMissed > 0) parts.push(`${daysMissed} missed`);
  if (daysRest > 0) parts.push(`${daysRest} rest`);

  return parts.join(" · ");
}

// ─────────────────────────────────────────────────────────────
// 7-day strip chip
// ─────────────────────────────────────────────────────────────

function DayChip({ day, index }: { day: DayRecap; index: number }) {
  // Stagger a subtle fade-in on mount so the strip "assembles"
  // as the screen opens. Matches the DayCircle animation pattern.
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    const delay = index * 40;
    opacity.value = withDelay(delay, withTiming(1, { duration: 320 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 320 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const theme = UnistylesRuntime.getTheme();
  const { bg, fg, border } = chipColors(day, theme);

  return (
    <Animated.View style={[styles.chipWrap, animatedStyle]}>
      <Text variant="micro" color="mutedText">
        {day.dayName.toUpperCase()}
      </Text>
      <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
        {day.isFrozen ? (
          <Ionicons name="snow" size={18} color={theme.colors.primary} />
        ) : day.isSealed ? (
          <Ionicons name="checkmark" size={20} color={theme.colors.onPrimary} />
        ) : (
          <Text variant="subheadBold" color={fg}>
            {day.dayNumber}
          </Text>
        )}
      </View>
      {day.isToday && <View style={styles.todayDot} />}
    </Animated.View>
  );
}

type ChipColors = {
  bg: string;
  fg: "onSurface" | "onPrimary" | "mutedText";
  border: string;
};

function chipColors(
  day: DayRecap,
  theme: ReturnType<typeof UnistylesRuntime.getTheme>,
): ChipColors {
  if (day.isSealed) {
    return {
      bg: theme.colors.primary,
      fg: "onPrimary",
      border: theme.colors.primary,
    };
  }
  if (day.isFrozen) {
    return {
      bg: theme.colors.panel,
      fg: "onSurface",
      border: theme.colors.primary,
    };
  }
  if (day.isRest) {
    return {
      bg: "transparent",
      fg: "mutedText",
      border: theme.colors.panelBorder,
    };
  }
  return {
    bg: theme.colors.surface,
    fg: "onSurface",
    border: theme.colors.panelBorder,
  };
}

// ─────────────────────────────────────────────────────────────
// Big stat card
// ─────────────────────────────────────────────────────────────

function BigStat({
  icon,
  label,
  value,
  unit,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={styles.bigStat}>
      <View style={styles.bigStatHeader}>
        <PrimaryIcon name={icon} size={18} />
        <Text variant="caption" color="mutedText">
          {label}
        </Text>
      </View>
      <Text variant="display" color="onSurface">
        {value}
      </Text>
      <Text variant="caption" color="mutedText">
        {unit}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Per-day row in the breakdown list
// ─────────────────────────────────────────────────────────────

function DayRow({ day }: { day: DayRecap }) {
  const state: { label: string; color: "primary" | "mutedText" } = (() => {
    if (day.isSealed) return { label: "Sealed", color: "primary" };
    if (day.isFrozen) return { label: "Frozen", color: "primary" };
    if (day.isRest) return { label: "Rest", color: "mutedText" };
    return { label: "Missed", color: "mutedText" };
  })();

  return (
    <View style={styles.dayRow}>
      <View style={styles.dayRowLeft}>
        <Text variant="subheadBold" color="onSurface">
          {day.dayName}
        </Text>
        <Text variant="caption" color="mutedText">
          {day.date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </Text>
      </View>

      <View style={styles.dayRowMiddle}>
        {!day.isRest && !day.isFrozen && (
          <Text variant="caption" color="mutedText">
            {day.completed}/{day.total} exercises
          </Text>
        )}
        {day.isFrozen && (
          <Text variant="caption" color="mutedText">
            Streak preserved
          </Text>
        )}
        {day.isRest && (
          <Text variant="caption" color="mutedText">
            No exercises scheduled
          </Text>
        )}
      </View>

      <Text variant="caption" color={state.color}>
        {state.label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },

  heroBlock: {
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
  },
  headline: {
    textAlign: "center",
    marginTop: theme.spacing.xxs,
  },
  subline: {
    textAlign: "center",
    maxWidth: 400,
  },

  stripCard: {
    padding: {
      phone: theme.spacing.md,
      tablet: theme.spacing.lg,
    },
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  strip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.xs,
  },
  chipWrap: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing.xxs,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.primary,
    marginTop: 2,
  },

  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  bigStat: {
    flex: 1,
    gap: theme.spacing.xxs,
    padding: {
      phone: theme.spacing.md,
      tablet: theme.spacing.lg,
    },
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  bigStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xxs,
  },

  section: { gap: theme.spacing.sm },
  list: { gap: theme.spacing.xxs },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.panelBorder,
    minHeight: 48,
  },
  dayRowLeft: { width: 90, gap: 1 },
  dayRowMiddle: { flex: 1, minWidth: 0 },

  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    minHeight: 52,
    marginTop: theme.spacing.sm,
  },
}));
