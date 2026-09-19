import {
  hasCelebratedTarget,
  markTargetCelebrated,
} from "@/utils/celebrations";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Watches the current streak against the user's target and surfaces a
 * flag when the grand celebration should fire. It fires exactly once per
 * target value — the target is marked as celebrated the moment the user
 * dismisses the modal.
 */
export function useTargetCelebration(
  streak: number,
  targetDays: number,
  enabled: boolean,
) {
  const db = useSQLiteContext();
  const [shouldShow, setShouldShow] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const check = useCallback(async () => {
    if (!enabled) return;

    // Not yet at target — nothing to celebrate.
    if (streak < targetDays) {
      if (mountedRef.current) setShouldShow(false);
      return;
    }

    try {
      const already = await hasCelebratedTarget(db, targetDays);
      if (!mountedRef.current) return;
      setShouldShow(!already);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[useTargetCelebration] check failed:", err);
    }
  }, [db, streak, targetDays, enabled]);

  useEffect(() => {
    check();
  }, [check]);

  const dismiss = useCallback(async () => {
    try {
      await markTargetCelebrated(db, targetDays);
    } catch (err) {
      console.warn("[useTargetCelebration] mark failed:", err);
    } finally {
      if (mountedRef.current) setShouldShow(false);
    }
  }, [db, targetDays]);

  return { shouldShow, dismiss, refresh: check };
}
