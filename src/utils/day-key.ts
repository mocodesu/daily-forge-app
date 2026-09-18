// ─────────────────────────────────────────────────────────────
// utils/day-key.ts — stable calendar-day buckets
// ─────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" for a given date in the device's local timezone. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Start-of-day in epoch ms (local time). */
export function dayStartMs(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** End-of-day in epoch ms (local time, exclusive). */
export function dayEndMs(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime() + 1;
}

/** Days back from today, `count` items, oldest first. */
export function lastNDays(count: number): Date[] {
  const out: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

/** UUID v4. Requires `expo-crypto` (already in Expo SDK). */
export { randomUUID } from "expo-crypto";
