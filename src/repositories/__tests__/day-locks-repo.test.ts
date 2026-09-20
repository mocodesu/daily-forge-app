import { initializeDatabase } from "@/db/client";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { createTestDb } from "@/testing/db";
import type { DayLock } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

const lock = (dayKey: string, lockedAt = 1_700_000_000_000): DayLock => ({
  id: `lock-${dayKey}`,
  dayKey,
  lockedAt,
});

describe("DayLocksRepo", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("isLocked returns false for an unlocked day", async () => {
    expect(await DayLocksRepo.isLocked(db, "2024-01-15")).toBe(false);
  });

  it("isLocked returns true after insert", async () => {
    await DayLocksRepo.insert(db, lock("2024-01-15"));
    expect(await DayLocksRepo.isLocked(db, "2024-01-15")).toBe(true);
  });

  it("a duplicate dayKey insert is a no-op (INSERT OR IGNORE)", async () => {
    await DayLocksRepo.insert(db, lock("2024-01-15", 100));
    // Second insert with a different id and timestamp, same dayKey.
    await DayLocksRepo.insert(db, {
      id: "different-id",
      dayKey: "2024-01-15",
      lockedAt: 999,
    });

    const row = await db.getFirstAsync<{ id: string; locked_at: number }>(
      `SELECT id, locked_at FROM day_locks WHERE day_key = ?`,
      "2024-01-15",
    );
    // First writer wins — the duplicate did not overwrite anything.
    expect(row?.id).toBe("lock-2024-01-15");
    expect(row?.locked_at).toBe(100);
  });

  it("different days can both be locked", async () => {
    await DayLocksRepo.insert(db, lock("2024-01-15"));
    await DayLocksRepo.insert(db, lock("2024-01-16"));

    expect(await DayLocksRepo.isLocked(db, "2024-01-15")).toBe(true);
    expect(await DayLocksRepo.isLocked(db, "2024-01-16")).toBe(true);
  });

  it("getRecent returns locks ordered by locked_at DESC", async () => {
    await DayLocksRepo.insert(db, lock("2024-01-15", 100));
    await DayLocksRepo.insert(db, lock("2024-01-16", 300));
    await DayLocksRepo.insert(db, lock("2024-01-17", 200));

    const result = await DayLocksRepo.getRecent(db);
    expect(result.map((l) => l.dayKey)).toEqual([
      "2024-01-16",
      "2024-01-17",
      "2024-01-15",
    ]);
  });

  it("getRecent respects the limit", async () => {
    for (let i = 0; i < 5; i++) {
      await DayLocksRepo.insert(db, lock(`2024-01-${15 + i}`, 100 + i));
    }
    const result = await DayLocksRepo.getRecent(db, 2);
    expect(result).toHaveLength(2);
  });

  it("getRecent returns an empty array when no locks exist", async () => {
    expect(await DayLocksRepo.getRecent(db)).toEqual([]);
  });
});
