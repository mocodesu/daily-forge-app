import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import {
  DEFAULT_SWEAR_PHRASE,
  SWEAR_PHRASE_MAX_WORDS,
  SWEAR_PHRASE_MIN_WORDS,
} from "@/constants/swear";
import { useSwearPhrase } from "@/hooks/use-swear-phrase";
import React, { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export function SwearPhraseEditor() {
  const { phrase, setPhrase, loading } = useSwearPhrase();

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading) setDraft(phrase);
  }, [loading, phrase]);

  const trimmedDraft = draft.trim().replace(/\s+/g, " ");
  const wordCount =
    trimmedDraft.length === 0 ? 0 : trimmedDraft.split(" ").length;
  const isDirty = trimmedDraft !== phrase;
  const isValid =
    wordCount >= SWEAR_PHRASE_MIN_WORDS && wordCount <= SWEAR_PHRASE_MAX_WORDS;

  const handleSave = async () => {
    setError(null);
    setSaved(false);

    if (wordCount < SWEAR_PHRASE_MIN_WORDS) {
      setError(`Phrase must be at least ${SWEAR_PHRASE_MIN_WORDS} words.`);
      return;
    }
    if (wordCount > SWEAR_PHRASE_MAX_WORDS) {
      setError(`Phrase must be ${SWEAR_PHRASE_MAX_WORDS} words or fewer.`);
      return;
    }

    await setPhrase(trimmedDraft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setDraft(DEFAULT_SWEAR_PHRASE);
    setError(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="subheadBold" color="onSurface">
          Swear Phrase
        </Text>
        <Text variant="caption" color="mutedText">
          The exact words you must say out loud to seal a day.
        </Text>
      </View>

      <TextInput
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          setError(null);
          setSaved(false);
        }}
        multiline
        numberOfLines={3}
        placeholder="Type your oath…"
        placeholderTextColor={UnistylesRuntime.getTheme().colors.mutedText}
        style={[styles.input, error ? styles.inputError : styles.inputIdle]}
      />

      <View style={styles.footer}>
        <Text
          variant="caption"
          color={wordCount > SWEAR_PHRASE_MAX_WORDS ? "primary" : "mutedText"}
        >
          {wordCount} / {SWEAR_PHRASE_MAX_WORDS} words
        </Text>

        <View style={styles.flex} />

        <Pressable onPress={handleReset} hitSlop={10}>
          <Text variant="caption" color="mutedText">
            Reset to Default
          </Text>
        </Pressable>
      </View>

      {error && (
        <View style={styles.messageRow}>
          <PrimaryIcon name="alert-circle-outline" size={14} />
          <Text variant="caption" color="primary" style={styles.flex}>
            {error}
          </Text>
        </View>
      )}

      {saved && (
        <View style={styles.messageRow}>
          <PrimaryIcon name="checkmark-circle" size={14} />
          <Text variant="caption" color="primary" style={styles.flex}>
            Phrase saved.
          </Text>
        </View>
      )}

      <HapticPressable
        haptic="medium"
        onPress={handleSave}
        disabled={!isDirty || !isValid}
        style={[
          styles.saveButton,
          isDirty && isValid ? styles.saveEnabled : styles.saveDisabled,
        ]}
      >
        <Text
          variant="subheadBold"
          color={isDirty && isValid ? "onPrimary" : "mutedText"}
        >
          Save Phrase
        </Text>
      </HapticPressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.spacing.sm },
  header: { gap: theme.spacing.xxs },
  flex: { flex: 1 },
  input: {
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: theme.colors.panel,
    color: theme.colors.onSurface,
  },
  inputError: { borderColor: theme.colors.primary },
  inputIdle: { borderColor: theme.colors.panelBorder },
  footer: { flexDirection: "row", alignItems: "center" },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    minHeight: 40,
  },
  saveEnabled: { backgroundColor: theme.colors.primary },
  saveDisabled: { backgroundColor: theme.colors.panelBorder },
}));
