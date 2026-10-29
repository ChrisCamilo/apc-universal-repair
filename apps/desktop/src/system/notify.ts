// The Windows notifications the web app asks for through the preload bridge (see preload.cts): their channels, and the
// check of what a request may carry, since it comes from the page. Only a title and a message, both text, go through.

/** Longest title a request may carry; longer ones are cut. */
const MAX_TITLE = 80;
/** Longest message a request may carry; longer ones are cut. */
const MAX_MESSAGE = 300;
/** The channel the page asks for a notification on (also written in preload.cts, which can't import this file). */
export const NOTIFY_CHANNEL = "apc:notify";
/** The channel the main process asks the page to open the bell's menu on, after a notification is clicked. */
export const OPEN_NOTIFICATIONS_CHANNEL = "apc:open-notifications";

/** What a notification shows. */
export type NotifyRequest = { title: string; message: string };

/**
 * Checks what the page sent for a notification: an object with a title and a message, both text and not blank.
 * @param value What came through the bridge.
 * @returns The title and the message, trimmed and cut to their longest, or null when the request isn't one.
 */
export function parseNotifyRequest(value: unknown): NotifyRequest | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { title, message } = value as Record<string, unknown>;
  if (typeof title !== "string" || typeof message !== "string" || !title.trim() || !message.trim()) {
    return null;
  }
  return { title: title.trim().slice(0, MAX_TITLE), message: message.trim().slice(0, MAX_MESSAGE) };
}
