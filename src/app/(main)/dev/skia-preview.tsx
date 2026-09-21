import { AppLottie } from "@/components/lottie";
import { ScrollScreen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { StreakDemoRing, StreakRing, VoiceWave } from "@/components/skia";
import Text from "@/components/text";
import React from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const FLAME_SOURCE = require("@/assets/animations/loop-flame.json");

export default function SkiaPreviewScreen() {
  const { theme } = useUnistyles();

  return (
    <ScrollScreen header={<ScreenHeader title="Animations Preview" />}>
      <Section title="Loop Flame — Lottie">
        <View style={styles.row}>
          <AppLottie source={FLAME_SOURCE} size={80} loop />
          <AppLottie source={FLAME_SOURCE} size={140} loop />
        </View>
      </Section>

      <Section title="Streak Demo Ring — Skia, segmented">
        <View style={styles.row}>
          <StreakDemoRing
            size={180}
            strokeWidth={14}
            trackColor={theme.colors.panelBorder}
            primaryColor={theme.colors.primary}
            illuminationColor={theme.colors.primaryIllumination}
          />
          <StreakDemoRing
            size={240}
            strokeWidth={18}
            trackColor={theme.colors.panelBorder}
            primaryColor={theme.colors.primary}
            illuminationColor={theme.colors.primaryIllumination}
          />
        </View>
        <Text variant="caption" color="mutedText">
          Seven segments fill in sequence, a bright dot tracks the leading edge.
        </Text>
      </Section>

      <Section title="VoiceWave — Skia">
        <View style={styles.row}>
          <VoiceWave
            size={180}
            primaryColor={theme.colors.primary}
            illuminationColor={theme.colors.primaryIllumination}
          />
          <VoiceWave
            size={260}
            primaryColor={theme.colors.primary}
            illuminationColor={theme.colors.primaryIllumination}
          />
        </View>
        <Text variant="caption" color="mutedText">
          Layered sine waves across a pulsing background.
        </Text>
      </Section>

      <Section title="Streak Ring — Skia, continuous (History)">
        <View style={styles.row}>
          <StreakRing
            size={140}
            strokeWidth={10}
            trackColor={theme.colors.panelBorder}
            primaryColor={theme.colors.primary}
            illuminationColor={theme.colors.primaryIllumination}
            value={0.35}
          />
          <StreakRing
            size={140}
            strokeWidth={10}
            trackColor={theme.colors.panelBorder}
            primaryColor={theme.colors.primary}
            illuminationColor={theme.colors.primaryIllumination}
            value={0.7}
          />
        </View>
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
      {children}
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
}));
