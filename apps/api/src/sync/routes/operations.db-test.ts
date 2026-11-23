import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { SyncOperationResult } from "@apc/domain/sync";
import type { DeviceSigner } from "@apc/domain/devices";
import { TEST_USERS } from "@apc/domain/test-users";
import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { testDevice, testProof } from "../../devices/testDevices.js";

// A phone's batch of operations against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded, on
// PostgreSQL or SQLite: operations apply in order with the item routes' rules, a new item keeps the ids the phone gave
// it, the same batch sent again (one after the other or at once) changes nothing, stock moves from two phones add up and
// stop at 0, and a refused operation answers why, the ones after it still applied. Each run uses its own codes and names,
// removed at the end, with its devices and the operations they sent.

const app = buildApp();
/** Tells this run's items and list names apart from the seed's and other runs'. */
const RUN = randomBytes(3).toString("hex").toUpperCase();
const USER = TEST_USERS[0];
/** The two phones the tests send from, authorized as they log in from the server's computer. */
const PHONES: DeviceSigner[] = [await testDevice(), await testDevice()];
/** Each phone's session token. */
const tokens: string[] = [];

before(async () => {
  for (const phone of PHONES) {
    const login = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { username: USER.username, password: USER.password, device: await testProof(app, phone) },
    });
    tokens.push(login.json().token);
  }
});

after(async () => {
  await prisma.item.deleteMany({ where: { brands: { some: { code: { contains: RUN } } } } });
  await prisma.brand.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.category.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.partBrand.deleteMany({ where: { name: { contains: RUN } } });
  for (const phone of PHONES) {
    await prisma.device.deleteMany({ where: { publicKey: await phone.publicKey() } });
  }
  await app.close();
  await prisma.$disconnect();
});

/**
 * Sends a batch of operations from one of the phones.
 * @param operations The operations.
 * @param phone Which phone, 0 or 1.
 * @returns Each operation's result.
 */
async function send(operations: object[], phone = 0): Promise<SyncOperationResult[]> {
  const answer = await app.inject({
    method: "POST",
    url: "/sync/operations",
    payload: { operations },
    headers: { authorization: `Bearer ${tokens[phone]}` },
  });
  assert.equal(answer.statusCode, 200, answer.body);
  return answer.json().results;
}

/**
 * Builds the operation that creates an item of this run, with the ids a phone gives it and its brand.
 * @param code The part code, before the run's mark.
 * @param quantity The brand's quantity.
 * @returns The operation, the item's id and its brand's.
 */
function creation(code: string, quantity = 5) {
  const itemId = randomUUID();
  const brandId = randomUUID();
  const operation = {
    id: randomUUID(),
    type: "createItem",
    itemId,
    item: {
      name: `Bomba d'água ${RUN}`,
      category: `Arrefecimento ${RUN}`,
      vehicles: [{ vehicleBrand: `Gurgel ${RUN}` }],
      brands: [{ id: brandId, code: `${code}-${RUN}`, partBrand: `Urba ${RUN}`, quantity, unitPriceCents: 15990 }],
    },
  };
  return { operation, itemId, brandId };
}

/**
 * Reads a brand's quantity and its item's.
 * @param brandId The brand.
 * @returns The two quantities.
 */
async function quantities(brandId: string) {
  const brand = await prisma.itemBrand.findUniqueOrThrow({ where: { id: brandId }, select: { quantity: true, item: { select: { quantity: true } } } });
  return { brand: brand.quantity, item: brand.item.quantity };
}

// Creates an item with the ids the phone gave it, edits it, moves its stock and deletes it in one batch, and checks
// each is applied in order with the route's status, the item having kept its ids until its deletion.
test("API: a batch applies its operations in order, a new item keeping the phone's ids", async () => {
  const { operation, itemId, brandId } = creation("OP-1");
  const edit = { id: randomUUID(), type: "updateItem", itemId, changes: { name: `Bomba d'água nova ${RUN}` } };
  const move = { id: randomUUID(), type: "moveStock", itemId, brandId, delta: -2 };
  const results = await send([operation, edit, move]);
  assert.deepEqual(
    results.map((result) => [result.status, result.statusCode]),
    [
      ["applied", 201],
      ["applied", 200],
      ["applied", 200],
    ],
  );
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId }, include: { brands: true } });
  assert.deepEqual([item.name, item.brands[0].id, item.quantity], [`Bomba d'água nova ${RUN}`, brandId, 3]);

  const [removed] = await send([{ id: randomUUID(), type: "deleteItem", itemId }]);
  assert.deepEqual([removed.status, removed.statusCode], ["applied", 204]);
  assert.equal(await prisma.item.count({ where: { id: itemId } }), 0);
});

// Sends a batch, then the same batch again, one after the other and then twice at once, as a phone does after a
// dropped connection, and checks each operation was applied once: the stock moved once, and every answer the same.
test("API: the same batch sent again changes nothing", async () => {
  const { operation, brandId } = creation("OP-2");
  const move = { id: randomUUID(), type: "moveStock", itemId: operation.itemId, brandId, delta: 4 };
  const first = await send([operation, move]);
  const again = await send([operation, move]);
  assert.deepEqual(again, first);
  assert.deepEqual(await quantities(brandId), { brand: 9, item: 9 });

  const twice = { id: randomUUID(), type: "moveStock", itemId: operation.itemId, brandId, delta: -1 };
  const [one, other] = await Promise.all([send([twice]), send([twice])]);
  assert.deepEqual(one, other);
  assert.deepEqual(await quantities(brandId), { brand: 8, item: 8 });
});

// Moves the same brand's stock from two phones, three in on one and two out on the other, and checks the moves add up;
// then takes out more than there is and checks the stock stops at 0.
test("API: stock moves from two phones add up, and stop at 0", async () => {
  const { operation, itemId, brandId } = creation("OP-3", 5);
  await send([operation]);
  await Promise.all([
    send([{ id: randomUUID(), type: "moveStock", itemId, brandId, delta: 3 }], 0),
    send([{ id: randomUUID(), type: "moveStock", itemId, brandId, delta: -2 }], 1),
  ]);
  assert.deepEqual(await quantities(brandId), { brand: 6, item: 6 });
  await send([{ id: randomUUID(), type: "moveStock", itemId, brandId, delta: -10 }], 1);
  assert.deepEqual(await quantities(brandId), { brand: 0, item: 0 });
});

// Sends a new item whose code another item uses, one whose id is taken and a move on an item that isn't there, between
// operations that are fine, and checks each refused one answers the route's status and why, the next ones still applied,
// and sending them again answers the same.
test("API: a refused operation answers why, and the ones after it still apply", async () => {
  const held = creation("OP-4");
  await send([held.operation]);
  const sameCode = creation("OP-4");
  const sameId = { ...creation("OP-5").operation, itemId: held.itemId };
  const fine = creation("OP-6");
  const missing = { id: randomUUID(), type: "moveStock", itemId: randomUUID(), brandId: randomUUID(), delta: 1 };
  const batch = [sameCode.operation, sameId, missing, fine.operation];
  const results = await send(batch);
  assert.deepEqual(
    results.map((result) => [result.status, result.statusCode]),
    [
      ["refused", 409],
      ["refused", 409],
      ["refused", 404],
      ["applied", 201],
    ],
  );
  assert.equal(results[0].details?.[0].itemId, held.itemId);
  assert.equal(await prisma.item.count({ where: { id: fine.itemId } }), 1);
  assert.deepEqual(await send(batch), results);
});
