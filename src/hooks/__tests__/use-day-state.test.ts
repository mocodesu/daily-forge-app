import { initializeDatabase } from "@/db/client";
import { useDayState } from "@/hooks/use-day-state";
import { CompletionsRepo } from "@/repositories/completions-repo";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { SwearsRepo } from "@/repositories/swears-repo";
import { createTestDb } from "@/testing/db";
import { setCurrentTestDb } from "@/testing/db-state";
import type { Exercise } from "@/types/dailyforge";
import { dayKey } from "@/utils/day-key";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { SQLiteDatabase } from "expo-sqlite";

const makeDaily = (id: string): Exercise => ({
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
  createdAt: Date.now() - 1000,
  sortIndex: 1,
});

const TODAY = dayKey();

describe("useDayState", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
    setCurrentTestDb(db);
  });

  afterEach(() => {
    setCurrentTestDb(null);
  });

  it("returns an empty state when nothing is set up", async () => {
    const { result } = await renderHook(() => useDayState(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.exercises).toEqual([]);
    expect(result.current.records).toEqual([]);
    expect(result.current.completedIds.size).toBe(0);
    expect(result.current.allDone).toBe(false);
    expect(result.current.allExercisesCompleted).toBe(false);
    expect(result.current.isLocked).toBe(false);
    expect(result.current.sworeToday).toBe(false);
    expect(result.current.meetsMinimum).toBe(false);
    expect(result.current.progress).toEqual({ done: 0, total: 0 });
    expect(result.current.streak).toBe(0);
    expect(result.current.todayKey).toBe(TODAY);
  });

  it("loads daily exercises as active", async () => {
    await ExercisesRepo.insert(db, makeDaily("e1"));
    await ExercisesRepo.insert(db, makeDaily("e2"));
    await ExercisesRepo.insert(db, makeDaily("e3"));

    const { result } = await renderHook(() => useDayState(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.exercises).toHaveLength(3);
    expect(result.current.progress).toEqual({ done: 0, total: 3 });
  });

  it("excludes one-off exercises not created today", async () => {
    await ExercisesRepo.insert(db, makeDaily("daily"));
    await ExercisesRepo.insert(db, {
      ...makeDaily("one-off"),
      isDaily: false,
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    });

    const { result } = await renderHook(() => useDayState(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.exercises.map((e) => e.id)).toEqual(["daily"]);
  });

  it("marks completed exercises in completedIds", async () => {
    await ExercisesRepo.insert(db, makeDaily("e1"));
    await ExercisesRepo.insert(db, makeDaily("e2"));
    await CompletionsRepo.insert(db, {
      id: "c1",
      exerciseId: "e1",
      dayKey: TODAY,
      startedAt: null,
      completedAt: Date.now(),
    });

    const { result } = await renderHook(() => useDayState(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.completedIds.has("e1")).toBe(true);
    expect(result.current.completedIds.has("e2")).toBe(false);
    expect(result.current.progress).toEqual({ done: 1, total: 2 });
  });

  it("allDone is true only when minimum is met and all are completed", async () => {
    await ExercisesRepo.insert(db, makeDaily("e1"));
    await ExercisesRepo.insert(db, makeDaily("e2"));
    await ExercisesRepo.insert(db, makeDaily("e3"));

    for (const id of ["e1", "e2", "e3"]) {
      await CompletionsRepo.insert(db, {
        id: `c-${id}`,
        exerciseId: id,
        dayKey: TODAY,
        startedAt: null,
        completedAt: Date.now(),
      });
    }

    const { result } = await renderHook(() => useDayState(3));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allDone).toBe(true);
    expect(result.current.allExercisesCompleted).toBe(true);
    expect(result.current.meetsMinimum).toBe(true);
  });

  it("allDone is false when minimum is not met", async () => {
    await ExercisesRepo.insert(db, makeDaily("e1"));
    await ExercisesRepo.insert(db, makeDaily("e2"));
    await ExercisesRepo.insert(db, makeDaily("e3"));

    for (const id of ["e1", "e2", "e3"]) {
      await CompletionsRepo.insert(db, {
        id: `c-${id}`,
        exerciseId: id,
        dayKey: TODAY,
        startedAt: null,
        completedAt: Date.now(),
      });
    }

    const { result } = await renderHook(() => useDayState(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allDone).toBe(false);
    expect(result.current.allExercisesCompleted).toBe(true);
    expect(result.current.meetsMinimum).toBe(false);
  });

  it("allDone is false when not all are completed", async () => {
    await ExercisesRepo.insert(db, makeDaily("e1"));
    await ExercisesRepo.insert(db, makeDaily("e2"));
    await ExercisesRepo.insert(db, makeDaily("e3"));

    await CompletionsRepo.insert(db, {
      id: "c1",
      exerciseId: "e1",
      dayKey: TODAY,
      startedAt: null,
      completedAt: Date.now(),
    });
    await CompletionsRepo.insert(db, {
      id: "c2",
      exerciseId: "e2",
      dayKey: TODAY,
      startedAt: null,
      completedAt: Date.now(),
    });

    const { result } = await renderHook(() => useDayState(3));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allDone).toBe(false);
    expect(result.current.allExercisesCompleted).toBe(false);
    expect(result.current.meetsMinimum).toBe(true);
  });

  it("reflects a day_locks row as isLocked", async () => {
    await DayLocksRepo.insert(db, {
      id: "lock-today",
      dayKey: TODAY,
      lockedAt: Date.now(),
    });

    const { result } = await renderHook(() => useDayState(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isLocked).toBe(true);
  });

  it("reflects a daily_swears row as sworeToday", async () => {
    await SwearsRepo.insert(db, {
      id: "swear-today",
      dayKey: TODAY,
      swornAt: Date.now(),
      transcript: "I swear by God",
      matchedPhrase: "I swear by God",
    });

    const { result } = await renderHook(() => useDayState(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sworeToday).toBe(true);
  });

  it("returns the streak from calculateStreak", async () => {
    await ExercisesRepo.insert(db, makeDaily("e1"));
    await DayLocksRepo.insert(db, {
      id: "lock-today",
      dayKey: TODAY,
      lockedAt: Date.now(),
    });

    const { result } = await renderHook(() => useDayState(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.streak).toBe(1);
    expect(result.current.freezeAllowance).toBe(2);
    expect(result.current.freezeUsed).toBe(0);
    expect(result.current.freezeBalance).toBe(2);
  });

  it("refresh re-reads from the DB", async () => {
    const { result } = await renderHook(() => useDayState(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.exercises).toHaveLength(0);

    await ExercisesRepo.insert(db, makeDaily("new-ex"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.exercises).toHaveLength(1);
    expect(result.current.progress.total).toBe(1);
  });

  it("stays in loading when disabled and never queries the DB", async () => {
    const spy = jest.spyOn(ExercisesRepo, "getActiveForDay");

    const { result } = await renderHook(() => useDayState(5, false));

    expect(result.current.loading).toBe(true);
    expect(result.current.exercises).toEqual([]);
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it("refresh is a no-op when disabled", async () => {
    const { result } = await renderHook(() => useDayState(5, false));
    expect(result.current.loading).toBe(true);

    // Manually invoking refresh hits the `if (!enabled) return;`
    // guard at the top of the function.
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.exercises).toEqual([]);
  });

  it("surfaces errors from failing repos", async () => {
    const spy = jest
      .spyOn(ExercisesRepo, "getActiveForDay")
      .mockRejectedValueOnce(new Error("disk read failed"));

    const { result } = await renderHook(() => useDayState(5));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("disk read failed");
    expect(result.current.exercises).toEqual([]);

    spy.mockRestore();
  });
});
