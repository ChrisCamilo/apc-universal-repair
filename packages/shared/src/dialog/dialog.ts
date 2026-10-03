// Sizes and timing shared by the web and mobile Dialog and Toast, so both platforms open the same windows.

/** Room a dialog leaves to the top and bottom edges of the screen, in px. */
export const DIALOG_HEIGHT_INSET = 48;
/** Room a dialog leaves to the side edges of the screen, in px, so it fits at 360px wide. */
export const DIALOG_SCREEN_INSET = 32;
/** Widest size of each dialog, in px: forms such as the item form, and short confirmations. */
export const DIALOG_WIDTHS = { form: 560, confirm: 420 } as const;
/** How long a toast stays on screen, in ms, before it hides on its own. */
export const TOAST_DURATION_MS = 2200;

export type DialogSize = keyof typeof DIALOG_WIDTHS;
