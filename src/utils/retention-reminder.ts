// ============================================================================
// retention-reminder.ts — DailyForge
// ============================================================================
//
// Two distinct notification systems run in this app:
//
//   1. Daily reminder (see `use-daily-reminder.ts`)
//      Time-based. Fires at a fixed hour every day if the user hasn't
//      completed today's exercises yet. Cancels for the day when the user
//      seals it.
//
//   2. Retention reminders (this file)
//      Inactivity-based. Fires a short three-stage sequence when the user
//      hasn't opened the app or completed anything in a while. Meant to
//      win back users who've drifted, not to nag daily users.
//
// The two systems are complementary. Daily reminders assume the user is
// engaged and just needs a nudge at the right hour. Retention reminders
// assume the user has stopped showing up entirely.
//
// HOW TO WIRE IT UP
//   • `useRetentionReminders()` (in hooks) calls `initializeRetentionReminders()`
//     once at app startup to re-arm the sequence for a returning user.
//   • `trackUserActivity()` is called whenever the user does something
//     meaningful — completing an exercise, swearing, or simply opening the
//     app. It resets the countdown and reschedules the sequence.
//
// HOW IT AVOIDS SPAMMING PEOPLE
//   • Every `trackUserActivity()` call cancels and rebuilds the whole
//     sequence, so reminders never stack up.
//   • `trackUserActivity()` is throttled (see CONFIG) so rapid repeat calls
//     — e.g. on every screen focus — don't cause churn.
//   • Reminders only fire inside a quiet-hours window defined below.
//   • `areRemindersSuppressed()` is the single place to disable reminders
//     for a user (currently always false; wire it to a future setting).
// ============================================================================

import {
  deleteStoredValues,
  getStoredValues,
  saveSecurely,
} from "@/store/storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ─────────────────────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────────────────────

const STATE_KEY = "retention.state";
const PERMISSION_PROMPTED_KEY = "retention.permissionPrompted";

// ─────────────────────────────────────────────────────────────
// Notification identifiers & Android channel
// ─────────────────────────────────────────────────────────────

const RETENTION_CHANNEL_ID = "retention-reminders";
const UPDATE_CHANNEL_ID = "update-reminders";

const RETENTION_NOTIFICATION_IDS = [
  "retention-reminder-1",
  "retention-reminder-2",
  "retention-reminder-3",
] as const;

// ─────────────────────────────────────────────────────────────
// Time constants
// ─────────────────────────────────────────────────────────────

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** Minimum lead time before a scheduled reminder, in ms. */
const MIN_SCHEDULE_LEAD_MS = 60 * MINUTE_MS;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface RetentionState {
  lastActivityAt: number;
  lastScheduledAt: number;
}

interface ReminderTemplate {
  title: string;
  body: string;
}

interface ReminderStage {
  id: string;
  delayMs: number;
  /** Per-stage minute offset so stages don't all fire at :00. */
  minuteOffset: number;
}

// ─────────────────────────────────────────────────────────────
// CONFIG — DailyForge tuning
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  /** Minimum time between two recorded activity events. Prevents writes
   *  and reschedules from firing repeatedly on every screen focus. */
  trackActivityThrottleMs: 10 * MINUTE_MS,

  /** Quiet-hours window in local time. Reminders get pushed to the next
   *  window if the computed time falls outside. */
  windowStartHour: 9,
  windowEndHour: 21,
  windowBaseMinute: 15,

  /** Minimum spacing between two consecutive stages after window
   *  normalization — prevents stages from bunching up. */
  minStageSpacingMs: 30 * MINUTE_MS,

  /** Android channel copy. */
  channelName: "Reminders",
  channelDescription:
    "Occasional nudges when you haven't opened DailyForge in a while.",
};

// ─────────────────────────────────────────────────────────────
// Reminder stages
//
// Sequence of three stages. Each fires `delayMs` after the last recorded
// activity, adjusted to fall within the quiet-hours window.
//
//   Stage 1:  30 hours — "you missed yesterday"
//   Stage 2:  78 hours — "three days is a pattern"
//   Stage 3: 174 hours — "last chance"  (~7 days)
// ─────────────────────────────────────────────────────────────

