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

/** Width of the revealed delete action, in points. */
const ACTION_WIDTH = 92;
/** Stagger gap between cards, in ms. */
const STAGGER_STEP = 45;
/** Cap so a long list doesn't leave the last card waiting too long. */
const STAGGER_CAP = 12;
/** Duration of each card's entry, in ms. */
const ENTRY_DURATION = 400;

export function SwipeableExerciseCard({
  exercise,
  isDone,
  index,
  onPress,
  onDelete,
}: {
  exercise: Exercise;
  isDone: boolean;
  index: number;
  onPress: () => void;
  onDelete: () => void;
}) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const animateClose = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 220 });
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
          onPress: () => {
            onDelete();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: animateClose,
      },
    );
  }, [exercise.name, onDelete, animateClose]);

  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      translateX.value = Math.min(0, Math.max(-ACTION_WIDTH, next));
    })
    .onEnd((e) => {
      const shouldOpen =
        translateX.value < -ACTION_WIDTH / 2 || e.velocityX < -500;
      translateX.value = withSpring(shouldOpen ? -ACTION_WIDTH : 0, {
        damping: 20,
        stiffness: 220,
      });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.abs(translateX.value) / ACTION_WIDTH);
    return {
      opacity: progress,
      transform: [{ translateX: (1 - progress) * 20 }],
    };
  });

  const handleDeletePress = useCallback(() => {
    confirmAndDelete();
  }, [confirmAndDelete]);

  // Stagger delay based on index, capped so long lists don't drag.
  const staggerDelay = Math.min(index, STAGGER_CAP) * STAGGER_STEP;

  return (
    <Animated.View
      entering={FadeInUp.delay(staggerDelay).duration(ENTRY_DURATION)}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.actionLayer, actionStyle]}>
          <Pressable
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
              exercise={exercise}
              isDone={isDone}
              onPress={onPress}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

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
