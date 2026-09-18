import { MilestonesRepo } from "@/repositories/milestones-repo";
import { UserProfileRepo } from "@/repositories/user-profile-repo";
import type { Milestone, UserProfile } from "@/types/dailyforge";
import { randomUUID } from "@/utils/day-key";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

const MILESTONE_INTERVAL = __DEV__ ? 2 : 30;

export function useMilestone(streak: number, enabled: boolean) {
  const db = useSQLiteContext();

  const [pending, setPending] = useState<Milestone | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

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
      const profileRow = await UserProfileRepo.get(db);
      if (!mountedRef.current) return;
      setProfile(profileRow);

      const unlockedDays = new Set(await MilestonesRepo.getAllDays(db));
      if (!mountedRef.current) return;

      for (
        let target = MILESTONE_INTERVAL;
        target <= streak;
        target += MILESTONE_INTERVAL
      ) {
        if (unlockedDays.has(target)) continue;

        const milestone: Milestone = {
          id: randomUUID(),
          day: target,
          unlockedAt: Date.now(),
          completedAt: null,
          currentWeightKg: null,
          userNotes: "",
          aiSummary: null,
        };
        await MilestonesRepo.insert(db, milestone);
        if (!mountedRef.current) return;
        setPending(milestone);
        return;
      }

      const pendingRow = await MilestonesRepo.getPending(db);
      if (!mountedRef.current) return;
      setPending(pendingRow);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[useMilestone] refresh failed:", err);
    }
  }, [db, streak, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const complete = useCallback(
    async (data: { currentWeightKg: number | null; userNotes: string }) => {
      if (!pending) return;
      try {
        await MilestonesRepo.complete(db, pending.id, {
          currentWeightKg: data.currentWeightKg,
          userNotes: data.userNotes,
          aiSummary: null,
        });
        if (!mountedRef.current) return;
        setPending(null);
      } catch (err) {
        if (!mountedRef.current) return;
        console.warn("[useMilestone] complete failed:", err);
      }
    },
    [db, pending],
  );

  const dismiss = useCallback(() => {
    setPending(null);
  }, []);

  return { pending, profile, complete, dismiss, refresh };
}
