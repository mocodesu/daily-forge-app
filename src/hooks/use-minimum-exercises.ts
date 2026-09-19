import {
  DEFAULT_MINIMUM_EXERCISES,
  MINIMUM_EXERCISES_RANGE,
} from "@/constants/dailyforge";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "exercises.minimum";

/**
 * Non-hook reader for call sites that need the live value without
 * subscribing to state — e.g. inside an async handler.
 */
export async function readMinimumExercises(
  db: ReturnType<typeof useSQLiteContext>,
): Promise<number> {
  try {
    const stored = await PreferencesRepo.get(db, KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.max(
          MINIMUM_EXERCISES_RANGE.min,
          Math.min(MINIMUM_EXERCISES_RANGE.max, parsed),
        );
      }
    }
  } catch (err) {
    console.warn("[readMinimumExercises] failed:", err);
  }
  return DEFAULT_MINIMUM_EXERCISES;
}

export function useMinimumExercises() {
  const db = useSQLiteContext();
  const [minimumExercises, setMinimumExercisesState] = useState<number>(
    DEFAULT_MINIMUM_EXERCISES,
  );
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const live = await readMinimumExercises(db);
      if (!mountedRef.current) return;
      setMinimumExercisesState(live);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[useMinimumExercises] load failed:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const setMinimumExercises = useCallback(
    async (next: number) => {
      const safe = Math.max(
        MINIMUM_EXERCISES_RANGE.min,
        Math.min(MINIMUM_EXERCISES_RANGE.max, Math.floor(next)),
      );
      setMinimumExercisesState(safe);
      try {
        await PreferencesRepo.set(db, KEY, String(safe));
      } catch (err) {
        if (!mountedRef.current) return;
        console.warn("[useMinimumExercises] save failed:", err);
      }
    },
    [db],
  );

  return {
    minimumExercises,
    setMinimumExercises,
    loading,
    refresh,
  };
}
