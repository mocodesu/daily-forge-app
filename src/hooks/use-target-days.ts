import { DEFAULT_TARGET_DAYS } from "@/constants/dailyforge";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "streak.targetDays";

/**
 * Reads the current target days preference from the DB. Exposed so
 * non-hook call sites (like `handleSworn`) can read the live value
 * without relying on the hook's state, which may be stale.
 */
export async function readTargetDays(
  db: ReturnType<typeof useSQLiteContext>,
): Promise<number> {
  try {
    const stored = await PreferencesRepo.get(db, KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.max(1, Math.min(365, parsed));
      }
    }
  } catch (err) {
    console.warn("[readTargetDays] failed:", err);
  }
  return DEFAULT_TARGET_DAYS;
}

export function useTargetDays() {
  const db = useSQLiteContext();
  const [targetDays, setTargetDaysState] =
    useState<number>(DEFAULT_TARGET_DAYS);
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
      const live = await readTargetDays(db);
      if (!mountedRef.current) return;
      setTargetDaysState(live);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[useTargetDays] load failed:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [db]);

  // `useFocusEffect` covers both the initial mount and every subsequent
  // focus (e.g. returning from Settings after changing the target).
  // The extra `useEffect(refresh)` in the previous version was
  // redundant and caused a double fetch on cold start.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const setTargetDays = useCallback(
    async (next: number) => {
      const safe = Math.max(1, Math.min(365, Math.floor(next)));
      setTargetDaysState(safe);
      try {
        await PreferencesRepo.set(db, KEY, String(safe));
      } catch (err) {
        if (!mountedRef.current) return;
        console.warn("[useTargetDays] save failed:", err);
      }
    },
    [db],
  );

  return { targetDays, setTargetDays, loading, refresh };
}
