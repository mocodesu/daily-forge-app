// ─────────────────────────────────────────────────────────────
// repositories/preferences-repo.ts
// ─────────────────────────────────────────────────────────────
import type { SQLiteDatabase } from "expo-sqlite";

export const PreferencesRepo = {
  async get(db: SQLiteDatabase, key: string): Promise<string | null> {
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM preferences WHERE key = ?`,
      key,
    );
    return row?.value ?? null;
  },

  async set(db: SQLiteDatabase, key: string, value: string): Promise<void> {
    await db.runAsync(
      `INSERT INTO preferences (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      key,
      value,
      Date.now(),
    );
  },

  async remove(db: SQLiteDatabase, key: string): Promise<void> {
    await db.runAsync(`DELETE FROM preferences WHERE key = ?`, key);
  },

  async getAll(db: SQLiteDatabase): Promise<Record<string, string>> {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM preferences`,
    );
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
};
