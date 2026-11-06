import assert from "node:assert/strict";
import { after, afterEach, test, mock } from "node:test";
import { proveDevice } from "@apc/domain/devices";
import { buildApp } from "../../app.js";
import { checkProof, isLoopback, issueChallenge } from "../devices.js";
import { entryCodeUser, HELD_MS, holdEntryCode, issueEntryCode, useEntryCode } from "../entryCodes.js";
import { testDevice } from "../testDevices.js";
import { AUTHORIZED, TEST_SESSIONS } from "../../auth/testSessions.js";

// The devices' rules and routes that answer before any database call: the nonces, the proof, and the routes kept to
// the server's computer.

const app = buildApp({ sessions: TEST_SESSIONS });

after(() => app.close());
afterEach(() => mock.timers.reset());

// Asks for two nonces and checks each is new, random and open without a session.
test("API: a device gets a fresh nonce to sign, without a session", async () => {
  const first = await app.inject({ method: "GET", url: "/devices/challenge", remoteAddress: "10.0.0.2" });
  const second = await app.inject({ method: "GET", url: "/devices/challenge", remoteAddress: "10.0.0.2" });
  assert.equal(first.statusCode, 200);
  assert.match(first.json().nonce, /^[A-Za-z0-9_-]{32}$/);
  assert.notEqual(first.json().nonce, second.json().nonce);
});

// Signs a nonce and checks the proof holds once only; then that a nonce never handed out, a signature by another key,
// and a nonce past its 2 minutes don't hold.
test("API: a device's proof holds once, for a live nonce, signed by its key", async () => {
  const device = await testDevice();
  const proof = await proveDevice(device, issueChallenge());
  assert.equal(await checkProof(proof), true);
  assert.equal(await checkProof(proof), false);

  assert.equal(await checkProof(await proveDevice(device, "never-handed-out")), false);
  const other = await proveDevice(await testDevice(), issueChallenge());
  assert.equal(await checkProof({ ...other, publicKey: await device.publicKey() }), false);

  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const old = await proveDevice(device, issueChallenge());
  mock.timers.tick(2 * 60 * 1000);
  assert.equal(await checkProof(old), false);
});

// Sends what the web app's demo sends in place of a device's proof ("demo", not a key: see
// apps/web/src/demo/demoDevice.ts), with a live nonce, and checks the API refuses it, so nothing from the demo works
// against a real server.
test("API: the demo's stand-in for a device is refused", async () => {
  const demo = { publicKey: "demo", signature: "demo" };
  assert.equal(await checkProof({ ...demo, nonce: issueChallenge() }), false);
  const { nonce } = (await app.inject({ method: "GET", url: "/devices/challenge" })).json();
  const status = await app.inject({ method: "POST", url: "/devices/status", payload: { ...demo, nonce } });
  assert.equal(status.statusCode, 401);
});

// Calls each device route with a session, and asks for an entry code, from an address on the Wi-Fi, and checks every
// one is refused with 403, so a device can't authorize itself or another, or hand itself a code; and that the
// loopback addresses count as the server's computer.
test("API: devices are managed only from the server's computer", async () => {
  const calls = [
    { method: "GET", url: "/devices" },
    { method: "POST", url: "/devices/d1/authorize", payload: {} },
    { method: "PATCH", url: "/devices/d1", payload: { name: "Celular" } },
    { method: "DELETE", url: "/devices/d1" },
    { method: "POST", url: "/pairings" },
  ] as const;
  for (const call of calls) {
    const response = await app.inject({ ...call, headers: AUTHORIZED, remoteAddress: "192.168.0.15" });
    assert.equal(response.statusCode, 403, call.url);
    assert.equal(response.json().message, "Devices are managed only on the server's computer.");
  }
  assert.equal((await app.inject({ method: "GET", url: "/devices", remoteAddress: "127.0.0.1" })).statusCode, 401);
  assert.deepEqual(
    ["127.0.0.1", "::1", "::ffff:127.0.0.1", "192.168.0.15", "::ffff:192.168.0.15", "10.0.2.2"].map(isLoopback),
    [true, true, true, false, false, false],
  );
});

