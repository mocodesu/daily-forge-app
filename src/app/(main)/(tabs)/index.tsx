import { CelebrationBurst } from "@/components/celebration-burst";
import { AllDoneBanner, MinimumNotMetBanner } from "@/components/day-banners";
import { DayCompletePrompt } from "@/components/day-complete-prompt";
import { GrandCelebration } from "@/components/grand-celebration";
import { HapticPressable } from "@/components/haptic-pressable";
import { MilestoneModal } from "@/components/milestone-modal";
import { ScrollScreen } from "@/components/screen";
import { SwearModal } from "@/components/swear-modal";
import Text from "@/components/text";
import { MutedIcon, PrimaryIcon } from "@/components/themed";
import { MIN_EXERCISES_PER_DAY } from "@/constants/dailyforge";
import { useDayState } from "@/hooks/use-day-state";
import { useMilestone } from "@/hooks/use-milestone";
import { useProfile } from "@/hooks/use-profile";
import { useTargetDays } from "@/hooks/use-target-days";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { SwearsRepo } from "@/repositories/swears-repo";
import type { Exercise, UserProfile } from "@/types/dailyforge";
import {
  hasCelebratedTarget,
  markTargetCelebrated,
} from "@/utils/celebrations";
import { dayKey, randomUUID } from "@/utils/day-key";
import { trackUserActivity } from "@/utils/retention-reminder";
import { calculateStreak } from "@/utils/streak";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

/** Gap between swear modal dismissal and the burst appearing. */
const SWEAR_TO_BURST_DELAY = 400;
/** Gap between burst dismissal and the grand appearing. */
const BURST_TO_GRAND_DELAY = 400;

export default function TodayScreen() {
  const profile = useProfile();

  if (profile.loading) {
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
    <TodayContent profile={profile.data} onProfileRefresh={profile.refresh} />
  );
}

