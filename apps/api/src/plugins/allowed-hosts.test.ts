import assert from "node:assert/strict";
import os from "node:os";
import { after, afterEach, test, mock } from "node:test";
import { buildApp } from "../app.js";
import { TEST_SESSIONS } from "../sessions/testSessions.js";
import { hostName } from "./allowed-hosts.js";

// The host check answers before any database call, so these run without a database.

/** An address only the mocked network interfaces have. */
const WIFI_ADDRESS = "192.168.77.10";

const app = buildApp({ sessions: TEST_SESSIONS });

after(() => app.close());

afterEach(() => {
  mock.restoreAll();
  delete process.env.APC_ALLOWED_HOSTS;
});

/**
 * Asks for the health check addressed to a host.
 * @param host The Host header.
 * @param on The app to ask; the shared one by default.
 * @returns The status code.
 */
async function healthFor(host: string, on = app): Promise<number> {
  return (await on.inject({ method: "GET", url: "/health", headers: { host } })).statusCode;
}

/**
 * Makes this computer's network interfaces hold one Wi-Fi address next to the loopback ones.
 * @param address The Wi-Fi address.
 */
function mockInterfaces(address: string) {
  mock.method(os, "networkInterfaces", () => ({
    lo: [{ address: "127.0.0.1", family: "IPv4", internal: true }],
    wifi: [{ address, family: "IPv4", internal: false }],
  }));
}

// Reads hosts with and without a port, in brackets for IPv6, in uppercase and missing, and checks only the name is
// kept, in lowercase.
test("API: a Host is read without its port", () => {
  assert.equal(hostName("LocalHost:3333"), "localhost");
  assert.equal(hostName("192.168.0.10"), "192.168.0.10");
  assert.equal(hostName("[::1]:3333"), "::1");
  assert.equal(hostName("fe80::1"), "fe80::1");
  assert.equal(hostName(""), undefined);
  assert.equal(hostName(undefined), undefined);
});

// Addresses the API as localhost, the loopback addresses and the Android emulator's alias, with and without a port,
// and checks each is answered.
test("API: requests addressed to this computer's own names are answered", async () => {
  for (const host of ["localhost:3333", "localhost", "127.0.0.1:3333", "[::1]:3333", "10.0.2.2:3333"]) {
    assert.equal(await healthFor(host), 200, host);
  }
});

// Addresses the API as another domain, with and without a port, and checks each is refused with 403 naming
// APC_ALLOWED_HOSTS, a route behind a session included. (A request without a Host has no name, as the first test
// shows, so it is refused the same way.)
test("API: requests addressed to another host are refused", async () => {
  for (const host of ["evil.example", "evil.example:3333"]) {
    const response = await app.inject({ method: "GET", url: "/health", headers: { host } });
    assert.equal(response.statusCode, 403, host);
    assert.match(response.json().message, /APC_ALLOWED_HOSTS/);
  }
  const items = await app.inject({ method: "GET", url: "/items", headers: { host: "evil.example:3333" } });
  assert.equal(items.statusCode, 403);
});

// Gives the computer a Wi-Fi address after the API started, and checks a request addressed to it is answered, as the
// phone's are, without a restart.
test("API: an address of this computer's network interfaces is answered, even a new one", async () => {
  assert.equal(await healthFor(`${WIFI_ADDRESS}:3333`), 403);
  mockInterfaces(WIFI_ADDRESS);
  assert.equal(await healthFor(`${WIFI_ADDRESS}:3333`), 200);
});

// Lists the computer's name and another in APC_ALLOWED_HOSTS, with spaces and in another case, and checks requests
// addressed to either are answered while others still aren't.
test("API: the names in APC_ALLOWED_HOSTS are answered", async () => {
  process.env.APC_ALLOWED_HOSTS = " Oficina.local , apc-server ";
  const listed = buildApp({ sessions: TEST_SESSIONS });
  try {
    assert.equal(await healthFor("oficina.local:3333", listed), 200);
    assert.equal(await healthFor("APC-SERVER", listed), 200);
    assert.equal(await healthFor("evil.example", listed), 403);
  } finally {
    await listed.close();
  }
});
