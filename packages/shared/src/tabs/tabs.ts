import type { IconName } from "../icons/icons.ts";

// Tab behavior shared by the web and mobile Dashboard tabs: which tabs there are, where the last tab is
// saved, which tab opens first, and how dragging or moving a tab changes their order.

/** localStorage (web) and AsyncStorage (mobile) key of the last selected Dashboard tab. */
export const DASHBOARD_TAB_STORAGE_KEY = "apc-tab";
/**
 * The Dashboard tabs, in display order; the first is the default. Each id is also the tab's route on the web
 * (`/inventory`). The Catalog tab joins in phase 2.
 */
export const DASHBOARD_TABS: readonly DashboardTab[] = [{ id: "inventory", label: "Estoque", icon: "cube" }];
/** localStorage (web) and AsyncStorage (mobile) key of the "Arrastar para reordenar" choice; off when not saved. */
export const REORDER_TABS_STORAGE_KEY = "apc-reorder-tabs";

/** A Dashboard tab: its id (and web route), label and the name of its icon in ICONS (@apc/shared/icons). */
export type DashboardTab = { id: string; label: string; icon: IconName };
/** Which side of the tab under the pointer a dragged tab lands on. */
export type DropSide = "before" | "after";

/**
 * Drops a dragged tab next to another one.
 * @param ids Tab ids in their current order.
 * @param dragged Id of the tab being dragged.
 * @param target Id of the tab it is dropped on.
 * @param side Whether it lands before or after the target.
 * @returns The new order; the same order when the tab is dropped on itself.
 */
export function dropTab<T extends string>(ids: readonly T[], dragged: T, target: T, side: DropSide): T[] {
  if (dragged === target) {
    return [...ids];
  }
  const rest = ids.filter((id) => id !== dragged);
  const at = rest.indexOf(target) + (side === "after" ? 1 : 0);
  return [...rest.slice(0, at), dragged, ...rest.slice(at)];
}

/**
 * Picks the tab to open: the saved one while it still exists, otherwise the first.
 * @param ids Tab ids in display order.
 * @param saved Value read back from storage, possibly missing or stale.
 * @returns The id of the tab to select.
 */
export function initialTab<T extends string>(ids: readonly T[], saved: unknown): T {
  return ids.includes(saved as T) ? (saved as T) : ids[0];
}

/**
 * Moves a tab one place to the left or right, e.g. with Alt + an arrow key; the ends don't wrap.
 * @param ids Tab ids in their current order.
 * @param id Id of the tab to move.
 * @param step -1 to move it left, 1 to move it right.
 * @returns The new order, or null when the tab is already at that end.
 */
export function moveTab<T extends string>(ids: readonly T[], id: T, step: -1 | 1): T[] | null {
  const from = ids.indexOf(id);
  const to = from + step;
  if (to < 0 || to >= ids.length) {
    return null;
  }
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
