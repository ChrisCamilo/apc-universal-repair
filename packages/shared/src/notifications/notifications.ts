import { z } from "zod";
import { stockStatus, type Item } from "../items/items.ts";
import { TOAST_KINDS, type ToastKind } from "../toast/toast.ts";

// The notifications history behind the Dashboard's bell, the same on web and mobile: every toast shown is kept, newest
// first, up to NOTIFICATIONS_LIMIT, on the device under a key for each user, so it survives a reload and another user
// on the same device doesn't see it. Opening the bell's menu marks them all read, which clears its badge. Items at or
// below their minimum stock (out of stock included, as the rows' tints show them) raise a warning once while they stay
// there; the ids already warned about are kept beside the history, also for each user.

/** Above this many unread, the badge shows "9+". */
const BADGE_MAX = 9;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
/** How many notifications are kept; older ones drop off. */
export const NOTIFICATIONS_LIMIT = 20;
const notificationSchema = z.object({
  id: z.number().int(),
  kind: z.enum(TOAST_KINDS),
  message: z.string(),
  /** When it was shown, as an ISO date. */
  at: z.string(),
  read: z.boolean(),
});

export type Notification = z.infer<typeof notificationSchema>;
/** What the low-stock warning needs of an item. */
export type StockItem = Pick<Item, "id" | "name" | "quantity" | "minQuantity">;

/**
 * Adds a notification at the top, unread, keeping the newest NOTIFICATIONS_LIMIT.
 * @param list The notifications, newest first.
 * @param kind The toast's kind.
 * @param message The toast's message.
 * @param now When it was shown.
 * @returns The new list, newest first.
 */
export function addNotification(list: readonly Notification[], kind: ToastKind, message: string, now: Date): Notification[] {
  const id = (list[0]?.id ?? 0) + 1;
  return [{ id, kind, message, at: now.toISOString(), read: false }, ...list].slice(0, NOTIFICATIONS_LIMIT);
}

/**
 * Finds the items newly at or below their minimum stock, against the ones already warned about. An item is warned about
 * once while it stays low; once its stock is fine again, it leaves the list and can be warned about again.
 * @param items Every item in stock.
 * @param warned The ids of the items already warned about.
 * @returns The items to warn about now, and the ids to keep as warned about: every item low now.
 */
export function lowStockAlerts<Stock extends StockItem>(items: readonly Stock[], warned: readonly string[]): { alerts: Stock[]; warned: string[] } {
  const low = items.filter((item) => stockStatus(item.quantity, item.minQuantity) !== null);
  return { alerts: low.filter((item) => !warned.includes(item.id)), warned: low.map((item) => item.id) };
}

/**
 * Names the storage key of the items a user was already warned about.
 * @param userId The logged user's id.
 * @returns E.g. "apc-low-stock:user-christian".
 */
export function lowStockKey(userId: string): string {
  return `apc-low-stock:${userId}`;
}

/**
 * Writes the low-stock warning, one item by name or several at once by count.
 * @param alerts The items to warn about, at least one.
 * @returns E.g. "Estoque baixo: “Filtro de óleo” (2 de 3)" or "Estoque baixo em 4 itens".
 */
export function lowStockMessage(alerts: readonly StockItem[]): string {
  const [item] = alerts;
  return alerts.length === 1 ? `Estoque baixo: “${item.name}” (${item.quantity} de ${item.minQuantity})` : `Estoque baixo em ${alerts.length} itens`;
}

/**
 * Marks every notification read.
 * @param list The notifications.
 * @returns The same list, all read (the same list when none was unread).
 */
export function markAllRead(list: readonly Notification[]): readonly Notification[] {
  return list.some((notification) => !notification.read) ? list.map((notification) => ({ ...notification, read: true })) : list;
}

/**
 * Names the storage key of a user's notifications, so each user on a device has their own.
 * @param userId The logged user's id.
 * @returns E.g. "apc-notifications:user-christian".
 */
export function notificationsKey(userId: string): string {
  return `apc-notifications:${userId}`;
}

/**
 * Reads notifications back from storage, treating anything unreadable as none.
 * @param saved What storage holds, or null.
 * @returns The notifications, newest first, at most NOTIFICATIONS_LIMIT.
 */
export function readNotifications(saved: string | null): Notification[] {
  try {
    return z.array(notificationSchema).parse(JSON.parse(saved ?? "[]")).slice(0, NOTIFICATIONS_LIMIT);
  } catch {
    return [];
  }
}

/**
 * Reads back the ids of the items already warned about, treating anything unreadable as none.
 * @param saved What storage holds, or null.
 * @returns The ids.
 */
export function readLowStockWarned(saved: string | null): string[] {
  try {
    return z.array(z.string()).parse(JSON.parse(saved ?? "[]"));
  } catch {
    return [];
  }
}

/**
 * Writes how long ago a notification was shown, in Portuguese, as the bell's menu lists it.
 * @param at When it was shown, as an ISO date.
 * @param now The current time.
 * @returns "agora" under a minute, "há 5 min" under an hour, "há 3 h" earlier today, "ontem", or the day, e.g. "12/10".
 */
export function timeAgo(at: string, now: Date): string {
  const then = new Date(at);
  const elapsed = now.getTime() - then.getTime();
  if (elapsed < MINUTE_MS) {
    return "agora";
  }
  if (elapsed < HOUR_MS) {
    return `há ${Math.floor(elapsed / MINUTE_MS)} min`;
  }
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((day(now) - day(then)) / (24 * HOUR_MS));
  if (days === 0) {
    return `há ${Math.floor(elapsed / HOUR_MS)} h`;
  }
  if (days === 1) {
    return "ontem";
  }
  return `${String(then.getDate()).padStart(2, "0")}/${String(then.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Writes the bell's badge: how many notifications are unread.
 * @param list The notifications.
 * @returns "" when none is unread, the count up to 9, then "9+".
 */
export function unreadBadge(list: readonly Notification[]): string {
  const count = list.filter((notification) => !notification.read).length;
  return count === 0 ? "" : count > BADGE_MAX ? `${BADGE_MAX}+` : String(count);
}
