import { AppLottie } from "@/components/lottie";
import { ScrollScreen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import {
  AgeTimeline,
  BMIGauge,
  NotificationPulse,
  PhotoFrames,
  SignatureLine,
  StreakDemoRing,
  VoiceWave,
} from "@/components/skia";
import Text from "@/components/text";
import React from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const FLAME_SOURCE = require("@/assets/animations/loop-flame.json");

export default function SkiaPreviewScreen() {
  const { theme } = useUnistyles();

  return (
    <ScrollScreen header={<ScreenHeader title="Animations Preview" />}>
      <Section title="Flame — Lottie">
        <View style={styles.row}>
          <AppLottie source={FLAME_SOURCE} size={100} loop />
        </View>
      </Section>

      <Section title="Streak Demo Ring — Skia">
        <StreakDemoRing
          size={180}
          strokeWidth={14}
          trackColor={theme.colors.panelBorder}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
          outlineColor={theme.colors.mutedText}
          completeColor={theme.colors.active}
        />
      </Section>

      <Section title="Voice Wave — Skia">
        <VoiceWave
          size={180}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
        />
      </Section>

      <Section title="Signature Line — Skia">
        <SignatureLine
          width={240}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
        />
      </Section>

      <Section title="Age Timeline — Skia">
        <AgeTimeline
          width={260}
          age={35}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
          trackColor={theme.colors.panelBorder}
        />
      </Section>

      <Section title="BMI Gauge — Skia">
        <BMIGauge width={300} bmi={24} markerColor={theme.colors.onSurface} />
      </Section>

      <Section title="Photo Frames — Skia">
        <PhotoFrames
          width={220}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
        />
      </Section>

      <Section title="Notification Pulse — Skia">
        <NotificationPulse
          size={160}
          primaryColor={theme.colors.primary}
          illuminationColor={theme.colors.primaryIllumination}
        />
      </Section>
    </ScrollScreen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="subheadBold" color="onSurface">
        {title}
      </Text>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  section: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
    flexWrap: "wrap",
  },
  center: {
    alignItems: "center",
  },
}));
