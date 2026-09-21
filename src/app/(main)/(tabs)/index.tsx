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
import { MutedIcon, PrimaryIcon } from "@/components/themed";
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
import { ActivityIndicator, View } from "react-native";
import {
  StyleSheet,
  UnistylesRuntime,
  useUnistyles,
} from "react-native-unistyles";

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

  // ── Deep link handling: ?seal=1 opens the swear modal ─────
  //
  // The medium widget's seal button links to
  // `scheme://?seal=1`. When that URL resolves, this effect
  // fires once, checks the day's state, and opens the modal if
  // everything is ready.
  //
  // The ref guards against re-firing on subsequent state changes
  // and re-firing if the user navigates back to Today with the
  // param still in the URL.
  const { seal } = useLocalSearchParams<{ seal?: string }>();
  const sealTriggeredRef = useRef(false);

  useEffect(() => {
    if (sealTriggeredRef.current) return;
    if (seal !== "1") return;
    if (day.loading) return;

    // Mark handled regardless of outcome so a subsequent day-state
    // change doesn't re-open the modal unexpectedly.
    sealTriggeredRef.current = true;

    // Conditions must match the widget's `canSeal` computation.
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
        await db.withTransactionAsync(async () => {
          await ExercisesRepo.delete(db, exercise.id);
        });
        await day.refresh();

        // The day's totals just changed. Refresh the widget.
        refreshDailyWidget(db).catch(() => {
          // Non-fatal.
        });
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

      cancelDailyReminderForToday().catch((err) => {
        console.warn("[today] cancel today's reminder failed:", err);
      });

      await trackUserActivity();

      const streakResult = await calculateStreak(db);
      const newStreak = streakResult.streak;
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

      // The day is sealed. Push a fresh render to the widget so it
      // shows "Sealed today" immediately instead of waiting up to
      // 30 minutes for Android's next scheduled update.
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

  if (day.error) {
    return (
      <ScrollScreen>
        <ErrorState
          title="Couldn't load today"
          message={day.error}
          onRetry={day.refresh}
        />
      </ScrollScreen>
    );
  }

  const showMinimumBanner =
    !day.isLocked && day.exercises.length > 0 && !day.meetsMinimum;
  const showAllDoneBanner = !day.isLocked && day.allDone && !day.sworeToday;

  const bannersContent = (
    <>
      {showMinimumBanner && (
        <MinimumNotMetBanner
          count={day.exercises.length}
          minimum={minimumExercises}
          onAdd={() => router.push("/(main)/create-exercise")}
        />
      )}
      {showAllDoneBanner && <AllDoneBanner onLock={requestLock} />}
    </>
  );

  const listContent =
    day.exercises.length === 0 ? (
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
    );

  const addButtonContent = !day.isLocked ? (
    <HapticPressable
      testID="today-add-exercise"
      haptic="medium"
      onPress={() => router.push("/(main)/create-exercise")}
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
              {bannersContent}
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

            {bannersContent}
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
