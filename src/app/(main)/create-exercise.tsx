import { BackButton } from "@/components/back-button";
import { BodyPartChip } from "@/components/body-part-chip";
import { CatalogPickerSheet } from "@/components/catalog-picker-sheet";
import { HapticPressable } from "@/components/haptic-pressable";
import { ScrollScreen } from "@/components/screen";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
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
  Switch,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export default function CreateExerciseScreen() {
  const db = useSQLiteContext();

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
  const [savedCount, setSavedCount] = useState(0);

  const placeholderColor = UnistylesRuntime.getTheme().colors.mutedText;

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

  function resetForm() {
    setName("");
    setSelectedParts(new Set());
    setExerciseType("reps");
    setSets("3");
    setReps("10");
    setDuration("30");
    setSessionDuration("60");
    setNotes("");
    setConfirmLock(false);
    setError(null);
  }

  async function handleSave(stayOpen: boolean) {
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

      if (stayOpen) {
        setSavedCount((c) => c + 1);
        resetForm();
        setSaving(false);
      } else {
        router.back();
      }
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
      <View style={styles.header}>
        <BackButton />
        <Text variant="title" color="onBackground">
          New Exercise
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollScreen safeTop={false}>
        {savedCount > 0 && (
          <View style={styles.savedBanner}>
            <PrimaryIcon name="checkmark-circle" size={18} />
            <Text variant="caption" color="onSurface" style={styles.flex}>
              {savedCount} exercise{savedCount === 1 ? "" : "s"} saved this
              session. Keep going.
            </Text>
          </View>
        )}

        <Pressable
          testID="create-exercise-quick-start"
          accessibilityRole="button"
          onPress={() => setPickerVisible(true)}
          style={styles.quickStartCard}
        >
          <View style={styles.quickStartIcon}>
            <Ionicons
              name="sparkles"
              size={20}
              color={UnistylesRuntime.getTheme().colors.onPrimary}
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
          <PrimaryIcon name="chevron-forward" size={18} />
        </Pressable>

        <Field label="Name">
          <TextInput
            testID="create-exercise-name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push-ups"
            placeholderTextColor={placeholderColor}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </Field>

        <Field label="Type">
          <View style={styles.segmented}>
            {(["reps", "timer"] as ExerciseType[]).map((type) => {
              const active = exerciseType === type;
              return (
                <Pressable
                  key={type}
                  testID={`create-exercise-type-${type}`}
                  accessibilityRole="button"
                  onPress={() => setExerciseType(type)}
                  style={[
                    styles.segment,
                    active ? styles.segmentActive : styles.segmentIdle,
                  ]}
                >
                  <Ionicons
                    name={type === "reps" ? "repeat" : "timer-outline"}
                    size={16}
                    style={active ? styles.iconOnPrimary : styles.iconMuted}
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

        <View style={styles.card}>
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
              testID="create-exercise-is-daily"
              value={isDaily}
              onValueChange={setIsDaily}
              trackColor={{
                false: UnistylesRuntime.getTheme().colors.panelBorder,
                true: UnistylesRuntime.getTheme().colors.primary,
              }}
              thumbColor={UnistylesRuntime.getTheme().colors.surface}
            />
          </View>
        </View>

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

        <Field label="Sets">
          <NumberInput value={sets} onChange={setSets} />
        </Field>

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

        <View style={styles.card}>
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
                key={label as string}
                label={label as string}
                onPress={() => setSessionDuration(String(secs))}
              />
            ))}
          </View>
        </View>

        <Field label="Notes (optional)">
          <TextInput
            testID="create-exercise-notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Form cues, reminders…"
            placeholderTextColor={placeholderColor}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
          />
        </Field>

        <Pressable
          testID="create-exercise-confirm-lock"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmLock }}
          onPress={() => setConfirmLock((v) => !v)}
          style={styles.confirmRow}
        >
          <View
            style={[
              styles.checkbox,
              confirmLock ? styles.checkboxOn : styles.checkboxOff,
            ]}
          >
            {confirmLock && (
              <Ionicons
                name="checkmark"
                size={14}
                color={UnistylesRuntime.getTheme().colors.onPrimary}
              />
            )}
          </View>
          <Text variant="callout" color="onSurface" style={styles.flex}>
            I understand this exercise is permanent and cannot be changed.
          </Text>
        </Pressable>

        {error && (
          <View style={styles.errorBox}>
            <PrimaryIcon name="alert-circle-outline" size={18} />
            <Text variant="subhead" color="onSurface" style={styles.flex}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <HapticPressable
            testID="create-exercise-save-and-add"
            haptic="light"
            onPress={() => handleSave(true)}
            disabled={!canSave}
            style={[
              styles.saveButton,
              styles.saveSecondary,
              !canSave && styles.saveDisabled,
            ]}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              style={canSave ? styles.iconPrimary : styles.iconMuted}
            />
            <Text
              variant="subheadBold"
              color={canSave ? "primary" : "mutedText"}
            >
              Save & Add Another
            </Text>
          </HapticPressable>

          <HapticPressable
            testID="create-exercise-save"
            haptic="medium"
            onPress={() => handleSave(false)}
            disabled={!canSave}
            style={[
              styles.saveButton,
              canSave ? styles.savePrimary : styles.saveDisabled,
            ]}
          >
            <Text
              variant="subheadBold"
              color={canSave ? "onPrimary" : "mutedText"}
            >
              {saving && !canSave ? "Saving…" : "Save Exercise"}
            </Text>
          </HapticPressable>
        </View>
      </ScrollScreen>

      <CatalogPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={applyCatalogItem}
      />
    </KeyboardAvoidingView>
  );
}

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
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ""))}
      keyboardType="number-pad"
      style={[styles.input, { width, textAlign: width ? "right" : "left" }]}
      placeholderTextColor={UnistylesRuntime.getTheme().colors.mutedText}
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
  return (
    <Pressable onPress={onPress} style={styles.quickButton}>
      <Text variant="caption" color="onSurface">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: rt.insets.top + theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.panelBorder,
  },
  headerSpacer: { width: 40 },

  field: { gap: theme.spacing.xs },
  input: {
    borderRadius: theme.radii.sm,
    borderWidth: theme.borderWidth.thin,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 17,
    minHeight: 44,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
    color: theme.colors.onSurface,
  },
  textArea: {
    minHeight: 80,
    paddingTop: theme.spacing.sm,
    textAlignVertical: "top",
  },

  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.panel,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
  },

  segmented: { flexDirection: "row", gap: theme.spacing.sm },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    borderWidth: theme.borderWidth.thin,
    minHeight: 44,
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  segmentIdle: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
  },
  iconOnPrimary: { color: theme.colors.onPrimary },
  iconMuted: { color: theme.colors.mutedText },
  iconPrimary: { color: theme.colors.primary },

  card: {
    padding: {
      phone: theme.spacing.md,
      tablet: theme.spacing.lg,
    },
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
    gap: theme.spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  rowText: { flex: 1, gap: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  quickButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radii.sm,
    borderWidth: theme.borderWidth.thin,
    minHeight: 36,
    justifyContent: "center",
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
  },

  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: theme.borderWidth.thick,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxOff: {
    backgroundColor: "transparent",
    borderColor: theme.colors.panelBorder,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.panel,
  },

  actionsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    minHeight: 52,
  },
  savePrimary: { backgroundColor: theme.colors.primary },
  saveSecondary: {
    backgroundColor: "transparent",
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.primary,
  },
  saveDisabled: {
    backgroundColor: theme.colors.panelBorder,
    borderColor: theme.colors.panelBorder,
  },

  quickStartCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: {
      phone: theme.spacing.md,
      tablet: theme.spacing.lg,
    },
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    minHeight: 68,
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.primary,
  },
  quickStartIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  quickStartBody: { flex: 1, gap: 2, minWidth: 0 },
}));
