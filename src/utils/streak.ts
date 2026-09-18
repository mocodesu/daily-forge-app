import type { SQLiteDatabase } from "expo-sqlite";
import { dayKey } from "./day-key";

/**
 * Returns the number of consecutive days ending today (or yesterday if
 * today isn't yet complete) where every daily exercise was completed.
 *
 * One-off exercises are excluded — they don't count toward the streak
 * because they aren't part of the recurring routine.
 */
export async function calculateStreak(db: SQLiteDatabase): Promise<number> {
  const dailyRows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM exercises WHERE is_daily = 1`,
  );
  if (dailyRows.length === 0) return 0;

  const dailyIds = new Set(dailyRows.map((r) => r.id));

  const completions = await db.getAllAsync<{
    day_key: string;
    exercise_id: string;
  }>(`SELECT day_key, exercise_id FROM completion_records`);

  // Group completions by day, filtering to daily exercises only
  const byDay = new Map<string, Set<string>>();
  for (const row of completions) {
    if (!dailyIds.has(row.exercise_id)) continue;
    if (!byDay.has(row.day_key)) byDay.set(row.day_key, new Set());
    byDay.get(row.day_key)!.add(row.exercise_id);
  }

  // A day counts toward the streak only if EVERY daily exercise is present
  const completeDays = new Set<string>();
  for (const [key, ids] of byDay) {
    let complete = true;
    for (const id of dailyIds) {
      if (!ids.has(id)) {
        complete = false;
        break;
      }
    }
    if (complete) completeDays.add(key);
  }

  // Count back from today. If today isn't complete, start from yesterday
  // so the streak doesn't drop to 0 the moment midnight passes.
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!completeDays.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (completeDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
