import type { DayLock } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

interface DayLockRow {
  id: string;
  day_key: string;
  locked_at: number;
}

const toLock = (row: DayLockRow): DayLock => ({
  id: row.id,
  dayKey: row.day_key,
  lockedAt: row.locked_at,
});

export const DayLocksRepo = {
  async insert(db: SQLiteDatabase, lock: DayLock): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO day_locks (id, day_key, locked_at)
       VALUES (?, ?, ?)`,
      lock.id,
      lock.dayKey,
      lock.lockedAt,
    );
  },

  async isLocked(db: SQLiteDatabase, dayKey: string): Promise<boolean> {
    const row = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM day_locks WHERE day_key = ?`,
      dayKey,
    );
    return !!row;
  },

  async getRecent(db: SQLiteDatabase, limit = 30): Promise<DayLock[]> {
    const rows = await db.getAllAsync<DayLockRow>(
      `SELECT * FROM day_locks
       ORDER BY locked_at DESC
       LIMIT ?`,
      limit,
    );
    return rows.map(toLock);
  },
};
