import { CelebrationBurst } from "@/components/celebration-burst";
import { AllDoneBanner, MinimumNotMetBanner } from "@/components/day-banners";
import { DayCompletePrompt } from "@/components/day-complete-prompt";
import { ErrorState } from "@/components/error-state";
import { GrandCelebration } from "@/components/grand-celebration";
import { HapticPressable } from "@/components/haptic-pressable";
import { MilestoneModal } from "@/components/milestone-modal";
import { ScrollScreen } from "@/components/screen";
import { StreakBadge } from "@/components/streak-badge";
import { SwearModal } from "@/components/swear-modal";
import { SwipeableExerciseCard } from "@/components/swipeable-exercise-card";
import Text from "@/components/text";
import {
  MutedIcon,
  PrimaryIcon,
  ThemedActivityIndicator,
} from "@/components/themed";
import { useAppBadge } from "@/hooks/use-app-badge";
import { cancelDailyReminderForToday } from "@/hooks/use-daily-reminder";
import { useDayState } from "@/hooks/use-day-state";
import { useMilestone } from "@/hooks/use-milestone";
import { useMinimumExercises } from "@/hooks/use-minimum-exercises";
import { useProfile } from "@/hooks/use-profile";
import { useTargetDays } from "@/hooks/use-target-days";
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
import { refreshDailyWidget } from "@/widgets/update-widget";
import {
  Redirect,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const SWEAR_TO_BURST_DELAY = 400;
const BURST_TO_GRAND_DELAY = 400;

export default function TodayScreen() {
  const profile = useProfile();
  const { minimumExercises, loading: minLoading } = useMinimumExercises();

  if (profile.loading || minLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedActivityIndicator size="large" />
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
  const { rt } = useUnistyles();

  const twoColumn = rt.breakpoint === "largeTablet";

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

  const { seal } = useLocalSearchParams<{ seal?: string }>();
  const sealTriggeredRef = useRef(false);

  useEffect(() => {
    if (sealTriggeredRef.current) return;
    if (seal !== "1") return;
    if (day.loading) return;

    sealTriggeredRef.current = true;

    const canSeal =
      !day.isLocked &&
      day.exercises.length >= minimumExercises &&
      day.exercises.length > 0 &&
      day.allExercisesCompleted;

    if (canSeal) {
      setPromptVisible(false);
      setSwearVisible(true);
    }
  }, [
    seal,
    day.loading,
    day.isLocked,
    day.exercises.length,
    day.allExercisesCompleted,
    minimumExercises,
  ]);

  const remainingToday = Math.max(0, day.progress.total - day.progress.done);
  const badgeCount = day.isLocked ? 0 : remainingToday;
  useAppBadge(badgeCount);

  const refreshDay = day.refresh;

  useFocusEffect(
    useCallback(() => {
      refreshDay();
      onProfileRefresh();
    }, [refreshDay, onProfileRefresh]),
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

  // Stable navigation callback. Passed directly to TodayBanners and
  // to the exercise list — no per-item closures.
  const handleAddExercise = useCallback(() => {
    router.push("/(main)/create-exercise");
  }, []);

  const requestLock = useCallback(() => {
    setPromptVisible(false);
    setSwearVisible(true);
  }, []);

  // Stable per-item callbacks. Combined with identity-preserving
  // Exercise objects from useDayState, existing cards receive
  // shallow-equal props on a refresh that only adds a new exercise,
  // and React Compiler skips re-rendering them.
  const handleCardPress = useCallback((exercise: Exercise) => {
    router.push({
      pathname: "/(main)/exercise/[id]",
      params: { id: exercise.id },
    });
  }, []);

  const handleDeleteExercise = useCallback(
    async (exercise: Exercise) => {
      try {
        await db.withTransactionAsync(async () => {
          await ExercisesRepo.delete(db, exercise.id);
        });
        await refreshDay();

        refreshDailyWidget(db).catch(() => {
          // Non-fatal.
        });
      } catch (err) {
        console.error("[today] delete exercise failed:", err);
      }
    },
    [db, refreshDay],
  );

  const fireStreakPulse = useCallback(() => {
    if (!pendingStreakPulseRef.current) return;
    pendingStreakPulseRef.current = false;
    setStreakPulseKey((k) => k + 1);
  }, []);

  const handleSworn = useCallback(
    async (data: { transcript: string; matchedPhrase: string }) => {
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

        cancelDailyReminderForToday().catch((err) => {
          console.warn("[today] cancel today's reminder failed:", err);
        });

        await trackUserActivity();

        const streakResult = await calculateStreak(db);
        const newStreak = streakResult.streak;
        await refreshDay();

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

        refreshDailyWidget(db).catch(() => {
          // Non-fatal — logged inside refreshDailyWidget.
        });

        setTimeout(() => {
          setBurstStreak(newStreak);
          setBurstVisible(true);
        }, SWEAR_TO_BURST_DELAY);
      } catch (err) {
        console.error("[today] lock+swear failed:", err);
        celebratingRef.current = false;
        pendingStreakPulseRef.current = false;
      }
    },
    [db, refreshDay, targetDays],
  );

  const handleAddMore = useCallback(() => setPromptVisible(false), []);

  const handleDismissBurst = useCallback(() => {
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
  }, [fireStreakPulse]);

  const handleDismissGrand = useCallback(async () => {
    try {
      await markTargetCelebrated(db, grandTarget);
    } catch (err) {
      console.warn("[today] mark target celebrated failed:", err);
    } finally {
      setGrandVisible(false);
      celebratingRef.current = false;
      fireStreakPulse();
    }
  }, [db, grandTarget, fireStreakPulse]);

  const handleMilestoneComplete = useCallback(
    async (data: { currentWeightKg: number | null; userNotes: string }) => {
      await milestone.complete(data);
      milestone.dismiss();
      await refreshDay();
    },
    [milestone, refreshDay],
  );

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (day.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedActivityIndicator size="large" />
      </View>
    );
  }

  if (day.error) {
    return (
      <ScrollScreen>
        <ErrorState
          title="Couldn't load today"
          message={day.error}
          onRetry={refreshDay}
        />
      </ScrollScreen>
    );
  }

  const showMinimumBanner =
    !day.isLocked && day.exercises.length > 0 && !day.meetsMinimum;
  const showAllDoneBanner = !day.isLocked && day.allDone && !day.sworeToday;

  const banners = (
    <TodayBanners
      showMinimum={showMinimumBanner}
      showAllDone={showAllDoneBanner}
      exerciseCount={day.exercises.length}
      minimumExercises={minimumExercises}
      onAdd={handleAddExercise}
      onLock={requestLock}
    />
  );

  const listContent =
    day.exercises.length === 0 ? (
      <EmptyState minimumExercises={minimumExercises} />
    ) : day.isLocked ? (
      <LockedState streak={day.streak} swore={day.sworeToday} />
    ) : (
      <TodayExerciseList
        exercises={day.exercises}
        completedIds={day.completedIds}
        onPress={handleCardPress}
        onDelete={handleDeleteExercise}
      />
    );

  const addButtonContent = !day.isLocked ? (
    <HapticPressable
      testID="today-add-exercise"
      haptic="medium"
      onPress={handleAddExercise}
      style={styles.addButton}
    >
      <PrimaryIcon name="add" size={20} />
      <Text variant="subheadBold" color="primary">
        Add Exercise
      </Text>
    </HapticPressable>
  ) : null;

  return (
    <>
      <ScrollScreen wide={twoColumn}>
        {twoColumn ? (
          <View style={styles.columns}>
            <View style={styles.primaryColumn}>
              {banners}
              {listContent}
              {addButtonContent}
            </View>

            <View style={styles.sidebarColumn}>
              <View style={styles.sidebarCard}>
                <Text variant="caption" color="mutedText">
                  Today
                </Text>
                <Text variant="h2" color="onBackground">
                  {dateLabel}
                </Text>
                <Text variant="subhead" color="mutedText">
                  {`Hi ${profile.displayName}`}
                </Text>

                <View style={styles.sidebarDivider} />

                <View style={styles.sidebarBadgeWrap}>
                  <StreakBadge
                    streak={day.streak}
                    freezeBalance={day.freezeBalance}
                    pulseKey={streakPulseKey}
                  />
                </View>

                <View style={styles.sidebarDivider} />

                <View style={styles.sidebarProgressBlock}>
                  <Text variant="caption" color="mutedText">
                    Progress
                  </Text>
                  <Text variant="title" color="onSurface">
                    {day.progress.done} of {day.progress.total}
                  </Text>
                  <Text variant="caption" color="mutedText">
                    {day.progress.total === 0
                      ? "No exercises yet"
                      : day.progress.done === day.progress.total
                        ? "All done — seal the day when ready"
                        : `${day.progress.total - day.progress.done} remaining`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text variant="h2" color="onBackground">
                  {dateLabel}
                </Text>
                <Text
                  testID="today-greeting"
                  variant="subhead"
                  color="mutedText"
                >
                  {`Hi ${profile.displayName} — `}
                  {day.progress.total === 0
                    ? "No exercises yet"
                    : `${day.progress.done} of ${day.progress.total} done today`}
                </Text>
              </View>

              <StreakBadge
                streak={day.streak}
                freezeBalance={day.freezeBalance}
                pulseKey={streakPulseKey}
              />
            </View>

            {banners}
            {listContent}
            {addButtonContent}
          </>
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
        onComplete={handleMilestoneComplete}
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

/**
 * The banners subtree. Isolated so unrelated state changes in
 * TodayContent (modal visibility, celebration state, streak pulse)
 * don't re-render it. All callbacks from the parent are stable.
 */
function TodayBanners({
  showMinimum,
  showAllDone,
  exerciseCount,
  minimumExercises,
  onAdd,
  onLock,
}: {
  showMinimum: boolean;
  showAllDone: boolean;
  exerciseCount: number;
  minimumExercises: number;
  onAdd: () => void;
  onLock: () => void;
}) {
  return (
    <>
      {showMinimum && (
        <MinimumNotMetBanner
          count={exerciseCount}
          minimum={minimumExercises}
          onAdd={onAdd}
        />
      )}
      {showAllDone && <AllDoneBanner onLock={onLock} />}
    </>
  );
}

/**
 * The exercise list subtree. Isolated from the rest of TodayContent
 * so that a change to `promptVisible`, celebration state, or streak
 * pulse doesn't cause the list to re-render.
 *
 * When a new exercise is added, this re-renders (the array changed),
 * but existing cards receive identity-preserved Exercise objects
 * plus stable callbacks, so React Compiler skips them and only the
 * new card actually renders.
 */
function TodayExerciseList({
  exercises,
  completedIds,
  onPress,
  onDelete,
}: {
  exercises: Exercise[];
  completedIds: Set<string>;
  onPress: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}) {
  return (
    <View style={styles.list}>
      {exercises.map((exercise, index) => (
        <SwipeableExerciseCard
          key={exercise.id}
          exercise={exercise}
          isDone={completedIds.has(exercise.id)}
          index={index}
          onPress={onPress}
          onDelete={onDelete}
        />
      ))}
    </View>
  );
}

function EmptyState({ minimumExercises }: { minimumExercises: number }) {
  const noun = minimumExercises === 1 ? "exercise" : "exercises";
  return (
    <View style={styles.stateContainer}>
      <MutedIcon name="barbell-outline" size={56} />
      <Text variant="h2" color="onBackground">
        No exercises today
      </Text>
      <Text variant="subhead" color="mutedText" style={styles.stateText}>
        Set up at least {minimumExercises} {noun} to begin your daily routine.
        You'll seal each day with a voice oath once they're done.
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

  columns: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.lg,
    width: "100%",
  },
  primaryColumn: {
    flex: 2,
    minWidth: 0,
    gap: theme.spacing.lg,
  },
  sidebarColumn: {
    flex: 1,
    minWidth: 260,
    maxWidth: 380,
  },
  sidebarCard: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  sidebarDivider: {
    height: theme.borderWidth.hairline,
    backgroundColor: theme.colors.panelBorder,
    marginVertical: theme.spacing.sm,
  },
  sidebarBadgeWrap: {
    flexDirection: "row",
  },
  sidebarProgressBlock: {
    gap: 2,
  },
}));
