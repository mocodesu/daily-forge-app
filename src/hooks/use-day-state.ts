import { CompletionsRepo } from "@/repositories/completions-repo";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { SwearsRepo } from "@/repositories/swears-repo";
import type { CompletionRecord, Exercise } from "@/types/dailyforge";
import { dayEndMs, dayKey, dayStartMs } from "@/utils/day-key";
import { calculateStreak } from "@/utils/streak";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

export interface DayState {
  loading: boolean;
  exercises: Exercise[];
  records: CompletionRecord[];
  completedIds: Set<string>;
  /** Every exercise completed AND minimum met. */
  allDone: boolean;
  /** Every exercise completed, regardless of the minimum. */
  allExercisesCompleted: boolean;
  isLocked: boolean;
  sworeToday: boolean;
  meetsMinimum: boolean;
  progress: { done: number; total: number };
  streak: number;
  todayKey: string;
}

const EMPTY: DayState = {
  loading: true,
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
};

/**
 * @param minimumExercises  The user-configured minimum number of daily
 *                          exercises required for a day to count as
 *                          "complete". Comes from `useMinimumExercises`.
 * @param enabled           When false, no queries run.
 */
export function useDayState(minimumExercises: number, enabled: boolean = true) {
  const db = useSQLiteContext();
  const [state, setState] = useState<DayState>(EMPTY);

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

      const [exercises, records, isLocked, sworeToday, streak] =
        await Promise.all([
          ExercisesRepo.getActiveForDay(db, startMs, endMs),
          CompletionsRepo.getForDay(db, key),
          DayLocksRepo.isLocked(db, key),
          SwearsRepo.hasSwornToday(db, key),
          calculateStreak(db),
        ]);

      if (!mountedRef.current) return;

      const completedIds = new Set(records.map((r) => r.exerciseId));

      const allExercisesCompleted =
        exercises.length > 0 && exercises.every((e) => completedIds.has(e.id));

      // The day is only "done" when the user has completed every exercise
      // AND they have at least `minimumExercises` configured.
      const allDone =
        exercises.length >= minimumExercises && allExercisesCompleted;

      setState({
        loading: false,
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
        streak,
        todayKey: key,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[useDayState] refresh failed:", err);
      setState((s) => ({ ...s, loading: false }));
    }
  }, [db, enabled, minimumExercises]);

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: true }));
      return;
    }
    refresh();
  }, [refresh, enabled]);

  return { ...state, refresh };
}
