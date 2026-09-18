import { UserProfileRepo } from "@/repositories/user-profile-repo";
import type { UserProfile } from "@/types/dailyforge";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

export function useProfile() {
  const db = useSQLiteContext();
  const [data, setData] = useState<UserProfile | null>(null);
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
      const profile = await UserProfileRepo.get(db);
      if (!mountedRef.current) return;
      setData(profile);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[useProfile] refresh failed:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
