import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
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
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";
import { scheduleOnRN } from "react-native-worklets";

const SETTLE_DELAY = 2500;
const AUTO_DISMISS_DELAY = 16000;

type BurstSound = "dayComplete" | "targetReached" | "none";

export function CelebrationBurst({
  visible,
  streak,
  onDismiss,
  title,
  subtitle,
  icon = "checkmark",
  sound = "dayComplete",
}: {
  visible: boolean;
  streak: number;
  onDismiss: () => void;
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  sound?: BurstSound;
}) {
  const [dismissable, setDismissable] = useState(false);
  /** Incrementing this re-mounts the confetti, forcing a fresh burst. */
  const [confettiKey, setConfettiKey] = useState(0);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const messageOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const dismissCalledRef = useRef(false);

  const handleDismiss = useCallback(() => {
    if (dismissCalledRef.current) return;
    dismissCalledRef.current = true;

    opacity.value = withTiming(0, { duration: 300 });
    messageOpacity.value = withTiming(0, { duration: 300 });
    buttonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) scheduleOnRN(onDismiss);
    });
  }, [opacity, messageOpacity, buttonOpacity, onDismiss]);

  useEffect(() => {
    if (!visible) return;

    if (sound !== "none") playSound(sound);

    dismissCalledRef.current = false;
    scale.value = 0;
    opacity.value = 0;
    messageOpacity.value = 0;
    buttonOpacity.value = 0;
    setDismissable(false);

    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 250 });
    messageOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    buttonOpacity.value = withDelay(
      SETTLE_DELAY,
      withTiming(1, { duration: 350 }),
    );

    const dismissTimer = setTimeout(() => setDismissable(true), SETTLE_DELAY);
    const autoTimer = setTimeout(handleDismiss, AUTO_DISMISS_DELAY);

    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(autoTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, handleDismiss, sound]);

  /** DEV ONLY: refire the confetti and replay the sound. */
  const handleDevRefire = useCallback(() => {
    setConfettiKey((k) => k + 1);
    if (sound !== "none") playSound(sound);
  }, [sound]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const messageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  if (!visible) return null;

  const theme = UnistylesRuntime.getTheme();
  const showConfetti = Platform.OS !== "web";
  const resolvedTitle = title ?? `Day ${streak} done`;
  const resolvedSubtitle = subtitle ?? "Rest up. Come back tomorrow.";

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={dismissable ? handleDismiss : undefined}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {showConfetti && (
          <View style={RNStyleSheet.absoluteFill} pointerEvents="none">
            <CannonConfetti
              key={confettiKey}
              autoplay
              fadeOutOnEnd
              gravity={0.6}
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
                count={150}
                initialSpeed={8}
                spread={Math.PI / 10}
              >
                <CannonConfetti.Flake width={9} height={17} radius={3} />
              </CannonConfetti.Origin>

              <CannonConfetti.Origin
                position="bottom-right"
                count={150}
                initialSpeed={8}
                spread={Math.PI / 10}
              >
                <CannonConfetti.Flake width={9} height={17} radius={3} />
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

        <Pressable
          style={styles.tapArea}
          onPress={dismissable ? handleDismiss : undefined}
          pointerEvents={dismissable ? "auto" : "none"}
        >
          <View style={styles.spacer} pointerEvents="none" />

          <View style={styles.centerContent} pointerEvents="none">
            <Animated.View style={[styles.centerBlock, iconAnimatedStyle]}>
              <View style={styles.iconCircle}>
                <PrimaryIcon name={icon} size={48} />
              </View>
            </Animated.View>

            <Animated.View style={[styles.textBlock, messageAnimatedStyle]}>
              <Text variant="h2" color="onBackground" style={styles.headline}>
                {resolvedTitle}
              </Text>
              <Text variant="subhead" color="mutedText" style={styles.sub}>
                {resolvedSubtitle}
              </Text>
            </Animated.View>
          </View>

          <Animated.View
            style={[styles.footer, buttonAnimatedStyle]}
            pointerEvents="none"
          >
            <View style={styles.button}>
              <Text variant="subheadBold" color="onPrimary">
                Continue
              </Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  tapArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: rt.insets.top + theme.spacing.xxl,
    paddingBottom: rt.insets.bottom + theme.spacing.xxl,
    paddingHorizontal: theme.layout.screenPaddingH,
  },
  spacer: { flex: 1 },
  centerContent: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xl,
    width: "100%",
    maxWidth: 480,
  },
  centerBlock: { alignItems: "center", justifyContent: "center" },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.panel,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  textBlock: { alignItems: "center", gap: theme.spacing.xs },
  headline: { textAlign: "center" },
  sub: { textAlign: "center" },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
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