const REMINDER_STAGES: readonly ReminderStage[] = [
  {
    id: RETENTION_NOTIFICATION_IDS[0],
    delayMs: 30 * HOUR_MS,
    minuteOffset: 0,
  },
  {
    id: RETENTION_NOTIFICATION_IDS[1],
    delayMs: 78 * HOUR_MS,
    minuteOffset: 5,
  },
  {
    id: RETENTION_NOTIFICATION_IDS[2],
    delayMs: 174 * HOUR_MS,
    minuteOffset: 10,
  },
];

// ─────────────────────────────────────────────────────────────
// Notification copy — DailyForge tone
// ─────────────────────────────────────────────────────────────

const REMINDER_TEMPLATES: readonly ReminderTemplate[][] = [
  // Stage 1 — ~30 hours since last activity
  [
    {
      title: "Yesterday slipped by",
      body: "Your {context} are still waiting. A few minutes gets you back on track.",
    },
    {
      title: "One day off is fine",
      body: "Two is a habit. Open DailyForge and do today's {context}.",
    },
    {
      title: "Back on the horse?",
      body: "Your {context} are right where you left them.",
    },
  ],
  // Stage 2 — ~3 days since last activity
  [
    {
      title: "Three days is a pattern",
      body: "The longer the gap, the harder it is to restart. Do today's {context}.",
    },
    {
      title: "Still here",
      body: "DailyForge hasn't heard from you. Pick up your {context}.",
    },
    {
      title: "Don't lose the streak you built",
      body: "Your {context} take minutes. Come back.",
    },
  ],
  // Stage 3 — ~7 days since last activity
  [
    {
      title: "Last nudge",
      body: "We'll stop reminding you after this. Your {context} are still here if you want them.",
    },
    {
      title: "One more try?",
      body: "Open DailyForge and pick up your {context}. No pressure after this.",
    },
    {
      title: "The door's still open",
      body: "Whenever you're ready — your {context} are waiting.",
    },
  ],
];

// ─────────────────────────────────────────────────────────────
// Context label — inserted into the {context} placeholder above
// ─────────────────────────────────────────────────────────────

const getReminderContextLabel = (): string => {
  return "exercises";
};

// ─────────────────────────────────────────────────────────────
// Suppression hook — return true to disable reminders entirely
// ─────────────────────────────────────────────────────────────

const areRemindersSuppressed = (): boolean => {
  return false;
};

// ─────────────────────────────────────────────────────────────
// In-memory caches
// ─────────────────────────────────────────────────────────────

let stateCache: RetentionState | null = null;
let permissionPromptedCache: boolean | null = null;
let channelSetupPromise: Promise<void> | null = null;

// ─────────────────────────────────────────────────────────────
// State load/save (MMKV-backed via @/store/storage)
// ─────────────────────────────────────────────────────────────

const createDefaultState = (): RetentionState => ({
  lastActivityAt: 0,
  lastScheduledAt: 0,
});

const parsePositiveNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const normalizeState = (
  raw: Partial<RetentionState> | null | undefined,
): RetentionState => {
  const fallback = createDefaultState();
  return {
    lastActivityAt: parsePositiveNumber(
      raw?.lastActivityAt,
      fallback.lastActivityAt,
    ),
    lastScheduledAt: parsePositiveNumber(
      raw?.lastScheduledAt,
      fallback.lastScheduledAt,
    ),
  };
};

const loadState = (): RetentionState => {
  if (stateCache) return stateCache;

  try {
    const { [STATE_KEY]: raw } = getStoredValues([STATE_KEY]);
    if (!raw) {
      const next = createDefaultState();
      stateCache = next;
      return next;
    }
    const normalized = normalizeState(JSON.parse(raw));
    stateCache = normalized;
    return normalized;
  } catch (err) {
    console.warn("[retention] state parse failed:", err);
    const next = createDefaultState();
    stateCache = next;
    return next;
  }
};

const persistState = (state: RetentionState): void => {
  stateCache = { ...state };
  try {
    saveSecurely([{ key: STATE_KEY, value: JSON.stringify(state) }]);
  } catch (err) {
    console.warn("[retention] state write failed:", err);
  }
};

// ─────────────────────────────────────────────────────────────
// Template helpers
// ─────────────────────────────────────────────────────────────

const fillTemplate = (
  template: ReminderTemplate,
  contextLabel: string,
): ReminderTemplate => ({
  title: template.title,
  body: template.body.replace("{context}", contextLabel),
});

