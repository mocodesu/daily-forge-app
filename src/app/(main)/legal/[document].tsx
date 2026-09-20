import { ScrollScreen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import Text from "@/components/text";
import { LEGAL_DOCUMENTS, type LegalDocumentId } from "@/constants/legal";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

function isLegalDocumentId(
  value: string | undefined,
): value is LegalDocumentId {
  return value === "privacy" || value === "terms";
}

export default function LegalDocumentScreen() {
  const { document } = useLocalSearchParams<{ document?: string }>();
  const documentId = isLegalDocumentId(document) ? document : "privacy";
  const legalDocument = LEGAL_DOCUMENTS[documentId];

  return (
    <ScrollScreen
      header={<ScreenHeader title={legalDocument.title} />}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.intro}>
        <Text variant="caption" color="mutedText">
          {legalDocument.updated}
        </Text>
        <Text variant="body" color="onBackground">
          {legalDocument.intro}
        </Text>
      </View>

      {legalDocument.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text variant="h3" color="onBackground">
            {section.heading}
          </Text>

          {section.paragraphs.map((paragraph, index) => (
            <Text
              key={`${section.heading}-${index}`}
              variant="body"
              color="onBackground"
            >
              {paragraph}
            </Text>
          ))}

          {section.bullets && (
            <View style={styles.bullets}>
              {section.bullets.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <View style={styles.bullet} />
                  <Text
                    variant="body"
                    color="onBackground"
                    style={styles.bulletText}
                  >
                    {bullet}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create((theme) => ({
  contentContainer: {
    gap: theme.spacing.xxl,
  },
  intro: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.panelBorder,
  },
  section: {
    gap: theme.spacing.sm,
  },
  bullets: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xxs,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    backgroundColor: theme.colors.primary,
  },
  bulletText: {
    flex: 1,
  },
}));
