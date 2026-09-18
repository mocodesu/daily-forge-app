import { CompletionsRepo } from "@/repositories/completions-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { dayKey, randomUUID } from "@/utils/day-key";
import type { SQLiteDatabase } from "expo-sqlite";

/**
 * End-to-end check of the data layer. Inserts a row, reads it back,
 * inserts a completion, reads that back, then cleans up after itself.
 *
 * Logs to the Metro bundler terminal — watch that window, not the
 * device console.
 */
export async function runDataLayerSmokeTest(db: SQLiteDatabase) {
  const stamp = new Date().toLocaleTimeString();
  console.log(`\n[smoke ${stamp}] ── starting ─────────────────`);

  const testId = randomUUID();
  const testName = `Smoke Test Exercise ${stamp}`;

  try {
    // ── 1. Count before ────────────────────────────────────
    const countBefore = await ExercisesRepo.count(db);
    console.log(`[smoke] exercises before: ${countBefore}`);

    // ── 2. Insert ──────────────────────────────────────────
    await ExercisesRepo.insert(db, {
      id: testId,
      name: testName,
      bodyParts: ["Chest", "Arms"],
      exerciseType: "reps",
      reps: 10,
      sets: 3,
      durationSeconds: 0,
      sessionDurationSeconds: 60,
      isDaily: true,
      notes: "inserted by smoke test",
      createdAt: Date.now(),
      sortIndex: 9999,
    });
    console.log(`[smoke] ✓ inserted exercise: ${testName}`);

    // ── 3. Read back by id ─────────────────────────────────
    const fetched = await ExercisesRepo.getById(db, testId);
    if (!fetched)
      throw new Error("Could not fetch the exercise we just inserted");
    if (fetched.name !== testName)
      throw new Error(`Name mismatch: ${fetched.name}`);
    if (fetched.bodyParts.length !== 2)
      throw new Error(`Body parts mismatch: ${fetched.bodyParts.length}`);
    if (!fetched.isDaily) throw new Error("isDaily should be true");
    console.log(
      `[smoke] ✓ read back: ${fetched.name} · ${fetched.bodyParts.join(", ")} · daily=${fetched.isDaily}`,
    );

    // ── 4. Count after insert ──────────────────────────────
    const countAfter = await ExercisesRepo.count(db);
    if (countAfter !== countBefore + 1) {
      throw new Error(
        `Count should have incremented by 1 (was ${countBefore}, now ${countAfter})`,
      );
    }
    console.log(`[smoke] ✓ exercises after: ${countAfter}`);

    // ── 5. Insert a completion ─────────────────────────────
    const today = dayKey();
    const startedAt = Date.now() - 60_000;
    const completedAt = Date.now();
    await CompletionsRepo.insert(db, {
      id: randomUUID(),
      exerciseId: testId,
      dayKey: today,
      startedAt,
      completedAt,
    });
    console.log(`[smoke] ✓ inserted completion for ${today}`);

    // ── 6. Read completions back ───────────────────────────
    const records = await CompletionsRepo.getForDay(db, today);
    const ours = records.find((r) => r.exerciseId === testId);
    if (!ours) throw new Error("Could not find our completion record");
    if (ours.startedAt !== startedAt)
      throw new Error("startedAt did not round-trip");
    console.log(
      `[smoke] ✓ completion for today: started=${ours.startedAt}, done=${ours.completedAt}`,
    );

    // ── 7. Verify the single-record lookup ─────────────────
    const single = await CompletionsRepo.getForExerciseOnDay(db, testId, today);
    if (!single) throw new Error("getForExerciseOnDay returned null");
    console.log(`[smoke] ✓ single-record lookup works`);

    console.log(`[smoke] ✅ ALL CHECKS PASSED`);
  } catch (err) {
    console.error(`[smoke] ❌ FAILED:`, err);
  } finally {
    // ── 8. Cleanup — always runs, even on failure ──────────
    try {
      await CompletionsRepo.deleteForExercise(db, testId);
      await ExercisesRepo.delete(db, testId);
      console.log(`[smoke] 🧹 cleaned up`);
    } catch (cleanupErr) {
      console.warn(`[smoke] cleanup failed:`, cleanupErr);
    }
    console.log(`[smoke] ── done ────────────────────────────────\n`);
  }
}
