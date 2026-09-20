import { initializeDatabase } from "@/db/client";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { createTestDb } from "@/testing/db";
import type { Exercise } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

const makeExercise = (
  id: string,
  overrides: Partial<Exercise> = {},
): Exercise => ({
  id,
  name: `Exercise ${id}`,
  bodyParts: ["Chest", "Arms"],
  exerciseType: "reps",
  reps: 10,
  sets: 3,
  durationSeconds: 0,
  sessionDurationSeconds: 60,
  isDaily: true,
  notes: "",
  createdAt: 1_700_000_000_000,
  sortIndex: 1,
  ...overrides,
});

describe("ExercisesRepo", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("count is 0 on a fresh install", async () => {
    expect(await ExercisesRepo.count(db)).toBe(0);
  });

  it("inserts and reads back a reps-type exercise", async () => {
    const ex = makeExercise("e1");
    await ExercisesRepo.insert(db, ex);
    expect(await ExercisesRepo.getById(db, "e1")).toEqual(ex);
  });

  it("inserts and reads back a timer-type exercise", async () => {
    const ex = makeExercise("e2", {
      exerciseType: "timer",
      reps: 0,
      durationSeconds: 30,
      sessionDurationSeconds: 90,
    });
    await ExercisesRepo.insert(db, ex);
    expect(await ExercisesRepo.getById(db, "e2")).toEqual(ex);
  });

  it("round-trips body parts through JSON", async () => {
    const ex = makeExercise("e3", {
      bodyParts: ["Legs", "Glutes", "Core"],
    });
    await ExercisesRepo.insert(db, ex);
    const loaded = await ExercisesRepo.getById(db, "e3");
    expect(loaded?.bodyParts).toEqual(["Legs", "Glutes", "Core"]);
  });

  it("round-trips isDaily=false", async () => {
    const ex = makeExercise("e4", { isDaily: false });
    await ExercisesRepo.insert(db, ex);
    const loaded = await ExercisesRepo.getById(db, "e4");
    expect(loaded?.isDaily).toBe(false);
  });

  it("getById returns null for an unknown id", async () => {
    expect(await ExercisesRepo.getById(db, "nope")).toBeNull();
  });

  it("inserting a duplicate id throws (no OR IGNORE on this repo)", async () => {
    await ExercisesRepo.insert(db, makeExercise("e5"));
    await expect(
      ExercisesRepo.insert(db, makeExercise("e5")),
    ).rejects.toThrow();
  });

  it("getAll returns exercises ordered by sort_index", async () => {
    await ExercisesRepo.insert(db, makeExercise("a", { sortIndex: 3 }));
    await ExercisesRepo.insert(db, makeExercise("b", { sortIndex: 1 }));
    await ExercisesRepo.insert(db, makeExercise("c", { sortIndex: 2 }));

    const result = await ExercisesRepo.getAll(db);
    expect(result.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("delete removes the exercise", async () => {
    await ExercisesRepo.insert(db, makeExercise("e6"));
    await ExercisesRepo.delete(db, "e6");
    expect(await ExercisesRepo.getById(db, "e6")).toBeNull();
  });

  it("updateIsDaily flips the flag", async () => {
    await ExercisesRepo.insert(db, makeExercise("e7", { isDaily: true }));
    await ExercisesRepo.updateIsDaily(db, "e7", false);
    const loaded = await ExercisesRepo.getById(db, "e7");
    expect(loaded?.isDaily).toBe(false);
  });

  it("updateIsDaily sets isDaily to true", async () => {
    await ExercisesRepo.insert(db, makeExercise("e9", { isDaily: false }));
    await ExercisesRepo.updateIsDaily(db, "e9", true);
    const loaded = await ExercisesRepo.getById(db, "e9");
    expect(loaded?.isDaily).toBe(true);
  });
  it("updateCreatedAt overwrites the timestamp", async () => {
    await ExercisesRepo.insert(db, makeExercise("e8", { createdAt: 100 }));
    await ExercisesRepo.updateCreatedAt(db, "e8", 200);
    const loaded = await ExercisesRepo.getById(db, "e8");
    expect(loaded?.createdAt).toBe(200);
  });

  describe("getActiveForDay", () => {
    const dayStart = 1_700_000_000_000;
    const dayEnd = dayStart + 86_400_000;

    it("includes daily exercises regardless of creation date", async () => {
      await ExercisesRepo.insert(
        db,
        makeExercise("daily", {
          isDaily: true,
          createdAt: dayStart - 999_999_999,
        }),
      );
      const result = await ExercisesRepo.getActiveForDay(db, dayStart, dayEnd);
      expect(result.map((e) => e.id)).toEqual(["daily"]);
    });

    it("includes a one-off created inside the window", async () => {
      await ExercisesRepo.insert(
        db,
        makeExercise("one-off-in", {
          isDaily: false,
          createdAt: dayStart + 1000,
        }),
      );
      const result = await ExercisesRepo.getActiveForDay(db, dayStart, dayEnd);
      expect(result.map((e) => e.id)).toEqual(["one-off-in"]);
    });

    it("excludes a one-off created before the window", async () => {
      await ExercisesRepo.insert(
        db,
        makeExercise("one-off-before", {
          isDaily: false,
          createdAt: dayStart - 1,
        }),
      );
      const result = await ExercisesRepo.getActiveForDay(db, dayStart, dayEnd);
      expect(result).toEqual([]);
    });

    it("excludes a one-off created at or after dayEnd (exclusive)", async () => {
      await ExercisesRepo.insert(
        db,
        makeExercise("one-off-after", {
          isDaily: false,
          createdAt: dayEnd,
        }),
      );
      const result = await ExercisesRepo.getActiveForDay(db, dayStart, dayEnd);
      expect(result).toEqual([]);
    });

    it("orders results by sort_index", async () => {
      await ExercisesRepo.insert(
        db,
        makeExercise("x", { isDaily: true, sortIndex: 2 }),
      );
      await ExercisesRepo.insert(
        db,
        makeExercise("y", { isDaily: true, sortIndex: 1 }),
      );
      const result = await ExercisesRepo.getActiveForDay(db, dayStart, dayEnd);
      expect(result.map((e) => e.id)).toEqual(["y", "x"]);
    });
  });
});
