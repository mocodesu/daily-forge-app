import { initializeDatabase } from "@/db/client";
import { createTestDb } from "@/testing/db";
import {
  clearCelebratedTargets,
  hasCelebratedTarget,
  listCelebratedTargets,
  markTargetCelebrated,
} from "@/utils/celebrations";
import type { SQLiteDatabase } from "expo-sqlite";

describe("celebrations", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("hasCelebratedTarget is false on a fresh install", async () => {
    expect(await hasCelebratedTarget(db, 30)).toBe(false);
  });

  it("markTargetCelebrated makes hasCelebratedTarget true", async () => {
    await markTargetCelebrated(db, 30);
    expect(await hasCelebratedTarget(db, 30)).toBe(true);
  });

  it("marking the same target twice is idempotent", async () => {
    await markTargetCelebrated(db, 30);
    await markTargetCelebrated(db, 30);
    expect(await listCelebratedTargets(db)).toEqual([30]);
  });

  it("different targets are tracked independently", async () => {
    await markTargetCelebrated(db, 30);
    await markTargetCelebrated(db, 90);

    expect(await hasCelebratedTarget(db, 30)).toBe(true);
    expect(await hasCelebratedTarget(db, 90)).toBe(true);
    expect(await hasCelebratedTarget(db, 60)).toBe(false);
  });

  it("listCelebratedTargets returns targets sorted ascending", async () => {
    await markTargetCelebrated(db, 90);
    await markTargetCelebrated(db, 30);
    await markTargetCelebrated(db, 60);

    expect(await listCelebratedTargets(db)).toEqual([30, 60, 90]);
  });

  it("clearCelebratedTargets wipes everything", async () => {
    await markTargetCelebrated(db, 30);
    await markTargetCelebrated(db, 90);
    await clearCelebratedTargets(db);

    expect(await listCelebratedTargets(db)).toEqual([]);
    expect(await hasCelebratedTarget(db, 30)).toBe(false);
  });

  it("invalid JSON in storage is treated as empty", async () => {
    const { PreferencesRepo } = require("@/repositories/preferences-repo");
    await PreferencesRepo.set(db, "streak.celebratedTargets", "not-json{{");
    expect(await listCelebratedTargets(db)).toEqual([]);
    expect(await hasCelebratedTarget(db, 30)).toBe(false);
  });

  it("non-array JSON is treated as empty", async () => {
    const { PreferencesRepo } = require("@/repositories/preferences-repo");
    await PreferencesRepo.set(
      db,
      "streak.celebratedTargets",
      JSON.stringify({ not: "an array" }),
    );
    expect(await listCelebratedTargets(db)).toEqual([]);
  });

  it("filters out non-number entries", async () => {
    const { PreferencesRepo } = require("@/repositories/preferences-repo");
    await PreferencesRepo.set(
      db,
      "streak.celebratedTargets",
      JSON.stringify([30, "60", null, 90, -5, 0]),
    );
    // Only positive numbers survive.
    expect(await listCelebratedTargets(db)).toEqual([30, 90]);
  });
});
