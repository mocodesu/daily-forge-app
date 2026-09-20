// ─────────────────────────────────────────────────────────────
// repositories/data-management-repo.ts
// ─────────────────────────────────────────────────────────────
import type { SQLiteDatabase } from "expo-sqlite";

export interface TableCounts {
  exercises: number;
  completions: number;
  dayLocks: number;
  swears: number;
  milestones: number;
  frozenDays: number;
  preferences: number;
  hasProfile: boolean;
}

export const DataManagementRepo = {
  async counts(db: SQLiteDatabase): Promise<TableCounts> {
    const [
      exercises,
      completions,
      dayLocks,
      swears,
      milestones,
      frozenDays,
      preferences,
      profile,
    ] = await Promise.all([
      count(db, "exercises"),
      count(db, "completion_records"),
      count(db, "day_locks"),
      count(db, "daily_swears"),
      count(db, "milestones"),
      count(db, "frozen_days"),
      count(db, "preferences"),
      count(db, "user_profile"),
    ]);
    return {
      exercises,
      completions,
      dayLocks,
      swears,
      milestones,
      frozenDays,
      preferences,
      hasProfile: profile > 0,
    };
  },

  async wipeAll(db: SQLiteDatabase): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`DELETE FROM completion_records`);
      await db.execAsync(`DELETE FROM day_locks`);
      await db.execAsync(`DELETE FROM daily_swears`);
      await db.execAsync(`DELETE FROM milestones`);
      await db.execAsync(`DELETE FROM frozen_days`);
      await db.execAsync(`DELETE FROM exercises`);
      await db.execAsync(`DELETE FROM user_profile`);
      await db.execAsync(`DELETE FROM preferences`);
    });
  },

  async restoreFrom(
    db: SQLiteDatabase,
    payload: {
      preferences: Record<string, string>;
      userProfile: unknown[] | null;
      exercises: unknown[];
      completions: unknown[];
      dayLocks: unknown[];
      swears: unknown[];
      milestones: unknown[];
      frozenDays: unknown[];
    },
  ): Promise<void> {
    await db.withTransactionAsync(async () => {
      // 1. Wipe
      await db.execAsync(`DELETE FROM completion_records`);
      await db.execAsync(`DELETE FROM day_locks`);
      await db.execAsync(`DELETE FROM daily_swears`);
      await db.execAsync(`DELETE FROM milestones`);
      await db.execAsync(`DELETE FROM frozen_days`);
      await db.execAsync(`DELETE FROM exercises`);
      await db.execAsync(`DELETE FROM user_profile`);
      await db.execAsync(`DELETE FROM preferences`);

      // 2. Preferences
      for (const [key, value] of Object.entries(payload.preferences)) {
        await db.runAsync(
          `INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?)`,
          key,
          value,
          Date.now(),
        );
      }

      // 3. User profile (single row)
      if (Array.isArray(payload.userProfile)) {
        for (const row of payload.userProfile) {
          const r = row as Record<string, unknown>;
          await db.runAsync(
            `INSERT INTO user_profile (
              id, display_name, start_date,
              initial_weight_kg, goal_weight_kg, initial_height_cm,
              initial_front_photo_uri, initial_side_photo_uri
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            r.id as string,
            r.display_name as string,
            r.start_date as number,
            r.initial_weight_kg as number,
            r.goal_weight_kg as number,
            r.initial_height_cm as number,
            (r.initial_front_photo_uri as string | null) ?? null,
            (r.initial_side_photo_uri as string | null) ?? null,
          );
        }
      }

      // 4. Exercises
      for (const row of payload.exercises) {
        const r = row as Record<string, unknown>;
        await db.runAsync(
          `INSERT INTO exercises (
            id, name, body_parts, exercise_type,
            reps, sets, duration_seconds, session_duration_seconds,
            is_daily, notes, created_at, sort_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          r.id as string,
          r.name as string,
          r.body_parts as string,
          r.exercise_type as string,
          r.reps as number,
          r.sets as number,
          r.duration_seconds as number,
          r.session_duration_seconds as number,
          r.is_daily as number,
          (r.notes as string) ?? "",
          r.created_at as number,
          r.sort_index as number,
        );
      }

      // 5. Completions
      for (const row of payload.completions) {
        const r = row as Record<string, unknown>;
        await db.runAsync(
          `INSERT INTO completion_records
            (id, exercise_id, day_key, started_at, completed_at)
           VALUES (?, ?, ?, ?, ?)`,
          r.id as string,
          r.exercise_id as string,
          r.day_key as string,
          (r.started_at as number | null) ?? null,
          r.completed_at as number,
        );
      }

      // 6. Day locks
      for (const row of payload.dayLocks) {
        const r = row as Record<string, unknown>;
        await db.runAsync(
          `INSERT INTO day_locks (id, day_key, locked_at) VALUES (?, ?, ?)`,
          r.id as string,
          r.day_key as string,
          r.locked_at as number,
        );
      }

      // 7. Swears
      for (const row of payload.swears) {
        const r = row as Record<string, unknown>;
        await db.runAsync(
          `INSERT INTO daily_swears
            (id, day_key, sworn_at, transcript, matched_phrase)
           VALUES (?, ?, ?, ?, ?)`,
          r.id as string,
          r.day_key as string,
          r.sworn_at as number,
          r.transcript as string,
          r.matched_phrase as string,
        );
      }

      // 8. Milestones
      for (const row of payload.milestones) {
        const r = row as Record<string, unknown>;
        await db.runAsync(
          `INSERT INTO milestones (
            id, day, unlocked_at, completed_at,
            current_weight_kg, user_notes, ai_summary
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          r.id as string,
          r.day as number,
          r.unlocked_at as number,
          (r.completed_at as number | null) ?? null,
          (r.current_weight_kg as number | null) ?? null,
          (r.user_notes as string) ?? "",
          (r.ai_summary as string | null) ?? null,
        );
      }

      // 9. Frozen days
      // Columns: day_key (PK), frozen_at, reason. No id column.
      for (const row of payload.frozenDays) {
        const r = row as Record<string, unknown>;
        await db.runAsync(
          `INSERT INTO frozen_days (day_key, frozen_at, reason)
           VALUES (?, ?, ?)`,
          r.day_key as string,
          r.frozen_at as number,
          (r.reason as string) ?? "auto-missed",
        );
      }
    });
  },
};

async function count(db: SQLiteDatabase, table: string): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM ${table}`,
  );
  /* istanbul ignore next: COUNT(*) always returns exactly one row */
  return row?.c ?? 0;
}
