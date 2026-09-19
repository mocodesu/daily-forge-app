import * as SQLite from "expo-sqlite";

export async function initializeDatabase(db: SQLite.SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS preferences (
      key        TEXT PRIMARY KEY NOT NULL,
      value      TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id                      TEXT PRIMARY KEY NOT NULL,
      display_name            TEXT NOT NULL,
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

    -- Streak freezes: days the user missed but that don't break the streak.
    CREATE TABLE IF NOT EXISTS frozen_days (
      day_key   TEXT PRIMARY KEY NOT NULL,
      frozen_at INTEGER NOT NULL,
      reason    TEXT NOT NULL DEFAULT 'auto-missed'
    );

    CREATE INDEX IF NOT EXISTS idx_frozen_days_month
      ON frozen_days (day_key);
  `);
}
