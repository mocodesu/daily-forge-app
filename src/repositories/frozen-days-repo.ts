import type { SQLiteDatabase } from "expo-sqlite";

export type FreezeReason = "auto-missed" | "manual";

export interface FrozenDay {
  dayKey: string;
  frozenAt: number;
  reason: FreezeReason;
}

interface FrozenDayRow {
  day_key: string;
  frozen_at: number;
  reason: string;
}

const toFrozenDay = (row: FrozenDayRow): FrozenDay => ({
  dayKey: row.day_key,
  frozenAt: row.frozen_at,
  reason: (row.reason as FreezeReason) ?? "auto-missed",
});

export const FrozenDaysRepo = {
  async insert(db: SQLiteDatabase, day: FrozenDay): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO frozen_days (day_key, frozen_at, reason)
       VALUES (?, ?, ?)`,
      day.dayKey,
      day.frozenAt,
      day.reason,
    );
  },

  async getAll(db: SQLiteDatabase): Promise<FrozenDay[]> {
    const rows = await db.getAllAsync<FrozenDayRow>(
      `SELECT * FROM frozen_days ORDER BY day_key DESC`,
    );
    return rows.map(toFrozenDay);
  },

  async isFrozen(db: SQLiteDatabase, dayKey: string): Promise<boolean> {
    const row = await db.getFirstAsync<{ day_key: string }>(
      `SELECT day_key FROM frozen_days WHERE day_key = ?`,
      dayKey,
    );
    return !!row;
  },

  /**
   * Counts frozen days whose day_key starts with "YYYY-MM".
   * Used to compute the current month's freeze usage.
   */
  async countForMonth(
    db: SQLiteDatabase,
    year: number,
    month: number,
  ): Promise<number> {
    const prefix = `${year}-${String(month).padStart(2, "0")}-%`;
    const row = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) AS c FROM frozen_days WHERE day_key LIKE ?`,
      prefix,
    );
    return row?.c ?? 0;
  },

  async delete(db: SQLiteDatabase, dayKey: string): Promise<void> {
    await db.runAsync(`DELETE FROM frozen_days WHERE day_key = ?`, dayKey);
  },

  async deleteAll(db: SQLiteDatabase): Promise<void> {
    await db.runAsync(`DELETE FROM frozen_days`);
  },
};
