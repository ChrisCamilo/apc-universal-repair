import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { TEST_USERS } from "@apc/shared/test-users";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";
import { hashToken } from "../sessions/sessions.js";

// Renaming and merging list entries against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded,
// on PostgreSQL or SQLite: a rename to a held name is refused naming the entry that has it, and a merge moves every
// item in one transaction, a vehicle brand's models along. Each run uses its own codes and names, removed at the end.

const app = buildApp();
/** Tells this run's items and list names apart from the seed's and other runs'. */
const RUN = randomBytes(3).toString("hex").toUpperCase();
const USER = TEST_USERS[0];
/** The token of this file's session. */
let token = "";

before(async () => {
  const login = await app.inject({ method: "POST", url: "/sessions", payload: { username: USER.username, password: USER.password } });
  token = login.json().token;
});

after(async () => {
  await prisma.item.deleteMany({ where: { code: { contains: RUN } } });
  await prisma.vehicleModel.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.brand.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.category.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.partBrand.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  await app.close();
  await prisma.$disconnect();
});

/**
 * Calls the API with this file's session.
 * @param method The method.
 * @param url The path.
 * @param payload The JSON body, if any.
 * @returns The answer.
 */
function call(method: "GET" | "POST" | "PATCH", url: string, payload?: object) {
  return app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });
}

/**
 * Creates an item of this run, its list names created with it.
 * @param code The part code, before the run's mark.
 * @param fields The list names to use.
 */
async function createItem(code: string, fields: { category?: string; vehicleBrand?: string; vehicleModel?: string } = {}) {
  const created = await call("POST", "/items", {
    code: `${code}-${RUN}`,
    name: `Para-choque ${RUN}`,
    category: `Para-choque ${RUN}`,
    partBrand: `Arteb ${RUN}`,
    vehicleBrand: `Gurgel ${RUN}`,
    unitPriceCents: 19990,
    ...fields,
  });
  assert.equal(created.statusCode, 201, created.body);
}

// Creates items in two categories, renames one to the other's name and checks it is refused naming that one, then
// merges it into the other and checks its items moved, it left the list, and a merge into itself or of an entry
// that is gone is refused.
test("API: a category merged into another takes its items there", async () => {
  await createItem("PC-1", { category: `Parachoque ${RUN}` });
  await createItem("PC-2", { category: `Parachoque ${RUN}` });
  await createItem("PC-3");
  const from = await prisma.category.findFirstOrThrow({ where: { name: `Parachoque ${RUN}` } });
  const into = await prisma.category.findFirstOrThrow({ where: { name: `Para-choque ${RUN}` } });

  const renamed = await call("PATCH", `/categories/${from.id}`, { name: `para-choque ${RUN}` });
  assert.equal(renamed.statusCode, 409);
  assert.equal(renamed.json().details[0].entryId, into.id);

  assert.equal((await call("POST", `/categories/${from.id}/merge`, { into: from.id })).statusCode, 409);
  const merged = await call("POST", `/categories/${from.id}/merge`, { into: into.id });
  assert.equal(merged.statusCode, 200);
  assert.deepEqual(merged.json(), { moved: 2 });
  assert.equal(await prisma.item.count({ where: { categoryId: into.id } }), 3);
  assert.equal(await prisma.category.findUnique({ where: { id: from.id } }), null);
  assert.equal((await call("POST", `/categories/${from.id}/merge`, { into: into.id })).statusCode, 404);
});

// Creates items on two vehicle brands, sharing a model name and each with a model of its own, merges one brand into
// the other and checks every item moved, the shared model joined the other's, the other model moved along, and a
// catalog brand can't be merged away.
test("API: a vehicle brand merged into another takes its items and models there", async () => {
  await createItem("VB-1", { vehicleBrand: `GM ${RUN}`, vehicleModel: `Opala ${RUN}` });
  await createItem("VB-2", { vehicleBrand: `GM ${RUN}`, vehicleModel: `Monza ${RUN}` });
  await createItem("VB-3", { vehicleBrand: `Chevrolet ${RUN}`, vehicleModel: `opala ${RUN}` });
  const from = await prisma.brand.findFirstOrThrow({ where: { name: `GM ${RUN}` } });
  const into = await prisma.brand.findFirstOrThrow({ where: { name: `Chevrolet ${RUN}` } });
  const opala = await prisma.vehicleModel.findFirstOrThrow({ where: { brandId: into.id } });

  const merged = await call("POST", `/vehicle-brands/${from.id}/merge`, { into: into.id });
  assert.deepEqual(merged.json(), { moved: 2 });
  const items = await prisma.item.findMany({
    where: { code: { startsWith: "VB-" }, AND: { code: { contains: RUN } } },
    select: { vehicleBrandId: true, vehicleModel: { select: { name: true, brandId: true } } },
    orderBy: { code: "asc" },
  });
  assert.ok(items.every((item) => item.vehicleBrandId === into.id && item.vehicleModel?.brandId === into.id));
  assert.deepEqual(
    items.map((item) => item.vehicleModel?.name),
    [opala.name, `Monza ${RUN}`, opala.name],
  );
  assert.equal(await prisma.vehicleModel.count({ where: { brandId: into.id } }), 2);
  assert.equal(await prisma.brand.findUnique({ where: { id: from.id } }), null);

  const catalog = await prisma.brand.findUniqueOrThrow({ where: { name: "Chevrolet" } });
  assert.equal((await call("POST", `/vehicle-brands/${catalog.id}/merge`, { into: into.id })).statusCode, 409);
});

// Creates two models of a brand and one of another, checks a model can't be merged into the other brand's, then
// merges the two of the same brand and checks the item moved.
test("API: a vehicle model merges only into a model of its brand", async () => {
  await createItem("VM-1", { vehicleBrand: `Ford ${RUN}`, vehicleModel: `Corcel II ${RUN}` });
  await createItem("VM-2", { vehicleBrand: `Ford ${RUN}`, vehicleModel: `Corcel 2 ${RUN}` });
  await createItem("VM-3", { vehicleBrand: `Gurgel ${RUN}`, vehicleModel: `Corcel ${RUN}` });
  const from = await prisma.vehicleModel.findFirstOrThrow({ where: { name: `Corcel II ${RUN}` } });
  const into = await prisma.vehicleModel.findFirstOrThrow({ where: { name: `Corcel 2 ${RUN}` } });
  const other = await prisma.vehicleModel.findFirstOrThrow({ where: { name: `Corcel ${RUN}` } });

  assert.equal((await call("POST", `/vehicle-models/${from.id}/merge`, { into: other.id })).statusCode, 409);
  const merged = await call("POST", `/vehicle-models/${from.id}/merge`, { into: into.id });
  assert.deepEqual(merged.json(), { moved: 1 });
  assert.equal(await prisma.item.count({ where: { vehicleModelId: into.id } }), 2);
  assert.equal(await prisma.vehicleModel.findUnique({ where: { id: from.id } }), null);
});
