import { PreferencesRepo } from "@/repositories/preferences-repo";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "units.system";

export type UnitSystem = "metric" | "imperial";

const LB_PER_KG = 2.2046226218;

export function useUnitSystem() {
  const db = useSQLiteContext();
  const [system, setSystemState] = useState<UnitSystem>("metric");

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
        if (stored === "metric" || stored === "imperial") {
          setSystemState(stored);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        console.warn("[useUnitSystem] load failed:", err);
      }
    })();
  }, [db]);

  const setSystem = useCallback(
    async (next: UnitSystem) => {
      setSystemState(next);
      try {
        await PreferencesRepo.set(db, KEY, next);
      } catch (err) {
        if (!mountedRef.current) return;
        console.warn("[useUnitSystem] save failed:", err);
      }
    },
    [db],
  );

  const kgToDisplay = useCallback(
    (kg: number) => (system === "metric" ? kg : kg * LB_PER_KG),
    [system],
  );

  const displayToKg = useCallback(
    (value: number) => (system === "metric" ? value : value / LB_PER_KG),
    [system],
  );

  const formatWeight = useCallback(
    (kg: number) => kgToDisplay(kg).toFixed(1),
    [kgToDisplay],
  );

  const weightUnit = system === "metric" ? "kg" : "lb";

  return {
    system,
    setSystem,
    kgToDisplay,
    displayToKg,
    formatWeight,
    weightUnit,
  };
}
