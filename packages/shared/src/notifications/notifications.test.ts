import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addNotification,
  lowStockAlerts,
  lowStockKey,
  lowStockMessage,
  readLowStockWarned,
  markAllRead,
  NOTIFICATIONS_LIMIT,
  notificationsKey,
  readNotifications,
  timeAgo,
  unreadBadge,
  type Notification,
} from "./notifications.ts";

const NOW = new Date(2026, 9, 14, 15, 30);

/**
 * Adds several notifications in a row, a minute apart.
 * @param count How many to add.
 * @returns The list, newest first.
 */
function added(count: number): Notification[] {
  let list: Notification[] = [];
  for (let index = 1; index <= count; index++) {
    list = addNotification(list, index % 2 ? "success" : "error", `Aviso ${index}`, new Date(NOW.getTime() + index * 60_000));
  }
  return list;
}

// Adds 25 notifications and checks the newest comes first, unread, with its kind and time, and only the last 20 stay.
test("Shared: the history keeps the newest notifications first, up to the limit", () => {
  const list = added(25);
  assert.equal(list.length, NOTIFICATIONS_LIMIT);
  assert.deepEqual(list[0], { id: 25, kind: "success", message: "Aviso 25", at: new Date(NOW.getTime() + 25 * 60_000).toISOString(), read: false });
  assert.equal(list.at(-1)!.message, "Aviso 6");
});

// Counts the unread on the badge: nothing at none, the count up to 9, "9+" above; marking all read clears it and keeps
// the list as it was when nothing was unread.
test("Shared: the badge counts the unread, and marking them read clears it", () => {
  assert.equal(unreadBadge([]), "");
  assert.equal(unreadBadge(added(2)), "2");
  assert.equal(unreadBadge(added(9)), "9");
  assert.equal(unreadBadge(added(10)), "9+");
  const read = markAllRead(added(3));
  assert.equal(unreadBadge(read), "");
  assert.ok(read.every((notification) => notification.read));
  assert.equal(markAllRead(read), read);
});

// Writes how long ago a notification was shown: now, minutes, hours earlier today, yesterday, then the day.
test("Shared: notifications say how long ago they were shown", () => {
  const ago = (ms: number) => timeAgo(new Date(NOW.getTime() - ms).toISOString(), NOW);
  assert.equal(ago(30_000), "agora");
  assert.equal(ago(5 * 60_000), "há 5 min");
  assert.equal(ago(3 * 3_600_000), "há 3 h");
  assert.equal(timeAgo(new Date(2026, 9, 13, 23, 0).toISOString(), NOW), "ontem");
  assert.equal(timeAgo(new Date(2026, 9, 2, 9, 0).toISOString(), NOW), "02/10");
});

// Reads the history back from storage, and anything unreadable (nothing saved, broken JSON, a wrong shape) as none.
test("Shared: the history reads back from storage, and broken data as none", () => {
  const list = added(3);
  assert.deepEqual(readNotifications(JSON.stringify(list)), list);
  assert.deepEqual(readNotifications(null), []);
  assert.deepEqual(readNotifications("{"), []);
  assert.deepEqual(readNotifications(JSON.stringify([{ id: 1, kind: "loud", message: "x", at: "", read: false }])), []);
});

// Checks each user keeps their notifications under their own key.
test("Shared: each user's notifications have their own key", () => {
  assert.equal(notificationsKey("user-christian"), "apc-notifications:user-christian");
  assert.notEqual(notificationsKey("user-christian"), notificationsKey("user-oficina"));
});

// Checks the low-stock warning: an item at its minimum, or out of stock, is warned about once; while it stays low it
// isn't again; once its stock is fine it leaves the list, and falling again warns again. Several at once make one text.
test("Shared: an item low on stock is warned about once while it stays low", () => {
  const filter = { id: "a", name: "Filtro de óleo", quantity: 2, minQuantity: 2 };
  const pads = { id: "b", name: "Pastilha", quantity: 9, minQuantity: 3 };
  const pump = { id: "c", name: "Bomba d'água", quantity: 0, minQuantity: 0 };
  const first = lowStockAlerts([filter, pads, pump], []);
  assert.deepEqual(first, { alerts: [filter, pump], warned: ["a", "c"] });
  assert.deepEqual(lowStockAlerts([{ ...filter, quantity: 1 }, pads, pump], first.warned).alerts, []);
  const restocked = lowStockAlerts([{ ...filter, quantity: 5 }, pads, pump], first.warned);
  assert.deepEqual(restocked, { alerts: [], warned: ["c"] });
  assert.deepEqual(lowStockAlerts([filter, pads, pump], restocked.warned).alerts, [filter]);

  assert.equal(lowStockMessage([filter]), "Estoque baixo: “Filtro de óleo” (2 de 2)");
  assert.equal(lowStockMessage([filter, pump, pads, pads]), "Estoque baixo em 4 itens");
});

// Reads back the items already warned about, and anything unreadable as none; each user has their own key.
test("Shared: the items warned about read back from storage, for each user", () => {
  assert.deepEqual(readLowStockWarned(JSON.stringify(["a", "c"])), ["a", "c"]);
  for (const odd of [null, "{", JSON.stringify([1])]) {
    assert.deepEqual(readLowStockWarned(odd), []);
  }
  assert.equal(lowStockKey("user-christian"), "apc-low-stock:user-christian");
});