const pickReminderTemplate = (
  stageIndex: number,
  lastActivityAt: number,
): ReminderTemplate => {
  const variants = REMINDER_TEMPLATES[stageIndex] ?? REMINDER_TEMPLATES[0];
  const daySeed = Math.floor(lastActivityAt / (24 * HOUR_MS));
  const variantIndex = Math.abs(daySeed + stageIndex) % variants.length;
  return variants[variantIndex] || variants[0];
};

// ─────────────────────────────────────────────────────────────
// Android channel — created once, idempotent
// ─────────────────────────────────────────────────────────────

export const ensureRetentionReminderChannelAsync = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  if (!channelSetupPromise) {
    channelSetupPromise = Notifications.setNotificationChannelAsync(
      RETENTION_CHANNEL_ID,
      {
        name: CONFIG.channelName,
        description: CONFIG.channelDescription,
        importance: Notifications.AndroidImportance.DEFAULT,
        enableVibrate: true,
        vibrationPattern: [0, 180, 120, 180],
        showBadge: true,
      },
    )
      .then(() => undefined)
      .catch((err) => {
        channelSetupPromise = null;
        throw err;
      });
  }
  await channelSetupPromise;
};

// ─────────────────────────────────────────────────────────────
// Permission
//
// We prompt at most once, automatically, the first time the user does
// something meaningful. If they dismiss the prompt, we never ask again
// on our own — future prompts would have to come from Settings.
// ─────────────────────────────────────────────────────────────

const ensurePermissionAsync = async (
  requestIfMissing: boolean,
): Promise<boolean> => {
  if (Platform.OS === "web") return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;

  if (!requestIfMissing || !current.canAskAgain) return false;

  if (permissionPromptedCache === null) {
    const { [PERMISSION_PROMPTED_KEY]: stored } = getStoredValues([
      PERMISSION_PROMPTED_KEY,
    ]);
    permissionPromptedCache = stored === "1";
  }
  if (permissionPromptedCache) return false;

  saveSecurely([{ key: PERMISSION_PROMPTED_KEY, value: "1" }]);
  permissionPromptedCache = true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
};

// ─────────────────────────────────────────────────────────────
// Cancel / schedule
// ─────────────────────────────────────────────────────────────

const cancelRetentionRemindersAsync = async (): Promise<void> => {
  await Promise.all(
    RETENTION_NOTIFICATION_IDS.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
    ),
  );
};

/**
 * Snaps a timestamp to the next valid quiet-hours slot.
 */
const normalizeReminderTimestamp = (
  timestamp: number,
  minuteOffset: number,
): number => {
  const date = new Date(timestamp);
  const windowMinute = Math.min(55, CONFIG.windowBaseMinute + minuteOffset);

  if (date.getHours() < CONFIG.windowStartHour) {
    date.setHours(CONFIG.windowStartHour, windowMinute, 0, 0);
    return date.getTime();
  }
  if (date.getHours() >= CONFIG.windowEndHour) {
    date.setDate(date.getDate() + 1);
    date.setHours(CONFIG.windowStartHour, windowMinute, 0, 0);
    return date.getTime();
  }
  date.setSeconds(0, 0);
  return date.getTime();
};

const toFutureReminderTimestamp = (
  baseTimestamp: number,
  minuteOffset: number,
  now: number,
): number => {
  let target = Math.max(baseTimestamp, now + MIN_SCHEDULE_LEAD_MS);
  target = normalizeReminderTimestamp(target, minuteOffset);

  if (target <= now + MIN_SCHEDULE_LEAD_MS) {
    target = normalizeReminderTimestamp(now + 30 * MINUTE_MS, minuteOffset);
  }
  return target;
};

// ─────────────────────────────────────────────────────────────
// Scheduling pass
// ─────────────────────────────────────────────────────────────

