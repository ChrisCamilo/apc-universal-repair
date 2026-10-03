import type { IconName } from "../icons/icons.ts";

// Tab behavior shared by the web and mobile Dashboard tabs: which tabs there are, where the last tab is
// saved and which tab opens first.

/** localStorage (web) and AsyncStorage (mobile) key of the last selected Dashboard tab. */
export const DASHBOARD_TAB_STORAGE_KEY = "apc-tab";
/**
 * The Dashboard tabs, in display order; the first is the default. Each id is also the tab's route on the web
 * (`/inventory`). The Catalog tab joins in phase 2.
 */
export const DASHBOARD_TABS: readonly DashboardTab[] = [{ id: "inventory", label: "Estoque", icon: "cube" }];

/** A Dashboard tab: its id (and web route), label and the name of its icon in ICONS (@apc/shared/icons). */
export type DashboardTab = { id: string; label: string; icon: IconName };

/**
 * Picks the tab to open: the saved one while it still exists, otherwise the first.
 * @param ids Tab ids in display order.
 * @param saved Value read back from storage, possibly missing or stale.
 * @returns The id of the tab to select.
 */
export function initialTab<T extends string>(ids: readonly T[], saved: unknown): T {
  return ids.includes(saved as T) ? (saved as T) : ids[0];
}
