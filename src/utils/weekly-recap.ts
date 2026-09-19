// ─────────────────────────────────────────────────────────────
// utils/weekly-recap.ts
//
// Computes the summary shown on the Weekly Recap screen: the last
// 7 days ending today, each with its own sealed/frozen/completion
// state, plus week-level totals.
//
// Design choices:
//   • "Last 7 days ending today" rather than "this calendar week".
//     Always shows 7 complete days — no greyed-out future days, no
//     Monday-morning "I have nothing to show" problem.
//   • Sealed days are the headline metric, matching the app's
//     identity. Completion percentage is secondary.
//   • Work time comes from `started_at → completed_at` on each
//     completion, summed across the week. Rows without a start time
//     contribute 0, matching how day-detail reports work time.
// ─────────────────────────────────────────────────────────────
import { dayKey } from "@/utils/day-key";
import { formatLongDuration } from "@/utils/format";
import { calculateStreak } from "@/utils/streak";
import type { SQLiteDatabase } from "expo-sqlite";

export interface DayRecap {
  dayKey: string;
  date: Date;
  /** Localized short weekday, e.g. "Mon". */
  dayName: string;
  /** Day-of-month number. */
  dayNumber: number;
  isToday: boolean;
  /** Sealed by voice oath — counted toward the streak. */
  isSealed: boolean;
  /** Missed day auto-frozen to preserve the streak. */
  isFrozen: boolean;
  /** No work was scheduled this day. */
  isRest: boolean;
  /** Number of exercises completed this day. */
  completed: number;
  /** Number of exercises due this day. */
  total: number;
  /** Sum of (completed_at - started_at) across completions with a start. */
  workMs: number;
}

export interface WeeklyRecap {
  weekStart: Date;
  weekEnd: Date;
  days: DayRecap[];
  /** Days in the window where the user sealed. */
  daysSealed: number;
  /** Days in the window that were auto-frozen. */
  daysFrozen: number;
  /** Days with work scheduled that were neither sealed nor frozen. */
  daysMissed: number;
  /** Days with no work scheduled. */
  daysRest: number;
  /** completed / due across the week, 0..1. 0 if nothing was due. */
  completionRate: number;
  /** Sum of work time across the week, in milliseconds. */
  totalWorkMs: number;
  /** Current streak (sealed days), sourced from calculateStreak. */
  streakNow: number;
}

/**
 * Computes the last-7-days recap ending on `referenceDate` (default:
 * now). Read-only against the DB, though `calculateStreak` internally
 * runs the freeze pass so the streak returned is up to date.
 */
export async function computeWeeklyRecap(
  db: SQLiteDatabase,
  referenceDate: Date = new Date(),
): Promise<WeeklyRecap> {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const weekStartKey = dayKey(days[0]);
  const weekEndKey = dayKey(days[days.length - 1]);
  const todayKey = dayKey(today);

  // ── One query per table for the whole window ─────────────
  const [completionRows, lockRows, frozenRows, exerciseRows] =
    await Promise.all([
      db.getAllAsync<{
        day_key: string;
        exercise_id: string;
        started_at: number | null;
        completed_at: number;
      }>(
        `SELECT day_key, exercise_id, started_at, completed_at
           FROM completion_records
          WHERE day_key >= ? AND day_key <= ?`,
        weekStartKey,
        weekEndKey,
      ),
      db.getAllAsync<{ day_key: string }>(
        `SELECT day_key FROM day_locks
          WHERE day_key >= ? AND day_key <= ?`,
        weekStartKey,
        weekEndKey,
      ),
      db.getAllAsync<{ day_key: string }>(
        `SELECT day_key FROM frozen_days
          WHERE day_key >= ? AND day_key <= ?`,
        weekStartKey,
        weekEndKey,
      ),
      db.getAllAsync<{ id: string; is_daily: number; created_at: number }>(
        `SELECT id, is_daily, created_at FROM exercises`,
      ),
    ]);

  const sealedKeys = new Set(lockRows.map((r) => r.day_key));
  const frozenKeys = new Set(frozenRows.map((r) => r.day_key));

  const completionsByDay = new Map<
    string,
    { exerciseId: string; workMs: number }[]
  >();
  for (const c of completionRows) {
    if (!completionsByDay.has(c.day_key)) {
      completionsByDay.set(c.day_key, []);
    }
    const workMs =
      c.started_at !== null ? Math.max(0, c.completed_at - c.started_at) : 0;
    completionsByDay.get(c.day_key)!.push({
      exerciseId: c.exercise_id,
      workMs,
    });
  }

  const dayRecaps: DayRecap[] = [];
  let totalCompleted = 0;
  let totalDue = 0;
  let totalWorkMs = 0;

  for (const d of days) {
    const key = dayKey(d);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    const due = exerciseRows.filter((e) => {
      if (e.is_daily === 1) return e.created_at <= dayEnd;
      return e.created_at >= dayStart && e.created_at <= dayEnd;
    });

    const todayCompletions = completionsByDay.get(key) ?? [];
    const completedIds = new Set(todayCompletions.map((c) => c.exerciseId));
    const completed = due.filter((e) => completedIds.has(e.id)).length;
    const workMs = todayCompletions.reduce((s, c) => s + c.workMs, 0);

    totalCompleted += completed;
    totalDue += due.length;
    totalWorkMs += workMs;

    dayRecaps.push({
      dayKey: key,
      date: d,
      dayName: d.toLocaleDateString(undefined, { weekday: "short" }),
      dayNumber: d.getDate(),
      isToday: key === todayKey,
      isSealed: sealedKeys.has(key),
      isFrozen: frozenKeys.has(key),
      isRest: due.length === 0,
      completed,
      total: due.length,
      workMs,
    });
  }

  const streakResult = await calculateStreak(db);

  const daysSealed = dayRecaps.filter((d) => d.isSealed).length;
  const daysFrozen = dayRecaps.filter((d) => d.isFrozen).length;
  const daysRest = dayRecaps.filter((d) => d.isRest).length;
  const daysMissed = dayRecaps.filter(
    (d) => !d.isSealed && !d.isFrozen && !d.isRest,
  ).length;

  return {
    weekStart: days[0],
    weekEnd: days[days.length - 1],
    days: dayRecaps,
    daysSealed,
    daysFrozen,
    daysMissed,
    daysRest,
    completionRate: totalDue > 0 ? totalCompleted / totalDue : 0,
    totalWorkMs,
    streakNow: streakResult.streak,
  };
}

/**
 * Formats the recap as plain text for sharing. Kept here so the
 * wording stays near the data that produces it.
 */
export function formatWeeklyRecapShareText(recap: WeeklyRecap): string {
  const range = `${recap.weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${recap.weekEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;

  const lines = [
    `My week in DailyForge (${range})`,
    ``,
    `Sealed: ${recap.daysSealed}/7 days`,
    `Completion: ${Math.round(recap.completionRate * 100)}%`,
    `Current streak: ${recap.streakNow} day${recap.streakNow === 1 ? "" : "s"}`,
  ];

  if (recap.totalWorkMs > 0) {
    lines.push(`Work time: ${formatLongDuration(recap.totalWorkMs)}`);
  }

  return lines.join("\n");
}
