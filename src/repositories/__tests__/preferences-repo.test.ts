import { initializeDatabase } from "@/db/client";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { createTestDb } from "@/testing/db";
import type { SQLiteDatabase } from "expo-sqlite";

describe("PreferencesRepo", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("returns null for a key that was never set", async () => {
    expect(await PreferencesRepo.get(db, "missing")).toBeNull();
  });

  it("round-trips a value", async () => {
    await PreferencesRepo.set(db, "units.system", "metric");
    expect(await PreferencesRepo.get(db, "units.system")).toBe("metric");
  });

  it("overwrites an existing key without erroring", async () => {
    await PreferencesRepo.set(db, "k", "v1");
    await PreferencesRepo.set(db, "k", "v2");
    expect(await PreferencesRepo.get(db, "k")).toBe("v2");
  });

  it("updates updated_at on overwrite", async () => {
    await PreferencesRepo.set(db, "k", "v1");
    const first = await db.getFirstAsync<{ updated_at: number }>(
      `SELECT updated_at FROM preferences WHERE key = ?`,
      "k",
    );

    // Sleep a tick so Date.now() can differ.
    await new Promise((r) => setTimeout(r, 5));

    await PreferencesRepo.set(db, "k", "v2");
    const second = await db.getFirstAsync<{ updated_at: number }>(
      `SELECT updated_at FROM preferences WHERE key = ?`,
      "k",
    );

    expect(second!.updated_at).toBeGreaterThan(first!.updated_at);
  });

  it("stores empty strings distinctly from missing keys", async () => {
    await PreferencesRepo.set(db, "k", "");
    expect(await PreferencesRepo.get(db, "k")).toBe("");
  });

  it("removes a key", async () => {
    await PreferencesRepo.set(db, "k", "v");
    await PreferencesRepo.remove(db, "k");
    expect(await PreferencesRepo.get(db, "k")).toBeNull();
  });

  it("removing a missing key is a no-op", async () => {
    await expect(PreferencesRepo.remove(db, "nope")).resolves.toBeUndefined();
  });

  it("getAll returns every key as an object", async () => {
    await PreferencesRepo.set(db, "a", "1");
    await PreferencesRepo.set(db, "b", "2");
    await PreferencesRepo.set(db, "c", "3");

    expect(await PreferencesRepo.getAll(db)).toEqual({
      a: "1",
      b: "2",
      c: "3",
    });
  });

  it("getAll returns an empty object when nothing is set", async () => {
    expect(await PreferencesRepo.getAll(db)).toEqual({});
  });
});
