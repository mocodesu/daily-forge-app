import Text from "@/components/text";
import { MutedIcon, PrimaryIcon } from "@/components/themed";
import {
  CATALOG_CATEGORIES,
  catalogByCategory,
  type CatalogCategory,
  type CatalogExercise,
} from "@/constants/workout-catalog";
import { formatDuration } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

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
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text variant="subhead" color="primary">
              Close
            </Text>
          </Pressable>
          <Text variant="title" color="onBackground">
            Choose Exercise
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {CATALOG_CATEGORIES.map((category) => (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <PrimaryIcon name={CATEGORY_ICONS[category]} size={18} />
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

          <View style={styles.bottomSpacer} />
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
  const summary =
    item.exerciseType === "timer"
      ? `${item.sets} × ${formatDuration(item.perSetSeconds)} • session ${formatDuration(
          item.sessionSeconds,
        )}`
      : `${item.sets} × ${item.reps} reps • session ${formatDuration(
          item.sessionSeconds,
        )}`;

  return (
    <Pressable onPress={onPress} style={styles.row}>
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

      <MutedIcon name="chevron-forward" size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.layout.screenPaddingH,
    // Clears the Android status bar. On iOS pageSheet, rt.insets.top is 0
    // inside the modal, so nothing is double-padded.
    paddingTop: rt.insets.top + theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.panelBorder,
  },
  headerSpacer: { width: 52 },
  content: {
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.lg,
    // Clears the Android nav bar / iOS home indicator at the bottom.
    paddingBottom: rt.insets.bottom + theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  bottomSpacer: { height: 40 },
  section: { gap: theme.spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  sectionItems: { gap: theme.spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.panelBorder,
    minHeight: 68,
  },
  rowBody: { flex: 1, gap: 2, minWidth: 0 },
}));
