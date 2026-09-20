import { DEFAULT_TARGET_DAYS } from "@/constants/dailyforge";
import { initializeDatabase } from "@/db/client";
import { readTargetDays, useTargetDays } from "@/hooks/use-target-days";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { createTestDb } from "@/testing/db";
import { setCurrentTestDb } from "@/testing/db-state";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { SQLiteDatabase } from "expo-sqlite";

describe("useTargetDays", () => {
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
    const { result } = await renderHook(() => useTargetDays());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.targetDays).toBe(DEFAULT_TARGET_DAYS);
  });

  it("loads a stored value", async () => {
    await PreferencesRepo.set(db, "streak.targetDays", "100");

    const { result } = await renderHook(() => useTargetDays());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.targetDays).toBe(100);
  });

  it("setTargetDays updates state and persists", async () => {
    const { result } = await renderHook(() => useTargetDays());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setTargetDays(60);
    });

    expect(result.current.targetDays).toBe(60);
    expect(await PreferencesRepo.get(db, "streak.targetDays")).toBe("60");
  });

  it("clamps above 365", async () => {
    const { result } = await renderHook(() => useTargetDays());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setTargetDays(1000);
    });

    expect(result.current.targetDays).toBe(365);
  });

  it("clamps below 1", async () => {
    const { result } = await renderHook(() => useTargetDays());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setTargetDays(0);
    });

    expect(result.current.targetDays).toBe(1);
  });

  it("corrupt stored value falls back to default", async () => {
    await PreferencesRepo.set(db, "streak.targetDays", "abc");

    const { result } = await renderHook(() => useTargetDays());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.targetDays).toBe(DEFAULT_TARGET_DAYS);
  });

  it("readTargetDays honors the same clamps", async () => {
    await PreferencesRepo.set(db, "streak.targetDays", "9999");
    expect(await readTargetDays(db)).toBe(365);

    await PreferencesRepo.set(db, "streak.targetDays", "0");
    expect(await readTargetDays(db)).toBe(DEFAULT_TARGET_DAYS);
  });
});
