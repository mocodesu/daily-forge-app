import { PreferencesRepo } from "@/repositories/preferences-repo";
import type { SQLiteDatabase } from "expo-sqlite";

const KEY = "streak.celebratedTargets";

async function readCelebrated(db: SQLiteDatabase): Promise<Set<number>> {
  try {
    const stored = await PreferencesRepo.get(db, KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((n): n is number => typeof n === "number" && n > 0),
    );
  } catch {
    return new Set();
  }
}

async function writeCelebrated(
  db: SQLiteDatabase,
  set: Set<number>,
): Promise<void> {
  const arr = Array.from(set).sort((a, b) => a - b);
  await PreferencesRepo.set(db, KEY, JSON.stringify(arr));
}

export async function hasCelebratedTarget(
  db: SQLiteDatabase,
  target: number,
): Promise<boolean> {
  const set = await readCelebrated(db);
  return set.has(target);
}

export async function markTargetCelebrated(
  db: SQLiteDatabase,
  target: number,
): Promise<void> {
  const set = await readCelebrated(db);
  set.add(target);
  await writeCelebrated(db, set);
}

/** Dev-only: wipes the celebrated list so the grand celebration fires again. */
export async function clearCelebratedTargets(
  db: SQLiteDatabase,
): Promise<void> {
  await writeCelebrated(db, new Set());
}

/** Dev-only: returns the currently celebrated target values, for display. */
export async function listCelebratedTargets(
  db: SQLiteDatabase,
): Promise<number[]> {
  const set = await readCelebrated(db);
  return Array.from(set).sort((a, b) => a - b);
}
