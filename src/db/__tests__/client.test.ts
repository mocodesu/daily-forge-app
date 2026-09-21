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

  it("sets schema_meta.version to 2 on a fresh install", async () => {
    const db = createTestDb();
    await initializeDatabase(db);

    const row = await db.getFirstAsync<{ version: number }>(
      `SELECT version FROM schema_meta WHERE id = 1`,
    );
    expect(row?.version).toBe(2);
  });

  it("is idempotent — running twice does not error and does not change the version", async () => {
    const db = createTestDb();
    await initializeDatabase(db);
    await expect(initializeDatabase(db)).resolves.toBeUndefined();

    const row = await db.getFirstAsync<{ version: number }>(
      `SELECT version FROM schema_meta WHERE id = 1`,
    );
    expect(row?.version).toBe(2);
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

  it("migrates a v1 install to v2 by adding the age column", async () => {
    const db = createTestDb();

    // Simulate a v1 install: schema_meta at version 1, user_profile
    // without the age column. This is the exact v1 shape — hand-written
    // here rather than pulled from a prior commit so the test is
    // deterministic and self-documenting.
    await db.execAsync(`
      CREATE TABLE schema_meta (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL
      );
      INSERT INTO schema_meta (id, version) VALUES (1, 1);

      CREATE TABLE user_profile (
        id                      TEXT PRIMARY KEY NOT NULL,
        display_name            TEXT NOT NULL,
        start_date              INTEGER NOT NULL,
        initial_weight_kg       REAL NOT NULL,
        goal_weight_kg          REAL NOT NULL,
        initial_height_cm       REAL NOT NULL,
        initial_front_photo_uri TEXT,
        initial_side_photo_uri  TEXT
      );
    `);

    // Insert a v1-era profile — no age column to fill.
    await db.runAsync(
      `INSERT INTO user_profile (
        id, display_name, start_date,
        initial_weight_kg, goal_weight_kg, initial_height_cm,
        initial_front_photo_uri, initial_side_photo_uri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      "default",
      "Ada",
      1_700_000_000_000,
      70,
      65,
      170,
      null,
      null,
    );

    await initializeDatabase(db);

    // Version bumped to 2.
    const meta = await db.getFirstAsync<{ version: number }>(
      `SELECT version FROM schema_meta WHERE id = 1`,
    );
    expect(meta?.version).toBe(2);

    // Age column exists, and the pre-existing row got NULL.
    const profile = await db.getFirstAsync<{ age: number | null }>(
      `SELECT age FROM user_profile WHERE id = ?`,
      "default",
    );
    expect(profile?.age).toBeNull();
  });

  it("a fresh install lands at v2 with age already in the schema", async () => {
    const db = createTestDb();
    await initializeDatabase(db);

    const meta = await db.getFirstAsync<{ version: number }>(
      `SELECT version FROM schema_meta WHERE id = 1`,
    );
    expect(meta?.version).toBe(2);

    // Insert a profile with age; read it back to prove the base
    // schema includes the column.
    await db.runAsync(
      `INSERT INTO user_profile (
        id, display_name, age, start_date,
        initial_weight_kg, goal_weight_kg, initial_height_cm,
        initial_front_photo_uri, initial_side_photo_uri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      "default",
      "Ada",
      30,
      1_700_000_000_000,
      70,
      65,
      170,
      null,
      null,
    );
    const row = await db.getFirstAsync<{ age: number | null }>(
      `SELECT age FROM user_profile WHERE id = ?`,
      "default",
    );
    expect(row?.age).toBe(30);
  });
});
