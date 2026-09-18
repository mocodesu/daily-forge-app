import Text from "@/components/text";
import {
  CATALOG_CATEGORIES,
  catalogByCategory,
  type CatalogCategory,
  type CatalogExercise,
} from "@/constants/workout-catalog";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const CATEGORY_ICONS: Record<CatalogCategory, keyof typeof Ionicons.glyphMap> =
  {
    Push: "arrow-up-circle-outline",
    Pull: "arrow-down-circle-outline",
    Legs: "walk-outline",
    Core: "ellipse-outline",
    Cardio: "heart-outline",
  };

export function CatalogPickerSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: CatalogExercise) => void;
}) {
  const { theme } = useUnistyles();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        {/* ── HEADER ──────────────────────────────────────── */}
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.colors.panelBorder },
          ]}
        >
          <Pressable onPress={onClose} hitSlop={12}>
            <Text variant="subhead" color="primary">
              Close
            </Text>
          </Pressable>
          <Text variant="title" color="onBackground">
            Choose Exercise
          </Text>
          <View style={{ width: 52 }} />
        </View>

        {/* ── LIST ────────────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {CATALOG_CATEGORIES.map((category) => (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name={CATEGORY_ICONS[category]}
                  size={18}
                  color={theme.colors.primary}
                />
                <Text variant="subheadBold" color="onSurface">
                  {category}
                </Text>
              </View>

              <View style={styles.sectionItems}>
                {catalogByCategory(category).map((item) => (
                  <CatalogRow
                    key={item.name}
                    item={item}
                    onPress={() => onSelect(item)}
                  />
                ))}
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function CatalogRow({
  item,
  onPress,
}: {
  item: CatalogExercise;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();

  const summary =
    item.exerciseType === "timer"
      ? `${item.sets} × ${formatDuration(item.perSetSeconds)} • session ${formatDuration(item.sessionSeconds)}`
      : `${item.sets} × ${item.reps} reps • session ${formatDuration(item.sessionSeconds)}`;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.panelBorder,
        },
      ]}
    >
      <View style={styles.rowBody}>
        <Text variant="subheadBold" color="onSurface">
          {item.name}
        </Text>
        <Text variant="caption" color="mutedText">
          {summary}
        </Text>
        <Text variant="caption" color="mutedText" numberOfLines={1}>
          {item.notes}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={theme.colors.mutedText}
      />
    </Pressable>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}:${s.toString().padStart(2, "0")}`;
}

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
    gap: theme.spacing.xl,
  },

  section: {
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  sectionItems: {
    gap: theme.spacing.xs,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
}));
