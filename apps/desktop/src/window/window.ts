// The size of the app's window. It opens at the minimum desktop screen from AGENTS.md (1280×720 of content) when the
// screen has room, and otherwise at the most the work area above the taskbar holds, so no part of it opens behind the
// taskbar, e.g. about 1280×689 on a 1366×768 notebook. It can't be made smaller than 1280×640, which still fits there
// with its title bar. These are MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT and MIN_WINDOW_HEIGHT in @apc/shared/screens,
// written here since the packaged app doesn't carry that package.

/** The smallest content the window can be resized to. */
export const MIN_WINDOW_SIZE = { width: 1280, height: 640 };
/** The content the window opens at when the screen has room. */
export const WINDOW_SIZE = { width: 1280, height: 720 };

/** A width and a height, in px. */
export type Size = { width: number; height: number };

/**
 * Works out the content size the window opens at.
 * @param workArea The screen's area above the taskbar, e.g. 1366×720 on a 1366×768 notebook.
 * @param frame What the window adds around its content: the title bar and the borders.
 * @returns WINDOW_SIZE when it fits, otherwise what the work area holds, never below MIN_WINDOW_SIZE.
 */
export function openingContentSize(workArea: Size, frame: Size): Size {
  return {
    width: Math.max(MIN_WINDOW_SIZE.width, Math.min(WINDOW_SIZE.width, workArea.width - frame.width)),
    height: Math.max(MIN_WINDOW_SIZE.height, Math.min(WINDOW_SIZE.height, workArea.height - frame.height)),
  };
}
