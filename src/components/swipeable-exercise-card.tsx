import { ExerciseCard } from "@/components/exercise-card";
import Text from "@/components/text";
import type { Exercise } from "@/types/dailyforge";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import { Alert, Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

const ACTION_WIDTH = 92;
const STAGGER_STEP = 45;
const STAGGER_CAP = 12;
const ENTRY_DURATION = 400;

export const SwipeableExerciseCard = React.memo(function SwipeableExerciseCard({
  exercise,
  isDone,
  index,
  onPress,
  onDelete,
}: {
  exercise: Exercise;
  isDone: boolean;
  index: number;
  onPress: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const animateClose = useCallback(() => {
    translateX.set(withSpring(0, { damping: 20, stiffness: 220 }));
  }, [translateX]);

  const confirmAndDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      `Delete "${exercise.name}"?`,
      "This also removes its completion history. This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: animateClose,
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(exercise),
        },
      ],
      {
        cancelable: true,
        onDismiss: animateClose,
      },
    );
  }, [exercise, onDelete, animateClose]);

  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startX.set(translateX.get());
    })
    .onUpdate((event) => {
      const next = startX.get() + event.translationX;
      const clamped = Math.min(0, Math.max(-ACTION_WIDTH, next));

      translateX.set(clamped);
    })
    .onEnd((event) => {
      const shouldOpen =
        translateX.get() < -ACTION_WIDTH / 2 || event.velocityX < -500;

      translateX.set(
        withSpring(shouldOpen ? -ACTION_WIDTH : 0, {
          damping: 20,
          stiffness: 220,
        }),
      );
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  const actionStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.abs(translateX.get()) / ACTION_WIDTH);

    return {
      opacity: progress,
      transform: [{ translateX: (1 - progress) * 20 }],
    };
  });

  const handleCardPress = useCallback(() => {
    onPress(exercise);
  }, [onPress, exercise]);

  const handleDeletePress = useCallback(() => {
    confirmAndDelete();
  }, [confirmAndDelete]);

  const staggerDelay = Math.min(index, STAGGER_CAP) * STAGGER_STEP;

  return (
    <Animated.View
      entering={FadeInUp.delay(staggerDelay).duration(ENTRY_DURATION)}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.actionLayer, actionStyle]}>
          <Pressable
            testID={`exercise-delete-${index}`}
            onPress={handleDeletePress}
            style={styles.deleteButton}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${exercise.name}`}
          >
            <Ionicons name="trash" size={22} color="#FFFFFF" />

            <Text variant="micro" color="onPrimary">
              DELETE
            </Text>
          </Pressable>
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardLayer, cardStyle]}>
            <ExerciseCard
              testID={`exercise-card-${index}`}
              exercise={exercise}
              isDone={isDone}
              onPress={handleCardPress}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create((theme) => ({
  container: {
    position: "relative",
    borderRadius: theme.radii.md,
    overflow: "hidden",
  },
  actionLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  deleteButton: {
    width: ACTION_WIDTH,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: theme.colors.primary,
  },
  cardLayer: {
    backgroundColor: "transparent",
  },
}));
