import { dayEndMs, dayKey, dayStartMs, lastNDays } from "@/utils/day-key";

describe("dayKey", () => {
  it("zero-pads month and day", () => {
    expect(dayKey(new Date(2024, 0, 1))).toBe("2024-01-01");
    expect(dayKey(new Date(2024, 8, 9))).toBe("2024-09-09");
    expect(dayKey(new Date(2024, 11, 31))).toBe("2024-12-31");
  });

  it("handles leap-day correctly", () => {
    expect(dayKey(new Date(2024, 1, 29))).toBe("2024-02-29");
  });

  it("rolls over a non-leap Feb 29 into Mar 1", () => {
    expect(dayKey(new Date(2023, 1, 29))).toBe("2023-03-01");
  });

  it("rolls day 0 back into the previous month", () => {
    expect(dayKey(new Date(2024, 0, 0))).toBe("2023-12-31");
    expect(dayKey(new Date(2024, 2, 0))).toBe("2024-02-29");
  });

  it("treats month 12 as next-year January", () => {
    expect(dayKey(new Date(2024, 12, 1))).toBe("2025-01-01");
  });

  it("ignores time-of-day", () => {
    expect(dayKey(new Date(2024, 5, 15, 0, 0, 0, 0))).toBe("2024-06-15");
    expect(dayKey(new Date(2024, 5, 15, 23, 59, 59, 999))).toBe("2024-06-15");
  });
});

describe("dayStartMs / dayEndMs", () => {
  it("dayStartMs snaps to local midnight", () => {
    const input = new Date(2024, 0, 15, 14, 30, 45, 123);
    const start = new Date(dayStartMs(input));

    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });

  it("dayEndMs returns the first millisecond of the next day (exclusive)", () => {
    const input = new Date(2024, 0, 15, 14, 30, 45, 123);
    const end = dayEndMs(input);

    const lastMs = new Date(end - 1);
    expect(lastMs.getDate()).toBe(15);
    expect(lastMs.getHours()).toBe(23);
    expect(lastMs.getMinutes()).toBe(59);
    expect(lastMs.getSeconds()).toBe(59);
    expect(lastMs.getMilliseconds()).toBe(999);

    const atEnd = new Date(end);
    expect(atEnd.getDate()).toBe(16);
    expect(atEnd.getHours()).toBe(0);
    expect(atEnd.getMinutes()).toBe(0);
  });

  it("start and end of the same day are within 24 hours of each other", () => {
    const d = new Date(2024, 0, 15);
    const span = dayEndMs(d) - dayStartMs(d);
    expect(span).toBeGreaterThan(22 * 60 * 60 * 1000);
    expect(span).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it("both accept an explicit date argument", () => {
    const target = new Date(2020, 5, 10, 12);
    expect(new Date(dayStartMs(target)).getFullYear()).toBe(2020);
    expect(new Date(dayEndMs(target)).getDate()).toBe(11);
  });

  it("both default to today when called with no args", () => {
    const nowStart = dayStartMs();
    const nowEnd = dayEndMs();
    expect(new Date(nowStart).getDate()).toBe(new Date().getDate());
    expect(new Date(nowEnd).getDate()).toBe(new Date().getDate() + 1);
  });
});

describe("lastNDays", () => {
  it("returns N days, oldest first, ending today", () => {
    const days = lastNDays(7);
    expect(days).toHaveLength(7);

    expect(dayKey(days[0])).not.toBe(dayKey(days[6]));
    expect(dayKey(days[6])).toBe(dayKey());

    for (let i = 1; i < days.length; i++) {
      expect(days[i].getTime()).toBeGreaterThan(days[i - 1].getTime());
    }
  });

  it("handles a single day", () => {
    const days = lastNDays(1);
    expect(days).toHaveLength(1);
    expect(dayKey(days[0])).toBe(dayKey());
  });

  it("each returned Date is at local midnight", () => {
    const days = lastNDays(3);
    for (const d of days) {
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
      expect(d.getMilliseconds()).toBe(0);
    }
  });
});
