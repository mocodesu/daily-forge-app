import { initializeDatabase } from "@/db/client";
import { SwearsRepo } from "@/repositories/swears-repo";
import { createTestDb } from "@/testing/db";
import type { DailySwear } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

const swear = (
  dayKey: string,
  extra: Partial<DailySwear> = {},
): DailySwear => ({
  id: `swear-${dayKey}`,
  dayKey,
  swornAt: 1_700_000_000_000,
  transcript: "I swear by God I did my exercises today",
  matchedPhrase: "I swear by God I did my exercises today",
  ...extra,
});

describe("SwearsRepo", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("hasSwornToday returns false for a day with no swear", async () => {
    expect(await SwearsRepo.hasSwornToday(db, "2024-01-15")).toBe(false);
  });

  it("hasSwornToday returns true after insert", async () => {
    await SwearsRepo.insert(db, swear("2024-01-15"));
    expect(await SwearsRepo.hasSwornToday(db, "2024-01-15")).toBe(true);
  });

  it("getForDay returns null when nothing is recorded", async () => {
    expect(await SwearsRepo.getForDay(db, "2024-01-15")).toBeNull();
  });

  it("getForDay round-trips a swear", async () => {
    const original = swear("2024-01-15");
    await SwearsRepo.insert(db, original);
    expect(await SwearsRepo.getForDay(db, "2024-01-15")).toEqual(original);
  });

  it("a duplicate dayKey insert is a no-op (INSERT OR IGNORE)", async () => {
    await SwearsRepo.insert(db, swear("2024-01-15", { transcript: "first" }));
    await SwearsRepo.insert(
      db,
      swear("2024-01-15", { id: "different", transcript: "second" }),
    );

    const row = await SwearsRepo.getForDay(db, "2024-01-15");
    expect(row?.transcript).toBe("first");
  });

  it("different days can both have swears", async () => {
    await SwearsRepo.insert(db, swear("2024-01-15"));
    await SwearsRepo.insert(db, swear("2024-01-16"));

    expect(await SwearsRepo.hasSwornToday(db, "2024-01-15")).toBe(true);
    expect(await SwearsRepo.hasSwornToday(db, "2024-01-16")).toBe(true);
  });

  it("preserves long transcripts", async () => {
    const long = "a".repeat(2000);
    await SwearsRepo.insert(db, swear("2024-01-15", { transcript: long }));
    const row = await SwearsRepo.getForDay(db, "2024-01-15");
    expect(row?.transcript).toBe(long);
  });
});
