import { HapticPressable } from "@/components/haptic-pressable";
import Text from "@/components/text";
import {
  DataManagementRepo,
  type TableCounts,
} from "@/repositories/data-management-repo";
import {
  buildBackupJson,
  parseBackupJson,
  summarizeBackup,
  writeBackupFile,
} from "@/utils/backup";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export default function DataManagementScreen() {
  const { theme } = useUnistyles();
  const db = useSQLiteContext();

  const [counts, setCounts] = useState<TableCounts | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | "wipe" | null>(null);

  const loadCounts = useCallback(async () => {
    try {
      const result = await DataManagementRepo.counts(db);
      setCounts(result);
    } catch (err) {
      console.warn("[data] counts failed:", err);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts]),
  );

  // ── Export ─────────────────────────────────────────────────
  const handleExport = async () => {
    setBusy("export");
    try {
      const json = await buildBackupJson(db, "1.0.0");
      const { uri, filename } = writeBackupFile(json);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Sharing unavailable",
          "This device can't open a share sheet.",
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/json",
        dialogTitle: `Export ${filename}`,
        UTI: "public.json",
      });
    } catch (err) {
      console.error("[data] export failed:", err);
      Alert.alert(
        "Export failed",
        err instanceof Error ? err.message : "Unknown error.",
      );
    } finally {
      setBusy(null);
    }
  };

  // ── Import ─────────────────────────────────────────────────
  const handleImport = async () => {
    setBusy("import");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled) {
        setBusy(null);
        return;
      }

      const uri = picked.assets[0].uri;
      const response = await fetch(uri);
      const raw = await response.text();

      const payload = parseBackupJson(raw);
      const summary = summarizeBackup(payload);

      Alert.alert(
        "Restore from backup?",
        `This will REPLACE all current data with:\n\n` +
          `• ${summary.exercises} exercises\n` +
          `• ${summary.completions} completions\n` +
          `• ${summary.dayLocks} locked days\n` +
          `• ${summary.swears} swears\n` +
          `• ${summary.milestones} milestones\n` +
          `• ${summary.hasProfile ? "1 profile" : "no profile"}\n` +
          `• ${summary.preferenceCount} preferences\n\n` +
          `Export from v${payload.appVersion}, dated ${new Date(payload.exportedAt).toLocaleString()}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: async () => {
              try {
                await DataManagementRepo.restoreFrom(db, payload);
                await loadCounts();
                Alert.alert(
                  "Restore complete",
                  "Your data has been replaced. Return to the app to see it.",
                  [{ text: "OK", onPress: () => router.back() }],
                );
              } catch (err) {
                console.error("[data] restore failed:", err);
                Alert.alert(
                  "Restore failed",
                  err instanceof Error ? err.message : "Unknown error.",
                );
              }
            },
          },
        ],
      );
    } catch (err) {
      console.error("[data] import failed:", err);
      Alert.alert(
        "Import failed",
        err instanceof Error ? err.message : "Unknown error.",
      );
    } finally {
      setBusy(null);
    }
  };

  // ── Wipe ───────────────────────────────────────────────────
  const handleWipe = () => {
    Alert.alert(
      "Wipe all data?",
      "This deletes every exercise, completion, swear, milestone, and your profile. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export First",
          onPress: async () => {
            await handleExport();
            // After the share sheet closes, ask again
            setTimeout(() => confirmWipe(), 500);
          },
        },
        {
          text: "Wipe",
          style: "destructive",
          onPress: () => confirmWipe(),
        },
      ],
    );
  };

  const confirmWipe = () => {
    Alert.alert(
      "Really wipe?",
      "There is no undo. Make sure you've exported a backup if you want to keep anything.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, wipe everything",
          style: "destructive",
          onPress: async () => {
            setBusy("wipe");
            try {
              await DataManagementRepo.wipeAll(db);
              await loadCounts();
              Alert.alert(
                "Data wiped",
                "The app will return to onboarding the next time it starts.",
                [{ text: "OK", onPress: () => router.back() }],
              );
            } catch (err) {
              console.error("[data] wipe failed:", err);
              Alert.alert(
                "Wipe failed",
                err instanceof Error ? err.message : "Unknown error.",
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* ── HEADER ────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h1" color="onBackground">
            Data
          </Text>
          <Text variant="subhead" color="mutedText">
            Everything stays on your device.
          </Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="subhead" color="primary">
            Close
          </Text>
        </Pressable>
      </View>

      {/* ── STORAGE ───────────────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="subheadBold" color="onSurface">
          Storage
        </Text>

        {counts === null ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <View style={styles.grid}>
            <StatTile label="Exercises" value={counts.exercises} />
            <StatTile label="Completions" value={counts.completions} />
            <StatTile label="Locked days" value={counts.dayLocks} />
            <StatTile label="Swears" value={counts.swears} />
            <StatTile label="Milestones" value={counts.milestones} />
            <StatTile
              label="Profile"
              value={counts.hasProfile ? "yes" : "none"}
            />
          </View>
        )}
      </View>

      {/* ── EXPORT / IMPORT ───────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="subheadBold" color="onSurface">
          Backup
        </Text>

        <ActionRow
          icon="share-outline"
          title="Export JSON"
          subtitle="Share a full snapshot to Files, Drive, email…"
          onPress={handleExport}
          busy={busy === "export"}
          disabled={busy !== null}
        />

        <ActionRow
          icon="download-outline"
          title="Import Backup"
          subtitle="Replace current data with a previous export"
          onPress={handleImport}
          busy={busy === "import"}
          disabled={busy !== null}
        />
      </View>

      {/* ── DANGER ZONE ───────────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="subheadBold" color="onSurface">
          Danger zone
        </Text>

        <HapticPressable
          haptic="heavy"
          onPress={handleWipe}
          disabled={busy !== null}
          style={[styles.dangerButton, { borderColor: theme.colors.primary }]}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={theme.colors.primary}
          />
          <Text variant="subheadBold" color="primary">
            {busy === "wipe" ? "Wiping…" : "Wipe All Data"}
          </Text>
        </HapticPressable>

        <Text variant="caption" color="mutedText" style={styles.dangerHint}>
          Deletes every exercise, record, swear, and milestone. There is no
          undo.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.statTile}>
      <Text variant="title" color="onSurface">
        {value}
      </Text>
      <Text variant="caption" color="mutedText">
        {label}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  busy,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionRow, { opacity: disabled && !busy ? 0.5 : 1 }]}
    >
      <View
        style={[styles.actionIcon, { backgroundColor: theme.colors.panel }]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        )}
      </View>
      <View style={styles.actionBody}>
        <Text variant="subheadBold" color="onSurface">
          {title}
        </Text>
        <Text variant="caption" color="mutedText">
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.colors.mutedText}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingTop: rt.insets.top + theme.spacing.lg,
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingBottom: theme.spacing.giant,
    gap: theme.spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  section: {
    gap: theme.spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 100,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
    gap: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.panelBorder,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBody: {
    flex: 1,
    gap: 2,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thick,
    borderStyle: "dashed",
  },
  dangerHint: {
    textAlign: "center",
  },
}));
