import type { DailySwear } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

interface SwearRow {
  id: string;
  day_key: string;
  sworn_at: number;
  transcript: string;
  matched_phrase: string;
}

const toSwear = (row: SwearRow): DailySwear => ({
  id: row.id,
  dayKey: row.day_key,
  swornAt: row.sworn_at,
  transcript: row.transcript,
  matchedPhrase: row.matched_phrase,
});

export const SwearsRepo = {
  async insert(db: SQLiteDatabase, swear: DailySwear): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO daily_swears
        (id, day_key, sworn_at, transcript, matched_phrase)
       VALUES (?, ?, ?, ?, ?)`,
      swear.id,
      swear.dayKey,
      swear.swornAt,
      swear.transcript,
      swear.matchedPhrase,
    );
  },

  async getForDay(
    db: SQLiteDatabase,
    dayKey: string,
  ): Promise<DailySwear | null> {
    const row = await db.getFirstAsync<SwearRow>(
      `SELECT * FROM daily_swears WHERE day_key = ?`,
      dayKey,
    );
    return row ? toSwear(row) : null;
  },

  async hasSwornToday(db: SQLiteDatabase, dayKey: string): Promise<boolean> {
    const row = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM daily_swears WHERE day_key = ?`,
      dayKey,
    );
    return !!row;
  },
};
