import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { catalogSchema } from "@apc/domain/catalog";
import { TEST_CATALOG_DATA } from "@apc/domain/test-catalog";
import { TEST_USERS } from "@apc/domain/test-users";
import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { testDevice, testProof } from "../../devices/testDevices.js";

// The catalog against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded, on PostgreSQL or
// SQLite: it holds the catalog a new database starts with, which its migration inserted, and the vehicle brands and
// models it has are kept in the Inventory's lists. Each run uses its own names, removed at the end.

const app = buildApp();
/** Tells this run's list names apart from the seed's and other runs'. */
const RUN = randomBytes(3).toString("hex").toUpperCase();
const USER = TEST_USERS[0];
/** The token of this file's session. */
let token = "";
/** The device the tests log in from, authorized as it logs in from the server's computer. */
const DEVICE = await testDevice();

before(async () => {
  const login = await app.inject({
    method: "POST",
    url: "/sessions",
    payload: { username: USER.username, password: USER.password, device: await testProof(app, DEVICE) },
  });
  token = login.json().token;
});

after(async () => {
  await prisma.vehicleModel.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.device.deleteMany({ where: { publicKey: await DEVICE.publicKey() } });
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
function call(method: "GET" | "POST" | "DELETE", url: string, payload?: object) {
  return app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });
}

// Loads the catalog and checks it is the starting one: its brands in the rail's order, each by the id of its vehicle
// brand in the lists, and its models, generations, versions, years and engines with their sheets, ids included.
test("API: the catalog holds the one a new database starts with", async () => {
  const answer = await call("GET", "/catalog");
  assert.equal(answer.statusCode, 200);
  const catalog = catalogSchema.parse(answer.json());
  const brands = await prisma.brand.findMany({ where: { name: { in: TEST_CATALOG_DATA.brands.map((brand) => brand.name) } } });
  const brandId = (name: string) => brands.find((brand) => brand.name === name)!.id;
  assert.deepEqual(catalog, { brands: TEST_CATALOG_DATA.brands.map((brand) => ({ ...brand, id: brandId(brand.name) })) });
});

// Lists the vehicle brands and models and checks the catalog's are marked, then tries to delete a catalog brand, and
// to delete and merge away a catalog model no item uses, and checks each is refused, while a model of this run isn't
// marked.
test("API: the catalog's vehicle brands and models are kept in the lists", async () => {
  const brands: { id: string; name: string; inCatalog: boolean }[] = (await call("GET", "/vehicle-brands")).json();
  const ford = brands.find((brand) => brand.name === "Ford")!;
  assert.equal(ford.inCatalog, true);
  assert.equal(brands.find((brand) => brand.name === "Universal")?.inCatalog, false);
  const models: { id: string; name: string; vehicleBrandId: string; inCatalog: boolean }[] = (await call("GET", "/vehicle-models")).json();
  const corcel = models.find((model) => model.name === "Corcel" && model.vehicleBrandId === ford.id)!;
  const escort = models.find((model) => model.name === "Escort" && model.vehicleBrandId === ford.id)!;
  assert.equal(corcel.inCatalog, true);

  assert.equal((await call("DELETE", `/vehicle-brands/${ford.id}`)).statusCode, 409);
  assert.equal((await call("DELETE", `/vehicle-models/${corcel.id}`)).statusCode, 409);
  assert.equal((await call("POST", `/vehicle-models/${corcel.id}/merge`, { into: escort.id })).statusCode, 409);
  assert.ok(await prisma.catalogModel.findUnique({ where: { vehicleModelId: corcel.id } }));

  const created = await call("POST", "/vehicle-models", { name: `Pampa ${RUN}`, vehicleBrandId: ford.id });
  assert.equal(created.json().inCatalog, false);
  assert.equal((await call("POST", `/vehicle-models/${created.json().id}/merge`, { into: corcel.id })).statusCode, 200);
});
