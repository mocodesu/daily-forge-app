import { CompletionsRepo } from "@/repositories/completions-repo";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { SwearsRepo } from "@/repositories/swears-repo";
import type { BodyPart, CompletionRecord, Exercise } from "@/types/dailyforge";
import { dayEndMs, dayKey, dayStartMs } from "@/utils/day-key";
import { calculateStreak } from "@/utils/streak";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface DayState {
  loading: boolean;
  /**
   * Non-null when the last refresh failed. Consumers should render an
   * error state instead of the normal content when this is set.
   */
  error: string | null;
  exercises: Exercise[];
  records: CompletionRecord[];
  completedIds: Set<string>;
  allDone: boolean;
  allExercisesCompleted: boolean;
  isLocked: boolean;
  sworeToday: boolean;
  meetsMinimum: boolean;
  progress: { done: number; total: number };
  streak: number;
  todayKey: string;

  // ── Freeze metadata ───────────────────────────────────────
  frozenDayKeys: Set<string>;
  freezeAllowance: number;
  freezeUsed: number;
  freezeBalance: number;
}

/**
 * Factory instead of a shared module-level constant. A shared `EMPTY`
 * object would have shared its `Set` instances across every hook
 * instance — a mutation anywhere would leak into every consumer.
 */
function createEmptyState(): DayState {
  return {
    loading: true,
    error: null,
    exercises: [],
    records: [],
    completedIds: new Set(),
    allDone: false,
    allExercisesCompleted: false,
    isLocked: false,
    sworeToday: false,
    meetsMinimum: false,
    progress: { done: 0, total: 0 },
    streak: 0,
    todayKey: dayKey(),
    frozenDayKeys: new Set(),
    freezeAllowance: 0,
    freezeUsed: 0,
    freezeBalance: 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Structural equality + identity preservation
//
// These helpers let `refresh()` keep the previous state object, and
// reuse previous Exercise objects / Sets, whenever the underlying
// data hasn't actually changed. Without them, every refresh produces
// a fresh graph of arrays, Sets, and Exercise objects — forcing the
// whole Today subtree (including every exercise card) to re-render
// even when nothing meaningful changed.
// ─────────────────────────────────────────────────────────────

function bodyPartsEqual(a: BodyPart[], b: BodyPart[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function exerciseEqual(a: Exercise, b: Exercise): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    bodyPartsEqual(a.bodyParts, b.bodyParts) &&
    a.exerciseType === b.exerciseType &&
    a.reps === b.reps &&
    a.sets === b.sets &&
    a.durationSeconds === b.durationSeconds &&
    a.sessionDurationSeconds === b.sessionDurationSeconds &&
    a.isDaily === b.isDaily &&
    a.notes === b.notes &&
    a.createdAt === b.createdAt &&
    a.sortIndex === b.sortIndex
  );
}

/**
 * Merges a freshly-fetched exercise list with the previous one,
 * reusing the previous Exercise object whenever its content is
 * identical. Returns the previous array reference outright when
 * nothing changed at all.
 *
 * Exercises in this app are immutable after creation (the user is
 * required to confirm they can never be edited), so content equality
 * here is sufficient for correctness.
 */
function reconcileExercises(prev: Exercise[], next: Exercise[]): Exercise[] {
  if (prev.length === 0) return next;
  if (next.length === 0) return prev.length === 0 ? prev : next;

  const prevById = new Map<string, Exercise>();
  for (const e of prev) prevById.set(e.id, e);

  let changed = prev.length !== next.length;
  const result = next.map((e) => {
    const old = prevById.get(e.id);
    if (old && exerciseEqual(old, e)) return old;
    changed = true;
    return e;
  });

  return changed ? result : prev;
}

/**
 * Reference equality for exercises. Correct because
 * `reconcileExercises` guarantees that identical-content exercises
 * share the same object reference across refreshes.
 */
function exercisesReferentiallyEqual(a: Exercise[], b: Exercise[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function recordEqual(a: CompletionRecord, b: CompletionRecord): boolean {
  return (
    a.id === b.id &&
    a.exerciseId === b.exerciseId &&
    a.dayKey === b.dayKey &&
    a.startedAt === b.startedAt &&
    a.completedAt === b.completedAt
  );
}

function recordsEqual(a: CompletionRecord[], b: CompletionRecord[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!recordEqual(a[i], b[i])) return false;
  }
  return true;
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

/**
 * Reuses the previous Set reference when contents are identical.
 * This keeps `completedIds` stable across refreshes that didn't
 * actually change anything, which lets downstream memoized
 * consumers — notably the exercise list — bail out entirely.
 */
function reconcileSet<T>(prev: Set<T>, next: Set<T>): Set<T> {
  return setsEqual(prev, next) ? prev : next;
}

function dayStateEqual(a: DayState, b: DayState): boolean {
  return (
    a.loading === b.loading &&
    a.error === b.error &&
    exercisesReferentiallyEqual(a.exercises, b.exercises) &&
    recordsEqual(a.records, b.records) &&
    setsEqual(a.completedIds, b.completedIds) &&
    a.allDone === b.allDone &&
    a.allExercisesCompleted === b.allExercisesCompleted &&
    a.isLocked === b.isLocked &&
    a.sworeToday === b.sworeToday &&
    a.meetsMinimum === b.meetsMinimum &&
    a.progress.done === b.progress.done &&
    a.progress.total === b.progress.total &&
    a.streak === b.streak &&
    a.todayKey === b.todayKey &&
    setsEqual(a.frozenDayKeys, b.frozenDayKeys) &&
    a.freezeAllowance === b.freezeAllowance &&
    a.freezeUsed === b.freezeUsed &&
    a.freezeBalance === b.freezeBalance
  );
}

export function useDayState(minimumExercises: number, enabled: boolean = true) {
  const db = useSQLiteContext();
  const [state, setState] = useState<DayState>(createEmptyState);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const now = new Date();
      const key = dayKey(now);
      const startMs = dayStartMs(now);
      const endMs = dayEndMs(now);

      const [
        fetchedExercises,
        fetchedRecords,
        isLocked,
        sworeToday,
        streakResult,
      ] = await Promise.all([
        ExercisesRepo.getActiveForDay(db, startMs, endMs),
        CompletionsRepo.getForDay(db, key),
        DayLocksRepo.isLocked(db, key),
        SwearsRepo.hasSwornToday(db, key),
        calculateStreak(db),
      ]);

      if (!mountedRef.current) return;

      setState((prev) => {
        const exercises = reconcileExercises(prev.exercises, fetchedExercises);

        // Preserve object identity across refreshes when contents
        // haven't changed.
        const records = recordsEqual(prev.records, fetchedRecords)
          ? prev.records
          : fetchedRecords;

        const freshCompletedIds = new Set(records.map((r) => r.exerciseId));
        const completedIds = reconcileSet(prev.completedIds, freshCompletedIds);

        const allExercisesCompleted =
          exercises.length > 0 &&
          exercises.every((e) => completedIds.has(e.id));
        const allDone =
          exercises.length >= minimumExercises && allExercisesCompleted;

        const next: DayState = {
          loading: false,
          error: null,
          exercises,
          records,
          completedIds,
          allDone,
          allExercisesCompleted,
          isLocked,
          sworeToday,
          meetsMinimum: exercises.length >= minimumExercises,
          progress: {
            done: exercises.filter((e) => completedIds.has(e.id)).length,
            total: exercises.length,
          },
          streak: streakResult.streak,
          todayKey: key,
          frozenDayKeys: reconcileSet(
            prev.frozenDayKeys,
            streakResult.frozenKeys,
          ),
          freezeAllowance: streakResult.freezeAllowance,
          freezeUsed: streakResult.freezeUsed,
          freezeBalance: streakResult.freezeBalance,
        };

        return dayStateEqual(prev, next) ? prev : next;
      });
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[useDayState] refresh failed:", err);
      const message =
        err instanceof Error ? err.message : "Could not load today's data.";
      setState((prev) =>
        prev.error === message && !prev.loading
          ? prev
          : { ...prev, loading: false, error: message },
      );
    }
  }, [db, enabled, minimumExercises]);

  useEffect(() => {
    if (!enabled) {
      setState((s) => (s.loading ? s : { ...s, loading: true }));
      return;
    }
    refresh();
  }, [refresh, enabled]);

  // Memoize the returned object so consumers that list `day` in a
  // dependency array don't invalidate on every render of the hook.
  return useMemo(() => ({ ...state, refresh }), [state, refresh]);
}
