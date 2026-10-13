import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_API_URL, isLocalApi, parseConfig, resolveApiUrl } from "./config.ts";

// Resolves the API address with each source set, and checks APC_API_URL wins over config.json, which wins over the
// default, and that a trailing slash is dropped so paths join on it.
test("Desktop: the API address comes from the environment, then config.json, then the default", () => {
  assert.equal(resolveApiUrl("http://10.0.0.5:3333/", { apiUrl: "http://192.168.0.10:3333" }), "http://10.0.0.5:3333");
  assert.equal(resolveApiUrl(undefined, { apiUrl: "http://192.168.0.10:3333" }), "http://192.168.0.10:3333");
  assert.equal(resolveApiUrl(undefined, {}), DEFAULT_API_URL);
});

// Gives addresses that aren't http or https, and text that isn't an address, and checks each is skipped for the
// next source.
test("Desktop: an address that isn't http or https is skipped", () => {
  assert.equal(resolveApiUrl("ftp://10.0.0.5", { apiUrl: "192.168.0.10:3333" }), DEFAULT_API_URL);
  assert.equal(resolveApiUrl("not an address", { apiUrl: "https://apc.example:8443" }), "https://apc.example:8443");
});

// Reads config.json texts, and checks a missing file, broken JSON or a value that isn't an object give no settings.
test("Desktop: config.json is read only when it holds a JSON object", () => {
  assert.deepEqual(parseConfig('{ "apiUrl": "http://192.168.0.10:3333" }'), { apiUrl: "http://192.168.0.10:3333" });
  assert.deepEqual(parseConfig(undefined), {});
  assert.deepEqual(parseConfig("{ apiUrl: "), {});
  assert.deepEqual(parseConfig("null"), {});
});

// Checks the app only counts this computer's addresses as local, the only ones it starts the API for.
test("Desktop: only this computer's addresses count as a local API", () => {
  assert.equal(isLocalApi("http://localhost:3333"), true);
  assert.equal(isLocalApi("http://127.0.0.1:3333"), true);
  assert.equal(isLocalApi("http://[::1]:3333"), true);
  assert.equal(isLocalApi("http://192.168.0.10:3333"), false);
});
