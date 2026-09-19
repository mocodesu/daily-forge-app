import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import { playSound } from "@/utils/sounds";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Modal,
  Platform,
  StyleSheet as RNStyleSheet,
  View,
} from "react-native";
import { CannonConfetti } from "react-native-fast-confetti";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export function GrandCelebration({
  visible,
  streak,
  target,
  onDismiss,
}: {
  visible: boolean;
  streak: number;
  target: number;
  onDismiss: () => void;
}) {
  const trophyScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const dismissCalledRef = useRef(false);

  const handleDismiss = useCallback(() => {
    if (dismissCalledRef.current) return;
    dismissCalledRef.current = true;
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) return;

    playSound("targetReached");

    dismissCalledRef.current = false;
    trophyScale.value = 0;
    textOpacity.value = 0;
    buttonOpacity.value = 0;

    trophyScale.value = withSpring(1, { damping: 12, stiffness: 140 });
    textOpacity.value = withDelay(500, withTiming(1, { duration: 350 }));
    buttonOpacity.value = withDelay(1300, withTiming(1, { duration: 400 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const trophyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }));
  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  if (!visible) return null;

  const theme = UnistylesRuntime.getTheme();
  const showConfetti = Platform.OS !== "web";

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {showConfetti && (
          <View style={RNStyleSheet.absoluteFill} pointerEvents="none">
            <CannonConfetti
              autoplay
              fadeOutOnEnd
              gravity={0.3}
              colors={[
                theme.colors.primary,
                "#FF6B35",
                "#FBBF24",
                "#4ADE80",
                "#F472B6",
                "#60A5FA",
              ]}
              containerStyle={RNStyleSheet.absoluteFill}
            >
              <CannonConfetti.Origin
                position="bottom-left"
                count={250}
                initialSpeed={4.5}
                spread={Math.PI / 3.5}
              >
                <CannonConfetti.Flake width={10} height={19} radius={3} />
              </CannonConfetti.Origin>

              <CannonConfetti.Origin
                position="bottom-right"
                count={250}
                initialSpeed={4.5}
                spread={Math.PI / 3.5}
              >
                <CannonConfetti.Flake width={10} height={19} radius={3} />
              </CannonConfetti.Origin>
            </CannonConfetti>
          </View>
        )}

        <View style={styles.content}>
          <Animated.View style={[styles.trophyCircle, trophyAnimatedStyle]}>
            <PrimaryIcon name="trophy" size={72} />
          </Animated.View>

          <Animated.View style={[styles.textBlock, textAnimatedStyle]}>
            <Text variant="display" color="onBackground" style={styles.title}>
              Target reached
            </Text>
            <Text variant="h2" color="primary" style={styles.streakText}>
              {streak} day{streak === 1 ? "" : "s"} in a row
            </Text>
            <Text variant="callout" color="mutedText" style={styles.body}>
              You set a {target}-day goal and you kept your promise. Every
              single day.
            </Text>
            <Text variant="subhead" color="mutedText" style={styles.body}>
              This is the kind of consistency that changes how you see yourself.
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
          <HapticPressable
            haptic="medium"
            onPress={handleDismiss}
            style={styles.button}
          >
            <Text variant="subheadBold" color="onPrimary">
              Keep going
            </Text>
          </HapticPressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: rt.insets.top + theme.spacing.xxl,
    paddingBottom: rt.insets.bottom + theme.spacing.xxl,
    paddingHorizontal: theme.layout.screenPaddingH,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xl,
    width: "100%",
    maxWidth: 480,
  },
  trophyCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.panel,
    borderWidth: 4,
    borderColor: theme.colors.primary,
  },
  textBlock: { alignItems: "center", gap: theme.spacing.sm },
  title: { textAlign: "center" },
  streakText: { textAlign: "center", marginTop: theme.spacing.xs },
  body: { textAlign: "center", maxWidth: 380, lineHeight: 22 },
  footer: { width: "100%", maxWidth: 320, alignItems: "center" },
  button: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    minHeight: 52,
  },
}));
