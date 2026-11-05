import assert from "node:assert/strict";
import { after, afterEach, test, mock } from "node:test";
import { proveDevice } from "@apc/shared/devices";
import { buildApp } from "../app.js";
import { checkProof, isLoopback, issueChallenge } from "../devices/devices.js";
import { testDevice } from "../devices/testDevices.js";
import { AUTHORIZED, TEST_SESSIONS } from "../sessions/testSessions.js";

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

// Calls each device route with a session, from an address on the Wi-Fi, and checks every one is refused with 403,
// so a device can't authorize itself or another; and that the loopback addresses count as the server's computer.
test("API: devices are managed only from the server's computer", async () => {
  const calls = [
    { method: "GET", url: "/devices" },
    { method: "POST", url: "/devices/d1/authorize", payload: {} },
    { method: "PATCH", url: "/devices/d1", payload: { name: "Celular" } },
    { method: "DELETE", url: "/devices/d1" },
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
