// Sizes shared by the web and mobile Dialog and BottomSheet, so both platforms open the same windows.

/** Room a dialog leaves to the top and bottom edges of the screen, in px. */
export const DIALOG_HEIGHT_INSET = 48;
/** Room a dialog leaves to the side edges of the screen, in px, so it fits at 360px wide. */
export const DIALOG_SCREEN_INSET = 32;
/** Widest size of each dialog, in px: forms such as the item form, short confirmations, and the photo viewer. */
export const DIALOG_WIDTHS = { form: 560, confirm: 420, viewer: 760 } as const;
/** How far a bottom sheet's handle is dragged down, in px, before letting go closes the sheet. */
export const SHEET_CLOSE_DRAG = 80;
/** A bottom sheet's handle, the bar its user drags it down by, in px. */
export const SHEET_HANDLE = { width: 40, height: 4 } as const;
/** Radius of a bottom sheet's top corners, in px. */
export const SHEET_RADIUS = 20;
/** Room a bottom sheet leaves to the top of the screen at its tallest, in px, where its content starts scrolling. */
export const SHEET_TOP_INSET = 64;

export type DialogSize = keyof typeof DIALOG_WIDTHS;
