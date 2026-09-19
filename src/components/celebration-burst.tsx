import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import { playSound } from "@/utils/sounds";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";
import { scheduleOnRN } from "react-native-worklets";

/** Delay before the "Continue" button appears, in ms. */
const SETTLE_DELAY = 2500;
/** Fallback auto-dismiss if the user never taps, in ms. */
const AUTO_DISMISS_DELAY = 12000;

export function CelebrationBurst({
  visible,
  streak,
  onDismiss,
}: {
  visible: boolean;
  streak: number;
  onDismiss: () => void;
}) {
  const [key, setKey] = useState(0);
  const [dismissable, setDismissable] = useState(false);

  // ── Shared values (Reanimated, live on the UI thread) ──
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const messageOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const cannon2Ref = useRef<ConfettiCannon>(null);

  /** Guards against double-firing onDismiss from a tap + back button. */
  const dismissCalledRef = useRef(false);

  const handleDismiss = useCallback(() => {
    if (dismissCalledRef.current) return;
    dismissCalledRef.current = true;

    opacity.value = withTiming(0, { duration: 300 });
    messageOpacity.value = withTiming(0, { duration: 300 });
    buttonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        // Hop back to JS thread to trigger the parent's state update.
        scheduleOnRN(onDismiss);
      }
    });
  }, [opacity, messageOpacity, buttonOpacity, onDismiss]);

  // ── Intro animation ──────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    playSound("dayComplete");

    // Reset everything for a fresh run.
    dismissCalledRef.current = false;
    scale.value = 0;
    opacity.value = 0;
    messageOpacity.value = 0;
    buttonOpacity.value = 0;
    setDismissable(false);
    setKey((k) => k + 1);

    // Orchestration:
    //   t=0     icon springs in, background fades in
    //   t=400   message fades in
    //   t=2500  continue button fades in, overlay becomes tappable
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 250 });
    messageOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    buttonOpacity.value = withDelay(
      SETTLE_DELAY,
      withTiming(1, { duration: 350 }),
    );

    const cannonTimer = setTimeout(() => {
      cannon2Ref.current?.start();
    }, 500);
    const dismissTimer = setTimeout(() => setDismissable(true), SETTLE_DELAY);
    const autoTimer = setTimeout(handleDismiss, AUTO_DISMISS_DELAY);

    return () => {
      clearTimeout(cannonTimer);
      clearTimeout(dismissTimer);
      clearTimeout(autoTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, handleDismiss]);

  // ── Animated styles (computed on UI thread) ──────────────
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

  const primary = UnistylesRuntime.getTheme().colors.primary;
  const showConfetti = Platform.OS !== "web";

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
          <>
            <ConfettiCannon
              key={`left-${key}`}
              count={90}
              origin={{ x: -10, y: 0 }}
              autoStart
              fadeOut
              explosionSpeed={550}
              fallSpeed={4500}
              colors={[primary, "#FF6B35", "#FBBF24", "#4ADE80"]}
            />
            <ConfettiCannon
              ref={cannon2Ref}
              key={`right-${key}`}
              count={90}
              origin={{ x: 420, y: 0 }}
              autoStart={false}
              fadeOut
              explosionSpeed={550}
              fallSpeed={4500}
              colors={[primary, "#4ADE80", "#F472B6", "#60A5FA"]}
            />
          </>
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
                <PrimaryIcon name="checkmark" size={48} />
              </View>
            </Animated.View>

            <Animated.View style={[styles.textBlock, messageAnimatedStyle]}>
              <Text variant="h2" color="onBackground" style={styles.headline}>
                Day {streak} done
              </Text>
              <Text variant="subhead" color="mutedText" style={styles.sub}>
                Rest up. Come back tomorrow.
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
