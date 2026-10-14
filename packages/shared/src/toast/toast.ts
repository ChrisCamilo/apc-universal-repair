import { alertIcon, checkRingIcon, closeRingIcon, infoIcon, type IconShape } from "../icons/icons.ts";
import { scales, type ColorToken } from "../theme/tokens.ts";

// The kinds of toast, the same on web and mobile: each one has its status color behind the message, the color drawn on
// it, and an icon before the message, so the kind is never told by color alone. Errors and warnings are read out at
// once, interrupting; successes and infos wait for the screen reader to finish. A toast fades in rising a little, and
// fades out when it hides or another one takes its place.

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
