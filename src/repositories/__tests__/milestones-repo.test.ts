import { initializeDatabase } from "@/db/client";
import { MilestonesRepo } from "@/repositories/milestones-repo";
import { createTestDb } from "@/testing/db";
import type { Milestone } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

const milestone = (
  id: string,
  day: number,
  overrides: Partial<Milestone> = {},
): Milestone => ({
  id,
  day,
  unlockedAt: 1_700_000_000_000,
  completedAt: null,
  currentWeightKg: null,
  userNotes: "",
  aiSummary: null,
  ...overrides,
});

describe("MilestonesRepo", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("getByDay returns null when no milestone exists", async () => {
    expect(await MilestonesRepo.getByDay(db, 30)).toBeNull();
  });

  it("round-trips a pending milestone", async () => {
    const m = milestone("m30", 30);
    await MilestonesRepo.insert(db, m);
    expect(await MilestonesRepo.getByDay(db, 30)).toEqual(m);
  });

  it("a duplicate day insert is a no-op (INSERT OR IGNORE)", async () => {
    await MilestonesRepo.insert(db, milestone("first", 30));
    await MilestonesRepo.insert(db, milestone("second", 30));

    const row = await MilestonesRepo.getByDay(db, 30);
    expect(row?.id).toBe("first");
  });

  it("getAll returns milestones ordered by day ASC", async () => {
    await MilestonesRepo.insert(db, milestone("m60", 60));
    await MilestonesRepo.insert(db, milestone("m30", 30));
    await MilestonesRepo.insert(db, milestone("m90", 90));

    const result = await MilestonesRepo.getAll(db);
    expect(result.map((m) => m.day)).toEqual([30, 60, 90]);
  });

  it("getPending returns the earliest incomplete milestone", async () => {
    await MilestonesRepo.insert(db, milestone("m30", 30));
    await MilestonesRepo.insert(db, milestone("m60", 60));

    const pending = await MilestonesRepo.getPending(db);
    expect(pending?.day).toBe(30);
  });

  it("getPending skips completed milestones", async () => {
    await MilestonesRepo.insert(db, milestone("m30", 30));
    await MilestonesRepo.insert(db, milestone("m60", 60));
    await MilestonesRepo.complete(db, "m30", {
      currentWeightKg: 70,
      userNotes: "done",
      aiSummary: null,
    });

    const pending = await MilestonesRepo.getPending(db);
    expect(pending?.day).toBe(60);
  });

  it("getPending returns null when everything is completed", async () => {
    await MilestonesRepo.insert(db, milestone("m30", 30));
    await MilestonesRepo.complete(db, "m30", {
      currentWeightKg: null,
      userNotes: "",
      aiSummary: null,
    });
    expect(await MilestonesRepo.getPending(db)).toBeNull();
  });

  it("getPending returns null on an empty table", async () => {
    expect(await MilestonesRepo.getPending(db)).toBeNull();
  });

  it("getAllDays returns just the day numbers", async () => {
    await MilestonesRepo.insert(db, milestone("m30", 30));
    await MilestonesRepo.insert(db, milestone("m90", 90));

    const days = await MilestonesRepo.getAllDays(db);
    expect(days.sort((a, b) => a - b)).toEqual([30, 90]);
  });

  it("complete records weight, notes, summary, and completedAt", async () => {
    await MilestonesRepo.insert(db, milestone("m30", 30));
    const before = Date.now();

    await MilestonesRepo.complete(db, "m30", {
      currentWeightKg: 68.5,
      userNotes: "Feeling strong",
      aiSummary: "Great progress",
    });

    const after = Date.now();
    const loaded = await MilestonesRepo.getByDay(db, 30);

    expect(loaded?.currentWeightKg).toBe(68.5);
    expect(loaded?.userNotes).toBe("Feeling strong");
    expect(loaded?.aiSummary).toBe("Great progress");
    expect(loaded?.completedAt).toBeGreaterThanOrEqual(before);
    expect(loaded?.completedAt).toBeLessThanOrEqual(after);
  });

  it("complete accepts null weight and summary", async () => {
    await MilestonesRepo.insert(db, milestone("m30", 30));
    await MilestonesRepo.complete(db, "m30", {
      currentWeightKg: null,
      userNotes: "",
      aiSummary: null,
    });
    const loaded = await MilestonesRepo.getByDay(db, 30);
    expect(loaded?.currentWeightKg).toBeNull();
    expect(loaded?.aiSummary).toBeNull();
    expect(loaded?.completedAt).not.toBeNull();
  });
});
