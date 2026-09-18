import { Platform } from "react-native";

import * as Notifications from "expo-notifications";

import { getStoredValues, saveSecurely } from "@/store/storage";

/**
 * ============================================================================
 * RETENTION REMINDERS — reusable template
 * ============================================================================
 * Schedules a short sequence of local notifications when a user goes quiet,
 * nudging them back into the app. Nothing here is tied to any specific app
 * anymore — drop this file in and customize the marked sections below.
 *
 * WHAT TO CUSTOMIZE (search for "CUSTOMIZE"):
 *   1. CONFIG                    – stage delays, quiet hours, throttling
 *   2. REMINDER_TEMPLATES        – notification copy
 *   3. getReminderContextLabel() – inject something personal into the copy
 *   4. areRemindersSuppressed()  – opt users out (pro users, muted, etc.)
 *   5. notification `data` payload – deep-link target for your app
 *   6. storage adapter import    – swap for your own get/set helpers
 *
 * HOW TO WIRE IT UP:
 *   - Call `initializeRetentionReminders()` once on app start, so a returning
 *     user's existing sequence gets picked back up if it's still relevant.
 *   - Call `trackUserActivity()` whenever the user does the "core" action you
 *     want to measure engagement by (opening a key screen, completing an
 *     action, etc). This resets the countdown and reschedules the sequence.
 *
 * HOW IT AVOIDS SPAMMING PEOPLE:
 *   - Every call to trackUserActivity() cancels and rebuilds the whole
 *     sequence, so a user never accumulates overlapping reminders.
 *   - trackUserActivity() is throttled (CONFIG.trackActivityThrottleMs) so
 *     rapid repeat calls (e.g. on every screen focus) don't cause churn.
 *   - Reminders only ever fire inside a quiet-hours window you define.
 *   - The OS permission prompt is shown at most once automatically; if the
 *     user dismisses it, the module won't ask again on its own.
 *   - areRemindersSuppressed() gives you a single place to permanently
 *     silence reminders for a given user (e.g. they turned it off, or don't
 *     need retention nudges for some other reason).
 * ============================================================================
 */

interface RetentionReminderState {
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
  minuteOffset: number;
}

const UPDATE_CHANNEL_ID = "update-reminders";

const RETENTION_STATE_KEY = "retentionReminderState";
const RETENTION_PERMISSION_PROMPTED_KEY = "retentionReminderPermissionPrompted";

const RETENTION_CHANNEL_ID = "retention-reminders";
const RETENTION_NOTIFICATION_IDS = [
  "retention-reminder-1",
  "retention-reminder-2",
  "retention-reminder-3",
] as const;

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const MIN_SCHEDULE_LEAD_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// CUSTOMIZE #1: the main dials you'll want to turn per project.
// ---------------------------------------------------------------------------
const CONFIG = {
  // Minimum time between two recorded activity events. Prevents excess
  // storage writes/reschedules if trackUserActivity() fires repeatedly.
  trackActivityThrottleMs: 10 * MINUTE_MS,

  // "Do not disturb" window — reminders never fire outside this local-time
  // range; they get pushed to the next window instead. 24h clock.
  windowStartHour: 10,
  windowEndHour: 20,
  windowBaseMinute: 15,

  // Minimum spacing enforced between two stages if their computed times land
  // too close together after window normalization.
  minStageSpacingMs: 30 * MINUTE_MS,

  // Android notification channel copy.
  channelName: "Reminders",
  channelDescription:
    "Occasional nudges when you have not opened the app in a while.",
};

// The reminder sequence: how long to wait since last activity before firing
// each stage, plus a small per-stage minute offset so stages don't all land
// on the exact same clock-minute. Add, remove, or retime stages freely —
// REMINDER_TEMPLATES and RETENTION_NOTIFICATION_IDS just need to match length.
const REMINDER_STAGES: readonly ReminderStage[] = [
  { id: RETENTION_NOTIFICATION_IDS[0], delayMs: 30 * HOUR_MS, minuteOffset: 0 },
  { id: RETENTION_NOTIFICATION_IDS[1], delayMs: 78 * HOUR_MS, minuteOffset: 5 },
  {
    id: RETENTION_NOTIFICATION_IDS[2],
    delayMs: 174 * HOUR_MS,
    minuteOffset: 10,
  },
];

