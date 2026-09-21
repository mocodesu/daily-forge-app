import { initializeDatabase } from "@/db/client";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { UserProfileRepo } from "@/repositories/user-profile-repo";
import { createTestDb } from "@/testing/db";
import type { Exercise, UserProfile } from "@/types/dailyforge";
import {
  buildBackupJson,
  writeBackupFile,
  type BackupPayload,
} from "@/utils/backup";
import type { SQLiteDatabase } from "expo-sqlite";

const exercise = (id: string): Exercise => ({
  id,
  name: `Exercise ${id}`,
  bodyParts: ["Chest"],
  exerciseType: "reps",
  reps: 10,
  sets: 3,
  durationSeconds: 0,
  sessionDurationSeconds: 60,
  isDaily: true,
  notes: "",
  createdAt: 1_700_000_000_000,
  sortIndex: 1,
});

const profile: UserProfile = {
  id: UserProfileRepo.defaultId,
  displayName: "Ada",
  age: 30,
  startDate: 1_700_000_000_000,
  initialWeightKg: 70,
  goalWeightKg: 65,
  initialHeightCm: 170,
  initialFrontPhotoUri: null,
  initialSidePhotoUri: null,
};

describe("buildBackupJson", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("produces a valid payload on an empty DB", async () => {
    const json = await buildBackupJson(db, "1.2.3");
    const payload = JSON.parse(json) as BackupPayload;

    expect(payload.version).toBe(1);
    expect(payload.appVersion).toBe("1.2.3");
    expect(payload.preferences).toEqual({});
    expect(payload.userProfile).toBeNull();
    expect(payload.exercises).toEqual([]);
    expect(payload.completions).toEqual([]);
  });

  it("includes preferences as a key-value object", async () => {
    await PreferencesRepo.set(db, "units.system", "imperial");
    await PreferencesRepo.set(db, "streak.targetDays", "60");

    const json = await buildBackupJson(db, "1.0.0");
    const payload = JSON.parse(json) as BackupPayload;

    expect(payload.preferences).toEqual({
      "units.system": "imperial",
      "streak.targetDays": "60",
    });
  });

  it("includes the user profile when present", async () => {
    await UserProfileRepo.insert(db, profile);

    const json = await buildBackupJson(db, "1.0.0");
    const payload = JSON.parse(json) as BackupPayload;

    expect(Array.isArray(payload.userProfile)).toBe(true);
    expect(payload.userProfile).toHaveLength(1);
  });

  it("includes exercises with all columns", async () => {
    await ExercisesRepo.insert(db, exercise("e1"));

    const json = await buildBackupJson(db, "1.0.0");
    const payload = JSON.parse(json) as BackupPayload;

    expect(payload.exercises).toHaveLength(1);
    const row = payload.exercises[0] as Record<string, unknown>;
    expect(row.id).toBe("e1");
    expect(row.name).toBe("Exercise e1");
  });

  it("sets exportedAt to approximately now", async () => {
    const before = Date.now();
    const json = await buildBackupJson(db, "1.0.0");
    const after = Date.now();
    const payload = JSON.parse(json) as BackupPayload;

    expect(payload.exportedAt).toBeGreaterThanOrEqual(before);
    expect(payload.exportedAt).toBeLessThanOrEqual(after);
  });
});

describe("writeBackupFile", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 15, 14, 30, 45));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns a uri and a filename with the expected timestamp pattern", () => {
    const { uri, filename } = writeBackupFile('{"x":1}');

    expect(filename).toBe("dailyforge-backup-20240115-143045.json");
    expect(uri).toBe(`file:///mock/document/${filename}`);
  });

  it("deletes an existing file before writing (second call in the same second)", () => {
    writeBackupFile('{"first":true}');
    expect(() => writeBackupFile('{"second":true}')).not.toThrow();
  });
});
