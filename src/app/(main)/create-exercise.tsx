import { BodyPartChip } from "@/components/body-part-chip";
import { CatalogPickerSheet } from "@/components/catalog-picker-sheet";
import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import type { CatalogExercise } from "@/constants/workout-catalog";
import { ExercisesRepo } from "@/repositories/exercises-repo";
import {
  BODY_PARTS,
  type BodyPart,
  type ExerciseType,
} from "@/types/dailyforge";
import { randomUUID } from "@/utils/day-key";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export default function CreateExerciseScreen() {
  const { theme } = useUnistyles();
  const db = useSQLiteContext();

  // ── Form state ──────────────────────────────────────────
  const [name, setName] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("reps");
  const [selectedParts, setSelectedParts] = useState<Set<BodyPart>>(new Set());
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [duration, setDuration] = useState("30");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [isDaily, setIsDaily] = useState(true);
  const [notes, setNotes] = useState("");
  const [confirmLock, setConfirmLock] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ─────────────────────────────────────────────
  function togglePart(part: BodyPart) {
    setSelectedParts((prev) => {
      const next = new Set(prev);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      return next;
    });
  }

  function applyCatalogItem(item: CatalogExercise) {
    setName(item.name);
    setSelectedParts(new Set(item.bodyParts));
    setExerciseType(item.exerciseType);
    setSets(String(item.sets));
    setSessionDuration(String(item.sessionSeconds));
    setNotes(item.notes);

    if (item.exerciseType === "reps") {
      setReps(String(item.reps));
      setDuration("30");
    } else {
      setDuration(String(item.perSetSeconds));
      setReps("10");
    }

    setError(null);
    setConfirmLock(false);
    setPickerVisible(false);
  }

  async function handleSave() {
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) return setError("Please enter a name.");
    if (selectedParts.size === 0)
      return setError("Pick at least one body part.");

    const setsNum = parseInt(sets, 10);
    if (!Number.isFinite(setsNum) || setsNum <= 0) {
      return setError("Sets must be a positive number.");
    }

    const sessionNum = parseInt(sessionDuration, 10);
    if (!Number.isFinite(sessionNum) || sessionNum <= 0) {
      return setError("Session duration must be a positive number of seconds.");
    }

    let repsNum = 0;
    let perSetDuration = 0;

    if (exerciseType === "reps") {
      repsNum = parseInt(reps, 10);
      if (!Number.isFinite(repsNum) || repsNum <= 0) {
        return setError("Reps must be a positive number.");
      }
    } else {
      perSetDuration = parseInt(duration, 10);
      if (!Number.isFinite(perSetDuration) || perSetDuration <= 0) {
        return setError("Per-set duration must be a positive number.");
      }
    }

    // Preserve canonical body-part order rather than tap order
    const orderedParts = BODY_PARTS.filter((p) => selectedParts.has(p));

    setSaving(true);
    try {
      await ExercisesRepo.insert(db, {
        id: randomUUID(),
        name: trimmed,
        bodyParts: orderedParts,
        exerciseType,
        reps: repsNum,
        sets: setsNum,
        durationSeconds: perSetDuration,
        sessionDurationSeconds: sessionNum,
        isDaily,
        notes: notes.trim(),
        createdAt: Date.now(),
        sortIndex: Date.now(),
      });
      router.back();
    } catch (err) {
      console.error("[create-exercise] save failed:", err);
      setError("Could not save the exercise. Check the console.");
      setSaving(false);
    }
  }

  const canSave = confirmLock && !saving;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── HEADER ──────────────────────────────────────── */}
      <View
        style={[styles.header, { borderBottomColor: theme.colors.panelBorder }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="subhead" color="mutedText">
            Cancel
          </Text>
        </Pressable>
        <Text variant="title" color="onBackground">
          New Exercise
        </Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── QUICK START ──────────────────────────────── */}
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={[
            styles.quickStartCard,
            {
              backgroundColor: theme.colors.panel,
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <View
            style={[
              styles.quickStartIcon,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={20}
              color={theme.colors.onPrimary}
            />
          </View>
          <View style={styles.quickStartBody}>
            <Text variant="subheadBold" color="onSurface">
              Quick Start
            </Text>
            <Text variant="caption" color="mutedText">
              Pick a common home workout to prefill every field below.
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.primary}
          />
        </Pressable>

        {/* ── NAME ─────────────────────────────────────── */}
        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push-ups"
            placeholderTextColor={theme.colors.mutedText}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.panelBorder,
                color: theme.colors.onSurface,
              },
            ]}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </Field>

        {/* ── TYPE ─────────────────────────────────────── */}
        <Field label="Type">
          <View style={styles.segmented}>
            {(["reps", "timer"] as ExerciseType[]).map((type) => {
              const active = exerciseType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setExerciseType(type)}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.panel,
                      borderColor: active
                        ? theme.colors.primary
                        : theme.colors.panelBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={type === "reps" ? "repeat" : "timer-outline"}
                    size={16}
                    color={
                      active ? theme.colors.onPrimary : theme.colors.mutedText
                    }
                  />
                  <Text
                    variant="subheadBold"
                    color={active ? "onPrimary" : "onSurface"}
                  >
                    {type === "reps" ? "Repetitions" : "Timed"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        {/* ── DAILY TOGGLE ─────────────────────────────── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.panelBorder,
            },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text variant="subheadBold" color="onSurface">
                Repeat every day
              </Text>
              <Text variant="caption" color="mutedText">
                {isDaily
                  ? "Appears fresh every day."
                  : "Only appears today, then retires."}
              </Text>
            </View>
            <Switch
              value={isDaily}
              onValueChange={setIsDaily}
              trackColor={{
                false: theme.colors.panelBorder,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>
        </View>

        {/* ── BODY PARTS ───────────────────────────────── */}
        <Field label="Body parts">
          <View style={styles.chipRow}>
            {BODY_PARTS.map((part) => (
              <BodyPartChip
                key={part}
                part={part}
                selected={selectedParts.has(part)}
                onPress={() => togglePart(part)}
              />
            ))}
          </View>
        </Field>

        {/* ── SETS ─────────────────────────────────────── */}
        <Field label="Sets">
          <NumberInput value={sets} onChange={setSets} />
        </Field>

        {/* ── REPS OR DURATION ─────────────────────────── */}
        {exerciseType === "reps" ? (
          <Field label="Reps per set">
            <NumberInput value={reps} onChange={setReps} />
          </Field>
        ) : (
          <Field label="Seconds per set">
            <NumberInput value={duration} onChange={setDuration} />
            <View style={styles.quickRow}>
              {[15, 30, 45, 60, 90, 120].map((s) => (
                <QuickButton
                  key={s}
                  label={s < 60 ? `${s}s` : `${s / 60}m`}
                  onPress={() => setDuration(String(s))}
                />
              ))}
            </View>
          </Field>
        )}

        {/* ── SESSION TIMER ────────────────────────────── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.panelBorder,
            },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text variant="subheadBold" color="onSurface">
                Session timer
              </Text>
              <Text variant="caption" color="mutedText">
                Total workout window. Cannot be stopped once started.
              </Text>
            </View>
            <NumberInput
              value={sessionDuration}
              onChange={setSessionDuration}
              width={72}
            />
          </View>
          <View style={styles.quickRow}>
            {[
              ["30s", 30],
              ["1m", 60],
              ["2m", 120],
              ["3m", 180],
              ["5m", 300],
              ["10m", 600],
            ].map(([label, secs]) => (
              <QuickButton
                key={label}
                label={label as string}
                onPress={() => setSessionDuration(String(secs))}
              />
            ))}
          </View>
        </View>

        {/* ── NOTES ────────────────────────────────────── */}
        <Field label="Notes (optional)">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Form cues, reminders…"
            placeholderTextColor={theme.colors.mutedText}
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.panelBorder,
                color: theme.colors.onSurface,
              },
            ]}
            multiline
            numberOfLines={3}
          />
        </Field>

        {/* ── CONFIRMATION ─────────────────────────────── */}
        <Pressable
          onPress={() => setConfirmLock((v) => !v)}
          style={styles.confirmRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: confirmLock
                  ? theme.colors.primary
                  : "transparent",
                borderColor: confirmLock
                  ? theme.colors.primary
                  : theme.colors.panelBorder,
              },
            ]}
          >
            {confirmLock && (
              <Ionicons
                name="checkmark"
                size={14}
                color={theme.colors.onPrimary}
              />
            )}
          </View>
          <Text variant="callout" color="onSurface" style={{ flex: 1 }}>
            I understand this exercise is permanent and cannot be changed.
          </Text>
        </Pressable>

        {/* ── ERROR ────────────────────────────────────── */}
        {error && (
          <View
            style={[styles.errorBox, { backgroundColor: theme.colors.panel }]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text variant="subhead" color="onSurface" style={{ flex: 1 }}>
              {error}
            </Text>
          </View>
        )}

        {/* ── SAVE ─────────────────────────────────────── */}
        <HapticPressable
          haptic="medium"
          onPress={handleSave}
          disabled={!canSave}
          style={[
            styles.saveButton,
            {
              backgroundColor: canSave
                ? theme.colors.primary
                : theme.colors.panelBorder,
            },
          ]}
        >
          <Text variant="subheadBold" color="onPrimary">
            {saving ? "Saving…" : "Save Exercise"}
          </Text>
        </HapticPressable>

        <View style={{ height: 40 }} />
      </ScrollView>
      <CatalogPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={applyCatalogItem}
      />
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color="mutedText">
        {label}
      </Text>
      {children}
    </View>
  );
}

