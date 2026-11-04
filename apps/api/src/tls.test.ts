import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { get } from "node:http";
import { request } from "node:https";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import type { TLSSocket } from "node:tls";
import { generate } from "selfsigned";
import { buildApp, type HttpsOptions } from "./app.js";

// With a certificate, as the desktop app hands it while the phone's access is on, the API answers over HTTPS on its
// port, and only a client that trusts that certificate gets an answer; without one it answers plain HTTP, as in
// development.

/** A self-signed certificate like the desktop app's, made for the test. */
let tls: HttpsOptions;
const servers: ReturnType<typeof buildApp>[] = [];

before(async () => {
  const made = await generate([{ name: "commonName", value: "APC Universal Repair test" }], { keyType: "ec", algorithm: "sha256" });
  tls = { cert: made.cert, key: made.private };
});

after(() => Promise.all(servers.map((server) => server.close())));

/**
 * Starts the API on a free port of this computer.
 * @param https The certificate and its key, or undefined for plain HTTP.
 * @returns The port.
 */
async function listen(https?: HttpsOptions): Promise<number> {
  const app = buildApp({ https });
  servers.push(app);
  await app.listen({ port: 0, host: "127.0.0.1" });
  return (app.server.address() as AddressInfo).port;
}

/**
 * Asks GET /health over HTTPS.
 * @param port The API's port.
 * @param ca The certificate the client trusts, or undefined for the system's.
 * @returns The status, or the error's code when the connection is refused.
 */
function askHttps(port: number, ca?: string): Promise<number | string> {
  return new Promise((resolve) => {
    const req = request({ host: "127.0.0.1", port, path: "/health", ca, checkServerIdentity: () => undefined }, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    req.on("error", (error: NodeJS.ErrnoException) => resolve(error.code ?? error.message));
    req.end();
  });
}

// Starts the API with a certificate and asks it over HTTPS: a client that trusts that certificate gets the health
// check, one that trusts only the system's authorities is refused, and the certificate it shows is the one given.
test("API: with a certificate it answers over HTTPS only to a client that trusts it", async () => {
  const port = await listen(tls);
  assert.equal(await askHttps(port, tls.cert), 200);
  assert.equal(await askHttps(port), "DEPTH_ZERO_SELF_SIGNED_CERT");

  const shown = await new Promise<string>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: "/health", rejectUnauthorized: false }, (response) => {
      response.resume();
      resolve((response.socket as TLSSocket).getPeerX509Certificate()?.fingerprint256 ?? "");
    });
    req.on("error", reject);
    req.end();
  });
  assert.equal(shown, new X509Certificate(tls.cert).fingerprint256);
});

// Starts the API without a certificate and asks it over plain HTTP, as development does.
test("API: without a certificate it answers plain HTTP", async () => {
  const port = await listen();
  const status = await new Promise<number>((resolve, reject) => {
    get({ host: "127.0.0.1", port, path: "/health" }, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    }).on("error", reject);
  });
  assert.equal(status, 200);
});
