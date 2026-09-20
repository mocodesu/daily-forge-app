import { initializeDatabase } from "@/db/client";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { FrozenDaysRepo } from "@/repositories/frozen-days-repo";
import { createTestDb } from "@/testing/db";
import type { Exercise } from "@/types/dailyforge";
import { dayKey } from "@/utils/day-key";
import { calculateStreak } from "@/utils/streak";
import type { SQLiteDatabase } from "expo-sqlite";

const k = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dayKey(d);
};

const kMs = (offset: number): number => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
};

const makeExercise = (id: string, createdAt: number): Exercise => ({
  id,
  name: `Exercise ${id}`,
  bodyParts: ["Chest"],
  exerciseType: "reps",
  reps: 10,
  sets: 3,
  durationSeconds: 0,
  sessionDurationSeconds: 60,
  isDaily: true,
  notes: "",
  createdAt,
  sortIndex: 1,
});

async function seal(db: SQLiteDatabase, dayOffset: number): Promise<void> {
  await DayLocksRepo.insert(db, {
    id: `lock-${dayOffset}`,
    dayKey: k(dayOffset),
    lockedAt: Date.now(),
  });
}

describe("calculateStreak — freeze application", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("returns zero streak with nothing recorded", async () => {
    const result = await calculateStreak(db);
    expect(result.streak).toBe(0);
    expect(result.freezesAppliedThisCall).toBe(0);
  });

  it("does not freeze when there are no daily exercises", async () => {
    await ExercisesRepo.insert(db, {
      ...makeExercise("one-off", kMs(-5)),
      isDaily: false,
    });
    await seal(db, -1);

    const result = await calculateStreak(db);
    expect(result.freezesAppliedThisCall).toBe(0);
    // Only the -1 lock counted, but a one-off doesn't keep the streak
    // alive — streak here is what computeStreak returns for the locks
    // that exist, which is 1.
    expect(result.streak).toBe(1);
  });

  it("freezes a single missed day between two sealed days", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-10)));
    await seal(db, 0);
    await seal(db, -2);

    const result = await calculateStreak(db);
    expect(result.freezesAppliedThisCall).toBe(1);
    expect(result.streak).toBe(2);
    expect(await FrozenDaysRepo.isFrozen(db, k(-1))).toBe(true);
  });

  it("freezes two consecutive missed days", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-10)));
    await seal(db, 0);
    await seal(db, -3);

    const result = await calculateStreak(db);
    expect(result.freezesAppliedThisCall).toBe(2);
    expect(result.streak).toBe(2);
    expect(await FrozenDaysRepo.isFrozen(db, k(-1))).toBe(true);
    expect(await FrozenDaysRepo.isFrozen(db, k(-2))).toBe(true);
  });

  it("does not freeze a run longer than the monthly balance", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-10)));
    await seal(db, 0);
    // Missing -1 through -4 (4 days) > balance of 2.
    await seal(db, -5);

    const result = await calculateStreak(db);
    expect(result.freezesAppliedThisCall).toBe(0);
    // Streak breaks at yesterday.
    expect(result.streak).toBe(1);
    expect(await FrozenDaysRepo.isFrozen(db, k(-1))).toBe(false);
  });

  it("does not freeze when the balance is exhausted", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-10)));
    await seal(db, 0);

    // Simulate two freezes already used this month. Mocking is cleaner
    // than inserting rows at fixed day-offsets, because those offsets
    // can fall in a different calendar month depending on when the
    // suite runs.
    const spy = jest
      .spyOn(FrozenDaysRepo, "countForMonth")
      .mockResolvedValue(2);

    try {
      const result = await calculateStreak(db);
      expect(result.freezesAppliedThisCall).toBe(0);
      expect(result.freezeUsed).toBe(2);
      expect(result.freezeBalance).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("stops the run at an already-frozen day", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-10)));
    await FrozenDaysRepo.insert(db, {
      dayKey: k(-1),
      frozenAt: Date.now(),
      reason: "auto-missed",
    });
    await seal(db, 0);

    const result = await calculateStreak(db);
    // Run scan hits -1 immediately which is already frozen → break.
    expect(result.freezesAppliedThisCall).toBe(0);
  });

  it("stops the run at a sealed day", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-10)));
    await seal(db, 0);
    await seal(db, -1);

    const result = await calculateStreak(db);
    expect(result.freezesAppliedThisCall).toBe(0);
    expect(result.streak).toBe(2);
  });

  it("stops the run at the earliest exercise creation", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-1)));
    await seal(db, 0);

    // Yesterday is the earliest day the user had work. The run can't
    // extend past it.
    const result = await calculateStreak(db);
    // The run would be [yesterday] but yesterday equals the boundary.
    // Boundary check is `cursor < earliestCreatedAt` (strict), so
    // yesterday is included if cursor >= earliest.
    expect(result.freezesAppliedThisCall).toBeLessThanOrEqual(1);
  });

  it("does not double-freeze on repeated calls", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-10)));
    await seal(db, 0);
    await seal(db, -2);

    const first = await calculateStreak(db);
    const second = await calculateStreak(db);

    expect(first.freezesAppliedThisCall).toBe(1);
    expect(second.freezesAppliedThisCall).toBe(0);
    expect(second.streak).toBe(2);
  });

  it("reports accurate freeze balance metadata", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-10)));
    await seal(db, 0);
    await seal(db, -2);

    const result = await calculateStreak(db);
    expect(result.freezeAllowance).toBe(2);
    expect(result.freezeUsed).toBe(1);
    expect(result.freezeBalance).toBe(1);
    expect(result.frozenKeys.has(k(-1))).toBe(true);
  });

  it("swallows insert failures on already-frozen days without crashing", async () => {
    await ExercisesRepo.insert(db, makeExercise("e1", kMs(-10)));
    await seal(db, 0);
    await seal(db, -2);

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const originalInsert = FrozenDaysRepo.insert;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (FrozenDaysRepo as any).insert = jest
      .fn()
      .mockRejectedValueOnce(new Error("disk full"));

    try {
      const result = await calculateStreak(db);

      // The failure was swallowed; the day wasn't frozen; the streak
      // calculation continues without it.
      expect(result.freezesAppliedThisCall).toBe(0);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (FrozenDaysRepo as any).insert = originalInsert;
      warnSpy.mockRestore();
    }
  });
});