function TodayContent({
  profile,
  onProfileRefresh,
}: {
  profile: UserProfile;
  onProfileRefresh: () => Promise<void>;
}) {
  const db = useSQLiteContext();
  const day = useDayState(true);
  const milestone = useMilestone(day.streak, !day.loading);
  const { targetDays } = useTargetDays();

  const [promptVisible, setPromptVisible] = useState(false);
  const [swearVisible, setSwearVisible] = useState(false);

  const [burstVisible, setBurstVisible] = useState(false);
  const [burstStreak, setBurstStreak] = useState(0);

  const [grandVisible, setGrandVisible] = useState(false);
  const [grandStreak, setGrandStreak] = useState(0);
  const [grandTarget, setGrandTarget] = useState(0);

  const prevAllDoneRef = useRef(false);

  /**
   * Holds the grand celebration's payload until the burst is dismissed.
   * If null when the burst dismisses, no grand fires this cycle.
   */
  const pendingGrandRef = useRef<{ streak: number; target: number } | null>(
    null,
  );

  /**
   * Mutex held across the entire celebration sequence (burst + grand).
   * Nothing else can start a celebration while this is true.
   */
  const celebratingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      day.refresh();
      onProfileRefresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day.refresh, onProfileRefresh]),
  );

  // Fire the day-complete prompt when all exercises just transitioned
  // to complete. Never fires when a celebration is running.
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

  // ── Swear flow: the entry point for the entire celebration chain ──
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

      // Decide whether a grand celebration is due AFTER the burst.
      const reachedTarget = newStreak >= targetDays;
      const grandDue = reachedTarget
        ? !(await hasCelebratedTarget(db, targetDays))
        : false;

      if (grandDue) {
        pendingGrandRef.current = { streak: newStreak, target: targetDays };
      } else {
        pendingGrandRef.current = null;
      }

      // Lock the mutex for the entire sequence — burst then optionally grand.
      celebratingRef.current = true;

      setTimeout(() => {
        setBurstStreak(newStreak);
        setBurstVisible(true);
      }, SWEAR_TO_BURST_DELAY);
    } catch (err) {
      console.error("[today] lock+swear failed:", err);
      celebratingRef.current = false;
    }
  };

  const handleAddMore = () => setPromptVisible(false);

  // ── Burst dismissed: hand off to the grand if one is pending ──
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
      // Sequence is finished — release the mutex.
      celebratingRef.current = false;
    }
  };

  // ── Grand dismissed: record it, end the sequence ──
  const handleDismissGrand = async () => {
    try {
      await markTargetCelebrated(db, grandTarget);
    } catch (err) {
      console.warn("[today] mark target celebrated failed:", err);
    } finally {
      setGrandVisible(false);
      celebratingRef.current = false;
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

  const showMinimumBanner =
    !day.isLocked && day.exercises.length > 0 && !day.meetsMinimum;
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

          <View style={styles.streakBadge}>
            {day.streak > 0 ? (
              <PrimaryIcon name="flame" size={20} />
            ) : (
              <MutedIcon name="flame" size={20} />
            )}
            <Text
              variant="title"
              color={day.streak > 0 ? "onSurface" : "mutedText"}
            >
              {day.streak}
            </Text>
          </View>
        </View>

        {showMinimumBanner && (
          <MinimumNotMetBanner
            count={day.exercises.length}
            minimum={MIN_EXERCISES_PER_DAY}
            onAdd={() => router.push("/(main)/create-exercise")}
          />
        )}

        {showAllDoneBanner && <AllDoneBanner onLock={requestLock} />}

        {day.exercises.length === 0 ? (
          <EmptyState />
        ) : day.isLocked ? (
          <LockedState streak={day.streak} swore={day.sworeToday} />
        ) : (
          <View style={styles.list}>
            {day.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                isDone={day.completedIds.has(exercise.id)}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/exercise/[id]",
                    params: { id: exercise.id },
                  })
                }
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

function ExerciseCard({
  exercise,
  isDone,
  onPress,
}: {
  exercise: Exercise;
  isDone: boolean;
  onPress: () => void;
}) {
  const iconName =
    exercise.exerciseType === "timer" ? "timer-outline" : "barbell-outline";
  const summary =
    exercise.exerciseType === "timer"
      ? `${exercise.sets} × ${formatDuration(exercise.durationSeconds)}`
      : `${exercise.sets} × ${exercise.reps} reps`;

  return (
    <HapticPressable
      haptic="selection"
      onPress={onPress}
      style={[styles.card, isDone && styles.cardDone]}
    >
      <View
        style={[
          styles.cardIcon,
          isDone ? styles.cardIconDone : styles.cardIconIdle,
        ]}
      >
        {isDone ? (
          <Ionicons
            name="checkmark"
            size={20}
            color={UnistylesRuntime.getTheme().colors.onPrimary}
          />
        ) : (
          <PrimaryIcon name={iconName as any} size={20} />
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text variant="title" color={isDone ? "mutedText" : "onSurface"}>
            {exercise.name}
          </Text>
          {!exercise.isDaily && (
            <View style={styles.pill}>
              <Text variant="micro" color="onSurface">
                ONE-OFF
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardMeta}>
          <Text variant="caption" color="mutedText">
            {summary}
          </Text>
          {exercise.bodyParts.slice(0, 2).map((part) => (
            <View key={part} style={styles.tag}>
              <Text variant="micro" color="mutedText">
                {part}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <MutedIcon name="chevron-forward" size={18} />
    </HapticPressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.stateContainer}>
      <MutedIcon name="barbell-outline" size={56} />
      <Text variant="h2" color="onBackground">
        No exercises today
      </Text>
      <Text variant="subhead" color="mutedText" style={styles.stateText}>
        Set up at least 5 exercises to begin your daily routine.
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}:${s.toString().padStart(2, "0")}`;
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
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minHeight: 40,
  },
  list: { gap: theme.spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    minHeight: 68,
  },
  cardDone: { opacity: 0.6 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconDone: { backgroundColor: theme.colors.primary },
  cardIconIdle: { backgroundColor: theme.colors.panel },
  cardBody: { flex: 1, gap: theme.spacing.xxs, minWidth: 0 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.panel,
  },
  tag: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.panel,
  },
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