const scheduleReminderSequenceAsync = async (
  state: RetentionState,
  requestPermissionIfMissing: boolean,
): Promise<boolean> => {
  if (Platform.OS === "web") return false;

  if (state.lastActivityAt <= 0 || areRemindersSuppressed()) {
    await cancelRetentionRemindersAsync();
    return false;
  }

  const granted = await ensurePermissionAsync(requestPermissionIfMissing);
  if (!granted) return false;

  await ensureRetentionReminderChannelAsync();
  await cancelRetentionRemindersAsync();

  const contextLabel = getReminderContextLabel();
  const now = Date.now();
  let previousTriggerAt = 0;

  for (let index = 0; index < REMINDER_STAGES.length; index++) {
    const stage = REMINDER_STAGES[index];
    const template = fillTemplate(
      pickReminderTemplate(index, state.lastActivityAt),
      contextLabel,
    );
    const baseTriggerAt = state.lastActivityAt + stage.delayMs;
    let triggerAt = toFutureReminderTimestamp(
      baseTriggerAt,
      stage.minuteOffset,
      now,
    );

    if (
      previousTriggerAt &&
      triggerAt <= previousTriggerAt + CONFIG.minStageSpacingMs
    ) {
      triggerAt = toFutureReminderTimestamp(
        previousTriggerAt + CONFIG.minStageSpacingMs,
        stage.minuteOffset,
        now,
      );
    }

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: stage.id,
        content: {
          title: template.title,
          body: template.body,
          sound: true,
          data: {
            type: "retention-reminder",
            stage: `${index + 1}`,
            // When deep linking is wired up, add:
            // url: `${APP_NAME.toLowerCase()}://today`,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerAt),
          ...(Platform.OS === "android"
            ? { channelId: RETENTION_CHANNEL_ID }
            : {}),
        },
      });
    } catch (err) {
      console.warn(`[retention] schedule stage ${index + 1} failed:`, err);
    }

    previousTriggerAt = triggerAt;
  }

  persistState({ ...state, lastScheduledAt: now });
  return true;
};

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Called once on app start. Re-arms the reminder sequence based on the
 * last recorded activity. Never prompts for permission on its own.
 */
export const initializeRetentionReminders = async (): Promise<void> => {
  const state = loadState();
  try {
    await scheduleReminderSequenceAsync(state, false);
  } catch (err) {
    console.warn("[retention] initialize failed:", err);
  }
};

/**
 * Call whenever the user does something meaningful — completes an
 * exercise, seals a day, or simply opens the app. Resets the countdown
 * and reschedules the sequence.
 *
 * Safe to call often. Internally throttled so a burst of calls doesn't
 * cause churn.
 */
export const trackUserActivity = async (): Promise<void> => {
  if (Platform.OS === "web") return;

  const current = loadState();
  const now = Date.now();

  const shouldSkip =
    current.lastActivityAt > 0 &&
    now - current.lastActivityAt < CONFIG.trackActivityThrottleMs;

  if (shouldSkip) return;

  const next: RetentionState = { ...current, lastActivityAt: now };
  persistState(next);

  try {
    await scheduleReminderSequenceAsync(next, true);
  } catch (err) {
    console.warn("[retention] schedule after activity failed:", err);
  }
};

/**
 * Creates the Android notification channel used for OTA update
 * announcements. Separate channel from retention reminders.
 */
export const initializeUpdateChannel = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(UPDATE_CHANNEL_ID, {
      name: "Updates",
      description: "Notifications for app updates and important announcements",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableLights: true,
      enableVibrate: true,
    });
  } catch (err) {
    console.warn("[retention] update channel setup failed:", err);
  }
};

/**
 * Dev-only helper. Wipes the retention state so the sequence can be
 * re-tested without waiting 30 hours.
 */
export const resetRetentionState = async (): Promise<void> => {
  stateCache = null;
  permissionPromptedCache = null;
  try {
    deleteStoredValues([STATE_KEY, PERMISSION_PROMPTED_KEY]);
    await cancelRetentionRemindersAsync();
  } catch (err) {
    console.warn("[retention] reset failed:", err);
  }
};

/**
 * Dev-only helper. Returns the current retention state for inspection.
 */
export const inspectRetentionState = async (): Promise<{
  lastActivityAt: number;
  lastScheduledAt: number;
  pendingReminderIds: string[];
}> => {
  const state = loadState();
  let pending: string[] = [];
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    pending = scheduled
      .map((n) => n.identifier)
      .filter((id) => id.startsWith("retention-reminder-"));
  } catch {
    // ignore
  }
  return {
    lastActivityAt: state.lastActivityAt,
    lastScheduledAt: state.lastScheduledAt,
    pendingReminderIds: pending,
  };
};
