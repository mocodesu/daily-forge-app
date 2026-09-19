import type { CompletionRecord } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

interface CompletionRow {
  id: string;
  exercise_id: string;
  day_key: string;
  started_at: number | null;
  completed_at: number;
}

const toRecord = (row: CompletionRow): CompletionRecord => ({
  id: row.id,
  exerciseId: row.exercise_id,
  dayKey: row.day_key,
  startedAt: row.started_at,
  completedAt: row.completed_at,
});

export const CompletionsRepo = {
  async insert(db: SQLiteDatabase, record: CompletionRecord): Promise<void> {
    // The (exercise_id, day_key) unique index means a second insert for
    // the same pair is a no-op instead of a throw. Matches the behavior
    // of DayLocksRepo.insert and SwearsRepo.insert.
    await db.runAsync(
      `INSERT OR IGNORE INTO completion_records
        (id, exercise_id, day_key, started_at, completed_at)
       VALUES (?, ?, ?, ?, ?)`,
      record.id,
      record.exerciseId,
      record.dayKey,
      record.startedAt,
      record.completedAt,
    );
  },

  async getForDay(
    db: SQLiteDatabase,
    dayKey: string,
  ): Promise<CompletionRecord[]> {
    const rows = await db.getAllAsync<CompletionRow>(
      `SELECT * FROM completion_records
       WHERE day_key = ?
       ORDER BY completed_at ASC`,
      dayKey,
    );
    return rows.map(toRecord);
  },

  async getForExerciseOnDay(
    db: SQLiteDatabase,
    exerciseId: string,
    dayKey: string,
  ): Promise<CompletionRecord | null> {
    const row = await db.getFirstAsync<CompletionRow>(
      `SELECT * FROM completion_records
       WHERE exercise_id = ? AND day_key = ?`,
      exerciseId,
      dayKey,
    );
    return row ? toRecord(row) : null;
  },

  /** All completion day-keys that have at least one record. */
  async getAllDayKeys(db: SQLiteDatabase): Promise<string[]> {
    const rows = await db.getAllAsync<{ day_key: string }>(
      `SELECT DISTINCT day_key FROM completion_records
       ORDER BY day_key DESC`,
    );
    return rows.map((r) => r.day_key);
  },

  async deleteForExercise(
    db: SQLiteDatabase,
    exerciseId: string,
  ): Promise<void> {
    await db.runAsync(
      `DELETE FROM completion_records WHERE exercise_id = ?`,
      exerciseId,
    );
  },

  async count(db: SQLiteDatabase): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM completion_records`,
    );
    return row?.count ?? 0;
  },
};
