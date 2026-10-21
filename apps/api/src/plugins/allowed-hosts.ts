import os from "node:os";
import type { FastifyInstance } from "fastify";

// The API answers only requests addressed to this computer, closing DNS rebinding: a web page open in a browser here
// can have its own domain resolve to 127.0.0.1 and reach the API as if it were that domain, but its requests still
// carry that domain as their Host. A Host is accepted, with any port, when it is localhost, a loopback address, an
// address of this computer's network interfaces (the phone calls http://<its IPv4>:3000), 10.0.2.2 (how the Android
// emulator reaches this computer), or a name listed in APC_ALLOWED_HOSTS, such as the computer's name on the network.
// The interfaces are read again when a Host isn't known, so a new Wi-Fi address works without a restart. Anything
// else, a request without a Host included, is answered 403 before the session is looked at.

/** The names that always mean this computer. */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "10.0.2.2"];

/**
 * Reads the name a Host header addresses, without its port.
 * @param header The Host header, e.g. "192.168.0.10:3333" or "[::1]:3333".
 * @returns The name in lowercase, e.g. "192.168.0.10" or "::1"; undefined for a missing or empty header.
 */
export function hostName(header: string | undefined): string | undefined {
  const host = header?.trim().toLowerCase();
  if (!host) {
    return undefined;
  }
  if (host.startsWith("[")) {
    return host.slice(1, host.indexOf("]"));
  }
  // A bare IPv6 address has several colons and no port.
  return host.split(":").length === 2 ? host.split(":")[0] : host;
}

/**
 * Lists the addresses of this computer's network interfaces.
 * @returns Each address in lowercase, IPv4 and IPv6.
 */
function interfaceAddresses(): string[] {
  return Object.values(os.networkInterfaces()).flatMap((addresses) => (addresses ?? []).map(({ address }) => address.toLowerCase()));
}

/**
 * Makes every route answer only requests addressed to this computer.
 * @param app The Fastify app, before its routes are registered.
 * @param listed The names APC_ALLOWED_HOSTS lists, comma separated.
 */
export function registerAllowedHosts(app: FastifyInstance, listed = process.env.APC_ALLOWED_HOSTS ?? "") {
  const named = [...LOCAL_HOSTS, ...listed.split(",").map((name) => name.trim().toLowerCase())].filter(Boolean);
  let allowed = new Set([...named, ...interfaceAddresses()]);
  app.addHook("onRequest", async (request, reply) => {
    const name = hostName(request.headers.host);
    if (name && !allowed.has(name)) {
      allowed = new Set([...named, ...interfaceAddresses()]);
    }
    if (!name || !allowed.has(name)) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: `This server doesn't answer for the host "${name ?? ""}". Add it to APC_ALLOWED_HOSTS to allow it.`,
      });
    }
  });
}
