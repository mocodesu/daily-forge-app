import { initializeDatabase } from "@/db/client";
import { FrozenDaysRepo } from "@/repositories/frozen-days-repo";
import { createTestDb } from "@/testing/db";
import type { SQLiteDatabase } from "expo-sqlite";

describe("FrozenDaysRepo", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("isFrozen returns false for a day that was never frozen", async () => {
    expect(await FrozenDaysRepo.isFrozen(db, "2024-01-15")).toBe(false);
  });

  it("isFrozen returns true after insert", async () => {
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-01-15",
      frozenAt: 1_700_000_000_000,
      reason: "auto-missed",
    });
    expect(await FrozenDaysRepo.isFrozen(db, "2024-01-15")).toBe(true);
  });

  it("a duplicate day_key insert is a no-op (INSERT OR IGNORE)", async () => {
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-01-15",
      frozenAt: 100,
      reason: "auto-missed",
    });
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-01-15",
      frozenAt: 999,
      reason: "manual",
    });

    const all = await FrozenDaysRepo.getAll(db);
    expect(all).toHaveLength(1);
    expect(all[0].frozenAt).toBe(100);
    expect(all[0].reason).toBe("auto-missed");
  });

  it("getAll returns days ordered newest first", async () => {
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-01-10",
      frozenAt: 100,
      reason: "auto-missed",
    });
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-01-20",
      frozenAt: 200,
      reason: "auto-missed",
    });
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-01-15",
      frozenAt: 150,
      reason: "auto-missed",
    });

    const result = await FrozenDaysRepo.getAll(db);
    expect(result.map((f) => f.dayKey)).toEqual([
      "2024-01-20",
      "2024-01-15",
      "2024-01-10",
    ]);
  });

  it("getAll returns an empty array on a fresh install", async () => {
    expect(await FrozenDaysRepo.getAll(db)).toEqual([]);
  });

  it("countForMonth counts only the specified month", async () => {
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-01-05",
      frozenAt: 100,
      reason: "auto-missed",
    });
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-01-20",
      frozenAt: 100,
      reason: "auto-missed",
    });
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-02-01",
      frozenAt: 100,
      reason: "auto-missed",
    });
    await FrozenDaysRepo.insert(db, {
      dayKey: "2023-12-31",
      frozenAt: 100,
      reason: "auto-missed",
    });

    expect(await FrozenDaysRepo.countForMonth(db, 2024, 1)).toBe(2);
    expect(await FrozenDaysRepo.countForMonth(db, 2024, 2)).toBe(1);
    expect(await FrozenDaysRepo.countForMonth(db, 2023, 12)).toBe(1);
    expect(await FrozenDaysRepo.countForMonth(db, 2024, 3)).toBe(0);
  });

  it("countForMonth zero-pads single-digit months correctly", async () => {
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-09-15",
      frozenAt: 100,
      reason: "auto-missed",
    });
    expect(await FrozenDaysRepo.countForMonth(db, 2024, 9)).toBe(1);
    // Should not match 2024-10 through 2024-12.
    expect(await FrozenDaysRepo.countForMonth(db, 2024, 10)).toBe(0);
  });

  it("delete removes one day", async () => {
    await FrozenDaysRepo.insert(db, {
      dayKey: "2024-01-15",
      frozenAt: 100,
      reason: "auto-missed",
    });
    await FrozenDaysRepo.delete(db, "2024-01-15");
    expect(await FrozenDaysRepo.isFrozen(db, "2024-01-15")).toBe(false);
  });

  it("deleteAll removes every frozen day", async () => {
    for (let i = 1; i <= 5; i++) {
      await FrozenDaysRepo.insert(db, {
        dayKey: `2024-01-0${i}`,
        frozenAt: 100,
        reason: "auto-missed",
      });
    }
    await FrozenDaysRepo.deleteAll(db);
    expect(await FrozenDaysRepo.getAll(db)).toEqual([]);
  });
});
