import {
  DEFAULT_MONTHLY_FREEZES,
  MAX_FREEZE_LOOKBACK_DAYS,
} from "@/constants/dailyforge";
import { FrozenDaysRepo } from "@/repositories/frozen-days-repo";
import { dayKey } from "@/utils/day-key";
import type { SQLiteDatabase } from "expo-sqlite";

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
  /**
   * Freezes applied *during this specific call* to `calculateStreak()`.
   * Almost always 0 — the auto-freeze pass only fires when the user
   * has an in-flight run of missed days to retroactively preserve.
   * This is NOT the same as `freezeUsed` (which is this calendar
   * month's total) and NOT a lifetime count.
   */
  freezesAppliedThisCall: number;
}

// ─────────────────────────────────────────────────────────────
// Pure streak math
// ─────────────────────────────────────────────────────────────

/**
 * Counts consecutive *sealed* days ending at today (or yesterday if
 * today isn't sealed yet).
 *
 * A day counts toward the streak ONLY if the user sealed it — i.e.
 * completed all exercises AND said the voice oath. Completing
 * exercises without sealing does not advance the streak; the seal is
 * the commitment.
 *
 * Frozen days are "skipped" — they don't add to the streak but they
 * don't break it either.
 */
export function computeStreak(
  sealedDayKeys: Set<string>,
  frozenKeys: Set<string>,
  today: Date = new Date(),
): number {
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  const todayKey = dayKey(cursor);
  if (!sealedDayKeys.has(todayKey) && !frozenKeys.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  // Hard cap to protect against a runaway loop if something is wrong.
  for (let i = 0; i < 3650; i++) {
    const key = dayKey(cursor);
    if (sealedDayKeys.has(key)) {
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
 * Scans backwards from yesterday looking for consecutive unsealed
 * days.
 *
 * "Unsealed" means: no `day_locks` row for that day. A day where the
 * user completed all exercises but didn't seal still counts as
 * unsealed — the streak cares about the commitment, not just the
 * work.
 *
 * If the run of unsealed days fits within the remaining freeze
 * balance, the run is frozen retroactively. Otherwise nothing is
 * frozen — freezing a partial run wouldn't preserve the streak
 * anyway, so we don't waste the balance.
 *
 * Idempotent: calling it twice in a row does nothing the second time.
 */
async function applyPendingFreezes(
  db: SQLiteDatabase,
  today: Date,
): Promise<ApplyResult> {
  // Freezes only apply to days where the user had work scheduled.
  // We use the earliest daily exercise as the "user started here"
  // boundary so we don't freeze empty days before the account existed.
  const exerciseRows = await db.getAllAsync<{
    created_at: number;
  }>(`SELECT created_at FROM exercises WHERE is_daily = 1`);

  if (exerciseRows.length === 0) return { applied: 0 };

  const earliestCreatedAt = exerciseRows.reduce(
    (min, r) => Math.min(min, r.created_at),
    Number.POSITIVE_INFINITY,
  );

  const lockRows = await db.getAllAsync<{ day_key: string }>(
    `SELECT day_key FROM day_locks`,
  );
  const sealedKeys = new Set(lockRows.map((r) => r.day_key));

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

  // Scan consecutive unsealed days ending at yesterday.
  const run: string[] = [];
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 1);

  for (let i = 0; i < MAX_FREEZE_LOOKBACK_DAYS; i++) {
    if (cursor.getTime() < earliestCreatedAt) break;
    const key = dayKey(cursor);
    if (sealedKeys.has(key)) break;
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
      // Defensive: INSERT OR IGNORE cannot fail once we've checked the
      // day isn't already frozen. Kept for schema drift safety.
      /* istanbul ignore next */
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
 * streak from sealed days only.
 */
export async function calculateStreak(
  db: SQLiteDatabase,
): Promise<StreakResult> {
  const today = new Date();

  // 1. Apply any pending freezes so the streak math below sees them.
  const { applied } = await applyPendingFreezes(db, today);

  // 2. Load sealed day keys from day_locks.
  const lockRows = await db.getAllAsync<{ day_key: string }>(
    `SELECT day_key FROM day_locks`,
  );
  const sealedKeys = new Set(lockRows.map((r) => r.day_key));

  // 3. Load frozen day keys.
  const frozen = await FrozenDaysRepo.getAll(db);
  const frozenKeys = new Set(frozen.map((f) => f.dayKey));

  // 4. Compute streak.
  const streak = computeStreak(sealedKeys, frozenKeys, today);

  // 5. Balance for display.
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
    freezesAppliedThisCall: applied,
  };
}
