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
  frozenDayKeys: new Set(),
  freezeAllowance: 0,
  freezeUsed: 0,
  freezeBalance: 0,
};

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

      const [exercises, records, isLocked, sworeToday, streakResult] =
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
        streak: streakResult.streak,
        todayKey: key,
        frozenDayKeys: streakResult.frozenKeys,
        freezeAllowance: streakResult.freezeAllowance,
        freezeUsed: streakResult.freezeUsed,
        freezeBalance: streakResult.freezeBalance,
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
