import { initializeDatabase } from "@/db/client";
import { useProfile } from "@/hooks/use-profile";
import { UserProfileRepo } from "@/repositories/user-profile-repo";
import { createTestDb } from "@/testing/db";
import { setCurrentTestDb } from "@/testing/db-state";
import type { UserProfile } from "@/types/dailyforge";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { SQLiteDatabase } from "expo-sqlite";

const profile: UserProfile = {
  id: UserProfileRepo.defaultId,
  displayName: "Ada",
  startDate: 1_700_000_000_000,
  initialWeightKg: 70,
  goalWeightKg: 65,
  initialHeightCm: 170,
  initialFrontPhotoUri: null,
  initialSidePhotoUri: null,
};

describe("useProfile", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
    setCurrentTestDb(db);
  });

  afterEach(() => {
    setCurrentTestDb(null);
  });

  it("resolves to null when no profile exists", async () => {
    const { result } = await renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it("loads an existing profile", async () => {
    await UserProfileRepo.insert(db, profile);

    const { result } = await renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(profile);
  });

  it("refresh re-reads from the DB", async () => {
    const { result } = await renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();

    await UserProfileRepo.insert(db, profile);
    await result.current.refresh();

    await waitFor(() => expect(result.current.data).toEqual(profile));
  });
});
