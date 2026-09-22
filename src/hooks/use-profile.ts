import { UserProfileRepo } from "@/repositories/user-profile-repo";
import type { UserProfile } from "@/types/dailyforge";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Shallow structural equality for UserProfile. All fields are
 * primitives or nullable strings, so a field-by-field compare is
 * cheap and exact.
 */
function profileEqual(a: UserProfile | null, b: UserProfile | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return (
    a.id === b.id &&
    a.displayName === b.displayName &&
    a.age === b.age &&
    a.startDate === b.startDate &&
    a.initialWeightKg === b.initialWeightKg &&
    a.goalWeightKg === b.goalWeightKg &&
    a.initialHeightCm === b.initialHeightCm &&
    a.initialFrontPhotoUri === b.initialFrontPhotoUri &&
    a.initialSidePhotoUri === b.initialSidePhotoUri
  );
}

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
      // Preserve the previous reference when the profile hasn't
      // actually changed. Focus-driven refreshes then become no-ops
      // for downstream consumers.
      setData((prev) => (profileEqual(prev, profile) ? prev : profile));
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("[useProfile] refresh failed:", err);
    } finally {
      if (mountedRef.current) setLoading((prev) => (prev ? false : prev));
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({ data, loading, refresh }), [data, loading, refresh]);
}
