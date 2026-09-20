import { SWEAR_MATCH_THRESHOLD } from "@/constants/swear";
import { matchSwear } from "@/utils/swear-matcher";

describe("matchSwear — input guards", () => {
  it("returns unmatched for empty input", () => {
    const r = matchSwear("", "I swear to do the thing");
    expect(r).toEqual({
      matched: false,
      score: 0,
      presentCount: 0,
      totalCount: 0,
    });
  });

  it("returns unmatched for whitespace-only input", () => {
    const r = matchSwear("   \n\t  ", "I swear to do the thing");
    expect(r.matched).toBe(false);
    expect(r.score).toBe(0);
  });

  it("returns unmatched for an empty phrase", () => {
    const r = matchSwear("I swear to do the thing", "");
    expect(r).toEqual({
      matched: false,
      score: 0,
      presentCount: 0,
      totalCount: 0,
    });
  });

  it("returns unmatched for a phrase of only punctuation", () => {
    const r = matchSwear("hello world", "!!!???");
    expect(r.matched).toBe(false);
    expect(r.score).toBe(0);
  });
});

describe("matchSwear — token overlap", () => {
  it("scores an exact match at 1.0", () => {
    const phrase = "I swear by God I did my exercises today";
    const r = matchSwear(phrase, phrase);
    expect(r.matched).toBe(true);
    expect(r.score).toBe(1);
    expect(r.presentCount).toBe(r.totalCount);
  });

  it("is case-insensitive", () => {
    const r = matchSwear(
      "i SWEAR by god i DID my exercises today",
      "I swear by God I did my exercises today",
    );
    expect(r.matched).toBe(true);
  });

  it("ignores punctuation", () => {
    const r = matchSwear(
      "I swear, by God — I did my exercises today!",
      "I swear by God I did my exercises today",
    );
    expect(r.matched).toBe(true);
  });

  it("normalizes runs of whitespace", () => {
    const r = matchSwear(
      "I    swear   by\tGod\nI did my exercises today",
      "I swear by God I did my exercises today",
    );
    expect(r.matched).toBe(true);
  });

  it("allows extra words in the input", () => {
    const r = matchSwear(
      "um I swear by God I did my exercises today yeah",
      "I swear by God I did my exercises today",
    );
    expect(r.matched).toBe(true);
    expect(r.score).toBe(1);
  });

  it("does not match partial words (token-level only)", () => {
    const r = matchSwear("I scatter the oath", "I swear the cat");
    expect(r.presentCount).toBe(2);
    expect(r.totalCount).toBe(4);
    expect(r.score).toBe(0.5);
    expect(r.matched).toBe(false);
  });

  it("preserves numbers during normalization", () => {
    const r = matchSwear("I swear 3 times today", "I swear 3 times today");
    expect(r.matched).toBe(true);
    expect(r.score).toBe(1);
  });
});

describe("matchSwear — threshold boundary", () => {
  it("accepts a score exactly at the threshold", () => {
    const r = matchSwear("a b c d", "a b c d e");
    expect(r.score).toBe(SWEAR_MATCH_THRESHOLD);
    expect(r.matched).toBe(true);
  });

  it("rejects a score just below the threshold", () => {
    const r = matchSwear("a b c", "a b c d");
    expect(r.score).toBe(0.75);
    expect(r.matched).toBe(false);
  });

  it("rejects a phrase that shares zero words with the input", () => {
    const r = matchSwear("alpha bravo", "charlie delta");
    expect(r.score).toBe(0);
    expect(r.matched).toBe(false);
  });
});

describe("matchSwear — quirks", () => {
  it("de-duplicates input but not the phrase", () => {
    const r = matchSwear("go", "go go go go go");
    expect(r.presentCount).toBe(5);
    expect(r.totalCount).toBe(5);
    expect(r.score).toBe(1);
    expect(r.matched).toBe(true);
  });

  it("strips contraction apostrophes into word boundaries", () => {
    const r = matchSwear("I don't quit", "I don't quit");
    expect(r.matched).toBe(true);
  });
});
