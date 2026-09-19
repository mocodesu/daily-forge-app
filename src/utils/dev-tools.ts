import { CompletionsRepo } from "@/repositories/completions-repo";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { SwearsRepo } from "@/repositories/swears-repo";
import type { Exercise } from "@/types/dailyforge";
import {
  clearCelebratedTargets,
  listCelebratedTargets,
} from "@/utils/celebrations";
import { dayEndMs, dayKey, dayStartMs, randomUUID } from "@/utils/day-key";
import type { SQLiteDatabase } from "expo-sqlite";

// ─────────────────────────────────────────────────────────────
// 1. Seed 5 exercises
// ─────────────────────────────────────────────────────────────

interface SeedSpec {
  name: string;
  bodyParts: Exercise["bodyParts"];
  exerciseType: Exercise["exerciseType"];
  reps: number;
  sets: number;
  durationSeconds: number;
  sessionDurationSeconds: number;
  notes: string;
}

const SEED_EXERCISES: SeedSpec[] = [
  {
    name: "Push-ups",
    bodyParts: ["Chest", "Arms"],
    exerciseType: "reps",
    reps: 12,
    sets: 3,
    durationSeconds: 0,
    sessionDurationSeconds: 60,
    notes: "Elbows tucked at 45°. Full range.",
  },
  {
    name: "Plank",
    bodyParts: ["Core"],
    exerciseType: "timer",
    reps: 0,
    sets: 3,
    durationSeconds: 30,
    sessionDurationSeconds: 90,
    notes: "Straight line from head to heels.",
  },
  {
    name: "Squats",
    bodyParts: ["Legs", "Glutes"],
    exerciseType: "reps",
    reps: 15,
    sets: 3,
    durationSeconds: 0,
    sessionDurationSeconds: 60,
    notes: "Knees track over toes.",
  },
  {
    name: "Superman",
    bodyParts: ["Back", "Core"],
    exerciseType: "reps",
    reps: 12,
    sets: 3,
    durationSeconds: 0,
    sessionDurationSeconds: 60,
    notes: "Lift chest and legs, squeeze glutes.",
  },
  {
    name: "Jumping Jacks",
    bodyParts: ["Cardio", "Full Body"],
    exerciseType: "reps",
    reps: 30,
    sets: 3,
    durationSeconds: 0,
    sessionDurationSeconds: 90,
    notes: "Full range, steady pace, soft landing.",
  },
];

export async function seedFiveExercises(db: SQLiteDatabase): Promise<number> {
  const existing = await ExercisesRepo.getAll(db);
  const existingNames = new Set(existing.map((e) => e.name));
  const baseSort = existing.length;

  let inserted = 0;
  for (let i = 0; i < SEED_EXERCISES.length; i++) {
    const spec = SEED_EXERCISES[i];
    if (existingNames.has(spec.name)) continue;

    await ExercisesRepo.insert(db, {
      id: randomUUID(),
      name: spec.name,
      bodyParts: spec.bodyParts,
      exerciseType: spec.exerciseType,
      reps: spec.reps,
      sets: spec.sets,
      durationSeconds: spec.durationSeconds,
      sessionDurationSeconds: spec.sessionDurationSeconds,
      isDaily: true,
      notes: spec.notes,
      createdAt: Date.now(),
      sortIndex: baseSort + i,
    });
    inserted++;
  }
  return inserted;
}

// ─────────────────────────────────────────────────────────────
// 2. Complete all exercises for today
// ─────────────────────────────────────────────────────────────

export async function completeAllExercisesForToday(
  db: SQLiteDatabase,
): Promise<number> {
  const now = new Date();
  const key = dayKey(now);
  const startMs = dayStartMs(now);
  const endMs = dayEndMs(now);

  const due = await ExercisesRepo.getActiveForDay(db, startMs, endMs);
  if (due.length === 0) return 0;

  const existing = await CompletionsRepo.getForDay(db, key);
  const doneIds = new Set(existing.map((r) => r.exerciseId));

  let created = 0;
  for (const exercise of due) {
    if (doneIds.has(exercise.id)) continue;

    const completedAt = Date.now();
    const startedAt = completedAt - exercise.sessionDurationSeconds * 1000;

    await CompletionsRepo.insert(db, {
      id: randomUUID(),
      exerciseId: exercise.id,
      dayKey: key,
      startedAt,
      completedAt,
    });
    created++;
    await new Promise((r) => setTimeout(r, 5));
  }
  return created;
}

// ─────────────────────────────────────────────────────────────
// 3. Reset only today's completions
// ─────────────────────────────────────────────────────────────

export async function resetTodayCompletions(db: SQLiteDatabase): Promise<void> {
  const key = dayKey();

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM completion_records WHERE day_key = ?`, key);
    await db.runAsync(`DELETE FROM day_locks WHERE day_key = ?`, key);
    await db.runAsync(`DELETE FROM daily_swears WHERE day_key = ?`, key);
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Celebration state helpers
// ─────────────────────────────────────────────────────────────

/**
 * Wipes the list of celebrated target values so the grand celebration
 * fires again next time the user reaches their target.
 */
export async function resetCelebrations(db: SQLiteDatabase): Promise<void> {
  await clearCelebratedTargets(db);
}

/** Returns the target values that have already been celebrated. */
export async function getCelebratedTargets(
  db: SQLiteDatabase,
): Promise<number[]> {
  return listCelebratedTargets(db);
}

// ─────────────────────────────────────────────────────────────
// Snapshot
// ─────────────────────────────────────────────────────────────

export interface DevDaySnapshot {
  exercisesToday: number;
  completedToday: number;
  isLocked: boolean;
  sworeToday: boolean;
  celebratedTargets: number[];
}

export async function getDevDaySnapshot(
  db: SQLiteDatabase,
): Promise<DevDaySnapshot> {
  const now = new Date();
  const key = dayKey(now);
  const startMs = dayStartMs(now);
  const endMs = dayEndMs(now);

  const [due, completions, isLocked, swore, celebrated] = await Promise.all([
    ExercisesRepo.getActiveForDay(db, startMs, endMs),
    CompletionsRepo.getForDay(db, key),
    DayLocksRepo.isLocked(db, key),
    SwearsRepo.hasSwornToday(db, key),
    listCelebratedTargets(db),
  ]);

  return {
    exercisesToday: due.length,
    completedToday: completions.length,
    isLocked,
    sworeToday: swore,
    celebratedTargets: celebrated,
  };
}