// Sends a login and a sign-up without the device's proof, and checks both are refused before anything else.
test("API: a login and a sign-up need the device's proof", async () => {
  const login = await app.inject({ method: "POST", url: "/sessions", payload: { username: "ana.souza", password: "freio1234" } });
  assert.equal(login.statusCode, 400);
  const signUp = await app.inject({
    method: "POST",
    url: "/users",
    payload: { displayName: "Ana Souza", username: "ana.souza", email: "ana@oficina.com", password: "freio1234" },
  });
  assert.equal(signUp.statusCode, 400);
});

// Asks for an entry code on the server's computer, and checks it is 8 characters that don't read alike, ending in 5
// minutes; then that a code works once, ends after its 5 minutes, and is replaced by the next one for the same user.
test("API: the server's computer hands out entry codes that work once, for 5 minutes", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-05T12:00:00Z") });
  const issued = await app.inject({ method: "POST", url: "/pairings", headers: AUTHORIZED, remoteAddress: "127.0.0.1" });
  assert.equal(issued.statusCode, 201);
  assert.match(issued.json().code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  assert.equal(issued.json().expiresAt, "2026-11-05T12:05:00.000Z");

  const once = issueEntryCode("u1").code;
  assert.equal(entryCodeUser(once, "pk1"), "u1");
  useEntryCode(once);
  assert.equal(entryCodeUser(once, "pk1"), null);
  const late = issueEntryCode("u1").code;
  mock.timers.tick(5 * 60 * 1000);
  assert.equal(entryCodeUser(late, "pk1"), null);
  const replaced = issueEntryCode("u1").code;
  const latest = issueEntryCode("u1").code;
  assert.equal(entryCodeUser(replaced, "pk1"), null);
  assert.equal(entryCodeUser(latest, "pk1"), "u1");
});

// Holds a code for a waiting phone, and checks only that phone's key uses it from then on, a new code for the user
// leaves it be, and it lasts 30 minutes from when it was held, past its first 5.
test("API: a code held by a waiting phone is that phone's, for 30 minutes", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-05T12:00:00Z") });
  const held = issueEntryCode("u2").code;
  holdEntryCode(held, "phone");
  assert.equal(entryCodeUser(held, "other"), null);
  assert.equal(entryCodeUser(held, "phone"), "u2");
  issueEntryCode("u2");
  mock.timers.tick(HELD_MS - 1);
  assert.equal(entryCodeUser(held, "phone"), "u2");
  mock.timers.tick(1);
  assert.equal(entryCodeUser(held, "phone"), null);
});

// Logs in with an entry code without the device's proof, then with a code never handed out, and checks each is
// refused; then that an address gets 10 tries in 15 minutes.
test("API: an entry with a code needs the device's proof and a code handed out, 10 tries per address", async () => {
  const device = await testDevice();
  const pair = async (remoteAddress: string, code = "K7Q2ZD9M") =>
    app.inject({ method: "POST", url: "/sessions/pairing", payload: { code, device: await proveDevice(device, issueChallenge()) }, remoteAddress });
  const unproved = await app.inject({ method: "POST", url: "/sessions/pairing", payload: { code: "K7Q2ZD9M" }, remoteAddress: "10.0.0.6" });
  assert.equal(unproved.statusCode, 400);
  const unknown = await pair("10.0.0.7");
  assert.equal(unknown.statusCode, 401);
  for (let i = 2; i <= 10; i++) {
    assert.equal((await pair("10.0.0.7")).statusCode, 401);
  }
  assert.equal((await pair("10.0.0.7")).statusCode, 429);
  assert.equal((await pair("10.0.0.8")).statusCode, 401);
});
