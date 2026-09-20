import type { BodyPart, Exercise, ExerciseType } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

interface ExerciseRow {
  id: string;
  name: string;
  body_parts: string;
  exercise_type: string;
  reps: number;
  sets: number;
  duration_seconds: number;
  session_duration_seconds: number;
  is_daily: number;
  notes: string;
  created_at: number;
  sort_index: number;
}

const toExercise = (row: ExerciseRow): Exercise => ({
  id: row.id,
  name: row.name,
  bodyParts: JSON.parse(row.body_parts) as BodyPart[],
  exerciseType: row.exercise_type as ExerciseType,
  reps: row.reps,
  sets: row.sets,
  durationSeconds: row.duration_seconds,
  sessionDurationSeconds: row.session_duration_seconds,
  isDaily: row.is_daily === 1,
  notes: row.notes,
  createdAt: row.created_at,
  sortIndex: row.sort_index,
});

export const ExercisesRepo = {
  async insert(db: SQLiteDatabase, exercise: Exercise): Promise<void> {
    await db.runAsync(
      `INSERT INTO exercises (
        id, name, body_parts, exercise_type,
        reps, sets, duration_seconds, session_duration_seconds,
        is_daily, notes, created_at, sort_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      exercise.id,
      exercise.name,
      JSON.stringify(exercise.bodyParts),
      exercise.exerciseType,
      exercise.reps,
      exercise.sets,
      exercise.durationSeconds,
      exercise.sessionDurationSeconds,
      exercise.isDaily ? 1 : 0,
      exercise.notes,
      exercise.createdAt,
      exercise.sortIndex,
    );
  },

  async getAll(db: SQLiteDatabase): Promise<Exercise[]> {
    const rows = await db.getAllAsync<ExerciseRow>(
      `SELECT * FROM exercises ORDER BY sort_index ASC`,
    );
    return rows.map(toExercise);
  },

  async getById(db: SQLiteDatabase, id: string): Promise<Exercise | null> {
    const row = await db.getFirstAsync<ExerciseRow>(
      `SELECT * FROM exercises WHERE id = ?`,
      id,
    );
    return row ? toExercise(row) : null;
  },

  /** Returns the exercises that apply on a given calendar day. */
  async getActiveForDay(
    db: SQLiteDatabase,
    dayStartMs: number,
    dayEndMs: number,
  ): Promise<Exercise[]> {
    const rows = await db.getAllAsync<ExerciseRow>(
      `SELECT * FROM exercises
       WHERE is_daily = 1
          OR (created_at >= ? AND created_at < ?)
       ORDER BY sort_index ASC`,
      dayStartMs,
      dayEndMs,
    );
    return rows.map(toExercise);
  },

  async updateIsDaily(
    db: SQLiteDatabase,
    id: string,
    isDaily: boolean,
  ): Promise<void> {
    await db.runAsync(
      `UPDATE exercises SET is_daily = ? WHERE id = ?`,
      isDaily ? 1 : 0,
      id,
    );
  },

  async updateCreatedAt(
    db: SQLiteDatabase,
    id: string,
    createdAt: number,
  ): Promise<void> {
    await db.runAsync(
      `UPDATE exercises SET created_at = ? WHERE id = ?`,
      createdAt,
      id,
    );
  },

  async delete(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM exercises WHERE id = ?`, id);
  },

  async count(db: SQLiteDatabase): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM exercises`,
    );
    /* istanbul ignore next: COUNT(*) always returns exactly one row */
    return row?.count ?? 0;
  },
};
