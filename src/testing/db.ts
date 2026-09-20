// ─────────────────────────────────────────────────────────────
// src/testing/db.ts
//
// In-memory SQLite wrapped to match expo-sqlite's async API.
//
// Used by repository tests and by any test that needs a real
// schema. Backed by better-sqlite3 (a genuine SQLite engine), so
// the queries under test execute against real SQLite — not a mock
// that would happily accept malformed SQL.
//
// The wrapper translates between:
//   • better-sqlite3's synchronous .run / .get / .all
//   • expo-sqlite's async runAsync / getFirstAsync / getAllAsync
//
// Transactions mirror expo-sqlite's behavior: BEGIN → callback →
// COMMIT on success, ROLLBACK on throw. Nested calls reuse the
// outer transaction rather than erroring (SQLite has no nested
// BEGIN without savepoints).
// ─────────────────────────────────────────────────────────────
import Database from "better-sqlite3";
import type { SQLiteDatabase } from "expo-sqlite";

export function createTestDb(): SQLiteDatabase {
  const sqlite = new Database(":memory:");

  let inTransaction = false;

  // expo-sqlite accepts both varargs and a single array as the
  // params argument. Normalize here so callers can use either.
  const normalizeParams = (params: unknown[]): unknown[] =>
    params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

  const db = {
    async runAsync(sql: string, ...params: unknown[]) {
      const args = normalizeParams(params);
      const result = sqlite.prepare(sql).run(...(args as never[]));
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: result.changes,
      };
    },

    async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const args = normalizeParams(params);
      return sqlite.prepare(sql).all(...(args as never[])) as T[];
    },

    async getFirstAsync<T>(
      sql: string,
      ...params: unknown[]
    ): Promise<T | null> {
      const args = normalizeParams(params);
      const row = sqlite.prepare(sql).get(...(args as never[])) as
        | T
        | undefined;
      return row ?? null;
    },

    async execAsync(sql: string) {
      sqlite.exec(sql);
    },

    async withTransactionAsync(fn: () => Promise<void>) {
      if (inTransaction) {
        // Nested — reuse the outer transaction. Matches expo-sqlite's
        // behavior when a callback triggers another withTransaction.
        await fn();
        return;
      }
      inTransaction = true;
      sqlite.exec("BEGIN");
      try {
        await fn();
        sqlite.exec("COMMIT");
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      } finally {
        inTransaction = false;
      }
    },

    async withExclusiveTransactionAsync(fn: (txn: unknown) => Promise<void>) {
      if (inTransaction) {
        await fn(db);
        return;
      }
      inTransaction = true;
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        await fn(db);
        sqlite.exec("COMMIT");
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      } finally {
        inTransaction = false;
      }
    },

    // Not part of expo-sqlite's public API, but useful for tests
    // that want to release the underlying handle explicitly.
    close() {
      sqlite.close();
    },
  };

  return db as unknown as SQLiteDatabase;
}
