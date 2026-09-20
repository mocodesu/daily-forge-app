import { initializeDatabase } from "@/db/client";
import { useUnitSystem } from "@/hooks/use-unit-system";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { createTestDb } from "@/testing/db";
import { setCurrentTestDb } from "@/testing/db-state";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { SQLiteDatabase } from "expo-sqlite";

describe("useUnitSystem", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
    setCurrentTestDb(db);
  });

  afterEach(() => {
    setCurrentTestDb(null);
  });

  it("defaults to metric", async () => {
    const { result } = await renderHook(() => useUnitSystem());
    expect(result.current.system).toBe("metric");
    expect(result.current.weightUnit).toBe("kg");
  });

  it("loads a stored imperial preference", async () => {
    await PreferencesRepo.set(db, "units.system", "imperial");

    const { result } = await renderHook(() => useUnitSystem());
    await waitFor(() => expect(result.current.system).toBe("imperial"));
    expect(result.current.weightUnit).toBe("lb");
  });

  it("setSystem updates state and persists", async () => {
    const { result } = await renderHook(() => useUnitSystem());

    await act(async () => {
      await result.current.setSystem("imperial");
    });

    expect(result.current.system).toBe("imperial");
    expect(await PreferencesRepo.get(db, "units.system")).toBe("imperial");
  });

  it("kgToDisplay converts kg to lb under imperial", async () => {
    const { result } = await renderHook(() => useUnitSystem());
    await act(async () => {
      await result.current.setSystem("imperial");
    });

    expect(result.current.kgToDisplay(10)).toBeCloseTo(22.046226, 5);
  });

  it("displayToKg converts lb back to kg (round-trip)", async () => {
    const { result } = await renderHook(() => useUnitSystem());
    await act(async () => {
      await result.current.setSystem("imperial");
    });

    const kg = 75;
    const lb = result.current.kgToDisplay(kg);
    expect(result.current.displayToKg(lb)).toBeCloseTo(kg, 8);
  });

  it("kgToDisplay is identity under metric", async () => {
    const { result } = await renderHook(() => useUnitSystem());
    expect(result.current.kgToDisplay(75)).toBe(75);
    expect(result.current.displayToKg(75)).toBe(75);
  });

  it("formatWeight returns one decimal place in the active unit", async () => {
    const { result } = await renderHook(() => useUnitSystem());
    expect(result.current.formatWeight(70)).toBe("70.0");

    await act(async () => {
      await result.current.setSystem("imperial");
    });
    expect(result.current.formatWeight(70)).toBe("154.3");
  });
});
