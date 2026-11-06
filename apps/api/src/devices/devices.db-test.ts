import assert from "node:assert/strict";
import { after, test } from "node:test";
import { deviceCode } from "@apc/shared/device-crypto";
import type { DeviceSigner } from "@apc/shared/devices";
import { TEST_USERS } from "@apc/shared/test-users";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";
import { hashToken } from "../auth/sessions.js";
import { testDevice, testProof } from "./testDevices.js";

// Authorizing devices against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded with the test
// users. The phone logs in from the Wi-Fi (PHONE_ADDRESS); the desktop app, from the server's computer, authorizes it.
// Each test's devices are removed at the end, with their sessions.

const app = buildApp();
const USER = TEST_USERS[0];
/** Where a phone on the shop's Wi-Fi calls from. */
const PHONE_ADDRESS = "192.168.0.15";
/** The devices the tests make, removed at the end. */
const made: DeviceSigner[] = [];

after(async () => {
  const keys = await Promise.all(made.map((device) => device.publicKey()));
  await prisma.device.deleteMany({ where: { publicKey: { in: keys } } });
  await app.close();
  await prisma.$disconnect();
});

/**
 * Makes a device, removed at the end.
 * @returns Its key.
 */
async function newDevice(): Promise<DeviceSigner> {
  const device = await testDevice();
  made.push(device);
  return device;
}

/**
 * Logs the first test user in from a device.
 * @param device The device's key.
 * @param remoteAddress Where the login comes from: the server's computer by default.
 * @returns The answer.
 */
async function login(device: DeviceSigner, remoteAddress = "127.0.0.1") {
  const proof = await testProof(app, device);
  return app.inject({ method: "POST", url: "/sessions", payload: { username: USER.username, password: USER.password, device: proof }, remoteAddress });
}

/**
 * Asks whether a device was authorized.
 * @param device The device's key.
 * @returns "pending", "authorized" or "unknown".
 */
async function statusOf(device: DeviceSigner): Promise<string> {
  const response = await app.inject({ method: "POST", url: "/devices/status", payload: await testProof(app, device), remoteAddress: PHONE_ADDRESS });
  return response.json().status;
}

/**
 * Builds the headers of a request with a token.
 * @param token The session's token.
 * @returns The Authorization header.
 */
function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

// Logs in from a new phone with the right password, and checks it is refused with 403 and the key's short code, no
// session started, and the device kept as pending with only its key, its status, its name and its dates.
test("API: a new device is recorded as pending, and its login waits", async () => {
  const phone = await newDevice();
  const response = await login(phone, PHONE_ADDRESS);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.json(), {
    statusCode: 403,
    error: "device_pending",
    message: "Este dispositivo precisa ser autorizado no computador do servidor.",
    code: await deviceCode(await phone.publicKey()),
  });
  const row = (await prisma.device.findFirst({ where: { publicKey: await phone.publicKey() } }))!;
  assert.deepEqual(Object.keys(row).sort(), ["approvedAt", "createdAt", "id", "lastUsedAt", "name", "publicKey", "status", "userId"]);
  assert.equal(row.status, "PENDING");
  assert.equal(await prisma.session.count({ where: { deviceId: row.id } }), 0);
  assert.equal(await statusOf(phone), "pending");

  const wrong = await app.inject({
    method: "POST",
    url: "/sessions",
    payload: { username: USER.username, password: "errada", device: await testProof(app, await newDevice()) },
    remoteAddress: PHONE_ADDRESS,
  });
  assert.equal(wrong.statusCode, 401);
});

