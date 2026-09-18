import type { Milestone } from "@/types/dailyforge";
import type { SQLiteDatabase } from "expo-sqlite";

interface MilestoneRow {
  id: string;
  day: number;
  unlocked_at: number;
  completed_at: number | null;
  current_weight_kg: number | null;
  user_notes: string;
  ai_summary: string | null;
}

const toMilestone = (row: MilestoneRow): Milestone => ({
  id: row.id,
  day: row.day,
  unlockedAt: row.unlocked_at,
  completedAt: row.completed_at,
  currentWeightKg: row.current_weight_kg,
  userNotes: row.user_notes,
  aiSummary: row.ai_summary,
});

export const MilestonesRepo = {
  async insert(db: SQLiteDatabase, milestone: Milestone): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO milestones
        (id, day, unlocked_at, completed_at, current_weight_kg, user_notes, ai_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      milestone.id,
      milestone.day,
      milestone.unlockedAt,
      milestone.completedAt,
      milestone.currentWeightKg,
      milestone.userNotes,
      milestone.aiSummary,
    );
  },

  async getByDay(db: SQLiteDatabase, day: number): Promise<Milestone | null> {
    const row = await db.getFirstAsync<MilestoneRow>(
      `SELECT * FROM milestones WHERE day = ?`,
      day,
    );
    return row ? toMilestone(row) : null;
  },

  async getAll(db: SQLiteDatabase): Promise<Milestone[]> {
    const rows = await db.getAllAsync<MilestoneRow>(
      `SELECT * FROM milestones ORDER BY day ASC`,
    );
    return rows.map(toMilestone);
  },

  /** The earliest milestone that exists but hasn't been completed yet. */
  async getPending(db: SQLiteDatabase): Promise<Milestone | null> {
    const row = await db.getFirstAsync<MilestoneRow>(
      `SELECT * FROM milestones
       WHERE completed_at IS NULL
       ORDER BY day ASC
       LIMIT 1`,
    );
    return row ? toMilestone(row) : null;
  },

  async getAllDays(db: SQLiteDatabase): Promise<number[]> {
    const rows = await db.getAllAsync<{ day: number }>(
      `SELECT day FROM milestones`,
    );
    return rows.map((r) => r.day);
  },

  async complete(
    db: SQLiteDatabase,
    id: string,
    data: {
      currentWeightKg: number | null;
      userNotes: string;
      aiSummary: string | null;
    },
  ): Promise<void> {
    await db.runAsync(
      `UPDATE milestones
       SET completed_at = ?, current_weight_kg = ?, user_notes = ?, ai_summary = ?
       WHERE id = ?`,
      Date.now(),
      data.currentWeightKg,
      data.userNotes,
      data.aiSummary,
      id,
    );
  },
};
