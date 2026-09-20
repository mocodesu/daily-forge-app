import { initializeDatabase } from "@/db/client";
import { CompletionsRepo } from "@/repositories/completions-repo";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { FrozenDaysRepo } from "@/repositories/frozen-days-repo";
import { createTestDb } from "@/testing/db";
import type { Exercise } from "@/types/dailyforge";
import { dayKey } from "@/utils/day-key";
import { computeHistory } from "@/utils/history";
import type { SQLiteDatabase } from "expo-sqlite";

const k = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dayKey(d);
};

const kMs = (offset: number, hour = 12): number => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

const makeDaily = (id: string): Exercise => ({
  id,
  name: `Daily ${id}`,
  bodyParts: ["Chest"],
  exerciseType: "reps",
  reps: 10,
  sets: 3,
  durationSeconds: 0,
  sessionDurationSeconds: 60,
  isDaily: true,
  notes: "",
  createdAt: kMs(-30),
  sortIndex: 1,
});

describe("computeHistory", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("returns N days newest-first with all zeros on an empty DB", async () => {
    const days = await computeHistory(db, 7);
    expect(days).toHaveLength(7);

    // Today is first.
    expect(days[0].isToday).toBe(true);
    expect(days[0].dayKey).toBe(k(0));
    // Oldest is last.
    expect(days[6].dayKey).toBe(k(-6));

    for (const d of days) {
      expect(d.completed).toBe(0);
      expect(d.total).toBe(0);
      expect(d.isSealed).toBe(false);
      expect(d.isFrozen).toBe(false);
    }
  });

  it("counts a daily exercise as due on every day it existed", async () => {
    await ExercisesRepo.insert(db, makeDaily("d1"));

    const days = await computeHistory(db, 5);
    for (const d of days) {
      expect(d.total).toBe(1);
    }
  });

  it("marks the day as sealed when a lock exists", async () => {
    await ExercisesRepo.insert(db, makeDaily("d1"));
    await DayLocksRepo.insert(db, {
      id: "lock-today",
      dayKey: k(0),
      lockedAt: Date.now(),
    });

    const days = await computeHistory(db, 3);
    expect(days[0].isSealed).toBe(true);
    expect(days[1].isSealed).toBe(false);
  });

  it("marks the day as frozen when frozen_days has a row", async () => {
    await FrozenDaysRepo.insert(db, {
      dayKey: k(-1),
      frozenAt: Date.now(),
      reason: "auto-missed",
    });

    const days = await computeHistory(db, 3);
    const yesterday = days.find((d) => d.dayKey === k(-1));
    expect(yesterday?.isFrozen).toBe(true);
  });

  it("counts completions for the correct day", async () => {
    await ExercisesRepo.insert(db, makeDaily("d1"));
    await ExercisesRepo.insert(db, makeDaily("d2"));
    await CompletionsRepo.insert(db, {
      id: "c1",
      exerciseId: "d1",
      dayKey: k(0),
      startedAt: null,
      completedAt: Date.now(),
    });

    const days = await computeHistory(db, 3);
    expect(days[0].completed).toBe(1);
    expect(days[0].total).toBe(2);
    expect(days[1].completed).toBe(0);
  });

  it("excludes one-off exercises from days they weren't created on", async () => {
    await ExercisesRepo.insert(db, {
      ...makeDaily("one-off"),
      isDaily: false,
      createdAt: kMs(-1),
    });

    const days = await computeHistory(db, 3);
    const twoDaysAgo = days.find((d) => d.dayKey === k(-2));
    expect(twoDaysAgo?.total).toBe(0);

    const yesterday = days.find((d) => d.dayKey === k(-1));
    expect(yesterday?.total).toBe(1);
  });

  it("defaults the day count from the caller", async () => {
    const days = await computeHistory(db, 14);
    expect(days).toHaveLength(14);
  });
  it("groups multiple completions on the same day", async () => {
    await ExercisesRepo.insert(db, makeDaily("d1"));
    await ExercisesRepo.insert(db, makeDaily("d2"));

    // Both completions on the same day — the second iteration of the
    // grouping loop takes the "already in the map" path.
    await CompletionsRepo.insert(db, {
      id: "c1",
      exerciseId: "d1",
      dayKey: k(0),
      startedAt: null,
      completedAt: Date.now(),
    });
    await CompletionsRepo.insert(db, {
      id: "c2",
      exerciseId: "d2",
      dayKey: k(0),
      startedAt: null,
      completedAt: Date.now(),
    });

    const days = await computeHistory(db, 3);
    expect(days[0].completed).toBe(2);
    expect(days[0].total).toBe(2);
  });
});