// Logs in from the server's computer, whose device is authorized at once; lists the devices there and authorizes the
// waiting phone with a name; and checks the phone is then told so, and its login goes through.
test("API: the server's computer authorizes a waiting device, which then logs in", async () => {
  const desktop = await newDevice();
  const here = await login(desktop);
  assert.equal(here.statusCode, 200);
  const token = here.json().token;

  const phone = await newDevice();
  assert.equal((await login(phone, PHONE_ADDRESS)).statusCode, 403);
  const listed = (await app.inject({ method: "GET", url: "/devices", headers: bearer(token) })).json().devices;
  const code = await deviceCode(await phone.publicKey());
  const waiting = listed.find((device: { code: string }) => device.code === code);
  assert.deepEqual([waiting.status, waiting.username, waiting.current], ["pending", USER.username, false]);
  assert.equal(listed.find((device: { current: boolean }) => device.current).status, "authorized");

  const authorized = await app.inject({ method: "POST", url: `/devices/${waiting.id}/authorize`, headers: bearer(token), payload: { name: " Celular da Ana " } });
  assert.deepEqual([authorized.statusCode, authorized.json().status, authorized.json().name], [200, "authorized", "Celular da Ana"]);
  assert.equal(await statusOf(phone), "authorized");
  assert.equal((await login(phone, PHONE_ADDRESS)).statusCode, 200);

  const renamed = await app.inject({ method: "PATCH", url: `/devices/${waiting.id}`, headers: bearer(token), payload: { name: "" } });
  assert.equal(renamed.json().name, `Dispositivo ${code}`);
});

// Authorizes a phone and logs it in, then removes it from the server's computer, and checks its session ends with it,
// its token is refused, and it is no longer known.
test("API: removing a device ends its sessions", async () => {
  const token = (await login(await newDevice())).json().token;
  const phone = await newDevice();
  await login(phone, PHONE_ADDRESS);
  const row = (await prisma.device.findFirst({ where: { publicKey: await phone.publicKey() } }))!;
  await app.inject({ method: "POST", url: `/devices/${row.id}/authorize`, headers: bearer(token), payload: {} });
  const phoneToken = (await login(phone, PHONE_ADDRESS)).json().token;
  assert.equal((await app.inject({ method: "GET", url: "/categories", headers: bearer(phoneToken) })).statusCode, 200);

  assert.equal((await app.inject({ method: "DELETE", url: `/devices/${row.id}`, headers: bearer(token) })).statusCode, 204);
  assert.equal(await prisma.session.count({ where: { tokenHash: hashToken(phoneToken) } }), 0);
  assert.equal((await app.inject({ method: "GET", url: "/categories", headers: bearer(phoneToken) })).statusCode, 401);
  assert.equal(await statusOf(phone), "unknown");
  assert.equal((await app.inject({ method: "DELETE", url: `/devices/${row.id}`, headers: bearer(token) })).statusCode, 404);
});

// Logs in on the server's computer and asks for an entry code there; a new phone sends it from the Wi-Fi and checks it
// waits for authorization with its short code, no session started, while another phone can't use the code it holds;
// the computer asks for a new code, as its dialog does every 5 minutes, and authorizes the phone, which then logs in
// with the same code into the same user, with a session that works; then that the code doesn't work again.
test("API: an entry code logs a phone in once the server's computer authorizes it", async () => {
  const token = (await login(await newDevice())).json().token;
  const issued = await app.inject({ method: "POST", url: "/pairings", headers: bearer(token) });
  assert.equal(issued.statusCode, 201);
  const { code } = issued.json();

  const phone = await newDevice();
  const pair = async (entry: string, device: DeviceSigner) =>
    app.inject({ method: "POST", url: "/sessions/pairing", payload: { code: entry, device: await testProof(app, device) }, remoteAddress: PHONE_ADDRESS });
  const waiting = await pair(code, phone);
  assert.equal(waiting.statusCode, 403);
  assert.deepEqual([waiting.json().error, waiting.json().code], ["device_pending", await deviceCode(await phone.publicKey())]);
  const row = (await prisma.device.findFirst({ where: { publicKey: await phone.publicKey() } }))!;
  assert.equal(row.status, "PENDING");
  assert.equal(await prisma.session.count({ where: { deviceId: row.id } }), 0);
  assert.equal((await pair(code, await newDevice())).statusCode, 401);

  assert.equal((await app.inject({ method: "POST", url: "/pairings", headers: bearer(token) })).statusCode, 201);
  await app.inject({ method: "POST", url: `/devices/${row.id}/authorize`, headers: bearer(token), payload: {} });
  assert.equal(await statusOf(phone), "authorized");
  const paired = await pair(code, phone);
  assert.equal(paired.statusCode, 200);
  assert.deepEqual([paired.json().username, paired.json().displayName], [USER.username, USER.displayName]);
  assert.equal((await app.inject({ method: "GET", url: "/categories", headers: bearer(paired.json().token) })).statusCode, 200);
  assert.equal((await pair(code, phone)).statusCode, 401);
});
