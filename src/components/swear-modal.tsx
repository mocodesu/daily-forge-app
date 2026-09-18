import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
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
import { StyleSheet, useUnistyles } from "react-native-unistyles";

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
  const { theme } = useUnistyles();
  const { phrase, loading } = useSwearPhrase();

  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const transcriptRef = useRef("");
  const hasFinalRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setPhase("idle");
      setTranscript("");
      setError(null);
      setPreparing(false);
      transcriptRef.current = "";
      hasFinalRef.current = false;
    }
  }, [visible]);

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

  const handleStart = useCallback(async () => {
    setError(null);
    setTranscript("");
    transcriptRef.current = "";
    hasFinalRef.current = false;

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
          const result =
            await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload(
              { locale: "en-US" },
            );
          console.log("[swear] model download result:", result);
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
    transcriptRef.current = "";
    setPhase("idle");
  }, []);

  const handleConfirm = useCallback(() => {
    if (!transcript.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSworn({ transcript: transcript.trim(), matchedPhrase: phrase });
  }, [transcript, phrase, onSworn]);

  const handleDevTyped = useCallback(
    (text: string) => {
      transcriptRef.current = text;
      setTranscript(text);
      if (text.length > 0 && phase === "idle") {
        setPhase("reviewing");
      }
    },
    [phase],
  );

  const match = phase === "reviewing" ? matchSwear(transcript, phrase) : null;

  const handleRequestClose = () => {
    if (phase === "recording") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (phase === "idle") onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}
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
          <View style={styles.header}>
            <Ionicons
              name="checkmark-circle"
              size={28}
              color={theme.colors.primary}
            />
            <Text variant="h2" color="onSurface">
              Seal the Day
            </Text>
            <Text variant="caption" color="mutedText" style={styles.subtitle}>
              You finished your exercises. Swear to it out loud.
            </Text>
          </View>

          <View
            style={[
              styles.phraseCard,
              {
                backgroundColor: theme.colors.panel,
                borderColor: theme.colors.panelBorder,
              },
            ]}
          >
            <Text variant="caption" color="mutedText">
              Say this phrase:
            </Text>
            <Text variant="callout" color="onSurface" style={styles.phraseText}>
              "{loading ? "…" : phrase}"
            </Text>
          </View>

          {phase === "idle" && (
            <IdleStage onStart={handleStart} busy={preparing} />
          )}
          {phase === "recording" && <RecordingStage transcript={transcript} />}
          {phase === "reviewing" && (
            <ReviewStage transcript={transcript} match={match} />
          )}

          {/* ── DEV FALLBACK: typed phrase ──────────────────── */}
          {__DEV__ && phase === "idle" && (
            <View style={styles.devBlock}>
              <Text variant="caption" color="mutedText">
                [dev] Or type the phrase to bypass the mic
              </Text>
              <TextInput
                placeholder="Type the exact phrase"
                placeholderTextColor={theme.colors.mutedText}
                style={[
                  styles.devInput,
                  {
                    backgroundColor: theme.colors.panel,
                    borderColor: theme.colors.panelBorder,
                    color: theme.colors.onSurface,
                  },
                ]}
                onChangeText={handleDevTyped}
                autoCapitalize="sentences"
              />
            </View>
          )}

          {error && (
            <View style={styles.errorRow}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={theme.colors.primary}
              />
              <Text variant="caption" color="onSurface" style={{ flex: 1 }}>
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

            <View style={{ flex: 1 }} />

            {phase === "idle" && (
              <HapticPressable
                haptic="medium"
                onPress={handleStart}
                disabled={preparing}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: preparing
                      ? theme.colors.panelBorder
                      : theme.colors.primary,
                  },
                ]}
              >
                {preparing ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.mutedText}
                    />
                    <Text variant="subheadBold" color="mutedText">
                      Preparing…
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

            {phase === "recording" && (
              <HapticPressable
                haptic="medium"
                onPress={handleStop}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.colors.primary },
                ]}
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

            {phase === "reviewing" && (
              <HapticPressable
                haptic="medium"
                onPress={handleConfirm}
                disabled={!match?.matched}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: match?.matched
                      ? theme.colors.primary
                      : theme.colors.panelBorder,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={
                    match?.matched
                      ? theme.colors.onPrimary
                      : theme.colors.mutedText
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

function IdleStage({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.stage}>
      <View style={[styles.micCircle, { backgroundColor: theme.colors.panel }]}>
        <Ionicons
          name="mic"
          size={36}
          color={busy ? theme.colors.mutedText : theme.colors.primary}
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
  const { theme } = useUnistyles();
  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.micCircle,
          styles.micCircleRecording,
          { backgroundColor: theme.colors.panel },
        ]}
      >
        <Ionicons name="mic" size={36} color={theme.colors.primary} />
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
  const { theme } = useUnistyles();
  const isEmpty = transcript.trim().length === 0;

  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.transcriptCard,
          {
            backgroundColor: theme.colors.panel,
            borderColor: theme.colors.panelBorder,
          },
        ]}
      >
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
            color={
              match.matched ? theme.colors.primary : theme.colors.mutedText
            }
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
  },
  header: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  subtitle: { textAlign: "center" },
  phraseCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
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
    minHeight: 40,
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
}));
