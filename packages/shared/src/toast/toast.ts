import { alertIcon, checkRingIcon, closeRingIcon, infoIcon, type IconShape } from "../icons/icons.ts";
import { scales, type ColorToken } from "../theme/tokens.ts";

// The kinds of toast, the same on web and mobile: each one has its status color behind the message, the color drawn on
// it, and an icon before the message, so the kind is never told by color alone. Errors and warnings are read out at
// once, interrupting; successes and infos wait for the screen reader to finish. A toast fades in rising a little, and
// fades out when it hides or another one takes its place. It stays on screen for the time the user picks in the bell's
// menu (TOAST_DURATION), saved on the device.

/** How long a toast stays on screen, in ms, before it fades out: by default, at least, at most, and the step between. */
export const TOAST_DURATION = { defaultMs: 5000, minMs: 2000, maxMs: 15000, stepMs: 1000 } as const;
/** localStorage (web) and AsyncStorage (mobile) key of the time picked. */
export const TOAST_DURATION_STORAGE_KEY = "apc-toast-duration";
/** How long a toast takes to fade in or out, in ms: the app's motion duration, which web transitions use by default. */
export const TOAST_FADE_MS = scales.motion.durationMs;

/** Each kind's look and how screen readers announce it. */
export const TOAST_KIND_LOOKS: Record<ToastKind, ToastKindLook> = {
  error: { color: "danger", onColor: "onDanger", icon: closeRingIcon, urgent: true },
  info: { color: "info", onColor: "onInfo", icon: infoIcon, urgent: false },
  success: { color: "success", onColor: "onSuccess", icon: checkRingIcon, urgent: false },
  warning: { color: "warn", onColor: "onWarn", icon: alertIcon, urgent: true },
};
export const TOAST_KINDS = ["success", "error", "info", "warning"] as const;

/**
 * Reads the time picked back from storage, treating anything that isn't a time the user could pick as nothing saved.
 * @param saved What storage holds, or null.
 * @returns The time in ms, or the default.
 */
export function readToastDuration(saved: string | null): number {
  const ms = Number(saved);
  const { defaultMs, minMs, maxMs, stepMs } = TOAST_DURATION;
  return saved !== null && Number.isInteger(ms) && ms >= minMs && ms <= maxMs && ms % stepMs === 0 ? ms : defaultMs;
}

/**
 * Moves the time a toast stays one step up or down, within the shortest and the longest.
 * @param ms The time now, in ms.
 * @param direction 1 for longer, -1 for shorter.
 * @returns The new time, in ms.
 */
export function stepToastDuration(ms: number, direction: 1 | -1): number {
  const { minMs, maxMs, stepMs } = TOAST_DURATION;
  return Math.min(maxMs, Math.max(minMs, ms + direction * stepMs));
}

/**
 * Writes the time a toast stays as the bell's menu shows it.
 * @param ms The time, in ms.
 * @returns E.g. "5 s".
 */
export function toastDurationLabel(ms: number): string {
  return `${ms / 1000} s`;
}

export type ToastKind = (typeof TOAST_KINDS)[number];
export type ToastKindLook = {
  /** The status color behind the message. */
  color: ColorToken;
  /** The color of the message and the icon on it. */
  onColor: ColorToken;
  icon: IconShape[];
  /** Read out at once, interrupting what the screen reader is saying (role="alert" on web). */
  urgent: boolean;
};
