import type { SQLiteDatabase } from "expo-sqlite";

export interface DayProgress {
  dayKey: string;
  date: Date;
  completed: number;
  total: number;
  isToday: boolean;
}

/**
 * Returns progress for the last `days` days, newest first.
 * A day's "total" is the set of exercises that were due that day:
 *   - all daily exercises (is_daily = 1 and created before end of day)
 *   - plus one-offs created that day
 */
export async function computeHistory(
  db: SQLiteDatabase,
  days: number,
): Promise<DayProgress[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load all exercises once
  const exercises = await db.getAllAsync<{
    id: string;
    is_daily: number;
    created_at: number;
  }>(`SELECT id, is_daily, created_at FROM exercises`);

  // Load all completions once
  const completions = await db.getAllAsync<{
    day_key: string;
    exercise_id: string;
  }>(`SELECT day_key, exercise_id FROM completion_records`);

  const byDay = new Map<string, Set<string>>();
  for (const row of completions) {
    if (!byDay.has(row.day_key)) byDay.set(row.day_key, new Set());
    byDay.get(row.day_key)!.add(row.exercise_id);
  }

  const out: DayProgress[] = [];

  for (let offset = 0; offset < days; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    const key = formatDayKey(d);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    const due = exercises.filter((e) => {
      if (e.is_daily === 1) {
        return e.created_at <= dayEnd;
      }
      return e.created_at >= dayStart && e.created_at <= dayEnd;
    });

    const completedSet = byDay.get(key) ?? new Set<string>();
    const done = due.filter((e) => completedSet.has(e.id)).length;

    out.push({
      dayKey: key,
      date: d,
      completed: done,
      total: due.length,
      isToday: offset === 0,
    });
  }

  return out;
}

function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
