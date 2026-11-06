// The screen sizes the project is built for (see "Supported Screen Sizes" in AGENTS.md), shared by the apps, their
// configs, stories and tests, so each size is written once. Below a minimum the app keeps working with its
// responsive layout, but the layout is not guaranteed.

/** The smallest desktop screen height, in px: 1366×768 notebooks, and 1920×1080 screens at 125% and 150% scaling. */
export const MIN_DESKTOP_HEIGHT = 720;
/** The smallest desktop screen width, in px, for the same screens as MIN_DESKTOP_HEIGHT. */
export const MIN_DESKTOP_WIDTH = 1280;
/** The smallest height and width a control a finger reaches has on a phone, in px. */
export const MIN_TOUCH_TARGET = 44;
/** The smallest phone screen height, in px: the Galaxy S22 and S23. */
export const MIN_MOBILE_HEIGHT = 780;
/** The smallest phone screen width, in px: the Galaxy S20–S23 at their default setting. */
export const MIN_MOBILE_WIDTH = 360;
/**
 * The smallest content height of the desktop app's window, in px: with its title bar, a window this tall fits the
 * 720px left above the taskbar of a 768px screen.
 */
export const MIN_WINDOW_HEIGHT = 640;
/** The phone screen height the mobile screens are designed at, in px: the iPhone 12–14. */
export const MOBILE_DESIGN_HEIGHT = 844;
/** The phone screen width the mobile screens are designed at, in px: the iPhone 12–14. */
export const MOBILE_DESIGN_WIDTH = 390;
/** A notebook screen's height, in px: 1360×768 and 1366×768 notebooks, such as the shop's. */
export const NOTEBOOK_HEIGHT = 768;
/** A notebook screen's width, in px, for the same screens as NOTEBOOK_HEIGHT. */
export const NOTEBOOK_WIDTH = 1360;
/** The content height of a window on a notebook screen, in px: 768 less the taskbar (48) and the title bar (31). */
export const NOTEBOOK_WINDOW_HEIGHT = 689;
