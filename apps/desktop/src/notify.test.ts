import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { NOTIFY_CHANNEL, OPEN_NOTIFICATIONS_CHANNEL, parseNotifyRequest } from "./notify.ts";

// Checks a notification request goes through only with a title and a message, both text and not blank, trimmed and cut
// to their longest; anything else the page could send is refused.
test("Desktop: the bridge only takes a title and a message, both text", () => {
  assert.deepEqual(parseNotifyRequest({ title: " Aviso ", message: " Estoque baixo em 2 itens " }), { title: "Aviso", message: "Estoque baixo em 2 itens" });
  assert.equal(parseNotifyRequest({ title: "Erro", message: "x".repeat(500) })!.message.length, 300);
  for (const odd of [null, undefined, "Aviso", 7, [], {}, { title: "Aviso" }, { title: 1, message: "x" }, { title: "Aviso", message: {} }, { title: " ", message: "x" }]) {
    assert.equal(parseNotifyRequest(odd), null, JSON.stringify(odd));
  }
});

// The sandboxed preload can't import notify.ts, so it writes the channels itself; checks they are the same.
test("Desktop: the preload uses the same channels as the main process", () => {
  const preload = readFileSync(path.join(import.meta.dirname, "preload.cts"), "utf8");
  assert.ok(preload.includes(`"${NOTIFY_CHANNEL}"`));
  assert.ok(preload.includes(`"${OPEN_NOTIFICATIONS_CHANNEL}"`));
});
