import { APP_NAME } from ".";

export type LegalDocumentId = "privacy" | "terms";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

// ─────────────────────────────────────────────────────────────
// Single source of truth for app identity and publisher details.
// Update these values before publishing.
// ─────────────────────────────────────────────────────────────

export const PUBLISHER_NAME = "mocodesu";
export const PRIVACY_CONTACT = "privacy@mocodesu.com"; // TODO: confirm before publishing
export const SUPPORT_CONTACT = "support@mocodesu.com"; // TODO: confirm before publishing
export const EFFECTIVE_DATE = "September 20, 2026";

// ─────────────────────────────────────────────────────────────
// Shared snippets
// ─────────────────────────────────────────────────────────────
const contactLine = `For privacy questions or data requests, contact us at ${PRIVACY_CONTACT}. For general support, contact us at ${SUPPORT_CONTACT}.`;

// ─────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────
export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    title: "Privacy Policy",
    updated: `Last updated ${EFFECTIVE_DATE}`,
    intro: `This Privacy Policy explains how ${PUBLISHER_NAME} ("we", "us", "our") handles information when you use ${APP_NAME} (the "App"). ${APP_NAME} is a local-first fitness and habit-tracking application. By using the App, you acknowledge the practices described in this policy.`,
    sections: [
      {
        heading: "Summary",
        paragraphs: [
          `${APP_NAME} is designed to keep your fitness data on your device. We do not operate a server account for your workout history. Limited diagnostic and speech-related data may be processed by third-party providers as described below.`,
        ],
        bullets: [
          "Workout history, profile, and settings are stored locally on your device.",
          "We do not sell your personal information.",
          "We do not use your data for advertising.",
          "Diagnostic data is processed by Sentry as described in the Diagnostics section.",
          "You can delete your local data at any time through the App or your device settings.",
        ],
      },
      {
        heading: `What ${APP_NAME} does`,
        paragraphs: [
          `${APP_NAME} helps you create and complete exercises, track daily progress and streaks, set goals, record optional spoken oaths, view history and recaps, and receive optional reminders. The App does not currently require an account and does not provide a server-side account for storing your workout history.`,
        ],
      },
      {
        heading: "Information you provide",
        paragraphs: [
          `Depending on the features you use, you may provide the following information directly to the App. This information is stored locally on your device unless otherwise stated:`,
        ],
        bullets: [
          "Display name and unit preferences.",
          "Starting and goal weight, and starting height.",
          "Optional front and side progress-photo file references.",
          "Exercises, body parts, sets, reps, durations, notes, and ordering.",
          "Exercise start and completion times, streaks, freezes, locked days, and milestones.",
          "Milestone notes, oath phrases, spoken transcripts, matched phrases, and reminder settings.",
        ],
      },
      {
        heading: "Speech recognition and microphone access",
        paragraphs: [
          `When you use the spoken oath feature, ${APP_NAME} requests microphone and speech-recognition permission. The device operating system and its speech-recognition provider may process the audio and return a transcript. ${APP_NAME} uses that transcript to compare your oath and stores the transcript and matched phrase locally on your device.`,
          `${APP_NAME} does not intentionally upload raw microphone recordings to its own servers. Apple, Google, or another operating-system provider may process speech according to their own terms and privacy policies. You should review those policies if you have concerns about speech processing.`,
        ],
      },
      {
        heading: "Progress photos and backups",
        paragraphs: [
          `Progress photos remain subject to your device photo-library, file-provider, device-backup, or cloud-sync settings. ${APP_NAME} can export a JSON backup containing preferences, profile, exercises, completions, day locks, oaths, milestones, and frozen days. You are responsible for protecting exported files and choosing where they are stored or shared.`,
        ],
      },
      {
        heading: "Notifications",
        paragraphs: [
          `If you grant permission, ${APP_NAME} schedules daily and limited inactivity reminders locally through the operating system. You can disable them in the App or in your device settings. Delivery and device-level processing are partly controlled by Apple, Google, and your device settings.`,
        ],
      },
      {
        heading: "Diagnostics and Sentry",
        paragraphs: [
          `${APP_NAME} uses Sentry for crash reporting, diagnostics, performance monitoring, session replay, and user feedback. Depending on the event, Sentry may receive crash reports, stack traces, performance data, device and operating-system details, app and update identifiers, screenshots, and session-replay information.`,
          "The current App configuration enables default PII, screenshot attachment, and session replay. Text, images, and vectors are not globally masked. Information visible on a captured screen may therefore appear in a diagnostic event. We recommend that you avoid entering highly sensitive information into the App.",
          "Sentry processes this data on our behalf. See Sentry's privacy documentation at https://sentry.io/privacy for details on how Sentry handles information.",
        ],
      },
      {
        heading: "Legal bases for processing (EEA, UK, and Switzerland)",
        paragraphs: [
          `If you are located in the European Economic Area, the United Kingdom, or Switzerland, we process personal information under the following legal bases:`,
        ],
        bullets: [
          "Performance of a contract: to provide the App's core features you request.",
          "Legitimate interests: to maintain the security, stability, and performance of the App, including crash and diagnostic reporting.",
          "Consent: for microphone access, speech recognition, notifications, and any optional feature that requires your permission. You may withdraw consent at any time through the App or your device settings.",
          "Legal obligation: where we are required to retain or disclose information by law.",
        ],
      },
      {
        heading: "Your privacy rights",
        paragraphs: [
          `Depending on your jurisdiction, you may have rights to access, correct, delete, restrict, or object to the processing of your personal information, and to data portability. Because most data is stored locally on your device, you can exercise many of these rights directly through the App's data-management controls.`,
          `For information processed by Sentry on our behalf, you may contact us to exercise your rights. We will respond within the timeframe required by applicable law. ${contactLine}`,
        ],
      },
      {
        heading: "Retention and deletion",
        paragraphs: [
          `Local data remains on your device until you delete it through the App's data-management controls, clear App storage, uninstall the App, or overwrite or import other data. Device backups and cloud-sync services may retain copies according to their own settings.`,
          `Because ${APP_NAME} has no central workout-data account, there is generally no server-side account to delete. Sentry data follows our Sentry configuration and Sentry's applicable retention policies.`,
        ],
      },
      {
        heading: "Children's privacy",
        paragraphs: [
          `${APP_NAME} is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If local law sets a higher minimum age, that age applies. If you believe a child has provided personal information, please contact us so we can take appropriate action.`,
        ],
      },
      {
        heading: "Security and international processing",
        paragraphs: [
          `The App uses operating-system storage and permission controls. However, no method of storage or transmission is completely secure, and we cannot guarantee absolute security. Sentry, platform providers, and speech-recognition providers may process information in countries other than where you live. Where required, we rely on appropriate safeguards for international transfers.`,
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          `We may update this policy when the App, our services, or legal requirements change. When we make material changes, we will update the "Last updated" date and, where appropriate, provide additional notice within the App. Continued use of the App after the revised date means the updated policy applies to future use, to the extent permitted by law.`,
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`${contactLine}`, `Publisher: ${PUBLISHER_NAME}.`],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: `Last updated ${EFFECTIVE_DATE}`,
    intro: `These Terms of Service ("Terms") govern your use of ${APP_NAME} (the "App"), provided by ${PUBLISHER_NAME} ("we", "us", "our"). By installing, accessing, or using the App, you agree to these Terms. If you do not agree, do not use the App.`,
    sections: [
      {
        heading: "The service",
        paragraphs: [
          `${APP_NAME} provides local-first tools for creating exercises, tracking workouts and habits, setting goals, recording optional oaths, viewing history and recaps, and scheduling optional reminders. Features may change, be suspended, or be removed as the App develops.`,
        ],
      },
      {
        heading: "Eligibility",
        paragraphs: [
          `You must be at least 13 years old to use the App, or the higher minimum age required in your jurisdiction. If you are under the age of majority in your jurisdiction, you may use the App only with the involvement of a parent or legal guardian.`,
        ],
      },
      {
        heading: "Fitness and health disclaimer",
        paragraphs: [
          `${APP_NAME} is a tracking and motivation tool. It is not medical, fitness, nutritional, mental-health, or emergency advice. It does not diagnose, treat, cure, or prevent disease or injury and does not replace a physician, qualified trainer, or other professional.`,
          `Exercise involves inherent risks, including injury, illness, or death. Choose activities appropriate for your condition and ability. Stop exercising and seek appropriate medical help if you experience concerning symptoms. Do not use ${APP_NAME} for emergency decisions.`,
        ],
      },
      {
        heading: "Your content",
        paragraphs: [
          `You retain your rights in content you enter, including exercise notes, profile information, measurements, photos, oath phrases, speech transcripts, and milestone notes. You grant ${APP_NAME} a limited, non-exclusive, royalty-free license to store, display, import, export, process, and match that content solely for the purpose of providing the App's functions.`,
          `You are responsible for ensuring that your content is accurate, lawful, and appropriate to store or share. Do not enter another person's private information or sensitive information that you do not want exposed through device storage, backups, sharing, diagnostics, screenshots, or session replay.`,
        ],
      },
      {
        heading: "Speech and notifications",
        paragraphs: [
          `Speech recognition may be performed by an operating-system provider, and results can be inaccurate. You are responsible for the permissions you grant and for any content used with the spoken oath feature.`,
          `Reminder delivery can be delayed, blocked, duplicated, or unavailable because of device settings, battery restrictions, network conditions, or platform changes. ${APP_NAME} does not guarantee notification delivery.`,
        ],
      },
      {
        heading: "Backups and data management",
        paragraphs: [
          `You are responsible for reviewing, protecting, and retaining JSON backups. Imported data can affect local records according to the App's current implementation. Do not rely on ${APP_NAME} as your only copy of important information.`,
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [`You must not:`],
        bullets: [
          "Reverse engineer, decompile, disassemble, or extract source code except where law permits it.",
          "Bypass security, permissions, rate limits, or technical restrictions.",
          "Interfere with the App, its update system, or diagnostic services.",
          "Use the App to harm, harass, impersonate, or violate another person's rights.",
          "Distribute malicious code or unlawful material through an App-supported workflow.",
          "Use the App in violation of any applicable law or regulation.",
        ],
      },
      {
        heading: "Ownership and third-party services",
        paragraphs: [
          `${APP_NAME}'s name, branding, interface, original software, artwork, sounds, and supplied materials are owned by or licensed to ${PUBLISHER_NAME}. You receive a limited, personal, non-exclusive, non-transferable, revocable license to use the App for its intended purpose.`,
          `The App depends on Expo, Apple or Google services, Sentry, speech-recognition providers, notification services, and file and sharing providers. Those services have their own terms, privacy policies, limitations, and availability requirements. We are not responsible for third-party services.`,
        ],
      },
      {
        heading: "Availability and updates",
        paragraphs: [
          `We may release native or over-the-air updates to fix bugs, improve security, change features, or modify compatibility. We do not guarantee that the App will always be available, uninterrupted, error-free, or compatible with every device.`,
        ],
      },
      {
        heading: "Disclaimer of warranties",
        paragraphs: [
          `To the maximum extent permitted by law, the App is provided "as is" and "as available", except for warranties that cannot legally be excluded. We disclaim all other warranties, whether express, implied, or statutory, including any implied warranties of merchantability, fitness for a particular purpose, and non-infringement.`,
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          `To the maximum extent permitted by law, ${APP_NAME} and ${PUBLISHER_NAME} will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, or business arising from or related to your use of the App.`,
          `To the maximum extent permitted by law, our total aggregate liability arising out of or relating to these Terms or the App will not exceed the greater of (a) the amount you paid us for the App in the twelve months preceding the claim, or (b) ten US dollars (or the equivalent in your local currency).`,
          `Nothing in these Terms excludes or limits any consumer right or liability that cannot legally be excluded or limited in your jurisdiction.`,
        ],
      },
      {
        heading: "Indemnity",
        paragraphs: [
          `To the extent permitted by law, you agree to indemnify and hold harmless ${PUBLISHER_NAME} from any claims, damages, liabilities, and expenses arising from your misuse of the App or your violation of these Terms.`,
        ],
      },
      {
        heading: "Termination",
        paragraphs: [
          `We may suspend or terminate your access to the App if you violate these Terms or if we discontinue the App. You may stop using the App at any time. Sections that by their nature should survive termination, including ownership, disclaimers, and limitation of liability, will survive.`,
        ],
      },
      {
        heading: "Governing law and disputes",
        paragraphs: [
          `These Terms are governed by the laws of the publisher's principal place of business, without regard to conflict-of-law rules, except where mandatory consumer protection laws in your jurisdiction provide otherwise.`,
          `Nothing in this section prevents you from bringing a claim in a court that has jurisdiction over you under applicable consumer law.`,
        ],
      },
      {
        heading: "Changes to these Terms",
        paragraphs: [
          `We may update these Terms as the App or the law changes. When we make material changes, we will update the "Last updated" date and, where appropriate, provide additional notice within the App. Continued use after the revised date means the updated Terms apply to future use, to the extent permitted by law.`,
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`${contactLine}`, `Publisher: ${PUBLISHER_NAME}.`],
      },
    ],
  },
};
