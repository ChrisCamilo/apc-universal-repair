// Sizes shared by the web and mobile Dialog, so both platforms open the same windows.

/** Room a dialog leaves to the top and bottom edges of the screen, in px. */
export const DIALOG_HEIGHT_INSET = 48;
/** Room a dialog leaves to the side edges of the screen, in px, so it fits at 360px wide. */
export const DIALOG_SCREEN_INSET = 32;
/** Widest size of each dialog, in px: forms such as the item form, short confirmations, and the photo viewer. */
export const DIALOG_WIDTHS = { form: 560, confirm: 420, viewer: 760 } as const;

export type DialogSize = keyof typeof DIALOG_WIDTHS;
