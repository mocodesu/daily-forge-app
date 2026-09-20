import { DEFAULT_SWEAR_PHRASE } from "@/constants/swear";
import { initializeDatabase } from "@/db/client";
import { useSwearPhrase } from "@/hooks/use-swear-phrase";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { createTestDb } from "@/testing/db";
import { setCurrentTestDb } from "@/testing/db-state";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { SQLiteDatabase } from "expo-sqlite";

describe("useSwearPhrase", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
    setCurrentTestDb(db);
  });

  afterEach(() => {
    setCurrentTestDb(null);
  });

  it("returns the default phrase when nothing is stored", async () => {
    const { result } = await renderHook(() => useSwearPhrase());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.phrase).toBe(DEFAULT_SWEAR_PHRASE);
  });

  it("loads a custom phrase", async () => {
    await PreferencesRepo.set(db, "swear.phrase", "I swear to finish strong");

    const { result } = await renderHook(() => useSwearPhrase());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.phrase).toBe("I swear to finish strong");
  });

  it("blank stored value falls back to default", async () => {
    await PreferencesRepo.set(db, "swear.phrase", "   ");

    const { result } = await renderHook(() => useSwearPhrase());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.phrase).toBe(DEFAULT_SWEAR_PHRASE);
  });

  it("setPhrase persists and trims whitespace", async () => {
    const { result } = await renderHook(() => useSwearPhrase());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setPhrase("   I swear   by God   ");
    });

    expect(result.current.phrase).toBe("I swear by God");
    expect(await PreferencesRepo.get(db, "swear.phrase")).toBe(
      "I swear by God",
    );
  });

  it("setPhrase collapses internal whitespace", async () => {
    const { result } = await renderHook(() => useSwearPhrase());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setPhrase("I\nswear\tby   God");
    });

    expect(result.current.phrase).toBe("I swear by God");
  });
});
