import { initializeDatabase } from "@/db/client";
import { createTestDb } from "@/testing/db";

describe("initializeDatabase", () => {
  it("creates the full schema on a fresh install", async () => {
    const db = createTestDb();
    await initializeDatabase(db);

    const tables = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`,
    );
    const names = tables.map((t) => t.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "schema_meta",
        "preferences",
        "user_profile",
        "exercises",
        "completion_records",
        "day_locks",
        "daily_swears",
        "milestones",
        "frozen_days",
      ]),
    );
  });

  it("sets schema_meta.version to 1 on a fresh install", async () => {
    const db = createTestDb();
    await initializeDatabase(db);

    const row = await db.getFirstAsync<{ version: number }>(
      `SELECT version FROM schema_meta WHERE id = 1`,
    );
    expect(row?.version).toBe(1);
  });

  it("is idempotent — running twice does not error and does not change the version", async () => {
    const db = createTestDb();
    await initializeDatabase(db);
    await expect(initializeDatabase(db)).resolves.toBeUndefined();

    const row = await db.getFirstAsync<{ version: number }>(
      `SELECT version FROM schema_meta WHERE id = 1`,
    );
    expect(row?.version).toBe(1);
  });

  it("enables foreign key enforcement (cascade delete works)", async () => {
    const db = createTestDb();
    await initializeDatabase(db);

    await db.runAsync(
      `INSERT INTO exercises (
        id, name, body_parts, exercise_type,
        reps, sets, duration_seconds, session_duration_seconds,
        is_daily, notes, created_at, sort_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      "ex-1",
      "Push-ups",
      '["Chest"]',
      "reps",
      10,
      3,
      0,
      60,
      1,
      "",
      1,
      1,
    );

    await db.runAsync(
      `INSERT INTO completion_records
        (id, exercise_id, day_key, started_at, completed_at)
       VALUES (?, ?, ?, ?, ?)`,
      "c-1",
      "ex-1",
      "2024-01-15",
      null,
      1_700_000_000_000,
    );

    await db.runAsync(`DELETE FROM exercises WHERE id = ?`, "ex-1");

    const remaining = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) AS c FROM completion_records`,
    );
    expect(remaining?.c).toBe(0);
  });

  it("rejects a completion referencing a non-existent exercise", async () => {
    const db = createTestDb();
    await initializeDatabase(db);

    await expect(
      db.runAsync(
        `INSERT INTO completion_records
          (id, exercise_id, day_key, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?)`,
        "c-orphan",
        "does-not-exist",
        "2024-01-15",
        null,
        1_700_000_000_000,
      ),
    ).rejects.toThrow();
  });
});
