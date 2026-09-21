import { initializeDatabase } from "@/db/client";
import { DataManagementRepo } from "@/repositories/data-management-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { UserProfileRepo } from "@/repositories/user-profile-repo";
import { createTestDb } from "@/testing/db";
import type { Exercise, UserProfile } from "@/types/dailyforge";
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

describe("DataManagementRepo", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  describe("counts", () => {
    it("reports zeros on a fresh install", async () => {
      const counts = await DataManagementRepo.counts(db);
      expect(counts).toEqual({
        exercises: 0,
        completions: 0,
        dayLocks: 0,
        swears: 0,
        milestones: 0,
        frozenDays: 0,
        preferences: 0,
        hasProfile: false,
      });
    });

    it("reflects inserted rows", async () => {
      await ExercisesRepo.insert(db, exercise("e1"));
      await ExercisesRepo.insert(db, exercise("e2"));
      await PreferencesRepo.set(db, "k", "v");
      await UserProfileRepo.insert(db, profile);

      const counts = await DataManagementRepo.counts(db);
      expect(counts.exercises).toBe(2);
      expect(counts.preferences).toBe(1);
      expect(counts.hasProfile).toBe(true);
    });
  });

  describe("wipeAll", () => {
    it("empties every user-facing table", async () => {
      await ExercisesRepo.insert(db, exercise("e1"));
      await PreferencesRepo.set(db, "k", "v");
      await UserProfileRepo.insert(db, profile);

      await DataManagementRepo.wipeAll(db);

      const counts = await DataManagementRepo.counts(db);
      expect(counts.exercises).toBe(0);
      expect(counts.preferences).toBe(0);
      expect(counts.hasProfile).toBe(false);
    });

    it("preserves schema_meta", async () => {
      await DataManagementRepo.wipeAll(db);
      const row = await db.getFirstAsync<{ version: number }>(
        `SELECT version FROM schema_meta WHERE id = 1`,
      );
      expect(row?.version).toBe(2);
    });

    it("is idempotent", async () => {
      await DataManagementRepo.wipeAll(db);
      await expect(DataManagementRepo.wipeAll(db)).resolves.toBeUndefined();
    });
  });

  describe("restoreFrom", () => {
    it("restores preferences, profile, and exercises", async () => {
      await DataManagementRepo.restoreFrom(db, {
        preferences: { "units.system": "imperial" },
        userProfile: [
          {
            id: UserProfileRepo.defaultId,
            display_name: "Restored",
            age: 30,
            start_date: 1_700_000_000_000,
            initial_weight_kg: 75,
            goal_weight_kg: 70,
            initial_height_cm: 180,
            initial_front_photo_uri: null,
            initial_side_photo_uri: null,
          },
        ],
        exercises: [
          {
            id: "ex-r",
            name: "Restored Exercise",
            body_parts: '["Chest"]',
            exercise_type: "reps",
            reps: 10,
            sets: 3,
            duration_seconds: 0,
            session_duration_seconds: 60,
            is_daily: 1,
            notes: "",
            created_at: 1_700_000_000_000,
            sort_index: 1,
          },
        ],
        completions: [],
        dayLocks: [],
        swears: [],
        milestones: [],
        frozenDays: [],
      });

      expect(await PreferencesRepo.get(db, "units.system")).toBe("imperial");
      const restored = await UserProfileRepo.get(db);
      expect(restored?.displayName).toBe("Restored");
      expect(restored?.age).toBe(30);
      expect(await ExercisesRepo.getById(db, "ex-r")).not.toBeNull();
    });

    it("wipes existing data before restoring", async () => {
      await ExercisesRepo.insert(db, exercise("old"));
      await PreferencesRepo.set(db, "old-key", "old-value");

      await DataManagementRepo.restoreFrom(db, {
        preferences: { "new-key": "new-value" },
        userProfile: null,
        exercises: [],
        completions: [],
        dayLocks: [],
        swears: [],
        milestones: [],
        frozenDays: [],
      });

      expect(await ExercisesRepo.getById(db, "old")).toBeNull();
      expect(await PreferencesRepo.get(db, "old-key")).toBeNull();
      expect(await PreferencesRepo.get(db, "new-key")).toBe("new-value");
    });

    it("handles a null userProfile", async () => {
      await DataManagementRepo.restoreFrom(db, {
        preferences: {},
        userProfile: null,
        exercises: [],
        completions: [],
        dayLocks: [],
        swears: [],
        milestones: [],
        frozenDays: [],
      });
      expect(await UserProfileRepo.get(db)).toBeNull();
    });

    it("restores a full payload with every table populated", async () => {
      await DataManagementRepo.restoreFrom(db, {
        preferences: { a: "1", b: "2" },
        userProfile: [
          {
            id: UserProfileRepo.defaultId,
            display_name: "Full",
            age: 30,
            start_date: 1_700_000_000_000,
            initial_weight_kg: 70,
            goal_weight_kg: 65,
            initial_height_cm: 170,
            initial_front_photo_uri: null,
            initial_side_photo_uri: null,
          },
        ],
        exercises: [
          {
            id: "ex-full",
            name: "Full Exercise",
            body_parts: '["Legs"]',
            exercise_type: "reps",
            reps: 15,
            sets: 3,
            duration_seconds: 0,
            session_duration_seconds: 60,
            is_daily: 1,
            notes: "",
            created_at: 1_700_000_000_000,
            sort_index: 1,
          },
        ],
        completions: [
          {
            id: "c-full",
            exercise_id: "ex-full",
            day_key: "2024-01-15",
            started_at: 1_700_000_000_000,
            completed_at: 1_700_000_060_000,
          },
        ],
        dayLocks: [
          {
            id: "dl-full",
            day_key: "2024-01-15",
            locked_at: 1_700_000_000_000,
          },
        ],
        swears: [
          {
            id: "sw-full",
            day_key: "2024-01-15",
            sworn_at: 1_700_000_000_000,
            transcript: "I swear",
            matched_phrase: "I swear",
          },
        ],
        milestones: [
          {
            id: "m-full",
            day: 30,
            unlocked_at: 1_700_000_000_000,
            completed_at: null,
            current_weight_kg: null,
            user_notes: "",
            ai_summary: null,
          },
        ],
        frozenDays: [
          {
            day_key: "2024-01-10",
            frozen_at: 1_700_000_000_000,
            reason: "auto-missed",
          },
        ],
      });

      const counts = await DataManagementRepo.counts(db);
      expect(counts).toEqual({
        exercises: 1,
        completions: 1,
        dayLocks: 1,
        swears: 1,
        milestones: 1,
        frozenDays: 1,
        preferences: 2,
        hasProfile: true,
      });
    });

    it("restores a v1 backup whose profile has no age (backward compat)", async () => {
      await DataManagementRepo.restoreFrom(db, {
        preferences: {},
        userProfile: [
          {
            id: UserProfileRepo.defaultId,
            display_name: "Old Backup",
            // No `age` key — simulating a v1 export.
            start_date: 1_700_000_000_000,
            initial_weight_kg: 70,
            goal_weight_kg: 65,
            initial_height_cm: 170,
            initial_front_photo_uri: null,
            initial_side_photo_uri: null,
          },
        ],
        exercises: [],
        completions: [],
        dayLocks: [],
        swears: [],
        milestones: [],
        frozenDays: [],
      });

      const restored = await UserProfileRepo.get(db);
      expect(restored?.displayName).toBe("Old Backup");
      expect(restored?.age).toBeNull();
    });

    it("rolls back the entire restore if a row violates a constraint", async () => {
      // Two exercises with the same id → second insert throws → the
      // transaction must roll back so neither the wipe nor the first
      // insert survives.
      await ExercisesRepo.insert(db, exercise("existing"));

      await expect(
        DataManagementRepo.restoreFrom(db, {
          preferences: {},
          userProfile: null,
          exercises: [
            {
              id: "dup",
              name: "First",
              body_parts: "[]",
              exercise_type: "reps",
              reps: 1,
              sets: 1,
              duration_seconds: 0,
              session_duration_seconds: 60,
              is_daily: 1,
              notes: "",
              created_at: 1,
              sort_index: 1,
            },
            {
              id: "dup",
              name: "Second",
              body_parts: "[]",
              exercise_type: "reps",
              reps: 1,
              sets: 1,
              duration_seconds: 0,
              session_duration_seconds: 60,
              is_daily: 1,
              notes: "",
              created_at: 2,
              sort_index: 2,
            },
          ],
          completions: [],
          dayLocks: [],
          swears: [],
          milestones: [],
          frozenDays: [],
        }),
      ).rejects.toThrow();

      // Original data must still be there — the wipe was rolled back.
      expect(await ExercisesRepo.getById(db, "existing")).not.toBeNull();
      expect(await ExercisesRepo.getById(db, "dup")).toBeNull();
    });
  });
});
