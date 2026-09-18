import { DEFAULT_SWEAR_PHRASE } from "@/constants/swear";
import { PreferencesRepo } from "@/repositories/preferences-repo";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "swear.phrase";

export function useSwearPhrase() {
  const db = useSQLiteContext();
  const [phrase, setPhraseState] = useState(DEFAULT_SWEAR_PHRASE);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await PreferencesRepo.get(db, KEY);
        if (!mountedRef.current) return;
        if (stored && stored.trim().length > 0) {
          setPhraseState(stored);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        console.warn("[useSwearPhrase] load failed:", err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  }, [db]);

  const setPhrase = useCallback(
    async (next: string) => {
      const cleaned = next.trim().replace(/\s+/g, " ");
      setPhraseState(cleaned);
      try {
        await PreferencesRepo.set(db, KEY, cleaned);
      } catch (err) {
        if (!mountedRef.current) return;
        console.warn("[useSwearPhrase] save failed:", err);
      }
    },
    [db],
  );

  return { phrase, setPhrase, loading };
}