// ---------------------------------------------------------------------------
// CUSTOMIZE #2: notification copy, one array of variants per stage above.
// `{context}` gets replaced with whatever getReminderContextLabel() returns.
// Multiple variants per stage keep repeat reminders from feeling identical;
// one is picked deterministically per day so a single scheduling run is
// stable but different days get different wording.
// ---------------------------------------------------------------------------
const REMINDER_TEMPLATES: readonly ReminderTemplate[][] = [
  [
    {
      title: "Quick check-in?",
      body: "You have not opened the app in a bit. Come see what's new with {context}.",
    },
    {
      title: "We saved your spot",
      body: "Pick up right where you left off with {context}.",
    },
    {
      title: "Still there?",
      body: "A quick look at {context} only takes a few seconds.",
    },
  ],
  [
    {
      title: "Things may have changed",
      body: "It has been a few days — {context} might look different now.",
    },
    {
      title: "Stay in the loop",
      body: "Check in on {context} so nothing catches you by surprise.",
    },
    {
      title: "A quick update",
      body: "Open the app for a fresh look at {context}.",
    },
  ],
  [
    {
      title: "Still with us?",
      body: "Come back for a fresh look at {context}.",
    },
    {
      title: "We miss you",
      body: "It has been a while — {context} is waiting whenever you're ready.",
    },
    {
      title: "Weekly check-in",
      body: "Take a minute to catch up on {context}.",
    },
  ],
];

// ---------------------------------------------------------------------------
// CUSTOMIZE #3: plug in something meaningful about the user's own data.
// Keep it short — it's substituted into copy as {context}. Read from
// whatever storage/state your project already has (e.g. selected items,
// open tasks, unread messages). Falls back to a generic phrase for now.
// ---------------------------------------------------------------------------
const getReminderContextLabel = (): string => {
  return "your saved items";
};

// ---------------------------------------------------------------------------
// CUSTOMIZE #4: return true to suppress the whole sequence — e.g. the user
// disabled reminders in-app settings, is in a state where nudging doesn't
// make sense, or has some other "do not remind me" flag.
// ---------------------------------------------------------------------------
const areRemindersSuppressed = (): boolean => {
  return false;
};

let retentionStateCache: RetentionReminderState | null = null;
let retentionPermissionPromptedCache: boolean | null = null;
let retentionChannelSetupPromise: Promise<void> | null = null;

