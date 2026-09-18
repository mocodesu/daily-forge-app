import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { useUnitSystem } from "@/hooks/use-unit-system";
import type { Milestone, UserProfile } from "@/types/dailyforge";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

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
  const { theme } = useUnistyles();
  const { system, kgToDisplay, displayToKg, formatWeight, weightUnit } =
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

  // Live delta preview
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
    const direction =
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
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.panelBorder,
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── HEADER ──────────────────────────────── */}
              <View style={styles.header}>
                <Ionicons
                  name="trophy"
                  size={32}
                  color={theme.colors.primary}
                />
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

              {/* ── WEIGHT COMPARISON ──────────────────── */}
              <View style={styles.section}>
                <Text variant="caption" color="mutedText">
                  Weight
                </Text>

                <View
                  style={[
                    styles.weightCard,
                    {
                      backgroundColor: theme.colors.panel,
                      borderColor: theme.colors.panelBorder,
                    },
                  ]}
                >
                  <WeightRow
                    label="Started at"
                    value={
                      startWeight
                        ? `${formatWeight(startWeight)} ${weightUnit}`
                        : "—"
                    }
                  />
                  <WeightRow
                    label="Goal"
                    value={
                      goalWeight
                        ? `${formatWeight(goalWeight)} ${weightUnit}`
                        : "—"
                    }
                  />
                  <View style={styles.weightInputRow}>
                    <Text variant="subhead" color="mutedText">
                      Today
                    </Text>
                    <View style={styles.weightInputBox}>
                      <TextInput
                        value={weightText}
                        onChangeText={(v) =>
                          setWeightText(v.replace(/[^0-9.]/g, ""))
                        }
                        placeholder={`${weightUnit}`}
                        placeholderTextColor={theme.colors.mutedText}
                        keyboardType="decimal-pad"
                        style={[
                          styles.weightInput,
                          {
                            color: theme.colors.onSurface,
                            borderColor: theme.colors.panelBorder,
                            backgroundColor: theme.colors.surface,
                          },
                        ]}
                      />
                      <Text variant="subhead" color="mutedText">
                        {weightUnit}
                      </Text>
                    </View>
                  </View>

                  {deltaLabel && (
                    <View style={styles.deltaRow}>
                      <Ionicons
                        name={
                          deltaLabel.direction === "lost"
                            ? "trending-down"
                            : deltaLabel.direction === "gained"
                              ? "trending-up"
                              : "remove"
                        }
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text variant="caption" color="primary">
                        {deltaLabel.direction === "maintained"
                          ? "Weight unchanged"
                          : `You've ${deltaLabel.direction} ${deltaLabel.amount.toFixed(1)} ${weightUnit}`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── NOTES ───────────────────────────────── */}
              <View style={styles.section}>
                <Text variant="caption" color="mutedText">
                  How do you feel?
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Notes about your progress…"
                  placeholderTextColor={theme.colors.mutedText}
                  multiline
                  numberOfLines={4}
                  style={[
                    styles.notesInput,
                    {
                      color: theme.colors.onSurface,
                      borderColor: theme.colors.panelBorder,
                      backgroundColor: theme.colors.panel,
                    },
                  ]}
                />
              </View>
            </ScrollView>

            {/* ── ACTIONS ─────────────────────────────── */}
            <View style={styles.actions}>
              <Pressable onPress={onCancel} hitSlop={12}>
                <Text variant="subhead" color="mutedText">
                  Later
                </Text>
              </Pressable>

              <View style={{ flex: 1 }} />

              <HapticPressable
                haptic="medium"
                onPress={handleSave}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={theme.colors.onPrimary}
                />
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
  },
  scrollContent: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  header: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: theme.spacing.md,
  },
  section: {
    gap: theme.spacing.xs,
  },
  weightCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
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
  },
}));
