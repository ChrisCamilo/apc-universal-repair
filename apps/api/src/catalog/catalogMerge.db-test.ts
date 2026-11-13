import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { catalogSchema, type CatalogData } from "@apc/domain/catalog";
import { TEST_USERS } from "@apc/domain/test-users";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";
import { testDevice, testProof } from "../devices/testDevices.js";

// Merging vehicle brands and models of the catalog in the lists against a real database (`pnpm --filter @apc/api
// test:db`), migrated and seeded, on PostgreSQL or SQLite: a model's tree moves to a model with none, or joins its tree;
// a brand's place in the rail goes to a brand the catalog doesn't have, or its models join the other's; and the items
// move with them. Each run uses its own names, removed at the end.

const app = buildApp();
/** Tells this run's names apart from the seed's and other runs'. */
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
  await prisma.item.deleteMany({ where: { brands: { some: { code: { contains: RUN } } } } });
  await prisma.catalogModel.deleteMany({ where: { vehicleModel: { name: { contains: RUN } } } });
  await prisma.catalogBrand.deleteMany({ where: { brand: { name: { contains: RUN } } } });
  await prisma.vehicleModel.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.brand.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.category.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.partBrand.deleteMany({ where: { name: { contains: RUN } } });
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

/** Reads the catalog. */
async function catalog(): Promise<CatalogData> {
  return catalogSchema.parse((await call("GET", "/catalog")).json());
}

/**
 * Adds a catalog brand of this run and returns its id, its vehicle brand's.
 * @param name The brand's name, before the run's mark.
 */
async function catalogBrand(name: string): Promise<string> {
  return catalogSchema.parse((await call("POST", "/catalog/brands", { name: `${name} ${RUN}` })).json()).brands.at(-1)!.id;
}

/**
 * Adds a catalog model of this run under a catalog brand, with one generation, one version, one year and one engine.
 * @param brandId The brand.
 * @param model The model's name, before the run's mark.
 * @param tree The generation's name and years, the version's name, the year and the engine's displacement in dL.
 * @returns The vehicle model's id.
 */
async function catalogModel(
  brandId: string,
  model: string,
  tree: { generation: string; firstYear: number; version: string; year: number; displacementDl: number },
): Promise<string> {
  await call("POST", `/catalog/brands/${brandId}/models`, { name: `${model} ${RUN}` });
  const node = (await catalog()).brands.find((brand) => brand.id === brandId)!.models.at(-1)!;
  const generation = catalogSchema.parse(
    (await call("POST", `/catalog/models/${node.id}/generations`, { name: tree.generation, firstYear: tree.firstYear, lastYear: null })).json(),
  ).brands.find((brand) => brand.id === brandId)!.models.at(-1)!.generations.at(-1)!;
  const version = catalogSchema.parse((await call("POST", `/catalog/generations/${generation.id}/versions`, { name: tree.version })).json())
    .brands.find((brand) => brand.id === brandId)!.models.at(-1)!.generations.at(-1)!.versions.at(-1)!;
  const year = catalogSchema.parse((await call("POST", `/catalog/versions/${version.id}/years`, { year: tree.year })).json())
    .brands.find((brand) => brand.id === brandId)!.models.at(-1)!.generations.at(-1)!.versions.at(-1)!.years.at(-1)!;
  await call("POST", `/catalog/years/${year.id}/engines`, { displacementDl: tree.displacementDl, cylinders: 4, drive: "FRONT", summary: "" });
  return (await prisma.vehicleModel.findFirstOrThrow({ where: { brandId, name: `${model} ${RUN}` } })).id;
}

/**
 * Creates an item of this run fitting a vehicle.
 * @param code The part code, before the run's mark.
 * @param vehicleBrand The vehicle brand's name.
 * @param vehicleModel The vehicle model's name.
 */
async function createItem(code: string, vehicleBrand: string, vehicleModel: string) {
  const created = await call("POST", "/items", {
    name: `Peça ${RUN}`,
    category: `Motor ${RUN}`,
    vehicles: [{ vehicleBrand, vehicleModel }],
    brands: [{ code: `${code}-${RUN}`, partBrand: `Bosch ${RUN}`, unitPriceCents: 1000 }],
  });
  assert.equal(created.statusCode, 201, created.body);
}

/**
 * Lists a catalog model's tree as names, years and engines, to compare.
 * @param model A catalog model.
 * @returns Each generation with its versions, years and engines' displacements.
 */
