import * as Clipboard from "expo-clipboard";
import { Alert, Platform, Share } from "react-native";

/**
 * ============================================================================
 * SHARE UTILITY — reusable template
 * ============================================================================
 * A thin, predictable wrapper around the native Share and Clipboard APIs.
 * Drop this file into any Expo project and customise the marked sections
 * below.
 *
 * WHAT TO CUSTOMIZE (search for "CUSTOMIZE"):
 *   1. CONFIG                        – default copy message, fallback behaviour
 *   2. onShareEvent()                – hook into share analytics (success/failure)
 *   3. clipboardAlert()              – change how copy feedback is surfaced
 *
 * HOW TO WIRE IT UP:
 *   - Import `share` / `copyToClipboard` wherever you need them.
 *   - Call `share({ title, message, url })` from a button or action.
 *   - The module automatically falls back to clipboard copying on web
 *     when native sharing isn’t available (configurable).
 *
 * HOW IT AVOIDS DUPLICATE WORK:
 *   - No global state, so no spamming. Each call is stateless.
 *   - Platform detection is handled internally so callers don’t need to
 *     branch on OS.
 * ============================================================================
 */

export interface ShareData {
  title?: string;
  message?: string;
  url?: string;
}

export interface ShareOptions {
  /**
   * Message displayed after copying.
   * @default CONFIG.defaultCopiedMessage
   */
  copiedMessage?: string;

  /**
   * Fallback to copying when native sharing isn’t available.
   * @default CONFIG.clipboardFallback
   */
  clipboardFallback?: boolean;
}

// ---------------------------------------------------------------------------
// CUSTOMIZE #1: change the default strings and fallback behaviour.
// ---------------------------------------------------------------------------
const CONFIG = {
  /** Shown in the alert when content is copied instead of shared. */
  defaultCopiedMessage: "Copied to clipboard.",

  /** Whether to automatically copy the text when native share is unavailable. */
  clipboardFallback: true,
};

// ---------------------------------------------------------------------------
// CUSTOMIZE #2: plug in your own analytics or logging here. The function
// is called after every successful share or clipboard copy with the method
// that was actually used ('native', 'web-share', or 'clipboard').
// ---------------------------------------------------------------------------
const onShareEvent = (method: "native" | "web-share" | "clipboard") => {
  // e.g. analytics.track('share_used', { method });
};

// ---------------------------------------------------------------------------
// CUSTOMIZE #3: if you prefer a toast or a different alert style, replace
// the body of this function. It receives the message from CONFIG or the
// call-site override.
// ---------------------------------------------------------------------------
const clipboardAlert = (message: string) => {
  Alert.alert("Copied", message);
};

// ---------------------------------------------------------------------------

/**
 * Share any content.  Tries native share first, falls back to clipboard
 * copying when that isn’t possible (controlled by `clipboardFallback`).
 */
export async function share(
  data: ShareData,
  options: ShareOptions = {},
): Promise<boolean> {
  const {
    copiedMessage = CONFIG.defaultCopiedMessage,
    clipboardFallback = CONFIG.clipboardFallback,
  } = options;

  const text = [data.message, data.url].filter(Boolean).join("\n");

  try {
    if (Platform.OS === "web" && navigator.share) {
      await navigator.share({
        title: data.title,
        text: data.message,
        url: data.url,
      });
      onShareEvent("web-share");
      return true;
    }

    if (Platform.OS !== "web") {
      await Share.share({
        title: data.title,
        message: text,
        url: data.url,
      });
      onShareEvent("native");
      return true;
    }

    if (clipboardFallback) {
      await copyToClipboard(text, copiedMessage);
      onShareEvent("clipboard");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Share failed:", error);
    return false;
  }
}

/**
 * Copy text to the clipboard and show user feedback.
 */
export async function copyToClipboard(
  text: string,
  successMessage = CONFIG.defaultCopiedMessage,
): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    clipboardAlert(successMessage);
    return true;
  } catch (error) {
    console.error("Clipboard failed:", error);
    return false;
  }
}
