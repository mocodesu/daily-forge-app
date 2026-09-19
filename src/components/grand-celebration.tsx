import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { getConfettiPalette } from "@/theme/confetti-palettes";
import { playSound } from "@/utils/sounds";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
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
import { StyleSheet, useUnistyles } from "react-native-unistyles";

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

  /** Incrementing this re-mounts the confetti, forcing a fresh burst. */
  const [confettiKey, setConfettiKey] = useState(0);

  // Reactive theme + active scheme. Both must be called
  // unconditionally, before the early return below.
  const { theme } = useUnistyles();
  const { schemeId } = useThemePreference();
  const palette = getConfettiPalette(schemeId);

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
    // SLOW PASS: button waits 2 s so the confetti curtain gets the
    // spotlight before the CTA competes for attention.
    buttonOpacity.value = withDelay(2000, withTiming(1, { duration: 400 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /** DEV ONLY: refire the confetti and replay the sound. */
  const handleDevRefire = useCallback(() => {
    setConfettiKey((k) => k + 1);
    playSound("targetReached");
  }, []);

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
              key={confettiKey}
              autoplay
              fadeOutOnEnd
              // ── Slow pass ─────────────────────────────
              // Lower gravity + speed + longer spray = drifting
              // curtain. Iterate here with the lab open.
              gravity={1}
              drag={4.5}
              sprayDuration={4000}
              colors={palette}
              containerStyle={RNStyleSheet.absoluteFill}
            >
              <CannonConfetti.Origin
                position="bottom-left"
                count={900}
                initialSpeed={4.5}
                spread={Math.PI / 3}
                speedVariation={{ min: 0.7, max: 1.5 }}
              >
                <CannonConfetti.Flake width={10} height={19} radius={3} />
              </CannonConfetti.Origin>

              <CannonConfetti.Origin
                position="bottom-right"
                count={900}
                initialSpeed={4.5}
                spread={Math.PI / 3}
                speedVariation={{ min: 0.7, max: 1.5 }}
              >
                <CannonConfetti.Flake width={10} height={19} radius={3} />
              </CannonConfetti.Origin>

              {/* Top corners — pure rain */}
              <CannonConfetti.Origin
                position="top-left"
                count={80}
                initialSpeed={1}
                spread={Math.PI / 2}
                speedVariation={{ min: 0.6, max: 1.1 }}
              >
                <CannonConfetti.Flake width={9} height={16} radius={3} />
              </CannonConfetti.Origin>

              <CannonConfetti.Origin
                position="top-right"
                count={80}
                initialSpeed={1}
                spread={Math.PI / 2}
                speedVariation={{ min: 0.6, max: 1.1 }}
              >
                <CannonConfetti.Flake width={9} height={16} radius={3} />
              </CannonConfetti.Origin>
            </CannonConfetti>
          </View>
        )}

        {/* ── DEV ONLY: refire button ─────────────────────── */}
        {__DEV__ && (
          <Pressable
            onPress={handleDevRefire}
            hitSlop={12}
            style={styles.devRefire}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text variant="micro" color="onPrimary">
              REFIRE
            </Text>
          </Pressable>
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
  devRefire: {
    position: "absolute",
    top: rt.insets.top + theme.spacing.md,
    right: theme.layout.screenPaddingH,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary,
    opacity: 0.9,
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
