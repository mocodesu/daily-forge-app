import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import { PrimaryIcon } from "@/components/themed";
import { useSwearPhrase } from "@/hooks/use-swear-phrase";
import { matchSwear } from "@/utils/swear-matcher";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

type Phase = "idle" | "recording" | "reviewing";

const ANDROID_RECOGNIZER_PACKAGE = "com.google.android.as";

export function SwearModal({
  visible,
  onCancel,
  onSworn,
}: {
  visible: boolean;
  onCancel: () => void;
  onSworn: (data: { transcript: string; matchedPhrase: string }) => void;
}) {
  const { phrase, loading } = useSwearPhrase();

  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  /** Dev-only typed phrase. Kept separate from `transcript` so the
   *  reviewing phase isn't triggered mid-typing. Committed only when
   *  the user taps "Use Phrase" or submits the keyboard. */
  const [devTypedText, setDevTypedText] = useState("");

  const transcriptRef = useRef("");

  // ── Reset when the modal opens ────────────────────────────
  useEffect(() => {
    if (visible) {
      setPhase("idle");
      setTranscript("");
      setError(null);
      setPreparing(false);
      setDevTypedText("");
      transcriptRef.current = "";
    }
  }, [visible]);

  // ── Speech recognition events ─────────────────────────────
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results?.[0]?.transcript ?? "";
    transcriptRef.current = text;
    if (phase === "recording") setTranscript(text);
  });

  useSpeechRecognitionEvent("end", () => {
    setPhase("reviewing");
    setTranscript(transcriptRef.current.trim());
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("[swear] recognition error:", event);
    const code = (event as { error?: string }).error;
    if (code === "no-speech") {
      setError("No speech was detected. Try again or use the dev input.");
    } else if (code === "service-not-allowed") {
      setError("Speech recognition service is unavailable on this device.");
    } else if (code === "not-allowed" || code === "audio-capture") {
      setError("Microphone access was denied. Enable it in Settings.");
    } else if (code === "language-not-supported") {
      setError(
        "The en-US speech model isn't installed. Tap Start to download it.",
      );
    } else {
      setError(
        (event as { message?: string }).message ??
          "Speech recognition failed. Try again.",
      );
    }
    setPhase("reviewing");
    setTranscript(transcriptRef.current.trim());
  });

  // ── Handlers ──────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    setError(null);
    setTranscript("");
    transcriptRef.current = "";

    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone or speech recognition permission was denied.");
        setPhase("reviewing");
        return;
      }

      if (Platform.OS === "android") {
        setPreparing(true);
        try {
          await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
            locale: "en-US",
          });
        } catch (err) {
          console.warn("[swear] model download failed:", err);
        }
        setPreparing(false);
      }

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
        addsPunctuation: Platform.OS === "ios",
        ...(Platform.OS === "android"
          ? {
              androidRecognitionServicePackage: ANDROID_RECOGNIZER_PACKAGE,
              androidIntentOptions: {
                EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
                EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
              },
            }
          : {}),
      });

      setPhase("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error("[swear] start failed:", err);
      setError("Could not start recording.");
      setPhase("reviewing");
      setPreparing(false);
    }
  }, []);

  const handleStop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setTranscript("");
    setDevTypedText("");
    transcriptRef.current = "";
    setPhase("idle");
  }, []);

  const handleConfirm = useCallback(() => {
    if (!transcript.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSworn({ transcript: transcript.trim(), matchedPhrase: phrase });
  }, [transcript, phrase, onSworn]);

  /**
   * Dev-only: commit the typed phrase to the transcript and move to the
   * reviewing phase. Called from the "Use Phrase" button or the keyboard
   * submit action — never on every keystroke.
   */
  const handleCommitDevTyped = useCallback(() => {
    const trimmed = devTypedText.trim();
    if (!trimmed) return;
    transcriptRef.current = trimmed;
    setTranscript(trimmed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase("reviewing");
  }, [devTypedText]);

  const handleRequestClose = () => {
    if (phase === "recording") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (phase === "idle") onCancel();
  };

  const match = phase === "reviewing" ? matchSwear(transcript, phrase) : null;
  const placeholderColor = UnistylesRuntime.getTheme().colors.mutedText;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <PrimaryIcon name="checkmark-circle" size={28} />
            <Text variant="h2" color="onSurface">
              Seal the Day
            </Text>
            <Text variant="caption" color="mutedText" style={styles.subtitle}>
              You finished your exercises. Swear to it out loud.
            </Text>
          </View>

          <View style={styles.phraseCard}>
            <Text variant="caption" color="mutedText">
              Say this phrase:
            </Text>
            <Text variant="callout" color="onSurface" style={styles.phraseText}>
              "{loading ? "…" : phrase}"
            </Text>
          </View>

          {phase === "idle" && <IdleStage busy={preparing} />}
          {phase === "recording" && <RecordingStage transcript={transcript} />}
          {phase === "reviewing" && (
            <ReviewStage transcript={transcript} match={match} />
          )}

          {/* ── DEV FALLBACK: type the phrase ─────────────────── */}
          {__DEV__ && phase === "idle" && (
            <View style={styles.devBlock}>
              <Text variant="caption" color="mutedText">
                [dev] Or type the full phrase
              </Text>
              <TextInput
                value={devTypedText}
                onChangeText={setDevTypedText}
                placeholder="Type the exact phrase, then tap Use Phrase"
                placeholderTextColor={placeholderColor}
                style={styles.devInput}
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleCommitDevTyped}
              />
              <Pressable
                onPress={handleCommitDevTyped}
                disabled={devTypedText.trim().length === 0}
                style={[
                  styles.devCommit,
                  devTypedText.trim().length > 0
                    ? styles.devCommitEnabled
                    : styles.devCommitDisabled,
                ]}
              >
                <Text
                  variant="caption"
                  color={
                    devTypedText.trim().length > 0 ? "onPrimary" : "mutedText"
                  }
                >
                  Use Phrase
                </Text>
              </Pressable>
            </View>
          )}

          {error && (
            <View style={styles.errorRow}>
              <PrimaryIcon name="alert-circle-outline" size={16} />
              <Text variant="caption" color="onSurface" style={styles.flex}>
                {error}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {phase === "idle" && !preparing && (
              <Pressable onPress={onCancel} hitSlop={12}>
                <Text variant="subhead" color="mutedText">
                  Cancel
                </Text>
              </Pressable>
            )}

            {phase === "recording" && (
              <Text
                variant="caption"
                color="mutedText"
                style={styles.lockedHint}
              >
                Cannot be cancelled while recording.
              </Text>
            )}

            {phase === "reviewing" && (
              <Pressable onPress={handleRetry} hitSlop={12}>
                <Text variant="subhead" color="onSurface">
                  Try Again
                </Text>
              </Pressable>
            )}

            <View style={styles.flex} />

            {phase === "idle" && (
              <HapticPressable
                haptic="medium"
                onPress={handleStart}
                disabled={preparing}
                style={[
                  styles.primaryButton,
                  preparing ? styles.btnDisabled : styles.btnPrimary,
                ]}
              >
                {preparing ? (
                  <>
                    <ActivityIndicator size="small" color={placeholderColor} />
                    <Text variant="subheadBold" color="mutedText">
                      Preparing…
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="mic"
                      size={16}
                      color={UnistylesRuntime.getTheme().colors.onPrimary}
                    />
                    <Text variant="subheadBold" color="onPrimary">
                      Start
                    </Text>
                  </>
                )}
              </HapticPressable>
            )}

            {phase === "recording" && (
              <HapticPressable
                haptic="medium"
                onPress={handleStop}
                style={[styles.primaryButton, styles.btnPrimary]}
              >
                <Ionicons
                  name="stop"
                  size={16}
                  color={UnistylesRuntime.getTheme().colors.onPrimary}
                />
                <Text variant="subheadBold" color="onPrimary">
                  Stop
                </Text>
              </HapticPressable>
            )}

            {phase === "reviewing" && (
              <HapticPressable
                haptic="medium"
                onPress={handleConfirm}
                disabled={!match?.matched}
                style={[
                  styles.primaryButton,
                  match?.matched ? styles.btnPrimary : styles.btnDisabled,
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={16}
                  style={
                    match?.matched ? styles.iconOnPrimary : styles.iconMuted
                  }
                />
                <Text
                  variant="subheadBold"
                  color={match?.matched ? "onPrimary" : "mutedText"}
                >
                  Confirm Swear
                </Text>
              </HapticPressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function IdleStage({ busy }: { busy: boolean }) {
  return (
    <View style={styles.stage}>
      <View style={styles.micCircle}>
        <Ionicons
          name="mic"
          size={36}
          style={busy ? styles.iconMuted : styles.iconPrimary}
        />
      </View>
      <Text variant="caption" color="mutedText" style={styles.stageHint}>
        {busy
          ? "Preparing the on-device speech model…"
          : "Press Start. Speak the phrase. Press Stop when you're done."}
      </Text>
    </View>
  );
}

function RecordingStage({ transcript }: { transcript: string }) {
  return (
    <View style={styles.stage}>
      <View style={[styles.micCircle, styles.micCircleRecording]}>
        <PrimaryIcon name="mic" size={36} />
      </View>
      <Text variant="subheadBold" color="onSurface" style={styles.stageHint}>
        Speak now…
      </Text>
      {transcript.length > 0 && (
        <Text
          variant="caption"
          color="mutedText"
          style={styles.stageHint}
          numberOfLines={3}
        >
          {transcript}
        </Text>
      )}
    </View>
  );
}

function ReviewStage({
  transcript,
  match,
}: {
  transcript: string;
  match: ReturnType<typeof matchSwear> | null;
}) {
  const isEmpty = transcript.trim().length === 0;

  return (
    <View style={styles.stage}>
      <View style={styles.transcriptCard}>
        <Text variant="caption" color="mutedText">
          This is what we heard:
        </Text>
        <Text variant="callout" color="onSurface" numberOfLines={4}>
          {isEmpty ? "(no speech detected)" : transcript}
        </Text>
      </View>

      {match && !isEmpty && (
        <View style={styles.matchRow}>
          <Ionicons
            name={match.matched ? "checkmark-circle" : "close-circle"}
            size={18}
            style={match.matched ? styles.iconPrimary : styles.iconMuted}
          />
          <Text variant="caption" color="mutedText">
            {match.matched
              ? "Phrase recognized."
              : `Match: ${Math.round(match.score * 100)}% — try again.`}
          </Text>
        </View>
      )}
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
    maxWidth: 440,
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderRadius: theme.radii.lg,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
  },
  header: { alignItems: "center", gap: theme.spacing.xs },
  subtitle: { textAlign: "center" },
  phraseCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
    gap: theme.spacing.xs,
  },
  phraseText: { fontStyle: "italic" },
  stage: {
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  micCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.panel,
  },
  micCircleRecording: {
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  stageHint: { textAlign: "center", paddingHorizontal: theme.spacing.md },
  transcriptCard: {
    width: "100%",
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
    gap: theme.spacing.xs,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  devBlock: { gap: theme.spacing.xs },
  devInput: {
    borderRadius: theme.radii.sm,
    borderWidth: theme.borderWidth.thin,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
    color: theme.colors.onSurface,
  },
  devCommit: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    minHeight: 40,
  },
  devCommitEnabled: { backgroundColor: theme.colors.primary },
  devCommitDisabled: { backgroundColor: theme.colors.panelBorder },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  lockedHint: { flex: 1 },
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
  btnPrimary: { backgroundColor: theme.colors.primary },
  btnDisabled: { backgroundColor: theme.colors.panelBorder },
  iconPrimary: { color: theme.colors.primary },
  iconMuted: { color: theme.colors.mutedText },
  iconOnPrimary: { color: theme.colors.onPrimary },
}));
