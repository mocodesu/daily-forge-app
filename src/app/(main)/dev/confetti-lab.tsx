import { CelebrationBurst } from "@/components/celebration-burst";
import { GrandCelebration } from "@/components/grand-celebration";
import { HapticPressable } from "@/components/haptic-pressable";
import { ScrollScreen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

// ─────────────────────────────────────────────────────────────
// A dev-only playground for tuning the two celebration animations.
//
// Both celebrations are rendered inline as full-screen modals, so
// what you see here is exactly what ships. The lab stays mounted
// underneath, so after dismissing a celebration you're immediately
// back here and can fire the next one.
// ─────────────────────────────────────────────────────────────

export default function ConfettiLabScreen() {
  const theme = UnistylesRuntime.getTheme();

  const [burstVisible, setBurstVisible] = useState(false);
  const [grandVisible, setGrandVisible] = useState(false);
  const [queuedGrand, setQueuedGrand] = useState(false);

  const [burstCount, setBurstCount] = useState(0);
  const [grandCount, setGrandCount] = useState(0);

  // Fire the burst. Optionally queue the grand right after, so you
  // can reproduce the seal-day → burst → grand sequence in one tap.
  const fireBurst = useCallback((thenGrand: boolean) => {
    setQueuedGrand(thenGrand);
    setBurstVisible(true);
    setBurstCount((c) => c + 1);
  }, []);

  const handleBurstDismiss = useCallback(() => {
    setBurstVisible(false);
    setBurstCount((c) => c);
    if (queuedGrand) {
      // Match the real sequence: 400 ms between burst end and grand.
      setTimeout(() => {
        setQueuedGrand(false);
        setGrandVisible(true);
        setGrandCount((c) => c + 1);
      }, 400);
    }
  }, [queuedGrand]);

  const handleGrandDismiss = useCallback(() => {
    setGrandVisible(false);
  }, []);

  return (
    <>
      <ScrollScreen header={<ScreenHeader title="Confetti Lab" />}>
        {/* ── Real celebrations ────────────────────────── */}
        <View style={styles.section}>
          <Text variant="subheadBold" color="onSurface">
            Fire in isolation
          </Text>
          <Text variant="caption" color="mutedText">
            Renders the exact component used in production with realistic
            placeholder data. Dismiss to come back here.
          </Text>

          <LabButton
            icon="checkmark-circle"
            title="Day Complete"
            subtitle="CelebrationBurst — the small one after swearing"
            badge={burstCount > 0 ? String(burstCount) : undefined}
            onPress={() => fireBurst(false)}
          />

          <LabButton
            icon="trophy"
            title="Target Reached"
            subtitle="GrandCelebration — the big one at the streak target"
            badge={grandCount > 0 ? String(grandCount) : undefined}
            onPress={() => {
              setGrandVisible(true);
              setGrandCount((c) => c + 1);
            }}
          />

          <LabButton
            icon="flash"
            title="Full Sequence"
            subtitle="Burst → 400 ms → Grand. Reproduces a real target day."
            onPress={() => fireBurst(true)}
          />
        </View>

        {/* ── Tuning guide ─────────────────────────────── */}
        <View style={styles.section}>
          <Text variant="subheadBold" color="onSurface">
            How to tune
          </Text>

          <TipRow
            icon="code-slash"
            text="Edit gravity, drag, initialSpeed, spread, or sprayDuration in the source."
          />
          <TipRow
            icon="refresh"
            text="Save the file. Fast Refresh re-renders instantly — the lab stays open."
          />
          <TipRow
            icon="repeat"
            text="Tap a button again to refire. No state to reset."
          />
          <TipRow
            icon="eye"
            text="Both components cache the theme on mount, so color changes need a full reload, not just Fast Refresh."
          />
        </View>

        {/* ── Parameter reference ──────────────────────── */}
        <View style={styles.section}>
          <Text variant="subheadBold" color="onSurface">
            Current parameters
          </Text>
          <View style={styles.paramCard}>
            <Text variant="caption" color="mutedText">
              Day Complete — CelebrationBurst
            </Text>
            <ParamRow label="gravity" value="0.22" />
            <ParamRow label="drag" value="0.98" />
            <ParamRow label="initialSpeed" value="3.5" />
            <ParamRow label="spread" value="π/4" />
            <ParamRow label="sprayDuration" value="800 ms" />
            <ParamRow
              label="origins"
              value="bottom-left, bottom-right, top-center"
            />
            <ParamRow label="count" value="110 + 110 + 60" />
          </View>

          <View style={styles.paramCard}>
            <Text variant="caption" color="mutedText">
              Target Reached — GrandCelebration
            </Text>
            <ParamRow label="gravity" value="0.15" />
            <ParamRow label="drag" value="0.985" />
            <ParamRow label="initialSpeed" value="3.0" />
            <ParamRow label="spread" value="π/3" />
            <ParamRow label="sprayDuration" value="1200 ms" />
            <ParamRow
              label="origins"
              value="bottom-left/right, top-left/right"
            />
            <ParamRow label="count" value="180 + 180 + 80 + 80" />
          </View>

          <Text variant="caption" color="mutedText">
            Update these when you change the source. Just a cheat sheet so you
            don&apos;t have to grep for numbers.
          </Text>
        </View>
      </ScrollScreen>

      {/* ── Real celebrations ─────────────────────────── */}
      <CelebrationBurst
        visible={burstVisible}
        streak={7}
        onDismiss={handleBurstDismiss}
      />

      <GrandCelebration
        visible={grandVisible}
        streak={30}
        target={30}
        onDismiss={handleGrandDismiss}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function LabButton({
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <HapticPressable haptic="medium" onPress={onPress} style={styles.labButton}>
      <View style={styles.labIcon}>
        <PrimaryIcon name={icon} size={20} />
      </View>
      <View style={styles.labBody}>
        <View style={styles.labTitleRow}>
          <Text variant="subheadBold" color="onSurface">
            {title}
          </Text>
          {badge && (
            <View style={styles.badge}>
              <Text variant="micro" color="onPrimary">
                {badge}
              </Text>
            </View>
          )}
        </View>
        <Text variant="caption" color="mutedText">
          {subtitle}
        </Text>
      </View>
      <PrimaryIcon name="play" size={16} />
    </HapticPressable>
  );
}

function TipRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.tipRow}>
      <Ionicons
        name={icon}
        size={14}
        style={{ color: UnistylesRuntime.getTheme().colors.mutedText }}
      />
      <Text variant="caption" color="mutedText" style={styles.tipText}>
        {text}
      </Text>
    </View>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.paramRow}>
      <Text variant="caption" color="mutedText" style={styles.paramLabel}>
        {label}
      </Text>
      <Text variant="caption" color="onSurface" style={styles.paramValue}>
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  section: { gap: theme.spacing.sm },

  labButton: {
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
  labIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.panel,
  },
  labBody: { flex: 1, gap: 2, minWidth: 0 },
  labTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.primary,
  },

  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  tipText: { flex: 1, lineHeight: 18 },

  paramCard: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.panel,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  paramRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  paramLabel: {
    fontFamily: "Courier",
    fontSize: 12,
  },
  paramValue: {
    fontFamily: "Courier",
    fontSize: 12,
    textAlign: "right",
  },
}));
