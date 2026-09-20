import { formatDuration, formatLongDuration, formatMMSS } from "@/utils/format";

describe("formatDuration", () => {
  it("renders sub-minute values as raw seconds", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(1)).toBe("1s");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(59)).toBe("59s");
  });

  it("drops the seconds field when it's exactly on the minute", () => {
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(600)).toBe("10m");
    expect(formatDuration(3600)).toBe("60m");
  });

  it("zero-pads the seconds field when both are present", () => {
    expect(formatDuration(61)).toBe("1:01");
    expect(formatDuration(210)).toBe("3:30");
    expect(formatDuration(605)).toBe("10:05");
  });
});

describe("formatMMSS", () => {
  it("always renders two fields, zero-padded", () => {
    expect(formatMMSS(0)).toBe("00:00");
    expect(formatMMSS(5)).toBe("00:05");
    expect(formatMMSS(60)).toBe("01:00");
    expect(formatMMSS(65)).toBe("01:05");
    expect(formatMMSS(3599)).toBe("59:59");
  });

  it("does not cap at an hour — the minutes field just grows", () => {
    expect(formatMMSS(3600)).toBe("60:00");
    expect(formatMMSS(7200)).toBe("120:00");
  });
});

describe("formatLongDuration", () => {
  it("rounds sub-second input to the nearest second", () => {
    expect(formatLongDuration(0)).toBe("0s");
    expect(formatLongDuration(400)).toBe("0s");
    expect(formatLongDuration(500)).toBe("1s");
    expect(formatLongDuration(1499)).toBe("1s");
    expect(formatLongDuration(1500)).toBe("2s");
  });

  it("renders sub-hour durations as 'Xm Ys'", () => {
    expect(formatLongDuration(60_000)).toBe("1m");
    expect(formatLongDuration(65_000)).toBe("1m 5s");
    expect(formatLongDuration(3_599_000)).toBe("59m 59s");
  });

  it("renders hour-plus durations as 'Xh Ym'", () => {
    expect(formatLongDuration(3_600_000)).toBe("1h");
    expect(formatLongDuration(3_660_000)).toBe("1h 1m");
    expect(formatLongDuration(8_100_000)).toBe("2h 15m");
  });

  it("drops the trailing field when it rounds to zero", () => {
    expect(formatLongDuration(120_000)).toBe("2m");
    expect(formatLongDuration(7_200_000)).toBe("2h");
  });
});
