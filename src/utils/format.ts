// ─────────────────────────────────────────────────────────────
// utils/format.ts — shared display formatters
//
// Every duration renderer in the app funnels through here. If the
// display convention ever changes (e.g. always "1m 30s", never
// "1:30"), this is the only file to touch.
// ─────────────────────────────────────────────────────────────

/**
 * Compact duration for exercise/session summaries.
 *
 *   < 60s   →  "45s"
 *   exact m →  "3m"
 *   m + s   →  "3:30"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Zero-padded MM:SS for the live session countdown.
 * Always shows both fields, never abbreviates.
 */
export function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
