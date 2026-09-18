// ─────────────────────────────────────────────────────────────
// constants/swear.ts — the voice oath
// ─────────────────────────────────────────────────────────────

export const DEFAULT_SWEAR_PHRASE =
  "I swear by God that I completed all my daily exercises today";

/** Range constraints for a user-editable phrase. */
export const SWEAR_PHRASE_MIN_WORDS = 3;
export const SWEAR_PHRASE_MAX_WORDS = 40;

/**
 * Minimum score for a spoken transcript to count as a match.
 * 0.8 means 80% of the required words must appear.
 */
export const SWEAR_MATCH_THRESHOLD = 0.8;
