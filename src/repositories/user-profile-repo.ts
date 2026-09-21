import type { UserProfile } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

const DEFAULT_ID = "default";

interface ProfileRow {
  id: string;
  display_name: string;
  age: number | null;
  start_date: number;
  initial_weight_kg: number;
  goal_weight_kg: number;
  initial_height_cm: number;
  initial_front_photo_uri: string | null;
  initial_side_photo_uri: string | null;
}

const toProfile = (row: ProfileRow): UserProfile => ({
  id: row.id,
  displayName: row.display_name,
  // Defensive: pre-v2 rows have no age. The `?? null` normalizes
  // both an absent column and an explicit SQL NULL to the same
  // TypeScript value.
  age: row.age ?? null,
  startDate: row.start_date,
  initialWeightKg: row.initial_weight_kg,
  goalWeightKg: row.goal_weight_kg,
  initialHeightCm: row.initial_height_cm,
  initialFrontPhotoUri: row.initial_front_photo_uri,
  initialSidePhotoUri: row.initial_side_photo_uri,
});

export const UserProfileRepo = {
  async insert(db: SQLiteDatabase, profile: UserProfile): Promise<void> {
    await db.runAsync(
      `INSERT INTO user_profile (
        id, display_name, age, start_date,
        initial_weight_kg, goal_weight_kg, initial_height_cm,
        initial_front_photo_uri, initial_side_photo_uri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      profile.id,
      profile.displayName,
      profile.age,
      profile.startDate,
      profile.initialWeightKg,
      profile.goalWeightKg,
      profile.initialHeightCm,
      profile.initialFrontPhotoUri,
      profile.initialSidePhotoUri,
    );
  },

  async get(db: SQLiteDatabase): Promise<UserProfile | null> {
    const row = await db.getFirstAsync<ProfileRow>(
      `SELECT * FROM user_profile WHERE id = ?`,
      DEFAULT_ID,
    );
    return row ? toProfile(row) : null;
  },

  async delete(db: SQLiteDatabase): Promise<void> {
    await db.runAsync(`DELETE FROM user_profile WHERE id = ?`, DEFAULT_ID);
  },

  defaultId: DEFAULT_ID,
};
