import { DEFAULT_TARGET_DAYS } from "@/constants/dailyforge";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "streak.targetDays";

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
      const stored = await PreferencesRepo.get(db, KEY);
      if (!mountedRef.current) return;
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          setTargetDaysState(parsed);
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[useTargetDays] load failed:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
