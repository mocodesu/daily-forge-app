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
  const [starting, setStarting] = useState(false);

  /**
   * Dev-only typed phrase.
   *
   * This is intentionally separate from the real speech transcript so
   * typing doesn't immediately trigger the reviewing state.
   */
  const [devTypedText, setDevTypedText] = useState("");

  /**
   * Keep the latest transcript outside React state.
   *
   * Speech recognition can emit several interim/final result events and
   * the event callback may run independently from React renders.
   */
  const transcriptRef = useRef("");
  const finalTranscriptRef = useRef("");

  /**
   * Keep the latest phase available to event handlers without relying
   * on a potentially stale closure.
   */
  const phaseRef = useRef<Phase>("idle");

  /**
   * Prevent multiple simultaneous calls to start().
   */
  const startingRef = useRef(false);

  /**
   * Tracks whether the native recognizer is actually active.
   */
  const recognitionActiveRef = useRef(false);

  /**
   * Prevent state updates after the component is unmounted.
   */
  const mountedRef = useRef(true);
  const visibleRef = useRef(visible);
  const ignoreNativeEventsRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // Ignore cleanup errors.
      }
    };
  }, []);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // ─────────────────────────────────────────────────────────────
  // Keep phase ref synchronized with React state
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ─────────────────────────────────────────────────────────────
  // Reset when modal opens
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) {
      ignoreNativeEventsRef.current = true;

      if (recognitionActiveRef.current || startingRef.current) {
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {
          // Ignore cleanup errors.
        }
      }

      recognitionActiveRef.current = false;
      startingRef.current = false;
      return;
    }

    ignoreNativeEventsRef.current = true;
    phaseRef.current = "idle";
    recognitionActiveRef.current = false;
    startingRef.current = false;

    setPhase("idle");
    setTranscript("");
    setError(null);
    setStarting(false);
    setDevTypedText("");

    transcriptRef.current = "";
    finalTranscriptRef.current = "";
  }, [visible]);

  // ─────────────────────────────────────────────────────────────
  // Speech recognition: start
  // ─────────────────────────────────────────────────────────────

  useSpeechRecognitionEvent("start", () => {
    if (
      !mountedRef.current ||
      !visibleRef.current ||
      ignoreNativeEventsRef.current
    )
      return;

    console.log("[swear] speech recognition started");

    recognitionActiveRef.current = true;
    startingRef.current = false;

    if (!mountedRef.current) return;

    setStarting(false);
    phaseRef.current = "recording";
    setPhase("recording");

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });

  // ─────────────────────────────────────────────────────────────
  // Speech recognition: speechstart
  // ─────────────────────────────────────────────────────────────

  useSpeechRecognitionEvent("speechstart", () => {
    console.log("[swear] speech detected by recognizer");
  });

  // ─────────────────────────────────────────────────────────────
  // Speech recognition: speechend
  // ─────────────────────────────────────────────────────────────

  useSpeechRecognitionEvent("speechend", () => {
    console.log("[swear] speech ended");
  });

  // ─────────────────────────────────────────────────────────────
  // Speech recognition: volume
  // ─────────────────────────────────────────────────────────────

  useSpeechRecognitionEvent("volumechange", (event) => {
    console.log("[swear] microphone volume:", event.value);
  });

  // ─────────────────────────────────────────────────────────────
  // Speech recognition: results
  // ─────────────────────────────────────────────────────────────

  useSpeechRecognitionEvent("result", (event) => {
    if (
      !mountedRef.current ||
      !visibleRef.current ||
      ignoreNativeEventsRef.current
    )
      return;

    // Alternatives describe one segment; they must not be concatenated.
    const text = event.results?.[0]?.transcript?.trim() ?? "";

    if (!text) return;

    console.log("[swear] recognition result:", text);

    const finalized = finalTranscriptRef.current;
    const nextTranscript = finalized
      ? `${finalized} ${text}`.replace(/\s+/g, " ").trim()
      : text;

    transcriptRef.current = nextTranscript;
    if (event.isFinal) finalTranscriptRef.current = nextTranscript;

    if (phaseRef.current === "recording") setTranscript(nextTranscript);
  });

  // ─────────────────────────────────────────────────────────────
  // Speech recognition: end
  // ─────────────────────────────────────────────────────────────

  useSpeechRecognitionEvent("end", () => {
    if (
      !mountedRef.current ||
      !visibleRef.current ||
      ignoreNativeEventsRef.current
    )
      return;

    console.log(
      "[swear] recognition ended:",
      transcriptRef.current.trim() || "(empty)",
    );

    recognitionActiveRef.current = false;
    startingRef.current = false;

    if (!mountedRef.current) return;

    const finalTranscript = transcriptRef.current.trim();

    setStarting(false);
    setTranscript(finalTranscript);

    phaseRef.current = "reviewing";
    setPhase("reviewing");
  });

  // ─────────────────────────────────────────────────────────────
  // Speech recognition: error
  // ─────────────────────────────────────────────────────────────

  useSpeechRecognitionEvent("error", (event) => {
    if (
      !mountedRef.current ||
      !visibleRef.current ||
      ignoreNativeEventsRef.current
    )
      return;

    console.warn("[swear] speech recognition error:", event);

    recognitionActiveRef.current = false;
    startingRef.current = false;

    if (!mountedRef.current) return;

    const code = (event as { error?: string }).error;
    const message = (event as { message?: string }).message;

    const currentTranscript = transcriptRef.current.trim();

    if (code === "no-speech") {
      /**
       * Android can emit no-speech when it fails to produce a final
       * recognition result. Keep any useful interim transcript rather
       * than throwing it away.
       */
      setError(
        currentTranscript
          ? "I heard something but couldn't finalize the speech. Please try again."
          : "No speech was detected. Speak clearly after the microphone starts.",
      );
    } else if (code === "service-not-allowed") {
      setError(
        "Speech recognition is unavailable on this device. Check that Google's speech service is enabled.",
      );
    } else if (code === "not-allowed") {
      setError(
        "Microphone or speech recognition permission was denied. Enable microphone access in Settings.",
      );
    } else if (code === "audio-capture") {
      setError(
        "The microphone could not be opened. Check microphone permissions and make sure another app isn't using the microphone.",
      );
    } else if (code === "language-not-supported") {
      setError(
        "English (US) speech recognition isn't available on this device.",
      );
    } else if (code === "aborted" || code === "interrupted") {
      /**
       * These are generally expected when the user closes/restarts
       * recognition. Don't show a scary error for them.
       */
      setError(null);
    } else {
      setError(message ?? "Speech recognition failed. Try again.");
    }

    setStarting(false);
    setTranscript(currentTranscript);

    phaseRef.current = "reviewing";
    setPhase("reviewing");
  });

  // ─────────────────────────────────────────────────────────────
  // Start recognition
  // ─────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (startingRef.current || recognitionActiveRef.current) {
      return;
    }

    startingRef.current = true;
    ignoreNativeEventsRef.current = false;

    setError(null);
    setTranscript("");
    transcriptRef.current = "";
    finalTranscriptRef.current = "";
    setStarting(true);

    try {
      // Make sure the device supports speech recognition.
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();

      console.log("[swear] recognition available:", available);

      if (!available) {
        throw new Error("Speech recognition is not available on this device.");
      }

      // Request microphone + speech recognition permissions.
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      console.log("[swear] permissions:", permission);

      if (!permission.granted) {
        throw new Error(
          "Microphone or speech recognition permission was denied.",
        );
      }

      if (!mountedRef.current || !visibleRef.current) {
        startingRef.current = false;
        return;
      }

      // Android diagnostics.
      if (Platform.OS === "android") {
        try {
          const services =
            ExpoSpeechRecognitionModule.getSpeechRecognitionServices();

          console.log("[swear] available speech services:", services);
        } catch (err) {
          console.warn("[swear] could not inspect speech services:", err);
        }

        try {
          const defaultService =
            ExpoSpeechRecognitionModule.getDefaultRecognitionService();

          console.log("[swear] default speech service:", defaultService);
        } catch (err) {
          console.warn(
            "[swear] could not inspect default speech service:",
            err,
          );
        }
      }

      /**
       * IMPORTANT:
       *
       * We intentionally DO NOT:
       *
       * - force com.google.android.as
       * - download an offline model
       * - require on-device recognition
       *
       * This allows Android to use its normal configured speech
       * recognition service.
       */
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",

        // Show partial/interim recognition while speaking.
        interimResults: true,

        // Keep Android listening through natural pauses; Stop submits the
        // final result. Android 12 and below do not support this mode.
        continuous: Platform.OS === "android" && Number(Platform.Version) >= 33,

        // Use the normal recognition service/network when necessary.
        requiresOnDeviceRecognition: false,

        // We only ask for punctuation where supported.
        addsPunctuation: Platform.OS === "ios",

        // Bias recognition toward the oath phrase.
        contextualStrings: phrase ? [phrase] : [],

        maxAlternatives: 1,

        ...(Platform.OS === "ios"
          ? {
              iosCategory: {
                category: "playAndRecord" as const,
                categoryOptions: [
                  "defaultToSpeaker" as const,
                  "allowBluetooth" as const,
                ],
                mode: "measurement" as const,
              },
            }
          : {}),

        ...(Platform.OS === "android"
          ? {
              androidIntentOptions: {
                /**
                 * "web_search" is useful for short spoken phrases
                 * and tends to work better for this type of input.
                 */
                EXTRA_LANGUAGE_MODEL: "web_search",

                /**
                 * Give Android enough time to decide that the user
                 * has finished speaking.
                 */
                EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,

                EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,

                /**
                 * IMPORTANT for an oath that may contain swear words.
                 *
                 * Android speech services can mask offensive words.
                 * We explicitly disable that behavior.
                 */
                EXTRA_MASK_OFFENSIVE_WORDS: false,
              },
            }
          : {}),
      });

      /**
       * Don't set "recording" here.
       *
       * The native "start" event is the authoritative indication that
       * recognition has actually started.
       */
    } catch (err) {
      console.error("[swear] start failed:", err);

      startingRef.current = false;
      recognitionActiveRef.current = false;

      if (!mountedRef.current) return;

      setStarting(false);

      const message =
        err instanceof Error
          ? err.message
          : "Could not start speech recognition.";

      setError(message);

      phaseRef.current = "reviewing";
      setPhase("reviewing");
    }
  }, [phrase]);

  // ─────────────────────────────────────────────────────────────
  // Stop recognition
  // ─────────────────────────────────────────────────────────────

  const handleStop = useCallback(() => {
    if (!recognitionActiveRef.current) {
      return;
    }

    console.log("[swear] stopping recognition");

    try {
      /**
       * stop() asks the native recognizer to finish and return its
       * final result.
       *
       * Do NOT use abort() here because abort intentionally discards
       * the final recognition result.
       */
      ExpoSpeechRecognitionModule.stop();
    } catch (err) {
      console.warn("[swear] stop failed:", err);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Retry
  // ─────────────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    ignoreNativeEventsRef.current = true;

    try {
      if (recognitionActiveRef.current) {
        ExpoSpeechRecognitionModule.abort();
      }
    } catch {
      // Ignore cleanup errors.
    }

    recognitionActiveRef.current = false;
    startingRef.current = false;

    transcriptRef.current = "";
    finalTranscriptRef.current = "";

    setError(null);
    setTranscript("");
    setDevTypedText("");
    setStarting(false);

    phaseRef.current = "idle";
    setPhase("idle");
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Confirm
  // ─────────────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    const trimmed = transcript.trim();

    if (!trimmed) return;

    /**
     * Always perform the match again immediately before confirming.
     *
     * The button is disabled when there is no match, but this protects
     * the actual submission path as well.
     */
    const result = matchSwear(trimmed, phrase);

    if (!result.matched) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    onSworn({
      transcript: trimmed,
      matchedPhrase: phrase,
    });
  }, [transcript, phrase, onSworn]);

  // ─────────────────────────────────────────────────────────────
  // Dev typed fallback
  // ─────────────────────────────────────────────────────────────

  const handleCommitDevTyped = useCallback(() => {
    const trimmed = devTypedText.trim();

    if (!trimmed) return;

    transcriptRef.current = trimmed;

    setTranscript(trimmed);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    phaseRef.current = "reviewing";
    setPhase("reviewing");
  }, [devTypedText]);

  // ─────────────────────────────────────────────────────────────
  // Close behavior
  // ─────────────────────────────────────────────────────────────

  const handleRequestClose = useCallback(() => {
    if (phase === "recording") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (phase === "idle") {
      onCancel();
    }
  }, [phase, onCancel]);

  const match = phase === "reviewing" ? matchSwear(transcript, phrase) : null;

  const placeholderColor = UnistylesRuntime.getTheme().colors.mutedText;

  const theme = UnistylesRuntime.getTheme();

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
          {/* ─────────────────────────────────────────────────── */}
          {/* Header */}
          {/* ─────────────────────────────────────────────────── */}

          <View style={styles.header}>
            <PrimaryIcon name="checkmark-circle" size={28} />

            <Text variant="h2" color="onSurface">
              Seal the Day
            </Text>

            <Text variant="caption" color="mutedText" style={styles.subtitle}>
              You finished your exercises. Swear to it out loud.
            </Text>
          </View>

          {/* ─────────────────────────────────────────────────── */}
          {/* Phrase */}
          {/* ─────────────────────────────────────────────────── */}

          <View style={styles.phraseCard}>
            <Text variant="caption" color="mutedText">
              Say this phrase:
            </Text>

            <Text variant="callout" color="onSurface" style={styles.phraseText}>
              "{loading ? "…" : phrase}"
            </Text>
          </View>

          {/* ─────────────────────────────────────────────────── */}
          {/* Speech stages */}
          {/* ─────────────────────────────────────────────────── */}

          {phase === "idle" && <IdleStage busy={starting} />}

          {phase === "recording" && <RecordingStage transcript={transcript} />}

          {phase === "reviewing" && (
            <ReviewStage transcript={transcript} match={match} />
          )}

          {/* ─────────────────────────────────────────────────── */}
          {/* DEV fallback */}
          {/* ─────────────────────────────────────────────────── */}

          {__DEV__ && phase === "idle" && !starting && (
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

          {/* ─────────────────────────────────────────────────── */}
          {/* Error */}
          {/* ─────────────────────────────────────────────────── */}

          {error && (
            <View style={styles.errorRow}>
              <PrimaryIcon name="alert-circle-outline" size={16} />

              <Text variant="caption" color="onSurface" style={styles.flex}>
                {error}
              </Text>
            </View>
          )}

          {/* ─────────────────────────────────────────────────── */}
          {/* Actions */}
          {/* ─────────────────────────────────────────────────── */}

          <View style={styles.actions}>
            {/* Cancel */}
            {phase === "idle" && !starting && (
              <Pressable onPress={onCancel} hitSlop={12}>
                <Text variant="subhead" color="mutedText">
                  Cancel
                </Text>
              </Pressable>
            )}

            {/* Recording lock */}
            {phase === "recording" && (
              <Text
                variant="caption"
                color="mutedText"
                style={styles.lockedHint}
              >
                Cannot be cancelled while recording.
              </Text>
            )}

            {/* Retry */}
            {phase === "reviewing" && (
              <Pressable onPress={handleRetry} hitSlop={12}>
                <Text variant="subhead" color="onSurface">
                  Try Again
                </Text>
              </Pressable>
            )}

            <View style={styles.flex} />

            {/* Start */}
            {phase === "idle" && (
              <HapticPressable
                haptic="medium"
                onPress={handleStart}
                disabled={starting}
                style={[
                  styles.primaryButton,
                  starting ? styles.btnDisabled : styles.btnPrimary,
                ]}
              >
                {starting ? (
                  <>
                    <ActivityIndicator size="small" color={placeholderColor} />

                    <Text variant="subheadBold" color="mutedText">
                      Starting…
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="mic"
                      size={16}
                      color={theme.colors.onPrimary}
                    />

                    <Text variant="subheadBold" color="onPrimary">
                      Start
                    </Text>
                  </>
                )}
              </HapticPressable>
            )}

            {/* Stop */}
            {phase === "recording" && (
              <HapticPressable
                haptic="medium"
                onPress={handleStop}
                style={[styles.primaryButton, styles.btnPrimary]}
              >
                <Ionicons
                  name="stop"
                  size={16}
                  color={theme.colors.onPrimary}
                />

                <Text variant="subheadBold" color="onPrimary">
                  Stop
                </Text>
              </HapticPressable>
            )}

            {/* Confirm */}
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

// ───────────────────────────────────────────────────────────────
// Idle stage
// ───────────────────────────────────────────────────────────────

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
          ? "Starting speech recognition…"
          : "Press Start, speak the phrase, then press Stop when you're done."}
      </Text>
    </View>
  );
}

// ───────────────────────────────────────────────────────────────
// Recording stage
// ───────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────
// Review stage
// ───────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  flex: {
    flex: 1,
  },

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

  header: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },

  subtitle: {
    textAlign: "center",
  },

  phraseCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.panelBorder,
    gap: theme.spacing.xs,
  },

  phraseText: {
    fontStyle: "italic",
  },

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

  stageHint: {
    textAlign: "center",
    paddingHorizontal: theme.spacing.md,
  },

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

  devBlock: {
    gap: theme.spacing.xs,
  },

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

  devCommitEnabled: {
    backgroundColor: theme.colors.primary,
  },

  devCommitDisabled: {
    backgroundColor: theme.colors.panelBorder,
  },

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

  lockedHint: {
    flex: 1,
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

  btnPrimary: {
    backgroundColor: theme.colors.primary,
  },

  btnDisabled: {
    backgroundColor: theme.colors.panelBorder,
  },

  iconPrimary: {
    color: theme.colors.primary,
  },

  iconMuted: {
    color: theme.colors.mutedText,
  },

  iconOnPrimary: {
    color: theme.colors.onPrimary,
  },
}));
