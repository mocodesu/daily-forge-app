import { AllDoneBanner, MinimumNotMetBanner } from "@/components/day-banners";
import { DayCompletePrompt } from "@/components/day-complete-prompt";
import { HapticPressable } from "@/components/haptic-pressable";
import { MilestoneModal } from "@/components/milestone-modal";
import { SwearModal } from "@/components/swear-modal";
import Text from "@/components/text";
import { MIN_EXERCISES_PER_DAY } from "@/constants/dailyforge";
import { useDayState } from "@/hooks/use-day-state";
import { useMilestone } from "@/hooks/use-milestone";
import { useProfile } from "@/hooks/use-profile";
import { DayLocksRepo } from "@/repositories/day-locks-repo";
import { SwearsRepo } from "@/repositories/swears-repo";
import type { Exercise, UserProfile } from "@/types/dailyforge";
import { dayKey, randomUUID } from "@/utils/day-key";
import { trackUserActivity } from "@/utils/retention-reminder";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

// ─────────────────────────────────────────────────────────────
// OUTER — decides whether we can run the inner screen
// ─────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { theme } = useUnistyles();
  const profile = useProfile();

  // Wait for the profile check to resolve before doing anything else.
  if (profile.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // No profile → straight to onboarding. Inner screen never mounts,
  // so no SQLite queries ever run against a released DB.
  if (profile.data === null) {
    return <Redirect href="/(main)/onboarding" />;
  }

  // Profile exists → render the real Today screen with all its hooks.
  return (
    <TodayContent profile={profile.data} onProfileRefresh={profile.refresh} />
  );
}

// ─────────────────────────────────────────────────────────────
// INNER — everything that queries the DB
// ─────────────────────────────────────────────────────────────

function TodayContent({
  profile,
  onProfileRefresh,
}: {
  profile: UserProfile;
  onProfileRefresh: () => Promise<void>;
}) {
  const { theme } = useUnistyles();
  const db = useSQLiteContext();
  const day = useDayState(true);
  const milestone = useMilestone(day.streak, !day.loading);

  const [promptVisible, setPromptVisible] = useState(false);
  const [swearVisible, setSwearVisible] = useState(false);
  const prevAllDoneRef = useRef(false);

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
    if (justCompleted) setPromptVisible(true);
    prevAllDoneRef.current = day.allDone;
  }, [day.allDone, day.isLocked, day.sworeToday]);

  const requestLock = () => {
    setPromptVisible(false);
    setSwearVisible(true);
  };

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
      await day.refresh();
    } catch (err) {
      console.error("[today] lock+swear failed:", err);
    }
  };

  const handleAddMore = () => setPromptVisible(false);

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (day.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const showMinimumBanner =
    !day.isLocked && day.exercises.length > 0 && !day.meetsMinimum;

  const showAllDoneBanner = !day.isLocked && day.allDone && !day.sworeToday;

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={day.loading}
            onRefresh={day.refresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="h1" color="onBackground">
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
            <Ionicons
              name="flame"
              size={18}
              color={
                day.streak > 0 ? theme.colors.primary : theme.colors.mutedText
              }
            />
            <Text
              variant="title"
              color={day.streak > 0 ? "onSurface" : "mutedText"}
            >
              {day.streak}
            </Text>
            <Text variant="caption" color="mutedText">
              day streak
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
            style={[styles.addButton, { borderColor: theme.colors.primary }]}
          >
            <Ionicons name="add" size={20} color={theme.colors.primary} />
            <Text variant="subheadBold" color="primary">
              Add Exercise
            </Text>
          </HapticPressable>
        )}
      </ScrollView>

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
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  isDone,
  onPress,
}: {
  exercise: Exercise;
  isDone: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
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
          {
            backgroundColor: isDone ? theme.colors.primary : theme.colors.panel,
          },
        ]}
      >
        <Ionicons
          name={isDone ? "checkmark" : (iconName as any)}
          size={20}
          color={isDone ? theme.colors.onPrimary : theme.colors.primary}
        />
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
      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.colors.mutedText}
      />
    </HapticPressable>
  );
}

function EmptyState() {
  const { theme } = useUnistyles();
  return (
    <View style={styles.stateContainer}>
      <Ionicons
        name="barbell-outline"
        size={56}
        color={theme.colors.mutedText}
      />
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
  const { theme } = useUnistyles();
  return (
    <View style={styles.stateContainer}>
      <Ionicons
        name="checkmark-circle"
        size={72}
        color={theme.colors.primary}
      />
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

const styles = StyleSheet.create((theme, rt) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingTop: rt.insets.top + theme.spacing.lg,
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingBottom: theme.spacing.giant,
    gap: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  headerLeft: { flex: 1, gap: theme.spacing.xxs },
  streakBadge: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
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
  },
  cardDone: { opacity: 0.6 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: theme.spacing.xxs },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
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
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.huge,
    gap: theme.spacing.sm,
  },
  stateText: { textAlign: "center", maxWidth: 320 },
}));
