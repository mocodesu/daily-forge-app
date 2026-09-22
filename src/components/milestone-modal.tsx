import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import {
  OnPrimaryIcon,
  PrimaryIcon,
  ThemedTextInput,
} from "@/components/themed";
import { useUnitSystem } from "@/hooks/use-unit-system";
import type { Milestone, UserProfile } from "@/types/dailyforge";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function MilestoneModal({
  visible,
  milestone,
  profile,
  onCancel,
  onComplete,
}: {
  visible: boolean;
  milestone: Milestone | null;
  profile: UserProfile | null;
  onCancel: () => void;
  onComplete: (data: {
    currentWeightKg: number | null;
    userNotes: string;
  }) => void;
}) {
  const { kgToDisplay, displayToKg, formatWeight, weightUnit } =
    useUnitSystem();

  const [weightText, setWeightText] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (visible && milestone) {
      setWeightText(
        milestone.currentWeightKg !== null
          ? formatWeight(milestone.currentWeightKg)
          : "",
      );
      setNotes(milestone.userNotes);
    }
  }, [visible, milestone, formatWeight]);

  const handleSave = useCallback(() => {
    if (!milestone) return;

    let kg: number | null = null;
    const trimmed = weightText.trim();
    if (trimmed.length > 0) {
      const value = parseFloat(trimmed);
      if (Number.isFinite(value) && value > 0) {
        kg = displayToKg(value);
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete({ currentWeightKg: kg, userNotes: notes.trim() });
  }, [milestone, weightText, notes, displayToKg, onComplete]);

  if (!milestone) return null;

  const startWeight = profile?.initialWeightKg ?? null;
  const goalWeight = profile?.goalWeightKg ?? null;

  const deltaKg = (() => {
    if (!startWeight) return null;
    const trimmed = weightText.trim();
    if (trimmed.length === 0) return null;
    const value = parseFloat(trimmed);
    if (!Number.isFinite(value) || value <= 0) return null;
    return displayToKg(value) - startWeight;
  })();

  const deltaLabel = (() => {
    if (deltaKg === null) return null;
    const abs = Math.abs(deltaKg);
    const direction: "lost" | "gained" | "maintained" =
      deltaKg < 0 ? "lost" : deltaKg > 0 ? "gained" : "maintained";
    return { direction, amount: kgToDisplay(abs) };
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <PrimaryIcon name="trophy" size={32} />
                <Text variant="h2" color="onSurface">
                  {milestone.day}-Day Milestone
                </Text>
                <Text
                  variant="caption"
                  color="mutedText"
                  style={styles.subtitle}
                >
                  You've been consistent. Time to reflect.
                </Text>
              </View>

              <View style={styles.section}>
                <Text variant="caption" color="mutedText">
                  Weight
                </Text>

                <View style={styles.weightCard}>
                  <WeightRow
                    label="Started at"
                    value={
                      startWeight !== null
                        ? `${formatWeight(startWeight)} ${weightUnit}`
                        : "—"
                    }
                  />
                  <WeightRow
                    label="Goal"
                    value={
                      goalWeight !== null
                        ? `${formatWeight(goalWeight)} ${weightUnit}`
                        : "—"
                    }
                  />

                  <View style={styles.weightInputRow}>
                    <Text variant="subhead" color="mutedText">
                      Today
                    </Text>
                    <View style={styles.weightInputBox}>
                      <ThemedTextInput
                        value={weightText}
                        onChangeText={(v) =>
                          setWeightText(v.replace(/[^0-9.]/g, ""))
                        }
                        placeholder={weightUnit}
                        keyboardType="decimal-pad"
                        style={styles.weightInput}
                      />
                      <Text variant="subhead" color="mutedText">
                        {weightUnit}
                      </Text>
                    </View>
                  </View>

                  {deltaLabel && (
                    <View style={styles.deltaRow}>
                      <PrimaryIcon
                        name={
                          deltaLabel.direction === "lost"
                            ? "trending-down"
                            : deltaLabel.direction === "gained"
                              ? "trending-up"
                              : "remove"
                        }
                        size={16}
                      />
                      <Text variant="caption" color="primary">
                        {deltaLabel.direction === "maintained"
                          ? "Weight unchanged"
                          : `You've ${deltaLabel.direction} ${deltaLabel.amount.toFixed(
                              1,
                            )} ${weightUnit}`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text variant="caption" color="mutedText">
                  How do you feel?
                </Text>
                <ThemedTextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Notes about your progress…"
                  multiline
                  numberOfLines={4}
                  style={styles.notesInput}
                />
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable onPress={onCancel} hitSlop={12}>
                <Text variant="subhead" color="mutedText">
                  Later
                </Text>
              </Pressable>

              <View style={styles.flex} />

              <HapticPressable
                haptic="medium"
                onPress={handleSave}
                style={styles.primaryButton}
              >
                <OnPrimaryIcon name="checkmark" size={16} />
                <Text variant="subheadBold" color="onPrimary">
                  Save Milestone
                </Text>
              </HapticPressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function WeightRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.weightRow}>
      <Text variant="subhead" color="mutedText">
        {label}
      </Text>
      <Text variant="subheadBold" color="onSurface">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.layout.screenPaddingH,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
    borderRadius: theme.radii.lg,
    borderWidth: theme.borderWidth.thin,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  header: { alignItems: "center", gap: theme.spacing.xs },
  subtitle: { textAlign: "center", paddingHorizontal: theme.spacing.md },
  section: { gap: theme.spacing.xs },
  weightCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
    gap: theme.spacing.sm,
  },
  weightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weightInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  weightInputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  weightInput: {
    width: 100,
    borderRadius: theme.radii.sm,
    borderWidth: theme.borderWidth.thin,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 17,
    textAlign: "right",
    minHeight: 40,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
    color: theme.colors.onSurface,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  notesInput: {
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
    color: theme.colors.onSurface,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.panelBorder,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    minHeight: 44,
    backgroundColor: theme.colors.primary,
  },
}));
