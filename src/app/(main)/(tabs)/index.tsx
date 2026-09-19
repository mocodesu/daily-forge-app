import { CelebrationBurst } from "@/components/celebration-burst";
import { AllDoneBanner, MinimumNotMetBanner } from "@/components/day-banners";
import { DayCompletePrompt } from "@/components/day-complete-prompt";
import { GrandCelebration } from "@/components/grand-celebration";
import { HapticPressable } from "@/components/haptic-pressable";
import { MilestoneModal } from "@/components/milestone-modal";
import { ScrollScreen } from "@/components/screen";
import { StreakBadge } from "@/components/streak-badge";
import { SwearModal } from "@/components/swear-modal";
import { SwipeableExerciseCard } from "@/components/swipeable-exercise-card";
import Text from "@/components/text";
import { MutedIcon, PrimaryIcon } from "@/components/themed";
import { useDayState } from "@/hooks/use-day-state";
import { useMilestone } from "@/hooks/use-milestone";
import { useMinimumExercises } from "@/hooks/use-minimum-exercises";
import { useProfile } from "@/hooks/use-profile";
import { useTargetDays } from "@/hooks/use-target-days";
import { CompletionsRepo } from "@/repositories/completions-repo";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import { SwearsRepo } from "@/repositories/swears-repo";
import type { Exercise, UserProfile } from "@/types/dailyforge";
import {
  hasCelebratedTarget,
  markTargetCelebrated,
} from "@/utils/celebrations";
import { dayKey, randomUUID } from "@/utils/day-key";
import { trackUserActivity } from "@/utils/retention-reminder";
import { calculateStreak } from "@/utils/streak";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

const SWEAR_TO_BURST_DELAY = 400;
const BURST_TO_GRAND_DELAY = 400;

export default function TodayScreen() {
  const profile = useProfile();
  const { minimumExercises, loading: minLoading } = useMinimumExercises();

  if (profile.loading || minLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={UnistylesRuntime.getTheme().colors.primary}
        />
      </View>
    );
  }

  if (profile.data === null) {
    return <Redirect href="/(main)/onboarding" />;
  }

  return (
    <TodayContent
      profile={profile.data}
      minimumExercises={minimumExercises}
      onProfileRefresh={profile.refresh}
    />
  );
}

