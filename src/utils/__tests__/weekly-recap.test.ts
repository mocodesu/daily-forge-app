import { initializeDatabase } from "@/db/client";
import { CompletionsRepo } from "@/repositories/completions-repo";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { FrozenDaysRepo } from "@/repositories/frozen-days-repo";
import { createTestDb } from "@/testing/db";
import type { Exercise } from "@/types/dailyforge";
import { dayKey } from "@/utils/day-key";
import {
  computeWeeklyRecap,
  formatWeeklyRecapShareText,
} from "@/utils/weekly-recap";
import type { SQLiteDatabase } from "expo-sqlite";

const k = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dayKey(d);
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
  createdAt: (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.getTime();
  })(),
  sortIndex: 1,
});

describe("computeWeeklyRecap", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("returns 7 days with zero counts on an empty DB", async () => {
    const recap = await computeWeeklyRecap(db);
    expect(recap.days).toHaveLength(7);
    expect(recap.daysSealed).toBe(0);
    expect(recap.daysFrozen).toBe(0);
    expect(recap.daysMissed).toBe(0);
    expect(recap.daysRest).toBe(7);
    expect(recap.completionRate).toBe(0);
    expect(recap.totalWorkMs).toBe(0);
    expect(recap.streakNow).toBe(0);
  });

  it("counts sealed days", async () => {
    await ExercisesRepo.insert(db, makeDaily("d1"));
    await DayLocksRepo.insert(db, {
      id: "l0",
      dayKey: k(0),
      lockedAt: Date.now(),
    });
    await DayLocksRepo.insert(db, {
      id: "l1",
      dayKey: k(-1),
      lockedAt: Date.now(),
    });

    const recap = await computeWeeklyRecap(db);
    expect(recap.daysSealed).toBe(2);
  });

  it("counts frozen days", async () => {
    await FrozenDaysRepo.insert(db, {
      dayKey: k(-2),
      frozenAt: Date.now(),
      reason: "auto-missed",
    });

    const recap = await computeWeeklyRecap(db);
    expect(recap.daysFrozen).toBe(1);
  });

  it("counts missed days", async () => {
    await ExercisesRepo.insert(db, makeDaily("d1"));

    // 1 sealed day, 6 unsealed and due = 6 missed.
    await DayLocksRepo.insert(db, {
      id: "l0",
      dayKey: k(0),
      lockedAt: Date.now(),
    });

    const recap = await computeWeeklyRecap(db);
    expect(recap.daysMissed).toBe(6);
  });

  it("computes completionRate across the window", async () => {
    await ExercisesRepo.insert(db, makeDaily("d1"));
    await ExercisesRepo.insert(db, makeDaily("d2"));

    // Complete both today, none the other days.
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

    const recap = await computeWeeklyRecap(db);
    // 2 completed / 14 due = 2/14.
    expect(recap.completionRate).toBeCloseTo(2 / 14, 5);
  });

  it("sums work time from startedAt → completedAt", async () => {
    await ExercisesRepo.insert(db, makeDaily("d1"));

    const startedAt = Date.now() - 60_000;
    const completedAt = Date.now();
    await CompletionsRepo.insert(db, {
      id: "c1",
      exerciseId: "d1",
      dayKey: k(0),
      startedAt,
      completedAt,
    });

    const recap = await computeWeeklyRecap(db);
    expect(recap.totalWorkMs).toBe(completedAt - startedAt);
  });

  it("contributes zero work time when startedAt is null", async () => {
    await ExercisesRepo.insert(db, makeDaily("d1"));
    await CompletionsRepo.insert(db, {
      id: "c1",
      exerciseId: "d1",
      dayKey: k(0),
      startedAt: null,
      completedAt: Date.now(),
    });

    const recap = await computeWeeklyRecap(db);
    expect(recap.totalWorkMs).toBe(0);
  });

  it("starts the window 6 days before the reference date", async () => {
    const reference = new Date();
    reference.setDate(reference.getDate() - 30);

    const recap = await computeWeeklyRecap(db, reference);
    const expectedEndKey = dayKey(reference);
    expect(recap.days[6].dayKey).toBe(expectedEndKey);
  });
  it("includes a one-off exercise created during the week", async () => {
    const oneOff: Exercise = {
      ...makeDaily("one-off-in"),
      isDaily: false,
      createdAt: (() => {
        const d = new Date();
        d.setDate(d.getDate() - 3);
        d.setHours(12, 0, 0, 0);
        return d.getTime();
      })(),
    };
    await ExercisesRepo.insert(db, oneOff);

    const recap = await computeWeeklyRecap(db);
    const threeDaysAgo = recap.days.find((d) => d.dayKey === k(-3));
    expect(threeDaysAgo?.total).toBe(1);
  });

  it("excludes a one-off exercise created before the week window", async () => {
    const oneOff: Exercise = {
      ...makeDaily("one-off-out"),
      isDaily: false,
      createdAt: (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.getTime();
      })(),
    };
    await ExercisesRepo.insert(db, oneOff);

    const recap = await computeWeeklyRecap(db);
    // No day in the window should count it.
    for (const day of recap.days) {
      expect(day.total).toBe(0);
    }
  });
});

describe("formatWeeklyRecapShareText", () => {
  it("includes the range, sealed count, completion, and streak", async () => {
    const db = createTestDb();
    await initializeDatabase(db);

    const recap = await computeWeeklyRecap(db);
    const text = formatWeeklyRecapShareText(recap);

    expect(text).toContain("My week in DailyForge");
    expect(text).toContain("Sealed: 0/7 days");
    expect(text).toContain("Completion: 0%");
    expect(text).toContain("Current streak: 0 days");
    // No work time line when totalWorkMs is 0.
    expect(text).not.toContain("Work time");
  });

  it("includes the work time line when there is work time", async () => {
    const db = createTestDb();
    await initializeDatabase(db);

    const ex = makeDaily("d1");
    await ExercisesRepo.insert(db, ex);

    const now = Date.now();
    await CompletionsRepo.insert(db, {
      id: "c1",
      exerciseId: "d1",
      dayKey: k(0),
      startedAt: now - 5 * 60 * 1000,
      completedAt: now,
    });

    const recap = await computeWeeklyRecap(db);
    const text = formatWeeklyRecapShareText(recap);
    expect(text).toContain("Work time: 5m");
  });

  it("uses singular 'day' when the streak is 1", async () => {
    const db = createTestDb();
    await initializeDatabase(db);

    await ExercisesRepo.insert(db, makeDaily("d1"));
    await DayLocksRepo.insert(db, {
      id: "l0",
      dayKey: k(0),
      lockedAt: Date.now(),
    });

    const recap = await computeWeeklyRecap(db);
    const text = formatWeeklyRecapShareText(recap);
    expect(text).toContain("Current streak: 1 day");
    expect(text).not.toContain("Current streak: 1 days");
  });
});
