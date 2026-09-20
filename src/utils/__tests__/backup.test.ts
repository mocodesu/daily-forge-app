import {
  parseBackupJson,
  summarizeBackup,
  type BackupPayload,
} from "@/utils/backup";

const VALID_MINIMAL = {
  version: 1,
  exportedAt: 1_700_000_000_000,
  appVersion: "1.0.0",
  preferences: { "units.system": "metric" },
  userProfile: null,
  exercises: [],
  completions: [],
  dayLocks: [],
  swears: [],
  milestones: [],
  frozenDays: [],
};

const stringify = (obj: unknown): string => JSON.stringify(obj);

describe("parseBackupJson — malformed input", () => {
  it("throws on invalid JSON", () => {
    expect(() => parseBackupJson("not json")).toThrow("not valid JSON");
  });

  it("throws on empty string", () => {
    expect(() => parseBackupJson("")).toThrow("not valid JSON");
  });

  it("throws when the top-level value is null", () => {
    expect(() => parseBackupJson("null")).toThrow("empty or malformed");
  });

  it("throws when the top-level value is a string", () => {
    expect(() => parseBackupJson('"hello"')).toThrow("empty or malformed");
  });

  it("throws when the top-level value is a number", () => {
    expect(() => parseBackupJson("42")).toThrow("empty or malformed");
  });

  it("throws when the top-level value is an array", () => {
    expect(() => parseBackupJson("[]")).toThrow("version number");
  });
});

describe("parseBackupJson — required fields", () => {
  it("throws when version is missing", () => {
    const { version, ...rest } = VALID_MINIMAL;
    expect(() => parseBackupJson(stringify(rest))).toThrow("version number");
  });

  it("throws when version is a string", () => {
    expect(() =>
      parseBackupJson(stringify({ ...VALID_MINIMAL, version: "1" })),
    ).toThrow("version number");
  });

  it("throws on a future version", () => {
    expect(() =>
      parseBackupJson(stringify({ ...VALID_MINIMAL, version: 2 })),
    ).toThrow("newer version");
  });

  it("throws when exercises is missing", () => {
    const { exercises, ...rest } = VALID_MINIMAL;
    expect(() => parseBackupJson(stringify(rest))).toThrow("exercises array");
  });

  it("throws when exercises is not an array", () => {
    expect(() =>
      parseBackupJson(stringify({ ...VALID_MINIMAL, exercises: "not-array" })),
    ).toThrow("exercises array");
  });

  it("throws when completions is missing", () => {
    const { completions, ...rest } = VALID_MINIMAL;
    expect(() => parseBackupJson(stringify(rest))).toThrow("completions array");
  });

  it("throws when completions is not an array", () => {
    expect(() =>
      parseBackupJson(stringify({ ...VALID_MINIMAL, completions: 42 })),
    ).toThrow("completions array");
  });
});

describe("parseBackupJson — backward compatibility", () => {
  it("accepts a v1 payload with only the required fields", () => {
    const parsed = parseBackupJson(stringify(VALID_MINIMAL));
    expect(parsed.version).toBe(1);
    expect(parsed.exercises).toEqual([]);
    expect(parsed.completions).toEqual([]);
  });

  it("fills missing optional arrays with empty arrays", () => {
    const { dayLocks, swears, milestones, frozenDays, ...rest } = VALID_MINIMAL;
    const parsed = parseBackupJson(stringify(rest));

    expect(parsed.dayLocks).toEqual([]);
    expect(parsed.swears).toEqual([]);
    expect(parsed.milestones).toEqual([]);
    expect(parsed.frozenDays).toEqual([]);
  });

  it("treats a missing userProfile as null", () => {
    const { userProfile, ...rest } = VALID_MINIMAL;
    const parsed = parseBackupJson(stringify(rest));
    expect(parsed.userProfile).toBeNull();
  });

  it("treats a missing preferences object as an empty object", () => {
    const { preferences, ...rest } = VALID_MINIMAL;
    const parsed = parseBackupJson(stringify(rest));
    expect(parsed.preferences).toEqual({});
  });

  it("substitutes 'unknown' for a non-string appVersion", () => {
    const parsed = parseBackupJson(
      stringify({ ...VALID_MINIMAL, appVersion: 123 }),
    );
    expect(parsed.appVersion).toBe("unknown");
  });

  it("fills a missing exportedAt with the current time", () => {
    const { exportedAt, ...rest } = VALID_MINIMAL;
    const before = Date.now();
    const parsed = parseBackupJson(stringify(rest));
    const after = Date.now();

    expect(parsed.exportedAt).toBeGreaterThanOrEqual(before);
    expect(parsed.exportedAt).toBeLessThanOrEqual(after);
  });
});

describe("parseBackupJson — happy path", () => {
  it("preserves a fully populated payload", () => {
    const full = {
      ...VALID_MINIMAL,
      userProfile: [{ id: "default", display_name: "Ada" }],
      exercises: [{ id: "e1" }],
      completions: [{ id: "c1" }],
      dayLocks: [{ id: "d1", day_key: "2024-01-15" }],
      swears: [{ id: "s1", day_key: "2024-01-15" }],
      milestones: [{ id: "m1", day: 30 }],
      frozenDays: [{ day_key: "2024-01-10" }],
    };
    const parsed = parseBackupJson(stringify(full));

    expect(parsed.userProfile).toHaveLength(1);
    expect(parsed.exercises).toHaveLength(1);
    expect(parsed.completions).toHaveLength(1);
    expect(parsed.dayLocks).toHaveLength(1);
    expect(parsed.swears).toHaveLength(1);
    expect(parsed.milestones).toHaveLength(1);
    expect(parsed.frozenDays).toHaveLength(1);
  });
});

describe("summarizeBackup", () => {
  it("reports zero for every count on an empty payload", () => {
    const payload = parseBackupJson(stringify(VALID_MINIMAL));
    expect(summarizeBackup(payload)).toEqual({
      exercises: 0,
      completions: 0,
      dayLocks: 0,
      swears: 0,
      milestones: 0,
      frozenDays: 0,
      hasProfile: false,
      preferenceCount: 1,
    });
  });

  it("counts every populated array", () => {
    const full: BackupPayload = {
      ...VALID_MINIMAL,
      userProfile: [{ id: "default" }],
      exercises: [{}, {}, {}],
      completions: [{}, {}],
      dayLocks: [{}],
      swears: [{}],
      milestones: [{}, {}, {}, {}],
      frozenDays: [{}, {}],
      preferences: { a: "1", b: "2", c: "3" },
    };
    expect(summarizeBackup(full)).toEqual({
      exercises: 3,
      completions: 2,
      dayLocks: 1,
      swears: 1,
      milestones: 4,
      frozenDays: 2,
      hasProfile: true,
      preferenceCount: 3,
    });
  });

  it("reports hasProfile=false when userProfile is an empty array", () => {
    const payload: BackupPayload = { ...VALID_MINIMAL, userProfile: [] };
    expect(summarizeBackup(payload).hasProfile).toBe(false);
  });

  it("reports hasProfile=false when userProfile is null", () => {
    const payload: BackupPayload = { ...VALID_MINIMAL, userProfile: null };
    expect(summarizeBackup(payload).hasProfile).toBe(false);
  });
});
