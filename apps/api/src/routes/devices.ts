import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { deviceCode } from "@apc/shared/device-crypto";
import { deviceChallengeSchema, deviceListSchema, deviceNameSchema, deviceProofSchema, deviceSchema, deviceStatusSchema } from "@apc/shared/devices";
import { prisma } from "../db/client.js";
import { checkProof, deviceOf, isLoopback, issueChallenge } from "../devices/devices.js";
import { createLimiter } from "../users/attempts.js";

// The devices users log in from (see devices.ts). Open without a session: GET /devices/challenge hands out a nonce to
// sign, and POST /devices/status tells a device that proves it holds its key whether it was authorized yet ("pending",
// "authorized", or "unknown" once refused or removed), so a waiting device asks without logging in again; each address
// gets CHALLENGE_LIMIT nonces and STATUS_LIMIT asks in a window. Behind a session, and only from the server's computer
// itself: GET /devices lists every user's devices, pending first; POST /devices/:id/authorize authorizes one, naming
// it; PATCH /devices/:id renames one; and DELETE /devices/:id removes one, ending its sessions. A blank name keeps
// "Dispositivo <code>". From any other address these answer 403, so a device on the Wi-Fi can't authorize itself.

/** How many nonces an address gets in a window. */
const CHALLENGE_LIMIT = 300;
/** How many times an address asks for a device's status in a window: one every 3 seconds. */
const STATUS_LIMIT = 300;
/** A device's id in a path. */
const deviceParamsSchema = z.object({ id: z.string() });
/** What a device row is read with. */
const ROW = { include: { user: { select: { username: true, displayName: true } } } } as const;

/**
 * Names a device as the approver typed it, or "Dispositivo <code>" for a blank name.
 * @param name What was typed, if anything.
 * @param publicKey The device's key, for its code.
 * @returns The name to keep.
 */
async function deviceName(name: string | undefined, publicKey: string): Promise<string> {
  return name?.trim() || `Dispositivo ${await deviceCode(publicKey)}`;
}

/**
 * Answers 401 for a device whose proof doesn't hold.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
function deviceRefused(reply: FastifyReply) {
  return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "The device's signature doesn't hold. Ask for a new challenge." });
}

/**
 * Answers 404 for a device id that doesn't exist.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
function deviceNotFound(reply: FastifyReply) {
  return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Device not found." });
}

/**
 * Answers 403 for a request from any address but the server's computer.
 * @param request The request.
 * @param reply Reply to send.
 * @returns The sent reply, or nothing to go on.
 */
async function onlyHere(request: FastifyRequest, reply: FastifyReply) {
  if (!isLoopback(request.ip)) {
    return reply.status(403).send({ statusCode: 403, error: "Forbidden", message: "Devices are managed only on the server's computer." });
  }
}

/**
 * Registers the devices' routes, with their own counts of attempts.
 * @param app The Fastify app.
 */
export function registerDeviceRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const challenges = createLimiter(CHALLENGE_LIMIT);
  const asks = createLimiter(STATUS_LIMIT);
  /** Counts a call per address, answering 429 once it reached the limit. */
  const limited = (limiter: ReturnType<typeof createLimiter>) => async (request: FastifyRequest, reply: FastifyReply) => {
    const wait = limiter.wait(request.ip);
    if (wait > 0) {
      return reply.status(429).header("retry-after", String(Math.ceil(wait / 1000))).send({ statusCode: 429, error: "Too Many Requests", message: "Too many attempts." });
    }
    limiter.count(request.ip);
  };

  routes.get(
    "/devices/challenge",
    { config: { public: true }, onRequest: limited(challenges), schema: { response: { 200: deviceChallengeSchema } } },
    async () => ({ nonce: issueChallenge() }),
  );

  routes.post(
    "/devices/status",
    { config: { public: true }, onRequest: limited(asks), schema: { body: deviceProofSchema, response: { 200: deviceStatusSchema } } },
    async (request, reply) => {
      if (!(await checkProof(request.body))) {
        return deviceRefused(reply);
      }
      const statuses = (await prisma.device.findMany({ where: { publicKey: request.body.publicKey }, select: { status: true } })).map(({ status }) => status);
      return { status: statuses.includes("AUTHORIZED") ? ("authorized" as const) : statuses.length ? ("pending" as const) : ("unknown" as const) };
    },
  );

  routes.get("/devices", { onRequest: onlyHere, schema: { response: { 200: deviceListSchema } } }, async (request) => {
    const rows = await prisma.device.findMany({ ...ROW, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
    return { devices: await Promise.all(rows.map((row) => deviceOf(row, request.session.deviceId))) };
  });

  routes.post(
    "/devices/:id/authorize",
    { onRequest: onlyHere, schema: { params: deviceParamsSchema, body: deviceNameSchema, response: { 200: deviceSchema } } },
    async (request, reply) => {
      const device = await prisma.device.findUnique({ where: { id: request.params.id } });
      if (!device) {
        return deviceNotFound(reply);
      }
      const row = await prisma.device.update({
        where: { id: device.id },
        data: { status: "AUTHORIZED", approvedAt: device.approvedAt ?? new Date(), name: await deviceName(request.body.name, device.publicKey) },
        ...ROW,
      });
      return deviceOf(row, request.session.deviceId);
    },
  );

  routes.patch(
    "/devices/:id",
    { onRequest: onlyHere, schema: { params: deviceParamsSchema, body: deviceNameSchema, response: { 200: deviceSchema } } },
    async (request, reply) => {
      const device = await prisma.device.findUnique({ where: { id: request.params.id } });
      if (!device) {
        return deviceNotFound(reply);
      }
      const row = await prisma.device.update({ where: { id: device.id }, data: { name: await deviceName(request.body.name, device.publicKey) }, ...ROW });
      return deviceOf(row, request.session.deviceId);
    },
  );

  routes.delete("/devices/:id", { onRequest: onlyHere, schema: { params: deviceParamsSchema } }, async (request, reply) => {
    const { count } = await prisma.device.deleteMany({ where: { id: request.params.id } });
    return count ? reply.status(204).send() : deviceNotFound(reply);
  });
}