function TodayContent({
  profile,
  minimumExercises,
  onProfileRefresh,
}: {
  profile: UserProfile;
  minimumExercises: number;
  onProfileRefresh: () => Promise<void>;
}) {
  const db = useSQLiteContext();
  const day = useDayState(minimumExercises, true);
  const milestone = useMilestone(day.streak, !day.loading);
  const { targetDays } = useTargetDays();

  const [promptVisible, setPromptVisible] = useState(false);
  const [swearVisible, setSwearVisible] = useState(false);

  const [burstVisible, setBurstVisible] = useState(false);
  const [burstStreak, setBurstStreak] = useState(0);

  const [grandVisible, setGrandVisible] = useState(false);
  const [grandStreak, setGrandStreak] = useState(0);
  const [grandTarget, setGrandTarget] = useState(0);

  const [streakPulseKey, setStreakPulseKey] = useState(0);

  const prevAllDoneRef = useRef(false);
  const pendingGrandRef = useRef<{ streak: number; target: number } | null>(
    null,
  );
  const celebratingRef = useRef(false);
  const pendingStreakPulseRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      day.refresh();
      onProfileRefresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day.refresh, onProfileRefresh]),
  );

  useEffect(() => {
    const justCompleted =
      day.allDone &&
      !prevAllDoneRef.current &&
      !day.isLocked &&
      !day.sworeToday;
    if (justCompleted && !celebratingRef.current) setPromptVisible(true);
    prevAllDoneRef.current = day.allDone;
  }, [day.allDone, day.isLocked, day.sworeToday]);

  const requestLock = () => {
    setPromptVisible(false);
    setSwearVisible(true);
  };

  const handleDeleteExercise = useCallback(
    async (exercise: Exercise) => {
      try {
        await CompletionsRepo.deleteForExercise(db, exercise.id);
        await ExercisesRepo.delete(db, exercise.id);
        await day.refresh();
      } catch (err) {
        console.error("[today] delete exercise failed:", err);
      }
    },
    [db, day],
  );

  const fireStreakPulse = useCallback(() => {
    if (!pendingStreakPulseRef.current) return;
    pendingStreakPulseRef.current = false;
    setStreakPulseKey((k) => k + 1);
  }, []);

  const handleSworn = async (data: {
    transcript: string;
    matchedPhrase: string;
  }) => {
    setSwearVisible(false);
    try {
      const today = dayKey();
      const now = Date.now();

      await SwearsRepo.insert(db, {
        id: randomUUID(),
        dayKey: today,
        swornAt: now,
        transcript: data.transcript,
        matchedPhrase: data.matchedPhrase,
      });

      await DayLocksRepo.insert(db, {
        id: randomUUID(),
        dayKey: today,
        lockedAt: now,
      });

      await trackUserActivity();

      const newStreak = await calculateStreak(db);
      await day.refresh();

      const reachedTarget = newStreak >= targetDays;
      const grandDue = reachedTarget
        ? !(await hasCelebratedTarget(db, targetDays))
        : false;

      if (grandDue) {
        pendingGrandRef.current = { streak: newStreak, target: targetDays };
      } else {
        pendingGrandRef.current = null;
      }

      pendingStreakPulseRef.current = true;
      celebratingRef.current = true;

      setTimeout(() => {
        setBurstStreak(newStreak);
        setBurstVisible(true);
      }, SWEAR_TO_BURST_DELAY);
    } catch (err) {
      console.error("[today] lock+swear failed:", err);
      celebratingRef.current = false;
      pendingStreakPulseRef.current = false;
    }
  };

  const handleAddMore = () => setPromptVisible(false);

  const handleDismissBurst = () => {
    setBurstVisible(false);

    const pending = pendingGrandRef.current;
    if (pending) {
      pendingGrandRef.current = null;
      setTimeout(() => {
        setGrandStreak(pending.streak);
        setGrandTarget(pending.target);
        setGrandVisible(true);
      }, BURST_TO_GRAND_DELAY);
    } else {
      celebratingRef.current = false;
      fireStreakPulse();
    }
  };

  const handleDismissGrand = async () => {
    try {
      await markTargetCelebrated(db, grandTarget);
    } catch (err) {
      console.warn("[today] mark target celebrated failed:", err);
    } finally {
      setGrandVisible(false);
      celebratingRef.current = false;
      fireStreakPulse();
    }
  };

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (day.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={UnistylesRuntime.getTheme().colors.primary}
        />
      </View>
    );
  }

  // ── Banner visibility ─────────────────────────────────────
  // The minimum banner shows when there are exercises but not enough
  // configured yet.
  const showMinimumBanner =
    !day.isLocked && day.exercises.length > 0 && !day.meetsMinimum;

  // The green "all done" banner only appears when the minimum has been
  // met AND every exercise is complete. This is guaranteed by
  // `day.allDone` which now requires both conditions.
  const showAllDoneBanner = !day.isLocked && day.allDone && !day.sworeToday;

  return (
    <>
      <ScrollScreen>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="h2" color="onBackground">
              {dateLabel}
            </Text>
            <Text variant="subhead" color="mutedText">
              {`Hi ${profile.displayName} — `}
              {day.progress.total === 0
                ? "No exercises yet"
                : `${day.progress.done} of ${day.progress.total} done today`}
            </Text>
          </View>

          <StreakBadge streak={day.streak} pulseKey={streakPulseKey} />
        </View>

        {showMinimumBanner && (
          <MinimumNotMetBanner
            count={day.exercises.length}
            minimum={minimumExercises}
            onAdd={() => router.push("/(main)/create-exercise")}
          />
        )}

        {showAllDoneBanner && <AllDoneBanner onLock={requestLock} />}

        {day.exercises.length === 0 ? (
          <EmptyState minimumExercises={minimumExercises} />
        ) : day.isLocked ? (
          <LockedState streak={day.streak} swore={day.sworeToday} />
        ) : (
          <View style={styles.list}>
            {day.exercises.map((exercise, index) => (
              <SwipeableExerciseCard
                key={exercise.id}
                exercise={exercise}
                isDone={day.completedIds.has(exercise.id)}
                index={index}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/exercise/[id]",
                    params: { id: exercise.id },
                  })
                }
                onDelete={() => handleDeleteExercise(exercise)}
              />
            ))}
          </View>
        )}

        {!day.isLocked && (
          <HapticPressable
            haptic="medium"
            onPress={() => router.push("/(main)/create-exercise")}
            style={styles.addButton}
          >
            <PrimaryIcon name="add" size={20} />
            <Text variant="subheadBold" color="primary">
              Add Exercise
            </Text>
          </HapticPressable>
        )}
      </ScrollScreen>

      <DayCompletePrompt
        visible={promptVisible}
        exerciseCount={day.exercises.length}
        onAddMore={handleAddMore}
        onDone={requestLock}
      />

      <SwearModal
        visible={swearVisible}
        onCancel={() => setSwearVisible(false)}
        onSworn={handleSworn}
      />

      <MilestoneModal
        visible={milestone.pending !== null}
        milestone={milestone.pending}
        profile={milestone.profile}
        onCancel={milestone.dismiss}
        onComplete={async (data) => {
          await milestone.complete(data);
          milestone.dismiss();
          await day.refresh();
        }}
      />

      <CelebrationBurst
        visible={burstVisible}
        streak={burstStreak}
        onDismiss={handleDismissBurst}
      />

      <GrandCelebration
        visible={grandVisible}
        streak={grandStreak}
        target={grandTarget}
        onDismiss={handleDismissGrand}
      />
    </>
  );
}

function EmptyState({ minimumExercises }: { minimumExercises: number }) {
  return (
    <View style={styles.stateContainer}>
      <MutedIcon name="barbell-outline" size={56} />
      <Text variant="h2" color="onBackground">
        No exercises today
      </Text>
      <Text variant="subhead" color="mutedText" style={styles.stateText}>
        Set up at least {minimumExercises} exercise
        {minimumExercises === 1 ? "" : "s"} to begin your daily routine.
      </Text>
    </View>
  );
}

function LockedState({ streak, swore }: { streak: number; swore: boolean }) {
  return (
    <View style={styles.stateContainer}>
      <PrimaryIcon name="checkmark-circle" size={72} />
      <Text variant="h2" color="onBackground">
        Done for today
      </Text>
      <Text variant="subhead" color="mutedText" style={styles.stateText}>
        {swore
          ? "You swore by voice. The day is sealed."
          : "Come back tomorrow. Rest is part of the plan."}
      </Text>
      <Text variant="caption" color="mutedText" style={styles.stateText}>
        {streak} day streak
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  headerLeft: { flex: 1, gap: theme.spacing.xxs },
  list: { gap: theme.spacing.sm },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thick,
    borderStyle: "dashed",
    borderColor: theme.colors.primary,
    minHeight: 52,
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.huge,
    gap: theme.spacing.sm,
  },
  stateText: { textAlign: "center", maxWidth: 320 },
}));