const createDefaultState = (): RetentionReminderState => ({
  lastActivityAt: 0,
  lastScheduledAt: 0,
});

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const normalizeState = (
  raw: Partial<RetentionReminderState> | null | undefined,
): RetentionReminderState => {
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

// -----------------------------------------------------------------------
// CUSTOMIZE #6: this module persists a tiny state blob (two timestamps) via
// getStoredValues/saveSecurely. Swap the import at the top of this file for
// whatever key/value storage your project uses — it just needs get(keys) and
// set([{key, value}]) semantics for a couple of strings.
// -----------------------------------------------------------------------
const loadState = (): RetentionReminderState => {
  if (retentionStateCache) {
    return retentionStateCache;
  }

  const stored = getStoredValues([RETENTION_STATE_KEY]);
  const rawValue = stored[RETENTION_STATE_KEY];

  if (!rawValue) {
    const defaultState = createDefaultState();
    retentionStateCache = defaultState;
    return defaultState;
  }

  try {
    const normalized = normalizeState(JSON.parse(rawValue));
    retentionStateCache = normalized;
    return normalized;
  } catch (error) {
    console.error("Failed to parse retention reminder state:", error);
    const defaultState = createDefaultState();
    retentionStateCache = defaultState;
    return defaultState;
  }
};

const persistState = (state: RetentionReminderState) => {
  retentionStateCache = { ...state };
  saveSecurely([{ key: RETENTION_STATE_KEY, value: JSON.stringify(state) }]);
};

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

export /**
 * Creates the Android notification channel used for retention reminders.
 * Safe to call multiple times (it dedupes in-flight setup) and a no-op on
 * iOS/web. Exported so it can be called eagerly on app start via
 * `useRetentionReminders`, rather than only lazily the first time a
 * reminder gets scheduled.
 */
const ensureRetentionReminderChannelAsync = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  if (!retentionChannelSetupPromise) {
    retentionChannelSetupPromise = Notifications.setNotificationChannelAsync(
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
      .catch((error) => {
        retentionChannelSetupPromise = null;
        throw error;
      });
  }

  await retentionChannelSetupPromise;
};

const ensurePermissionAsync = async (requestIfMissing: boolean) => {
  if (Platform.OS === "web") {
    return false;
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  if (currentPermission.status === "granted") {
    return true;
  }

  if (!requestIfMissing || !currentPermission.canAskAgain) {
    return false;
  }

  if (retentionPermissionPromptedCache === null) {
    const stored = getStoredValues([RETENTION_PERMISSION_PROMPTED_KEY]);
    retentionPermissionPromptedCache =
      stored[RETENTION_PERMISSION_PROMPTED_KEY] === "1";
  }
  if (retentionPermissionPromptedCache) {
    return false;
  }

  saveSecurely([{ key: RETENTION_PERMISSION_PROMPTED_KEY, value: "1" }]);
  retentionPermissionPromptedCache = true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
};

const cancelRetentionRemindersAsync = async () => {
  await Promise.all(
    RETENTION_NOTIFICATION_IDS.map((notificationId) =>
      Notifications.cancelScheduledNotificationAsync(notificationId).catch(
        () => undefined,
      ),
    ),
  );
};

const normalizeReminderTimestamp = (
  timestamp: number,
  minuteOffset: number,
) => {
  const reminderDate = new Date(timestamp);
  const windowMinute = Math.min(55, CONFIG.windowBaseMinute + minuteOffset);

  if (reminderDate.getHours() < CONFIG.windowStartHour) {
    reminderDate.setHours(CONFIG.windowStartHour, windowMinute, 0, 0);
    return reminderDate.getTime();
  }

  if (reminderDate.getHours() >= CONFIG.windowEndHour) {
    reminderDate.setDate(reminderDate.getDate() + 1);
    reminderDate.setHours(CONFIG.windowStartHour, windowMinute, 0, 0);
    return reminderDate.getTime();
  }

  reminderDate.setSeconds(0, 0);
  return reminderDate.getTime();
};

const toFutureReminderTimestamp = (
  baseTimestamp: number,
  minuteOffset: number,
  now = Date.now(),
) => {
  let targetTimestamp = Math.max(baseTimestamp, now + MIN_SCHEDULE_LEAD_MS);
  targetTimestamp = normalizeReminderTimestamp(targetTimestamp, minuteOffset);

  if (targetTimestamp <= now + MIN_SCHEDULE_LEAD_MS) {
    targetTimestamp = normalizeReminderTimestamp(
      now + 30 * MINUTE_MS,
      minuteOffset,
    );
  }

  return targetTimestamp;
};

const scheduleReminderSequenceAsync = async (
  state: RetentionReminderState,
  requestPermissionIfMissing: boolean,
) => {
  if (Platform.OS === "web") {
    return false;
  }

  if (state.lastActivityAt <= 0 || areRemindersSuppressed()) {
    await cancelRetentionRemindersAsync();
    return false;
  }

  const hasPermission = await ensurePermissionAsync(requestPermissionIfMissing);
  if (!hasPermission) {
    return false;
  }

  await ensureRetentionReminderChannelAsync();
  await cancelRetentionRemindersAsync();

  const contextLabel = getReminderContextLabel();
  const now = Date.now();
  let previousTriggerAt = 0;

  for (let index = 0; index < REMINDER_STAGES.length; index += 1) {
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

    await Notifications.scheduleNotificationAsync({
      identifier: stage.id,
      content: {
        title: template.title,
        body: template.body,
        sound: true,
        data: {
          type: "retention-reminder",
          stage: `${index + 1}`,
          // CUSTOMIZE #5: add a deep-link target for your app, e.g.
          // screen: "Home",
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

    previousTriggerAt = triggerAt;
  }

  persistState({
    ...state,
    lastScheduledAt: now,
  });

  return true;
};

/**
 * Call once on app start. Re-applies the reminder sequence based on
 * previously saved state (e.g. after an app update or device restart),
 * without ever requesting notification permission on its own.
 */
export const initializeRetentionReminders = async () => {
  const state = loadState();

  try {
    await scheduleReminderSequenceAsync(state, false);
  } catch (error) {
    console.error("Failed to initialize retention reminders:", error);
  }
};

/**
 * Call whenever the user performs the "core" action you're using as your
 * engagement signal. Resets the countdown and reschedules the sequence.
 * Safe to call often — internally throttled by CONFIG.trackActivityThrottleMs
 * so it won't cause excess storage writes or reschedules.
 */
export const trackUserActivity = async () => {
  if (Platform.OS === "web") {
    return;
  }

  const currentState = loadState();
  const now = Date.now();
  const shouldSkipUpdate =
    currentState.lastActivityAt > 0 &&
    now - currentState.lastActivityAt < CONFIG.trackActivityThrottleMs;

  if (shouldSkipUpdate) {
    return;
  }

  const nextState: RetentionReminderState = {
    ...currentState,
    lastActivityAt: now,
  };
  persistState(nextState);

  try {
    await scheduleReminderSequenceAsync(nextState, true);
  } catch (error) {
    console.error("Failed to schedule retention reminders:", error);
  }
};

export const initializeUpdateChannel = async () => {
  await Notifications.setNotificationChannelAsync(UPDATE_CHANNEL_ID, {
    name: "updates",
    description: "Notifications for app updates and important announcements",
    importance: Notifications.AndroidImportance.HIGH,
    //sound: "update.wav",
    vibrationPattern: [0, 250, 250, 250],
    enableLights: true,
    enableVibrate: true,
  });
};
