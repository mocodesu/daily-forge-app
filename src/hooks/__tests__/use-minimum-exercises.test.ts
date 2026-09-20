import { DEFAULT_MINIMUM_EXERCISES } from "@/constants/dailyforge";
import { initializeDatabase } from "@/db/client";
import {
  readMinimumExercises,
  useMinimumExercises,
} from "@/hooks/use-minimum-exercises";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { createTestDb } from "@/testing/db";
import { setCurrentTestDb } from "@/testing/db-state";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { SQLiteDatabase } from "expo-sqlite";

describe("useMinimumExercises", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
    setCurrentTestDb(db);
  });

  afterEach(() => {
    setCurrentTestDb(null);
  });

  it("falls back to the default when nothing is stored", async () => {
    const { result } = await renderHook(() => useMinimumExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.minimumExercises).toBe(DEFAULT_MINIMUM_EXERCISES);
  });

  it("loads a stored value", async () => {
    await PreferencesRepo.set(db, "exercises.minimum", "7");

    const { result } = await renderHook(() => useMinimumExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.minimumExercises).toBe(7);
  });

  it("setMinimumExercises updates state and persists to DB", async () => {
    const { result } = await renderHook(() => useMinimumExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setMinimumExercises(10);
    });

    expect(result.current.minimumExercises).toBe(10);
    expect(await PreferencesRepo.get(db, "exercises.minimum")).toBe("10");
  });

  it("clamps values above the max", async () => {
    const { result } = await renderHook(() => useMinimumExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setMinimumExercises(999);
    });

    expect(result.current.minimumExercises).toBe(30);
  });

  it("clamps values below the min", async () => {
    const { result } = await renderHook(() => useMinimumExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setMinimumExercises(0);
    });

    expect(result.current.minimumExercises).toBe(1);
  });

  it("floors fractional values", async () => {
    const { result } = await renderHook(() => useMinimumExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setMinimumExercises(5.9);
    });

    expect(result.current.minimumExercises).toBe(5);
  });

  it("corrupt stored value falls back to default", async () => {
    await PreferencesRepo.set(db, "exercises.minimum", "not-a-number");

    const { result } = await renderHook(() => useMinimumExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.minimumExercises).toBe(DEFAULT_MINIMUM_EXERCISES);
  });

  it("readMinimumExercises clamps stored values outside the range", async () => {
    await PreferencesRepo.set(db, "exercises.minimum", "9999");
    expect(await readMinimumExercises(db)).toBe(30);

    await PreferencesRepo.set(db, "exercises.minimum", "-5");
    expect(await readMinimumExercises(db)).toBe(DEFAULT_MINIMUM_EXERCISES);
  });
});
