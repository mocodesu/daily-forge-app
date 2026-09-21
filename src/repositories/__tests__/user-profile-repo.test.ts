import { initializeDatabase } from "@/db/client";
import { UserProfileRepo } from "@/repositories/user-profile-repo";
import { createTestDb } from "@/testing/db";
import type { UserProfile } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

const PROFILE: UserProfile = {
  id: UserProfileRepo.defaultId,
  displayName: "Ada",
  age: 30,
  startDate: 1_700_000_000_000,
  initialWeightKg: 70.5,
  goalWeightKg: 65,
  initialHeightCm: 170,
  initialFrontPhotoUri: null,
  initialSidePhotoUri: null,
};

describe("UserProfileRepo", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
  });

  it("returns null when no profile exists", async () => {
    expect(await UserProfileRepo.get(db)).toBeNull();
  });

  it("round-trips a profile with null photo URIs", async () => {
    await UserProfileRepo.insert(db, PROFILE);
    expect(await UserProfileRepo.get(db)).toEqual(PROFILE);
  });

  it("round-trips a profile with photo URIs", async () => {
    const withPhotos: UserProfile = {
      ...PROFILE,
      initialFrontPhotoUri: "file:///photos/front.jpg",
      initialSidePhotoUri: "file:///photos/side.jpg",
    };
    await UserProfileRepo.insert(db, withPhotos);
    expect(await UserProfileRepo.get(db)).toEqual(withPhotos);
  });

  it("preserves floating-point weight and height", async () => {
    const p: UserProfile = {
      ...PROFILE,
      initialWeightKg: 82.35,
      goalWeightKg: 78.9,
      initialHeightCm: 182.6,
    };
    await UserProfileRepo.insert(db, p);
    const loaded = await UserProfileRepo.get(db);

    expect(loaded!.initialWeightKg).toBeCloseTo(82.35, 6);
    expect(loaded!.goalWeightKg).toBeCloseTo(78.9, 6);
    expect(loaded!.initialHeightCm).toBeCloseTo(182.6, 6);
  });

  it("round-trips a null age (pre-v2 installs)", async () => {
    await UserProfileRepo.insert(db, { ...PROFILE, age: null });
    const loaded = await UserProfileRepo.get(db);
    expect(loaded?.age).toBeNull();
  });

  it("round-trips a numeric age", async () => {
    await UserProfileRepo.insert(db, { ...PROFILE, age: 42 });
    const loaded = await UserProfileRepo.get(db);
    expect(loaded?.age).toBe(42);
  });

  it("only returns the row whose id matches the default", async () => {
    // Insert with a non-default id — get() should not see it.
    await UserProfileRepo.insert(db, { ...PROFILE, id: "secondary" });
    expect(await UserProfileRepo.get(db)).toBeNull();
  });

  it("throws when inserting a second row with the same id", async () => {
    await UserProfileRepo.insert(db, PROFILE);
    await expect(UserProfileRepo.insert(db, PROFILE)).rejects.toThrow();
  });

  it("delete removes only the default-id row", async () => {
    await UserProfileRepo.insert(db, PROFILE);
    await UserProfileRepo.delete(db);
    expect(await UserProfileRepo.get(db)).toBeNull();
  });

  it("delete on an empty table is a no-op", async () => {
    await expect(UserProfileRepo.delete(db)).resolves.toBeUndefined();
  });
});
