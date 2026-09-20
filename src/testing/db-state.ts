import type { SQLiteDatabase } from "expo-sqlite";

let current: SQLiteDatabase | null = null;

/** Set the DB that `useSQLiteContext` will return in the current test. */
export function setCurrentTestDb(db: SQLiteDatabase | null): void {
  current = db;
}

/** Read the current test DB, or null if none was set. */
export function getCurrentTestDb(): SQLiteDatabase | null {
  return current;
}
