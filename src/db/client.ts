import type * as SQLite from "expo-sqlite";

// ─────────────────────────────────────────────────────────────
// Schema version
//
// Bump this whenever a migration is added to the MIGRATIONS array
// below. Never bump without a matching migration — the migration
// runner relies on them being in lockstep.
//
//   1 → base schema
//   2 → user_profile.age
// ─────────────────────────────────────────────────────────────
const SCHEMA_VERSION = 2;

// ─────────────────────────────────────────────────────────────
// Meta table
//
// Single-row table holding the current schema version. Lives outside
// the user-facing tables so "Wipe All Data" doesn't lose it — wiping
// data does not un-apply migrations.
// ─────────────────────────────────────────────────────────────
const META_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_meta (
    id      INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL
  );
`;

async function getSchemaVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ version: number }>(
    `SELECT version FROM schema_meta WHERE id = 1`,
  );
  return row?.version ?? 0;
}

async function setSchemaVersion(
  db: SQLite.SQLiteDatabase,
  version: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO schema_meta (id, version) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET version = excluded.version`,
    version,
  );
}

// ─────────────────────────────────────────────────────────────
// Base schema
//
// The full schema at the current SCHEMA_VERSION. Runs only on
// fresh installs (no schema_meta row yet). Every statement is
// IF NOT EXISTS, so it's also safe to re-run defensively.
//
// IMPORTANT: this represents the *latest* shape. If a future
// migration changes an existing table, update this block to
// reflect the new shape — fresh installs should never need to
// run migrations to reach the current version.
// ─────────────────────────────────────────────────────────────
async function runBaseSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS preferences (
      key        TEXT PRIMARY KEY NOT NULL,
      value      TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id                      TEXT PRIMARY KEY NOT NULL,
      display_name            TEXT NOT NULL,
      age                     INTEGER,
      start_date              INTEGER NOT NULL,
      initial_weight_kg       REAL NOT NULL,
      goal_weight_kg          REAL NOT NULL,
      initial_height_cm       REAL NOT NULL,
      initial_front_photo_uri TEXT,
      initial_side_photo_uri  TEXT
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id                       TEXT PRIMARY KEY NOT NULL,
      name                     TEXT NOT NULL,
      body_parts               TEXT NOT NULL,
      exercise_type            TEXT NOT NULL,
      reps                     INTEGER NOT NULL DEFAULT 0,
      sets                     INTEGER NOT NULL,
      duration_seconds         INTEGER NOT NULL DEFAULT 0,
      session_duration_seconds INTEGER NOT NULL,
      is_daily                 INTEGER NOT NULL DEFAULT 1,
      notes                    TEXT NOT NULL DEFAULT '',
      created_at               INTEGER NOT NULL,
      sort_index               INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_exercises_sort
      ON exercises (sort_index);

    CREATE TABLE IF NOT EXISTS completion_records (
      id           TEXT PRIMARY KEY NOT NULL,
      exercise_id  TEXT NOT NULL,
      day_key      TEXT NOT NULL,
      started_at   INTEGER,
      completed_at INTEGER NOT NULL,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_completions_day
      ON completion_records (day_key);
    CREATE INDEX IF NOT EXISTS idx_completions_exercise
      ON completion_records (exercise_id);

    DELETE FROM completion_records
     WHERE rowid NOT IN (
       SELECT MIN(rowid)
         FROM completion_records
        GROUP BY exercise_id, day_key
     );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_completions_exercise_day
      ON completion_records (exercise_id, day_key);

    CREATE TABLE IF NOT EXISTS day_locks (
      id        TEXT PRIMARY KEY NOT NULL,
      day_key   TEXT NOT NULL UNIQUE,
      locked_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_swears (
      id             TEXT PRIMARY KEY NOT NULL,
      day_key        TEXT NOT NULL UNIQUE,
      sworn_at       INTEGER NOT NULL,
      transcript     TEXT NOT NULL,
      matched_phrase TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id                TEXT PRIMARY KEY NOT NULL,
      day               INTEGER NOT NULL UNIQUE,
      unlocked_at       INTEGER NOT NULL,
      completed_at      INTEGER,
      current_weight_kg REAL,
      user_notes        TEXT NOT NULL DEFAULT '',
      ai_summary        TEXT
    );

    CREATE TABLE IF NOT EXISTS frozen_days (
      day_key   TEXT PRIMARY KEY NOT NULL,
      frozen_at INTEGER NOT NULL,
      reason    TEXT NOT NULL DEFAULT 'auto-missed'
    );

    CREATE INDEX IF NOT EXISTS idx_frozen_days_month
      ON frozen_days (day_key);
  `);
}

// ─────────────────────────────────────────────────────────────
// Migrations
//
// Each entry transforms the schema from `to - 1` to `to`. Add new
// entries at the END of the array; never reorder or delete existing
// entries — an install somewhere in the wild may be sitting at any
// version. Bump SCHEMA_VERSION to match the highest `to`.
// ─────────────────────────────────────────────────────────────
interface Migration {
  to: number;
  run: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    to: 2,
    run: async (db) => {
      // Adds the nullable `age` column. Pre-existing profiles get
      // NULL; the onboarding flow now requires an age for new
      // profiles, so the practical shape is "null only on installs
      // that predate v2 and never re-onboarded".
      await db.execAsync(`ALTER TABLE user_profile ADD COLUMN age INTEGER`);
    },
  },
];

// ─────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────
export async function initializeDatabase(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  await db.execAsync(META_TABLE_SQL);

  const currentVersion = await getSchemaVersion(db);

  // ── Fresh install ────────────────────────────────────────
  if (currentVersion === 0) {
    await runBaseSchema(db);
    await setSchemaVersion(db, SCHEMA_VERSION);
    return;
  }

  // ── Upgrades ─────────────────────────────────────────────
  if (currentVersion < SCHEMA_VERSION) {
    for (const migration of MIGRATIONS) {
      if (migration.to > currentVersion) {
        await migration.run(db);
        await setSchemaVersion(db, migration.to);
      }
    }
  }

  // currentVersion === SCHEMA_VERSION → nothing to do.
  // currentVersion > SCHEMA_VERSION → app downgrade; leave it alone.
}
