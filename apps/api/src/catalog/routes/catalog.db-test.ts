import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { catalogSchema } from "@apc/domain/catalog";
import { TEST_CATALOG_DATA } from "@apc/domain/test-catalog";
import { TEST_USERS } from "@apc/domain/test-users";
import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { testDevice, testProof } from "../../devices/testDevices.js";

// The catalog against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded, on PostgreSQL or
// SQLite: it holds the catalog a new database starts with, which its migration inserted, and the vehicle brands and
// models it has are kept in the Inventory's lists; a brand and the levels of its tree are added, renamed, moved and
// deleted. Each run uses its own names, removed at the end.

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
  await prisma.catalogModel.deleteMany({ where: { vehicleModel: { name: { contains: RUN } } } });
  await prisma.catalogBrand.deleteMany({ where: { brand: { name: { contains: RUN } } } });
  await prisma.vehicleModel.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.brand.deleteMany({ where: { name: { contains: RUN } } });
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
function call(method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: object) {
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

// Adds a brand of this run, and checks it joins the lists and ends the rail with its letters, and that adding it again
// is refused; adds a model under it, then a generation, a version and a year down from it, and checks a second model
// or year of the same name or number is refused, a generation whose last year comes first is rejected, and a parent
// that isn't there is not found.
test("API: a brand and the levels of its tree are added", async () => {
  const added = await call("POST", "/catalog/brands", { name: `renault ${RUN}` });
  assert.equal(added.statusCode, 201);
  const brand = catalogSchema.parse(added.json()).brands.at(-1)!;
  assert.deepEqual([brand.name, brand.mark, brand.models], [`Renault ${RUN}`, `R${RUN[0]}`, []]);
  assert.ok(await prisma.brand.findUnique({ where: { id: brand.id } }));
  assert.equal((await call("POST", "/catalog/brands", { name: `RENAULT ${RUN}` })).statusCode, 409);

  const model = (await call("POST", `/catalog/brands/${brand.id}/models`, { name: `clio ${RUN}` })).json();
  const clio = catalogSchema.parse(model).brands.at(-1)!.models[0];
  assert.equal(clio.name, `Clio ${RUN}`);
  assert.equal((await call("POST", `/catalog/brands/${brand.id}/models`, { name: `Clio ${RUN}` })).statusCode, 409);

  const backwards = await call("POST", `/catalog/models/${clio.id}/generations`, { name: "Primeira geração", firstYear: 1999, lastYear: 1990 });
  assert.equal(backwards.statusCode, 400);
  const withGeneration = await call("POST", `/catalog/models/${clio.id}/generations`, { name: "primeira geração", firstYear: 1990, lastYear: null });
  const generation = catalogSchema.parse(withGeneration.json()).brands.at(-1)!.models[0].generations[0];
  assert.deepEqual([generation.name, generation.firstYear, generation.lastYear], ["Primeira geração", 1990, null]);
  const withVersion = await call("POST", `/catalog/generations/${generation.id}/versions`, { name: "RT" });
  const version = catalogSchema.parse(withVersion.json()).brands.at(-1)!.models[0].generations[0].versions[0];
  const year = await call("POST", `/catalog/versions/${version.id}/years`, { year: 1996 });
  assert.equal(year.statusCode, 201);
  assert.equal(catalogSchema.parse(year.json()).brands.at(-1)!.models[0].generations[0].versions[0].years[0].year, 1996);
  assert.equal((await call("POST", `/catalog/versions/${version.id}/years`, { year: 1996 })).statusCode, 409);
  assert.equal((await call("POST", `/catalog/versions/${randomUUID()}/years`, { year: 1997 })).statusCode, 404);
});

// Builds a model with three generations, then renames the model, a generation with its years, a version and a year,
// moves the last generation up twice and once more past the top, and checks each change and the order the catalog
// answers; a rename to another model's name, or to a year the version has, is refused.
test("API: the levels of a tree are renamed and moved", async () => {
  const brand = await addedBrand(`Peugeot ${RUN}`);
  const tree = async () => catalogSchema.parse((await call("GET", "/catalog")).json()).brands.find((each) => each.id === brand)!;
  await call("POST", `/catalog/brands/${brand}/models`, { name: `206 ${RUN}` });
  await call("POST", `/catalog/brands/${brand}/models`, { name: `306 ${RUN}` });
  const [model, other] = (await tree()).models;
  for (const name of ["Primeira", "Segunda", "Terceira"]) {
    await call("POST", `/catalog/models/${model.id}/generations`, { name, firstYear: 2000, lastYear: 2005 });
  }
  assert.equal((await call("PATCH", `/catalog/models/${model.id}`, { name: other.name })).statusCode, 409);
  await call("PATCH", `/catalog/models/${model.id}`, { name: `207 ${RUN}` });
  const generations = (await tree()).models[0].generations;
  await call("PATCH", `/catalog/generations/${generations[0].id}`, { name: "Fase 1", firstYear: 1998, lastYear: 2004 });
  await call("POST", `/catalog/generations/${generations[2].id}/move`, { direction: "up" });
  await call("POST", `/catalog/generations/${generations[2].id}/move`, { direction: "up" });
  assert.equal((await call("POST", `/catalog/generations/${generations[2].id}/move`, { direction: "up" })).statusCode, 200);
  const renamed = (await tree()).models[0];
  assert.equal(renamed.name, `207 ${RUN}`);
  assert.deepEqual(
    renamed.generations.map((each) => [each.name, each.firstYear, each.lastYear]),
    [
      ["Terceira", 2000, 2005],
      ["Fase 1", 1998, 2004],
      ["Segunda", 2000, 2005],
    ],
  );

  await call("POST", `/catalog/generations/${generations[1].id}/versions`, { name: "GTI" });
  const version = (await tree()).models[0].generations[2].versions[0];
  await call("PATCH", `/catalog/versions/${version.id}`, { name: "griffe" });
  await call("POST", `/catalog/versions/${version.id}/years`, { year: 2001 });
  await call("POST", `/catalog/versions/${version.id}/years`, { year: 2002 });
  const years = (await tree()).models[0].generations[2].versions[0].years;
  assert.equal((await call("PATCH", `/catalog/years/${years[1].id}`, { year: 2001 })).statusCode, 409);
  await call("PATCH", `/catalog/years/${years[1].id}`, { year: 2003 });
  const changed = (await tree()).models[0].generations[2].versions[0];
  assert.deepEqual([changed.name, changed.years.map((each) => each.year)], ["Griffe", [2001, 2003]]);
});

// Deletes a generation with a version and a year under it, and checks they go with it, then deletes the model and
// checks its vehicle model stays in the lists; a node that isn't there is not found.
test("API: deleting a level of a tree takes what is under it", async () => {
  const brand = await addedBrand(`Citroën ${RUN}`);
  const tree = async () => catalogSchema.parse((await call("GET", "/catalog")).json()).brands.find((each) => each.id === brand)!;
  await call("POST", `/catalog/brands/${brand}/models`, { name: `Xsara ${RUN}` });
  const model = (await tree()).models[0];
  await call("POST", `/catalog/models/${model.id}/generations`, { name: "Primeira", firstYear: 1997, lastYear: 2006 });
  const generation = (await tree()).models[0].generations[0];
  await call("POST", `/catalog/generations/${generation.id}/versions`, { name: "VTS" });
  const version = (await tree()).models[0].generations[0].versions[0];
  await call("POST", `/catalog/versions/${version.id}/years`, { year: 2000 });

  const deleted = await call("DELETE", `/catalog/generations/${generation.id}`);
  assert.equal(deleted.statusCode, 200);
  assert.deepEqual(catalogSchema.parse(deleted.json()).brands.find((each) => each.id === brand)!.models[0].generations, []);
  assert.equal(await prisma.catalogVersion.count({ where: { id: version.id } }), 0);
  assert.equal(await prisma.catalogYear.count({ where: { versionId: version.id } }), 0);

  const vehicleModel = (await prisma.catalogModel.findUniqueOrThrow({ where: { id: model.id } })).vehicleModelId;
  assert.equal((await call("DELETE", `/catalog/models/${model.id}`)).statusCode, 200);
  assert.deepEqual((await tree()).models, []);
  assert.ok(await prisma.vehicleModel.findUnique({ where: { id: vehicleModel } }));
  assert.equal((await call("DELETE", `/catalog/years/${randomUUID()}`)).statusCode, 404);
});

// Adds an engine with its sheet to a year of this run, and checks it ends the year's engines with its name and sheet as
// sent; saves its sheet again and checks the change; a sheet out of range, or with no drive, is rejected, and a year or
// engine that isn't there is not found.
test("API: an engine is added with its sheet, and its sheet is saved again", async () => {
  const brand = await addedBrand(`Lada ${RUN}`);
  const tree = async () => catalogSchema.parse((await call("GET", "/catalog")).json()).brands.find((each) => each.id === brand)!;
  await call("POST", `/catalog/brands/${brand}/models`, { name: `Niva ${RUN}` });
  await call("POST", `/catalog/models/${(await tree()).models[0].id}/generations`, { name: "Primeira", firstYear: 1977, lastYear: null });
  await call("POST", `/catalog/generations/${(await tree()).models[0].generations[0].id}/versions`, { name: "4x4" });
  await call("POST", `/catalog/versions/${(await tree()).models[0].generations[0].versions[0].id}/years`, { year: 1991 });
  const year = (await tree()).models[0].generations[0].versions[0].years[0];

  const sheet = { displacementDl: 16, cylinders: 4, drive: "ALL", summary: "  Tração integral permanente.  " };
  const added = await call("POST", `/catalog/years/${year.id}/engines`, sheet);
  assert.equal(added.statusCode, 201);
  const engine = catalogSchema.parse(added.json()).brands.find((each) => each.id === brand)!.models[0].generations[0].versions[0].years[0].engines[0];
  assert.deepEqual({ ...engine, id: undefined }, { id: undefined, displacementDl: 16, cylinders: 4, drive: "ALL", summary: "Tração integral permanente." });

  const saved = await call("PATCH", `/catalog/engines/${engine.id}`, { displacementDl: 17, cylinders: 4, drive: "ALL", summary: "" });
  assert.equal(saved.statusCode, 200);
  const engines = (await tree()).models[0].generations[0].versions[0].years[0].engines;
  assert.deepEqual(engines.map((each) => [each.id, each.displacementDl, each.summary]), [[engine.id, 17, ""]]);

  assert.equal((await call("POST", `/catalog/years/${year.id}/engines`, { ...sheet, cylinders: 0 })).statusCode, 400);
  assert.equal((await call("POST", `/catalog/years/${year.id}/engines`, { displacementDl: 16, cylinders: 4, summary: "" })).statusCode, 400);
  assert.equal((await call("POST", `/catalog/years/${randomUUID()}/engines`, sheet)).statusCode, 404);
  assert.equal((await call("PATCH", `/catalog/engines/${randomUUID()}`, sheet)).statusCode, 404);
});

/**
 * Adds a catalog brand of this run.
 * @param name Its name, with the run's mark.
 * @returns Its id, its vehicle brand's.
 */
async function addedBrand(name: string): Promise<string> {
  const added = await call("POST", "/catalog/brands", { name });
  return catalogSchema.parse(added.json()).brands.at(-1)!.id;
}
