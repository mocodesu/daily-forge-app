import { initializeDatabase } from "@/db/client";
import { useMilestone } from "@/hooks/use-milestone";
import { MilestonesRepo } from "@/repositories/milestones-repo";
import { UserProfileRepo } from "@/repositories/user-profile-repo";
import { createTestDb } from "@/testing/db";
import { setCurrentTestDb } from "@/testing/db-state";
import type { UserProfile } from "@/types/dailyforge";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { SQLiteDatabase } from "expo-sqlite";

// ─────────────────────────────────────────────────────────────
// MILESTONE_INTERVAL is `__DEV__ ? 2 : 30`. Jest runs with
// `__DEV__ = true`, so every test below assumes interval = 2.
// ─────────────────────────────────────────────────────────────
const INTERVAL = 2;

const profile: UserProfile = {
  id: UserProfileRepo.defaultId,
  displayName: "Ada",
  startDate: 1_700_000_000_000,
  initialWeightKg: 70,
  goalWeightKg: 65,
  initialHeightCm: 170,
  initialFrontPhotoUri: null,
  initialSidePhotoUri: null,
};

describe("useMilestone", () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDb();
    await initializeDatabase(db);
    setCurrentTestDb(db);
  });

  afterEach(() => {
    setCurrentTestDb(null);
  });

  it("returns null pending and null profile on an empty DB", async () => {
    const { result } = await renderHook(() => useMilestone(0, true));
    expect(result.current.pending).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("loads an existing profile", async () => {
    await UserProfileRepo.insert(db, profile);

    const { result } = await renderHook(() => useMilestone(0, true));
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    expect(result.current.profile).toEqual(profile);
  });

  it("does not create a milestone when streak is below the interval", async () => {
    const { result } = await renderHook(() => useMilestone(INTERVAL - 1, true));
    expect(result.current.pending).toBeNull();

    const all = await MilestonesRepo.getAll(db);
    expect(all).toHaveLength(0);
  });

  it("creates a milestone when streak reaches the interval", async () => {
    const { result } = await renderHook(() => useMilestone(INTERVAL, true));

    await waitFor(() => expect(result.current.pending).not.toBeNull());
    expect(result.current.pending!.day).toBe(INTERVAL);

    const all = await MilestonesRepo.getAll(db);
    expect(all).toHaveLength(1);
    expect(all[0].day).toBe(INTERVAL);
    expect(all[0].completedAt).toBeNull();
  });

  it("only creates one milestone per mount even if several are due", async () => {
    const { result } = await renderHook(() => useMilestone(INTERVAL * 3, true));

    await waitFor(() => expect(result.current.pending).not.toBeNull());
    expect(result.current.pending!.day).toBe(INTERVAL);

    const all = await MilestonesRepo.getAll(db);
    expect(all).toHaveLength(1);
  });

  it("skips days that are already unlocked", async () => {
    await MilestonesRepo.insert(db, {
      id: "pre-2",
      day: INTERVAL,
      unlockedAt: Date.now(),
      completedAt: null,
      currentWeightKg: null,
      userNotes: "",
      aiSummary: null,
    });

    const { result } = await renderHook(() => useMilestone(INTERVAL * 2, true));

    await waitFor(() => expect(result.current.pending).not.toBeNull());
    expect(result.current.pending!.day).toBe(INTERVAL * 2);

    const all = await MilestonesRepo.getAll(db);
    expect(all).toHaveLength(2);
  });

  it("returns an existing pending milestone without inserting a new one", async () => {
    await MilestonesRepo.insert(db, {
      id: "pending-2",
      day: INTERVAL,
      unlockedAt: Date.now(),
      completedAt: null,
      currentWeightKg: null,
      userNotes: "",
      aiSummary: null,
    });

    const { result } = await renderHook(() => useMilestone(1, true));

    await waitFor(() => expect(result.current.pending).not.toBeNull());
    expect(result.current.pending!.id).toBe("pending-2");
    expect(result.current.pending!.day).toBe(INTERVAL);

    const all = await MilestonesRepo.getAll(db);
    expect(all).toHaveLength(1);
  });

  it("complete() marks the milestone completed and clears pending", async () => {
    const { result } = await renderHook(() => useMilestone(INTERVAL, true));
    await waitFor(() => expect(result.current.pending).not.toBeNull());

    await act(async () => {
      await result.current.complete({
        currentWeightKg: 68,
        userNotes: "Strongest month yet",
      });
    });

    expect(result.current.pending).toBeNull();

    const stored = await MilestonesRepo.getByDay(db, INTERVAL);
    expect(stored).not.toBeNull();
    expect(stored!.completedAt).not.toBeNull();
    expect(stored!.currentWeightKg).toBe(68);
    expect(stored!.userNotes).toBe("Strongest month yet");
  });

  it("dismiss() clears pending without touching the DB", async () => {
    const { result } = await renderHook(() => useMilestone(INTERVAL, true));
    await waitFor(() => expect(result.current.pending).not.toBeNull());

    // Async act even for the sync dismiss — React 19 always returns
    // a thenable from act, and the awaiting flushes the state update
    // deterministically.
    await act(async () => {
      result.current.dismiss();
    });

    expect(result.current.pending).toBeNull();

    // Row still exists, still pending.
    const stored = await MilestonesRepo.getByDay(db, INTERVAL);
    expect(stored).not.toBeNull();
    expect(stored!.completedAt).toBeNull();
  });

  it("does nothing when disabled", async () => {
    const profileSpy = jest.spyOn(UserProfileRepo, "get");
    const daysSpy = jest.spyOn(MilestonesRepo, "getAllDays");

    const { result } = await renderHook(() => useMilestone(INTERVAL, false));

    expect(result.current.pending).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(profileSpy).not.toHaveBeenCalled();
    expect(daysSpy).not.toHaveBeenCalled();

    profileSpy.mockRestore();
    daysSpy.mockRestore();
  });

  it("a completed earlier milestone does not block a later one", async () => {
    await MilestonesRepo.insert(db, {
      id: "done-2",
      day: INTERVAL,
      unlockedAt: Date.now(),
      completedAt: Date.now(),
      currentWeightKg: 72,
      userNotes: "first",
      aiSummary: null,
    });

    const { result } = await renderHook(() => useMilestone(INTERVAL * 2, true));

    await waitFor(() => expect(result.current.pending).not.toBeNull());
    expect(result.current.pending!.day).toBe(INTERVAL * 2);
  });

  it("swallows errors from UserProfileRepo.get without crashing", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const spy = jest
      .spyOn(UserProfileRepo, "get")
      .mockRejectedValueOnce(new Error("profile read failed"));

    const { result } = await renderHook(() => useMilestone(0, true));

    expect(result.current.pending).toBeNull();
    expect(result.current.profile).toBeNull();

    spy.mockRestore();
    warnSpy.mockRestore();
  });

  it("swallows errors from MilestonesRepo.complete without clearing pending", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = await renderHook(() => useMilestone(INTERVAL, true));
    await waitFor(() => expect(result.current.pending).not.toBeNull());

    const spy = jest
      .spyOn(MilestonesRepo, "complete")
      .mockRejectedValueOnce(new Error("write failed"));

    await act(async () => {
      await result.current.complete({
        currentWeightKg: 68,
        userNotes: "",
      });
    });

    // pending is not cleared because the write failed
    expect(result.current.pending).not.toBeNull();

    spy.mockRestore();
    warnSpy.mockRestore();
  });
  it("complete() is a no-op when there is no pending milestone", async () => {
    // Streak 0 → interval 2 → no milestone created. pending stays null.
    const { result } = await renderHook(() => useMilestone(0, true));
    expect(result.current.pending).toBeNull();

    // Calling complete() with no pending is a contract no-op: no
    // write, no throw, no state change. Covers the `if (!pending)
    // return;` true-branch in the hook.
    await act(async () => {
      await result.current.complete({
        currentWeightKg: 68,
        userNotes: "should not persist",
      });
    });

    expect(result.current.pending).toBeNull();

    const all = await MilestonesRepo.getAll(db);
    expect(all).toHaveLength(0);
  });
});
