// ─────────────────────────────────────────────────────────────
// utils/backup.ts — export, import, and validate DailyForge data
// ─────────────────────────────────────────────────────────────
import { File, Paths } from "expo-file-system";
import type { SQLiteDatabase } from "expo-sqlite";

const EXPORT_VERSION = 1;

export interface BackupPayload {
  version: number;
  exportedAt: number;
  appVersion: string;
  preferences: Record<string, string>;
  userProfile: unknown[] | null;
  exercises: unknown[];
  completions: unknown[];
  dayLocks: unknown[];
  swears: unknown[];
  milestones: unknown[];
  frozenDays: unknown[];
}

export interface BackupSummary {
  exercises: number;
  completions: number;
  dayLocks: number;
  swears: number;
  milestones: number;
  frozenDays: number;
  hasProfile: boolean;
  preferenceCount: number;
}

export async function buildBackupJson(
  db: SQLiteDatabase,
  appVersion: string,
): Promise<string> {
  const [
    prefs,
    profile,
    exercises,
    completions,
    locks,
    swears,
    milestones,
    frozen,
  ] = await Promise.all([
    db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM preferences`,
    ),
    db.getAllAsync<unknown>(`SELECT * FROM user_profile`),
    db.getAllAsync<unknown>(`SELECT * FROM exercises`),
    db.getAllAsync<unknown>(`SELECT * FROM completion_records`),
    db.getAllAsync<unknown>(`SELECT * FROM day_locks`),
    db.getAllAsync<unknown>(`SELECT * FROM daily_swears`),
    db.getAllAsync<unknown>(`SELECT * FROM milestones`),
    db.getAllAsync<unknown>(`SELECT * FROM frozen_days`),
  ]);

  const preferences: Record<string, string> = {};
  for (const row of prefs) {
    preferences[row.key] = row.value;
  }

  const payload: BackupPayload = {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    appVersion,
    preferences,
    userProfile: profile.length > 0 ? profile : null,
    exercises,
    completions,
    dayLocks: locks,
    swears,
    milestones,
    frozenDays: frozen,
  };

  return JSON.stringify(payload, null, 2);
}

export function writeBackupFile(json: string): {
  uri: string;
  filename: string;
} {
  const stamp = timestampForFilename();
  const filename = `dailyforge-backup-${stamp}.json`;
  const file = new File(Paths.document, filename);

  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(json);

  return { uri: file.uri, filename };
}

export function parseBackupJson(raw: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  return validatePayload(parsed);
}

function validatePayload(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Backup file is empty or malformed.");
  }
  const p = raw as Partial<BackupPayload>;

  if (typeof p.version !== "number") {
    throw new Error("Backup file is missing a version number.");
  }
  if (p.version > EXPORT_VERSION) {
    throw new Error(
      `Backup was created with a newer version of DailyForge (v${p.version}). Update the app and try again.`,
    );
  }
  if (!Array.isArray(p.exercises)) {
    throw new Error("Backup file is missing the exercises array.");
  }
  if (!Array.isArray(p.completions)) {
    throw new Error("Backup file is missing the completions array.");
  }

  return {
    version: p.version,
    exportedAt: typeof p.exportedAt === "number" ? p.exportedAt : Date.now(),
    appVersion: typeof p.appVersion === "string" ? p.appVersion : "unknown",
    preferences: p.preferences ?? {},
    userProfile: p.userProfile ?? null,
    exercises: p.exercises,
    completions: p.completions,
    dayLocks: p.dayLocks ?? [],
    swears: p.swears ?? [],
    milestones: p.milestones ?? [],
    // Backups created before this field existed won't have it — default
    // to an empty array so old backups still restore cleanly.
    frozenDays: Array.isArray(p.frozenDays) ? p.frozenDays : [],
  };
}

export function summarizeBackup(payload: BackupPayload): BackupSummary {
  return {
    exercises: payload.exercises.length,
    completions: payload.completions.length,
    dayLocks: payload.dayLocks.length,
    swears: payload.swears.length,
    milestones: payload.milestones.length,
    frozenDays: payload.frozenDays.length,
    hasProfile:
      Array.isArray(payload.userProfile) && payload.userProfile.length > 0,
    preferenceCount: Object.keys(payload.preferences).length,
  };
}

function timestampForFilename(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "-",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("");
}
