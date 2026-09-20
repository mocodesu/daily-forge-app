import { dayKey } from "@/utils/day-key";
import { computeStreak } from "@/utils/streak";

const TODAY = new Date(2024, 0, 15, 12, 0, 0);
const k = (offset: number): string =>
  dayKey(new Date(2024, 0, 15 + offset, 12, 0, 0));

const s = (...offsets: number[]): Set<string> => new Set(offsets.map(k));

describe("computeStreak — empty and trivial cases", () => {
  it("returns 0 when nothing is sealed or frozen", () => {
    expect(computeStreak(s(), s(), TODAY)).toBe(0);
  });

  it("returns 1 when only today is sealed", () => {
    expect(computeStreak(s(0), s(), TODAY)).toBe(1);
  });

  it("returns 1 when only yesterday is sealed and today is untouched", () => {
    expect(computeStreak(s(-1), s(), TODAY)).toBe(1);
  });

  it("returns 0 when neither today nor yesterday is sealed", () => {
    expect(computeStreak(s(-2, -3), s(), TODAY)).toBe(0);
  });
});

describe("computeStreak — consecutive runs", () => {
  it("counts a run that ends today", () => {
    expect(computeStreak(s(0, -1, -2, -3), s(), TODAY)).toBe(4);
  });

  it("counts a run that ends yesterday when today is untouched", () => {
    expect(computeStreak(s(-1, -2, -3), s(), TODAY)).toBe(3);
  });

  it("stops at the first gap", () => {
    expect(computeStreak(s(0, -1, -3), s(), TODAY)).toBe(2);
  });

  it("ignores sealed days isolated after a gap", () => {
    expect(computeStreak(s(-5), s(), TODAY)).toBe(0);
  });
});

describe("computeStreak — frozen days", () => {
  it("skips a frozen day without breaking or incrementing", () => {
    expect(computeStreak(s(0, -2), s(-1), TODAY)).toBe(2);
  });

  it("ignores a frozen today — cursor skips it without counting", () => {
    expect(computeStreak(s(), s(0), TODAY)).toBe(0);
  });

  it("counts sealed days on either side of a frozen day", () => {
    expect(computeStreak(s(-1, -3), s(-2), TODAY)).toBe(2);
  });

  it("a full freeze week still counts the streak that leads up to it", () => {
    expect(computeStreak(s(0, -4, -5), s(-1, -2, -3), TODAY)).toBe(3);
  });

  it("a frozen day followed by an unsealed day ends the streak", () => {
    expect(computeStreak(s(0), s(-1), TODAY)).toBe(1);
  });
});

describe("computeStreak — cursor behavior at boundaries", () => {
  it("head-day preference: today over yesterday when both are sealed", () => {
    expect(computeStreak(s(0, -1), s(), TODAY)).toBe(2);
  });

  it("head-day preference: yesterday over a further-back sealed day", () => {
    expect(computeStreak(s(-1, -3), s(), TODAY)).toBe(1);
  });

  it("a sealed day far in the past with no anchor does not produce a streak", () => {
    expect(computeStreak(s(-10), s(), TODAY)).toBe(0);
  });
});

describe("computeStreak — default argument", () => {
  it("uses today's date when the third argument is omitted", () => {
    // The default arg `today: Date = new Date()` runs only when the
    // function is called with two arguments. Assert the return type —
    // the exact value depends on the wall clock.
    const result = computeStreak(new Set(), new Set());
    expect(typeof result).toBe("number");
    expect(result).toBe(0);
  });
});