function shape(model: CatalogData["brands"][number]["models"][number]) {
  return model.generations.map((generation) => [
    generation.name,
    generation.versions.map((version) => [version.name, version.years.map((year) => [year.year, year.engines.map((engine) => engine.displacementDl)])]),
  ]);
}

// Merges a catalog model into a model of its brand the catalog doesn't have, and checks the kept model takes its place
// and tree; then merges a second catalog model into it, the two trees sharing a generation, a version and a year, and
// checks they join with nothing lost, and the items move along.
test("API: a catalog model merged into another takes its tree there, joining the other's", async () => {
  const brand = await catalogBrand("Lada");
  const niva = await catalogModel(brand, "Niva", { generation: "Primeira", firstYear: 1977, version: "1.6", year: 1990, displacementDl: 16 });
  const plain = (await call("POST", "/vehicle-models", { name: `Niva Nova ${RUN}`, vehicleBrandId: brand })).json().id as string;
  await createItem("N1", `Lada ${RUN}`, `Niva ${RUN}`);

  assert.equal((await call("POST", `/vehicle-models/${niva}/merge`, { into: plain })).statusCode, 200);
  const moved = (await catalog()).brands.find((each) => each.id === brand)!.models;
  assert.deepEqual(moved.map((model) => model.name), [`Niva Nova ${RUN}`]);
  assert.deepEqual(shape(moved[0]), [["Primeira", [["1.6", [[1990, [16]]]]]]]);

  const other = await catalogModel(brand, "Taiga", { generation: "primeira", firstYear: 1977, version: "1.6", year: 1990, displacementDl: 17 });
  await call("POST", `/catalog/versions/${(await catalog()).brands.find((each) => each.id === brand)!.models.at(-1)!.generations[0].versions[0].id}/years`, { year: 1991 });
  await createItem("T1", `Lada ${RUN}`, `Taiga ${RUN}`);
  assert.equal((await call("POST", `/vehicle-models/${other}/merge`, { into: plain })).statusCode, 200);
  const joined = (await catalog()).brands.find((each) => each.id === brand)!.models;
  assert.deepEqual(joined.map((model) => model.name), [`Niva Nova ${RUN}`]);
  assert.deepEqual(shape(joined[0]), [["Primeira", [["1.6", [[1990, [16, 17]], [1991, []]]]]]]);
  assert.equal(await prisma.itemVehicle.count({ where: { vehicleModelId: plain } }), 2);
});

// Merges a catalog brand into a brand the catalog doesn't have, and checks the kept brand takes its place in the rail
// with its models; then merges a second catalog brand into it, with a model of the same name and one the other hasn't,
// and checks the models join after the kept brand's own, the twin trees joined, and the merged brand leaves the rail.
test("API: a catalog brand merged into another takes its place or joins its models", async () => {
  const gurgel = await catalogBrand("Gurgel");
  await catalogModel(gurgel, "BR-800", { generation: "Única", firstYear: 1988, version: "SL", year: 1990, displacementDl: 8 });
  const place = (await catalog()).brands.findIndex((each) => each.id === gurgel);
  const plain = (await call("POST", "/vehicle-brands", { name: `Gurgel Motores ${RUN}` })).json().id as string;
  await createItem("G1", `Gurgel ${RUN}`, `BR-800 ${RUN}`);

  assert.equal((await call("POST", `/vehicle-brands/${gurgel}/merge`, { into: plain })).statusCode, 200);
  const rail = (await catalog()).brands;
  assert.equal(rail.findIndex((each) => each.id === plain), place);
  assert.equal(rail.some((each) => each.id === gurgel), false);
  assert.deepEqual(rail[place].models.map((model) => model.name), [`BR-800 ${RUN}`]);

  const other = await catalogBrand("Amaral");
  await catalogModel(other, "BR-800", { generation: "única", firstYear: 1988, version: "SL", year: 1991, displacementDl: 8 });
  await catalogModel(other, "Supermini", { generation: "Única", firstYear: 1992, version: "SL", year: 1992, displacementDl: 8 });
  assert.equal((await call("POST", `/vehicle-brands/${other}/merge`, { into: plain })).statusCode, 200);
  const after = (await catalog()).brands;
  assert.equal(after.some((each) => each.id === other), false);
  const kept = after.find((each) => each.id === plain)!;
  assert.deepEqual(kept.models.map((model) => model.name), [`BR-800 ${RUN}`, `Supermini ${RUN}`]);
  assert.deepEqual(shape(kept.models[0]), [["Única", [["SL", [[1990, [8]], [1991, [8]]]]]]]);
  assert.equal(await prisma.itemVehicle.count({ where: { vehicleBrandId: plain } }), 1);
});
