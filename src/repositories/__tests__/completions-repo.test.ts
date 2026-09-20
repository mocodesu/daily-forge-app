import { initializeDatabase } from "@/db/client";
import { CompletionsRepo } from "@/repositories/completions-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { createTestDb } from "@/testing/db";
import type { CompletionRecord, Exercise } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

const makeExercise = (id: string): Exercise => ({
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
  createdAt: 1_700_000_000_000,
  sortIndex: 1,
});

const completion = (
  id: string,
  exerciseId: string,
  dayKey: string,
  overrides: Partial<CompletionRecord> = {},
): CompletionRecord => ({
  id,
  exerciseId,
  dayKey,
  startedAt: 1_700_000_000_000,
  completedAt: 1_700_000_060_000,
  ...overrides,
});

describe("CompletionsRepo", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
    await ExercisesRepo.insert(db, makeExercise("ex-1"));
    await ExercisesRepo.insert(db, makeExercise("ex-2"));
  });

  it("count is 0 on a fresh install", async () => {
    expect(await CompletionsRepo.count(db)).toBe(0);
  });

  it("round-trips a completion", async () => {
    const c = completion("c1", "ex-1", "2024-01-15");
    await CompletionsRepo.insert(db, c);
    expect(
      await CompletionsRepo.getForExerciseOnDay(db, "ex-1", "2024-01-15"),
    ).toEqual(c);
  });

  it("preserves a null startedAt", async () => {
    const c = completion("c-null", "ex-1", "2024-01-15", { startedAt: null });
    await CompletionsRepo.insert(db, c);
    const loaded = await CompletionsRepo.getForExerciseOnDay(
      db,
      "ex-1",
      "2024-01-15",
    );
    expect(loaded?.startedAt).toBeNull();
  });

  it("a duplicate (exerciseId, dayKey) insert is a no-op", async () => {
    await CompletionsRepo.insert(
      db,
      completion("first", "ex-1", "2024-01-15", { completedAt: 100 }),
    );
    await CompletionsRepo.insert(
      db,
      completion("second", "ex-1", "2024-01-15", { completedAt: 200 }),
    );

    const row = await CompletionsRepo.getForExerciseOnDay(
      db,
      "ex-1",
      "2024-01-15",
    );
    expect(row?.id).toBe("first");
    expect(row?.completedAt).toBe(100);
  });

  it("the same exercise can be completed on different days", async () => {
    await CompletionsRepo.insert(db, completion("c1", "ex-1", "2024-01-15"));
    await CompletionsRepo.insert(db, completion("c2", "ex-1", "2024-01-16"));

    const day1 = await CompletionsRepo.getForDay(db, "2024-01-15");
    const day2 = await CompletionsRepo.getForDay(db, "2024-01-16");
    expect(day1).toHaveLength(1);
    expect(day2).toHaveLength(1);
  });

  it("getForDay returns completions ordered by completed_at ASC", async () => {
    await CompletionsRepo.insert(
      db,
      completion("late", "ex-1", "2024-01-15", { completedAt: 300 }),
    );
    await CompletionsRepo.insert(
      db,
      completion("early", "ex-2", "2024-01-15", { completedAt: 100 }),
    );

    const result = await CompletionsRepo.getForDay(db, "2024-01-15");
    expect(result.map((r) => r.id)).toEqual(["early", "late"]);
  });

  it("getForDay returns an empty array for an empty day", async () => {
    expect(await CompletionsRepo.getForDay(db, "2024-01-15")).toEqual([]);
  });

  it("getForExerciseOnDay returns null when nothing matches", async () => {
    expect(
      await CompletionsRepo.getForExerciseOnDay(db, "ex-1", "2024-01-15"),
    ).toBeNull();
  });

  it("getAllDayKeys returns distinct day keys, newest first", async () => {
    await CompletionsRepo.insert(db, completion("a", "ex-1", "2024-01-15"));
    await CompletionsRepo.insert(db, completion("b", "ex-1", "2024-01-17"));
    await CompletionsRepo.insert(db, completion("c", "ex-2", "2024-01-15"));

    expect(await CompletionsRepo.getAllDayKeys(db)).toEqual([
      "2024-01-17",
      "2024-01-15",
    ]);
  });

  it("getAllDayKeys returns an empty array when nothing is recorded", async () => {
    expect(await CompletionsRepo.getAllDayKeys(db)).toEqual([]);
  });

  it("deleteForExercise removes only that exercise's records", async () => {
    await CompletionsRepo.insert(db, completion("c1", "ex-1", "2024-01-15"));
    await CompletionsRepo.insert(db, completion("c2", "ex-2", "2024-01-15"));

    await CompletionsRepo.deleteForExercise(db, "ex-1");

    expect(await CompletionsRepo.count(db)).toBe(1);
    expect(
      await CompletionsRepo.getForExerciseOnDay(db, "ex-2", "2024-01-15"),
    ).not.toBeNull();
  });

  it("deleting an exercise cascades to its completions", async () => {
    await CompletionsRepo.insert(db, completion("c1", "ex-1", "2024-01-15"));
    await ExercisesRepo.delete(db, "ex-1");
    expect(await CompletionsRepo.count(db)).toBe(0);
  });

  it("count increments per insert", async () => {
    await CompletionsRepo.insert(db, completion("c1", "ex-1", "2024-01-15"));
    await CompletionsRepo.insert(db, completion("c2", "ex-2", "2024-01-15"));
    expect(await CompletionsRepo.count(db)).toBe(2);
  });
});
