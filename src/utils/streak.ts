import {
  DEFAULT_MONTHLY_FREEZES,
  MAX_FREEZE_LOOKBACK_DAYS,
} from "@/constants/dailyforge";
import { FrozenDaysRepo } from "@/repositories/frozen-days-repo";
import type { SQLiteDatabase } from "expo-sqlite";
import { dayKey } from "./day-key";

/**
 * Result of a streak calculation. Includes freeze metadata so the UI
 * can render balance and highlight frozen days.
 */
export interface StreakResult {
  streak: number;
  frozenKeys: Set<string>;
  freezeAllowance: number;
  freezeUsed: number;
  freezeBalance: number;
  /** Number of freezes applied during this call, for logs/debug. */
  freezeApplied: number;
}

// ─────────────────────────────────────────────────────────────
// Pure streak math
// ─────────────────────────────────────────────────────────────

/**
 * Counts consecutive days ending at today (or yesterday if today isn't
 * complete yet). Frozen days are "skipped" — they don't add to the
 * streak but they don't break it either.
 */
export function computeStreak(
  completedDayKeys: Set<string>,
  frozenKeys: Set<string>,
  today: Date = new Date(),
): number {
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  const todayKey = dayKey(cursor);
  if (!completedDayKeys.has(todayKey) && !frozenKeys.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  // Hard cap to protect against a runaway loop if something is wrong.
  for (let i = 0; i < 3650; i++) {
    const key = dayKey(cursor);
    if (completedDayKeys.has(key)) {
      streak++;
    } else if (frozenKeys.has(key)) {
      // Frozen — skip without breaking or incrementing
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ─────────────────────────────────────────────────────────────
// Auto-freeze pass
// ─────────────────────────────────────────────────────────────

interface ApplyResult {
  applied: number;
}

/**
 * Scans backwards from yesterday looking for consecutive missed days.
 * If the run of missed days fits within the remaining freeze balance,
 * the run is frozen retroactively. Otherwise nothing is frozen —
 * freezing a partial run wouldn't preserve the streak anyway, so we
 * don't waste the balance.
 *
 * Idempotent: calling it twice in a row does nothing the second time.
 */
async function applyPendingFreezes(
  db: SQLiteDatabase,
  today: Date,
): Promise<ApplyResult> {
  // Load daily exercises — freezes only apply to days where the user
  // had work scheduled.
  const exerciseRows = await db.getAllAsync<{
    id: string;
    is_daily: number;
    created_at: number;
  }>(`SELECT id, is_daily, created_at FROM exercises WHERE is_daily = 1`);

  if (exerciseRows.length === 0) return { applied: 0 };

  const earliestCreatedAt = exerciseRows.reduce(
    (min, r) => Math.min(min, r.created_at),
    Number.POSITIVE_INFINITY,
  );
  const dailyIds = new Set(exerciseRows.map((r) => r.id));

  // Build the set of completed day keys (all daily exercises done).
  const completions = await db.getAllAsync<{
    day_key: string;
    exercise_id: string;
  }>(`SELECT day_key, exercise_id FROM completion_records`);

  const byDay = new Map<string, Set<string>>();
  for (const c of completions) {
    if (!dailyIds.has(c.exercise_id)) continue;
    if (!byDay.has(c.day_key)) byDay.set(c.day_key, new Set());
    byDay.get(c.day_key)!.add(c.exercise_id);
  }
  const completedKeys = new Set<string>();
  for (const [key, ids] of byDay) {
    if ([...dailyIds].every((id) => ids.has(id))) {
      completedKeys.add(key);
    }
  }

  const frozen = await FrozenDaysRepo.getAll(db);
  const frozenKeys = new Set(frozen.map((f) => f.dayKey));

  // Balance: allowance - usedThisMonth
  const allowance = DEFAULT_MONTHLY_FREEZES;
  const usedThisMonth = await FrozenDaysRepo.countForMonth(
    db,
    today.getFullYear(),
    today.getMonth() + 1,
  );
  const balance = Math.max(0, allowance - usedThisMonth);

  if (balance === 0) return { applied: 0 };

  // Scan consecutive missed days ending at yesterday.
  const run: string[] = [];
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 1);

  for (let i = 0; i < MAX_FREEZE_LOOKBACK_DAYS; i++) {
    if (cursor.getTime() < earliestCreatedAt) break;
    const key = dayKey(cursor);
    if (completedKeys.has(key)) break;
    if (frozenKeys.has(key)) break;
    run.push(key);
    cursor.setDate(cursor.getDate() - 1);
  }

  if (run.length === 0) return { applied: 0 };
  if (run.length > balance) return { applied: 0 };

  let applied = 0;
  const now = Date.now();
  for (const key of run) {
    try {
      await FrozenDaysRepo.insert(db, {
        dayKey: key,
        frozenAt: now,
        reason: "auto-missed",
      });
      applied++;
    } catch (err) {
      console.warn("[freeze] insert failed:", err);
    }
  }
  return { applied };
}

// ─────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────

/**
 * Applies pending freezes if any are due, then computes the current
 * streak with full freeze awareness.
 */
export async function calculateStreak(
  db: SQLiteDatabase,
): Promise<StreakResult> {
  const today = new Date();

  // 1. Apply any pending freezes so the streak math below sees them.
  const { applied } = await applyPendingFreezes(db, today);

  // 2. Load daily exercises
  const exerciseRows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM exercises WHERE is_daily = 1`,
  );

  if (exerciseRows.length === 0) {
    return {
      streak: 0,
      frozenKeys: new Set(),
      freezeAllowance: DEFAULT_MONTHLY_FREEZES,
      freezeUsed: 0,
      freezeBalance: DEFAULT_MONTHLY_FREEZES,
      freezeApplied: applied,
    };
  }

  const dailyIds = new Set(exerciseRows.map((r) => r.id));

  // 3. Load completions and freezes
  const completions = await db.getAllAsync<{
    day_key: string;
    exercise_id: string;
  }>(`SELECT day_key, exercise_id FROM completion_records`);

  const frozen = await FrozenDaysRepo.getAll(db);
  const frozenKeys = new Set(frozen.map((f) => f.dayKey));

  // 4. Build completed day keys
  const byDay = new Map<string, Set<string>>();
  for (const c of completions) {
    if (!dailyIds.has(c.exercise_id)) continue;
    if (!byDay.has(c.day_key)) byDay.set(c.day_key, new Set());
    byDay.get(c.day_key)!.add(c.exercise_id);
  }
  const completedKeys = new Set<string>();
  for (const [key, ids] of byDay) {
    if ([...dailyIds].every((id) => ids.has(id))) {
      completedKeys.add(key);
    }
  }

  // 5. Compute streak
  const streak = computeStreak(completedKeys, frozenKeys, today);

  // 6. Balance for display
  const allowance = DEFAULT_MONTHLY_FREEZES;
  const usedThisMonth = await FrozenDaysRepo.countForMonth(
    db,
    today.getFullYear(),
    today.getMonth() + 1,
  );
  const balance = Math.max(0, allowance - usedThisMonth);

  return {
    streak,
    frozenKeys,
    freezeAllowance: allowance,
    freezeUsed: usedThisMonth,
    freezeBalance: balance,
    freezeApplied: applied,
  };
}