function NumberInput({
  value,
  onChange,
  width,
}: {
  value: string;
  onChange: (v: string) => void;
  width?: number;
}) {
  const { theme } = useUnistyles();
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ""))}
      keyboardType="number-pad"
      style={[
        styles.input,
        {
          width,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.panelBorder,
          color: theme.colors.onSurface,
          textAlign: width ? "right" : "left",
        },
      ]}
      returnKeyType="done"
    />
  );
}

function QuickButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.quickButton,
        {
          backgroundColor: theme.colors.panel,
          borderColor: theme.colors.panelBorder,
        },
      ]}
    >
      <Text variant="caption" color="onSurface">
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: theme.borderWidth.hairline,
  },
  content: {
    padding: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.lg,
  },

  field: {
    gap: theme.spacing.xs,
  },
  input: {
    borderRadius: theme.radii.sm,
    borderWidth: theme.borderWidth.thin,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 17,
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    paddingTop: theme.spacing.sm,
    textAlignVertical: "top",
  },

  segmented: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    borderWidth: theme.borderWidth.thin,
  },

  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  quickButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    borderWidth: theme.borderWidth.thin,
  },

  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: theme.borderWidth.thick,
    alignItems: "center",
    justifyContent: "center",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.sm,
  },

  saveButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  quickStartCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
  },
  quickStartIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  quickStartBody: {
    flex: 1,
    gap: 2,
  },
}));
