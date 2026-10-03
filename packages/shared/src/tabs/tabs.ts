// Tab behavior shared by the web and mobile Dashboard tabs: where the last tab is saved and which tab
// opens first.

/** localStorage (web) and AsyncStorage (mobile) key of the last selected Dashboard tab. */
export const DASHBOARD_TAB_STORAGE_KEY = "apc-tab";

/**
 * Picks the tab to open: the saved one while it still exists, otherwise the first.
 * @param ids Tab ids in display order.
 * @param saved Value read back from storage, possibly missing or stale.
 * @returns The id of the tab to select.
 */
export function initialTab<T extends string>(ids: readonly T[], saved: unknown): T {
  return ids.includes(saved as T) ? (saved as T) : ids[0];
}
