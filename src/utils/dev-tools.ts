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
import {
  inspectRetentionState,
  resetRetentionState,
  trackUserActivity,
} from "@/utils/retention-reminder";
import * as Notifications from "expo-notifications";
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
    notes: "Elbows tucked at 45°.",
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
    notes: "Squeeze glutes at the top.",
  },
  {
    name: "Jumping Jacks",
    bodyParts: ["Cardio", "Full Body"],
    exerciseType: "reps",
    reps: 30,
    sets: 3,
    durationSeconds: 0,
    sessionDurationSeconds: 90,
    notes: "Full range, steady pace.",
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
// 2. Complete all / reset today / delete exercises
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

export async function resetTodayCompletions(db: SQLiteDatabase): Promise<void> {
  const key = dayKey();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM completion_records WHERE day_key = ?`, key);
    await db.runAsync(`DELETE FROM day_locks WHERE day_key = ?`, key);
    await db.runAsync(`DELETE FROM daily_swears WHERE day_key = ?`, key);
  });
}

export async function deleteAllExercises(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(`DELETE FROM exercises`);
}

export async function clearAllHistory(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(`DELETE FROM completion_records`);
}

// ─────────────────────────────────────────────────────────────
// 3. Celebration state
// ─────────────────────────────────────────────────────────────

export async function resetCelebrations(db: SQLiteDatabase): Promise<void> {
  await clearCelebratedTargets(db);
}

export async function getCelebratedTargets(
  db: SQLiteDatabase,
): Promise<number[]> {
  return listCelebratedTargets(db);
}

// ─────────────────────────────────────────────────────────────
// 4. Notifications
// ─────────────────────────────────────────────────────────────

export async function getNotificationPermissionStatus(): Promise<string> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return canAskAgain ? status : `${status} (can't ask again)`;
  } catch {
    return "unknown";
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/** Fires a notification immediately (via `trigger: null`). */
export async function fireTestNotificationNow(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `dev-immediate-${Date.now()}`,
      content: {
        title: "Immediate test",
        body: "If you can see this, notifications work.",
        sound: true,
        data: { type: "dev-test" },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("[dev-tools] immediate notification failed:", err);
  }
}

/** Schedules a test notification `seconds` from now. */
export async function scheduleTestNotificationIn(
  seconds: number,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `dev-timed-${Date.now()}`,
      content: {
        title: `Timed test (+${seconds}s)`,
        body: `Scheduled ${seconds} seconds from now.`,
        sound: true,
        data: { type: "dev-test" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  } catch (err) {
    console.warn("[dev-tools] timed notification failed:", err);
  }
}

/**
 * Simulates a daily-reminder firing in `minutes`. Uses a dev-only
 * identifier so it doesn't collide with the real scheduled reminders.
 */
export async function scheduleDevDailyReminderIn(
  minutes: number,
): Promise<void> {
  const id = "dev-test-daily-reminder";
  await Notifications.cancelScheduledNotificationAsync(id).catch(
    () => undefined,
  );
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: "Time to work out",
      body: `DEV: daily reminder. Scheduled ${minutes} min ago.`,
      sound: true,
      data: { type: "dev-test-daily-reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + minutes * 60 * 1000),
    },
  });
}

/**
 * Simulates a retention reminder firing in `minutes`. Uses a dev-only
 * identifier so it doesn't collide with the real ones.
 */
export async function scheduleDevRetentionReminderIn(
  minutes: number,
): Promise<void> {
  const id = "dev-test-retention-reminder";
  await Notifications.cancelScheduledNotificationAsync(id).catch(
    () => undefined,
  );
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: "DEV: retention nudge",
      body: `Simulated retention reminder. Scheduled ${minutes} min ago.`,
      sound: true,
      data: { type: "dev-test-retention" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + minutes * 60 * 1000),
    },
  });
}

export interface ScheduledNotificationInfo {
  identifier: string;
  title: string;
  body: string;
  triggerDate: Date | null;
}

export async function listScheduledNotifications(): Promise<
  ScheduledNotificationInfo[]
> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.map((n) => {
      // Trigger shape varies. Date and timeInterval triggers expose
      // different fields. Try to extract a concrete Date where possible.
      let triggerDate: Date | null = null;
      const trigger = n.trigger as unknown as {
        type?: string;
        date?: Date | number;
        seconds?: number;
      } | null;

      if (trigger?.date) {
        triggerDate =
          trigger.date instanceof Date ? trigger.date : new Date(trigger.date);
      } else if (trigger?.seconds && typeof trigger.seconds === "number") {
        triggerDate = new Date(Date.now() + trigger.seconds * 1000);
      }

      return {
        identifier: n.identifier,
        title: n.content?.title ?? "",
        body: n.content?.body ?? "",
        triggerDate,
      };
    });
  } catch (err) {
    console.warn("[dev-tools] list scheduled failed:", err);
    return [];
  }
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn("[dev-tools] cancel all failed:", err);
  }
}

/** Cancels only notifications whose ID starts with a given prefix. */
export async function cancelScheduledByPrefix(prefix: string): Promise<number> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matching = scheduled.filter((n) => n.identifier.startsWith(prefix));
    await Promise.all(
      matching.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier).catch(
          () => undefined,
        ),
      ),
    );
    return matching.length;
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Retention reminder state
// ─────────────────────────────────────────────────────────────

export async function getRetentionState() {
  return inspectRetentionState();
}

export async function resetRetention(): Promise<void> {
  await resetRetentionState();
}

export async function recordActivityNow(): Promise<void> {
  await trackUserActivity();
}

// ─────────────────────────────────────────────────────────────
// 6. Snapshot
// ─────────────────────────────────────────────────────────────

export interface DevDaySnapshot {
  exercisesToday: number;
  completedToday: number;
  isLocked: boolean;
  sworeToday: boolean;
  celebratedTargets: number[];
  retentionLastActivityAt: number;
  retentionPendingIds: string[];
  totalExercises: number;
  totalCompletions: number;
}

export async function getDevDaySnapshot(
  db: SQLiteDatabase,
): Promise<DevDaySnapshot> {
  const now = new Date();
  const key = dayKey(now);
  const startMs = dayStartMs(now);
  const endMs = dayEndMs(now);

  const [
    due,
    completions,
    isLocked,
    swore,
    celebrated,
    retention,
    totalExercises,
    totalCompletions,
  ] = await Promise.all([
    ExercisesRepo.getActiveForDay(db, startMs, endMs),
    CompletionsRepo.getForDay(db, key),
    DayLocksRepo.isLocked(db, key),
    SwearsRepo.hasSwornToday(db, key),
    listCelebratedTargets(db),
    inspectRetentionState(),
    ExercisesRepo.count(db),
    CompletionsRepo.count(db),
  ]);

  return {
    exercisesToday: due.length,
    completedToday: completions.length,
    isLocked,
    sworeToday: swore,
    celebratedTargets: celebrated,
    retentionLastActivityAt: retention.lastActivityAt,
    retentionPendingIds: retention.pendingReminderIds,
    totalExercises,
    totalCompletions,
  };
}
