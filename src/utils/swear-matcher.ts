import { SWEAR_MATCH_THRESHOLD } from "@/constants/swear";

export interface SwearMatchResult {
  matched: boolean;
  score: number;
  presentCount: number;
  totalCount: number;
}

/**
 * Compares a spoken transcript to the target phrase.
 * Case- and punctuation-insensitive. Token-level overlap.
 */
export function matchSwear(input: string, phrase: string): SwearMatchResult {
  const normalizedInput = normalize(input);
  const normalizedTarget = normalize(phrase);

  if (!normalizedInput || !normalizedTarget) {
    return { matched: false, score: 0, presentCount: 0, totalCount: 0 };
  }

  const inputWords = new Set(normalizedInput.split(" "));
  const targetWords = normalizedTarget.split(" ");

  let present = 0;
  for (const word of targetWords) {
    if (inputWords.has(word)) present += 1;
  }
  const score = present / targetWords.length;

  return {
    matched: score >= SWEAR_MATCH_THRESHOLD,
    score,
    presentCount: present,
    totalCount: targetWords.length,
  };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
