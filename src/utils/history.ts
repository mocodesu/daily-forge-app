import { FrozenDaysRepo } from "@/repositories/frozen-days-repo";
import type { SQLiteDatabase } from "expo-sqlite";
import { dayKey } from "./day-key";

export interface DayProgress {
  dayKey: string;
  date: Date;
  completed: number;
  total: number;
  isToday: boolean;
  /** True if this day was a missed day that was frozen retroactively. */
  isFrozen: boolean;
  /**
   * True if the user sealed the day — completed all exercises AND
   * said the voice oath. Only sealed days contribute to the streak.
   */
  isSealed: boolean;
}

/**
 * Structural equality for two DayProgress entries. Used by the
 * History screen to preserve object identity across refreshes so
 * unchanged days don't force the grid to re-render.
 */
export function dayProgressEqual(a: DayProgress, b: DayProgress): boolean {
  return (
    a.dayKey === b.dayKey &&
    a.date.getTime() === b.date.getTime() &&
    a.completed === b.completed &&
    a.total === b.total &&
    a.isToday === b.isToday &&
    a.isFrozen === b.isFrozen &&
    a.isSealed === b.isSealed
  );
}

export async function computeHistory(
  db: SQLiteDatabase,
  days: number,
): Promise<DayProgress[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exercises = await db.getAllAsync<{
    id: string;
    is_daily: number;
    created_at: number;
  }>(`SELECT id, is_daily, created_at FROM exercises`);

  const completions = await db.getAllAsync<{
    day_key: string;
    exercise_id: string;
  }>(`SELECT day_key, exercise_id FROM completion_records`);

  const [frozen, lockRows] = await Promise.all([
    FrozenDaysRepo.getAll(db),
    db.getAllAsync<{ day_key: string }>(`SELECT day_key FROM day_locks`),
  ]);
  const frozenKeys = new Set(frozen.map((f) => f.dayKey));
  const sealedKeys = new Set(lockRows.map((r) => r.day_key));

  // Build the per-day completion index without non-null assertions.
  const byDay = new Map<string, Set<string>>();
  for (const row of completions) {
    let set = byDay.get(row.day_key);
    if (!set) {
      set = new Set<string>();
      byDay.set(row.day_key, set);
    }
    set.add(row.exercise_id);
  }

  const out: DayProgress[] = [];
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (let offset = 0; offset < days; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    const key = dayKey(d);
    const dayStart = d.getTime();
    const dayEnd = dayStart + ONE_DAY_MS - 1;

    const due = exercises.filter((e) => {
      if (e.is_daily === 1) return e.created_at <= dayEnd;
      return e.created_at >= dayStart && e.created_at <= dayEnd;
    });

    const completedSet = byDay.get(key);
    const done = completedSet
      ? due.filter((e) => completedSet.has(e.id)).length
      : 0;

    out.push({
      dayKey: key,
      date: d,
      completed: done,
      total: due.length,
      isToday: offset === 0,
      isFrozen: frozenKeys.has(key),
      isSealed: sealedKeys.has(key),
    });
  }

  return out;
}
