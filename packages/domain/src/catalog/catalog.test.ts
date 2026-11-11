import assert from "node:assert/strict";
import { test } from "node:test";
import type { Item } from "../inventory/items.ts";
import {
  belowNode,
  brandMark,
  brandsNamed,
  brandSummary,
  brandWithModel,
  CATALOG_HOME,
  CATALOG_TAKEN,
  catalogAddUnder,
  catalogEditRequest,
  catalogFrom,
  catalogNodePath,
  catalogNodes,
  catalogSheetRequest,
  catalogSiblings,
  catalogValuesOf,
  engineLabel,
  enginePath,
  engineSheet,
  engineSheetNames,
  findParts,
  firstSheet,
  itemFit,
  litresText,
  locatePart,
  modelsNamed,
  partFit,
  partScreen,
  readCatalogFields,
  readEngineFields,
  revealedVehicle,
  screenBack,
  screenHeader,
  treePath,
  type CatalogData,
  type CatalogNode,
} from "./catalog.ts";
import { testItem, type FlatItem } from "../inventory/testItems.ts";
import { applyCatalogChange, catalogChangeOf, TEST_CATALOG, TEST_CATALOG_DATA, TEST_ENGINES, testCatalogId } from "./testCatalog.ts";

const CHEVROLET = testCatalogId("Chevrolet");
const VOLKSWAGEN = testCatalogId("Volkswagen");
const FIAT = testCatalogId("Fiat");
const FORD = testCatalogId("Ford");
const OPALA = testCatalogId("Chevrolet", "Opala");

/**
 * Lists every node of a tree, depth first.
 * @param nodes The tree's top level.
 * @returns Every node.
 */
function allNodes(nodes: readonly CatalogNode[]): CatalogNode[] {
  return nodes.flatMap((node) => [node, ...allNodes(node.children ?? [])]);
}

/**
 * Fills in an inventory item with the fields the catalog search doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function part(fields: FlatItem & Required<Pick<FlatItem, "code">>): Item {
  return testItem({
    id: fields.code,
    name: "Peça",
    category: "Motor",
    partBrand: "Bosch",
    vehicleBrand: "Chevrolet",
    vehicleModel: null,
    position: "N/A",
    side: "N/A",
    color: "N/A",
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 100,
    photos: [],
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...fields,
  });
}

// Checks every node id is unique across the whole catalog and the engines (the leaves) and the sheets match one to
// one, so the engine the tree selects always has its sheet and every sheet can be reached.
test("Shared: catalog ids are unique and every engine has its sheet", () => {
  const nodes = TEST_CATALOG.brands.flatMap((brand) => allNodes(brand.models));
  assert.equal(new Set(nodes.map((node) => node.id)).size, nodes.length);
  const leaves = nodes.filter((node) => node.children === undefined).map((node) => node.id);
  assert.deepEqual([...leaves].sort(), Object.keys(TEST_CATALOG.sheets).sort());
});

// Turns the API's catalog into the tree and sheets the screens show: a generation's years after its name, open-ended
// while it is still made, a year by its number, an engine named by its sheet, and the sheet's title built from the tree.
test("Shared: the catalog from the API becomes the tree and the sheets", () => {
  const opala = TEST_CATALOG.brands[0].models[1];
  assert.equal(opala.label, "Opala");
  assert.deepEqual(
    opala.children!.map((generation) => [generation.label, generation.detail]),
    [
      ["Primeira geração", "1968–1974"],
      ["Segunda geração", "1975–1979"],
      ["Terceira geração", "1980–1992"],
    ],
  );
  assert.deepEqual(TEST_CATALOG.sheets[TEST_ENGINES.opala41], {
    title: "1986 · Chevrolet Opala Diplomata 4.1",
    specs: ["1986", "4.1 L", "6 CIL", "TRASEIRA"],
    summary: TEST_CATALOG_DATA.brands[0].models[1].generations[2].versions[1].years[1].engines[1].summary,
  });
  assert.deepEqual(TEST_CATALOG.sheets[TEST_ENGINES.unoMille].specs, ["1991", "1.0 L", "4 CIL", "DIANTEIRA"]);
  assert.equal(engineLabel({ displacementDl: 10, cylinders: 4 }), "1.0 L 4 cilindros");
  const current = catalogFrom({
    brands: [{ ...TEST_CATALOG_DATA.brands[3], models: [{ id: OPALA, name: "Ka", generations: [{ id: FIAT, name: "Terceira geração", firstYear: 2014, lastYear: null, versions: [] }] }] }],
  });
  assert.equal(current.brands[0].models[0].children![0].detail, "2014–");
});

// Finds the first engine with a sheet in each brand, and checks a brand with none, and an empty tree, have none.
test("Shared: firstSheet finds the first engine with a sheet, depth first", () => {
  const brand = (id: string) => TEST_CATALOG.brands.find((b) => b.id === id)!.models;
  assert.equal(firstSheet(TEST_CATALOG, brand(CHEVROLET)), TEST_ENGINES.opala25);
  assert.equal(firstSheet(TEST_CATALOG, brand(VOLKSWAGEN)), TEST_ENGINES.golGts);
  assert.equal(firstSheet(TEST_CATALOG, brand(FORD)), undefined);
  assert.equal(firstSheet(TEST_CATALOG, []), undefined);
});

// Searches brands and models in another case and without accents, and checks the matching ones are listed in order
// and an empty search lists them all.
test("Shared: brands and models are found by name, ignoring case and accents", () => {
  assert.deepEqual(brandsNamed(TEST_CATALOG, "VOLKS").map((brand) => brand.id), [VOLKSWAGEN]);
  assert.deepEqual(brandsNamed(TEST_CATALOG, "  ").map((brand) => brand.id), [CHEVROLET, VOLKSWAGEN, FIAT, FORD]);
  const chevrolet = TEST_CATALOG.brands[0].models;
  assert.deepEqual(modelsNamed(chevrolet, "ópa").map((model) => model.label), ["Opala"]);
  assert.deepEqual(modelsNamed(chevrolet, "fusca"), []);
});

// Searches a model the chosen brand has, one only another brand has, and one no brand has, and checks the brand to
// show stays, moves to the first brand with the model, or is null.
test("Shared: a model search keeps the brand that has it or moves to the first that does", () => {
  assert.equal(brandWithModel(TEST_CATALOG, CHEVROLET, "opala"), CHEVROLET);
  assert.equal(brandWithModel(TEST_CATALOG, CHEVROLET, "uno"), FIAT);
  assert.equal(brandWithModel(TEST_CATALOG, FIAT, "Gol"), VOLKSWAGEN);
  assert.equal(brandWithModel(TEST_CATALOG, CHEVROLET, "Kombi"), null);
});

// Searches part codes with separators left out and in another case, and checks the matches are listed with the exact
// code first, at most five with the count of the rest, and that fewer than three letters or digits find nothing.
test("Shared: parts are found by code, exact codes first, five at most", () => {
  const items = ["FRA-10001", "FRA-1000", "XFRA-1000", "FRA 1000/2", "fra.1000.3", "FRA-1000-4", "OUTRA"].map((code) => part({ code }));
  const found = findParts(items, "fra1000");
  assert.deepEqual(found.parts.map((item) => item.code), ["FRA-1000", "FRA-10001", "XFRA-1000", "FRA 1000/2", "fra.1000.3"]);
  assert.equal(found.more, 1);
  assert.deepEqual(findParts(items, "f-r"), { parts: [], more: 0 });
  assert.deepEqual(findParts(items, "zzz"), { parts: [], more: 0 });
});

// Finds parts by their items' original codes, ignoring separators, each listed with its code and an id of its own
// apart from its brands', next to a brand whose code matches too, the exact code first.
test("Shared: parts are found by their original codes too", () => {
  const filter = part({ code: "W 712/95", originalCodes: ["030 115 561 AN", "030115561AP"] });
  const found = findParts([filter, part({ code: "030-115-561" })], "030115561");
  assert.deepEqual(
    found.parts.map((each) => [each.code, each.item.id]),
    [
      ["030-115-561", "030-115-561"],
      ["030 115 561 AN", "W 712/95"],
      ["030115561AP", "W 712/95"],
    ],
  );
  assert.equal(new Set([...found.parts.map((each) => each.id), filter.brands[0].id]).size, 4);
  assert.deepEqual(
    findParts([filter], "030-115-561-an").parts.map((each) => each.code),
    ["030 115 561 AN"],
  );
});

// Places parts in the catalog: an engine by its displacement, a model with no such engine, a model the catalog lacks,
// a part for any model of a brand, and a brand the catalog lacks.
test("Shared: a part leads to its brand, model and engine in the catalog", () => {
  assert.deepEqual(locatePart(TEST_CATALOG, { vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" }), {
    brandId: CHEVROLET,
    modelId: OPALA,
    engineId: TEST_ENGINES.opala41,
  });
  assert.deepEqual(locatePart(TEST_CATALOG, { vehicleBrand: "chevrolet", vehicleModel: "Opala 3.8" }), { brandId: CHEVROLET, modelId: OPALA, engineId: undefined });
  assert.deepEqual(locatePart(TEST_CATALOG, { vehicleBrand: "Ford", vehicleModel: "Escort XR3" }), {
    brandId: FORD,
    modelId: testCatalogId("Ford", "Escort"),
    engineId: undefined,
  });
  assert.deepEqual(locatePart(TEST_CATALOG, { vehicleBrand: "Fiat", vehicleModel: "Palio" }), { brandId: FIAT });
  assert.deepEqual(locatePart(TEST_CATALOG, { vehicleBrand: "Fiat", vehicleModel: null }), { brandId: FIAT });
  assert.equal(locatePart(TEST_CATALOG, { vehicleBrand: "Toyota", vehicleModel: "Corolla" }), null);
});

// Writes the vehicle line of parts that fit an engine with a sheet, a model without one, an engine without one, any
// model of a brand, any vehicle, and a brand the catalog lacks.
test("Shared: the part list says which vehicle each part fits", () => {
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" }), "Serve no Chevrolet Opala 4.1");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Ford", vehicleModel: "Escort" }), "Ford Escort (modelo ainda sem ficha no catálogo)");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Chevrolet", vehicleModel: "Opala 3.8" }), "Chevrolet Opala 3.8 (motor ainda sem ficha no catálogo)");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Volkswagen", vehicleModel: null }), "Serve em qualquer Volkswagen");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Universal", vehicleModel: null }), "Serve em qualquer veículo");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Toyota", vehicleModel: "Corolla" }), "Toyota não está no catálogo");
});

// Lists a part of several vehicles: it shows the first whose engine has a sheet, or else the first the catalog has, or
// else its first, with how many more it fits; one vehicle reads as itself.
test("Shared: a part of several vehicles shows the one the catalog knows best", () => {
  const toyota = { vehicleBrand: "Toyota", vehicleModel: "Corolla" };
  const escort = { vehicleBrand: "Ford", vehicleModel: "Escort" };
  const opala = { vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" };
  assert.deepEqual(revealedVehicle(TEST_CATALOG, { vehicles: [toyota, escort, opala] }), opala);
  assert.deepEqual(revealedVehicle(TEST_CATALOG, { vehicles: [toyota, escort] }), escort);
  assert.deepEqual(revealedVehicle(TEST_CATALOG, { vehicles: [toyota] }), toyota);
  assert.equal(itemFit(TEST_CATALOG, { vehicles: [toyota, escort, opala] }), "Serve no Chevrolet Opala 4.1 +2");
  assert.equal(itemFit(TEST_CATALOG, { vehicles: [opala] }), "Serve no Chevrolet Opala 4.1");
});

// Walks a phone's screens from an engine's sheet back to the brands and checks ← opens the brand's models on the
// engine, then the brands, where there is nowhere to go back to; each screen's title row names the tab or the brand,
// and where its ← goes.
test("Shared: on a phone ← goes back from the sheet to the models, then the brands", () => {
  const sheet = { view: "sheet", brandId: CHEVROLET, engineId: TEST_ENGINES.opala41 } as const;
  const models = screenBack(sheet)!;
  assert.deepEqual(models, { view: "models", brandId: CHEVROLET, engineId: TEST_ENGINES.opala41 });
  assert.deepEqual(screenBack(models), CATALOG_HOME);
  assert.equal(screenBack(CATALOG_HOME), null);
  assert.deepEqual(screenHeader(TEST_CATALOG, CATALOG_HOME), { title: "Catálogo" });
  assert.deepEqual(screenHeader(TEST_CATALOG, models), { title: "Chevrolet", back: "Voltar às marcas" });
  assert.deepEqual(screenHeader(TEST_CATALOG, sheet), { title: "Chevrolet", back: "Voltar aos modelos" });
});

// Opens the screens of parts found by code: an engine with a sheet opens it; a model without one, its brand's models
// with the model pointed out and the vehicle named for the note; a part for any model of a brand, the brand's models
// with no note; and a brand the catalog lacks, no screen.
test("Shared: a part found by code opens its sheet, or else its brand's models", () => {
  const fits = (vehicleBrand: string, vehicleModel: string | null) => ({ vehicles: [{ vehicleBrand, vehicleModel }] });
  assert.deepEqual(partScreen(TEST_CATALOG, fits("Chevrolet", "Opala 4.1")), {
    view: "sheet",
    brandId: CHEVROLET,
    engineId: TEST_ENGINES.opala41,
  });
  assert.deepEqual(partScreen(TEST_CATALOG, fits("Ford", "Escort")), {
    view: "models",
    brandId: FORD,
    modelId: testCatalogId("Ford", "Escort"),
    missing: "Ford Escort",
  });
  assert.deepEqual(partScreen(TEST_CATALOG, fits("Fiat", null)), { view: "models", brandId: FIAT, modelId: undefined, missing: undefined });
  assert.equal(partScreen(TEST_CATALOG, fits("Toyota", "Corolla")), null);
});

// Writes each brand's line on the brands screen, in plural and singular and with no sheet yet, and the path above an
// engine's sheet; the path to a node goes from its model down to it, and to a node the brand lacks, nowhere.
test("Shared: the brand lines and an engine's path read as in the mockup", () => {
  assert.deepEqual(
    TEST_CATALOG.brands.map((brand) => brandSummary(TEST_CATALOG, brand)),
    ["3 modelos · 2 fichas técnicas", "3 modelos · 1 ficha técnica", "3 modelos · 1 ficha técnica", "3 modelos · sem ficha técnica ainda"],
  );
  assert.equal(
    brandSummary(TEST_CATALOG, { id: "x", name: "X", mark: "X", models: [{ id: "x-1", label: "Um", level: "model", children: [] }] }),
    "1 modelo · sem ficha técnica ainda",
  );
  assert.equal(enginePath(TEST_CATALOG, CHEVROLET, TEST_ENGINES.opala41), "Opala › Terceira geração › Diplomata › 1986");
  assert.deepEqual(
    treePath(TEST_CATALOG, VOLKSWAGEN, testCatalogId("Volkswagen", "Gol", "Primeira geração", "GTS")).map((node) => node.label),
    ["Gol", "Primeira geração", "GTS"],
  );
  assert.deepEqual(treePath(TEST_CATALOG, FORD, OPALA), []);
  assert.equal(enginePath(TEST_CATALOG, FORD, TEST_ENGINES.opala41), "");
});

// Writes a brand's letters from one word and from two, without accents, and says what deleting a node takes with it:
// counted in the singular and plural, leaving out the levels it hasn't, and nothing for a node with nothing under it.
test("Shared: a brand's letters and what a delete takes with it", () => {
  assert.equal(brandMark("Renault"), "RE");
  assert.equal(brandMark("  del  rey "), "DR");
  assert.equal(brandMark("Citroën"), "CI");
  const opala = TEST_CATALOG.brands[0].models[1];
  assert.equal(belowNode(opala), "3 gerações, 3 versões, 2 anos, 2 motores com ficha");
  assert.equal(belowNode(opala.children![2].children![1]), "2 anos, 2 motores com ficha");
  assert.equal(belowNode(opala.children![0]), null);
});

// Makes the API's changes on the test catalog in memory: a brand added once, a model of one name and a year of one
// number once each, a generation renamed with its years and its versions kept, a move up and one past the top, a delete
// with what is under it, and a node that isn't there; the catalog given is left as it was.
test("Shared: the catalog's changes are made in memory under the API's rules", () => {
  const added = applyCatalogChange(TEST_CATALOG_DATA, { kind: "addBrand", id: FORD, name: "renault" });
  assert.notEqual(added, "taken");
  assert.deepEqual((added as CatalogData).brands.at(-1), { id: FORD, name: "Renault", mark: "RE", models: [] });
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { kind: "addBrand", id: FORD, name: "FIAT" }), "taken");
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { kind: "add", level: "model", parentId: CHEVROLET, id: FIAT, values: { name: "opala" } }), "taken");
  const diplomata = testCatalogId("Chevrolet", "Opala", "Terceira geração", "Diplomata");
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { kind: "add", level: "year", parentId: diplomata, id: FIAT, values: { year: 1986 } }), "taken");

  const third = testCatalogId("Chevrolet", "Opala", "Terceira geração");
  const renamed = applyCatalogChange(TEST_CATALOG_DATA, {
    kind: "edit",
    level: "generation",
    id: third,
    values: { name: "fase 3", firstYear: 1980, lastYear: null },
  }) as CatalogData;
  const generation = renamed.brands[0].models[1].generations[2];
  assert.deepEqual([generation.name, generation.firstYear, generation.lastYear, generation.versions.length], ["Fase 3", 1980, null, 3]);

  const moved = applyCatalogChange(TEST_CATALOG_DATA, { kind: "move", level: "generation", id: third, direction: "up" }) as CatalogData;
  assert.deepEqual(moved.brands[0].models[1].generations.map((each) => each.name), ["Primeira geração", "Terceira geração", "Segunda geração"]);
  const top = testCatalogId("Chevrolet", "Opala", "Primeira geração");
  assert.deepEqual(applyCatalogChange(TEST_CATALOG_DATA, { kind: "move", level: "generation", id: top, direction: "up" }), TEST_CATALOG_DATA);

  const deleted = applyCatalogChange(TEST_CATALOG_DATA, { kind: "delete", level: "model", id: OPALA }) as CatalogData;
  assert.deepEqual(deleted.brands[0].models.map((each) => each.name), ["Chevette", "Monza"]);
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { kind: "delete", level: "year", id: FIAT }), "missing");
  assert.equal(TEST_CATALOG_DATA.brands[0].models.length, 3);
});

// Reads the change of each kind of request to the catalog's routes, with the status it answers, and nothing for a read.
test("Shared: a request to the catalog's routes says which change it makes", () => {
  assert.deepEqual(catalogChangeOf("POST", "/brands", { name: "Renault" }, FORD), {
    status: 201,
    change: { kind: "addBrand", id: FORD, name: "Renault" },
  });
  assert.deepEqual(catalogChangeOf("POST", `/models/${OPALA}/generations`, { name: "Quarta" }, FORD), {
    status: 201,
    change: { kind: "add", level: "generation", parentId: OPALA, id: FORD, values: { name: "Quarta" } },
  });
  assert.deepEqual(catalogChangeOf("PATCH", `/years/${FIAT}`, { year: 1990 }, FORD)?.change, { kind: "edit", level: "year", id: FIAT, values: { year: 1990 } });
  assert.deepEqual(catalogChangeOf("POST", `/versions/${FIAT}/move`, { direction: "down" }, FORD)?.change, {
    kind: "move",
    level: "version",
    id: FIAT,
    direction: "down",
  });
  assert.deepEqual(catalogChangeOf("DELETE", `/models/${OPALA}`, {}, FORD), { status: 200, change: { kind: "delete", level: "model", id: OPALA } });
  assert.equal(catalogChangeOf("GET", "", {}, FORD), null);
});

// Builds an engine's sheet from the tree's names and its sheet, and makes an engine's changes in memory: one added
// under a year with its sheet, its summary trimmed, and its sheet saved again; and reads the engine routes' changes.
test("Shared: an engine's sheet is built, and an engine is added and saved in memory", () => {
  const names = { year: 1985, brand: "Chevrolet", model: "Opala", version: "Diplomata" };
  assert.deepEqual(engineSheet(names, { displacementDl: 38, cylinders: 6, drive: "REAR", summary: "Seis em linha." }), {
    title: "1985 · Chevrolet Opala Diplomata 3.8",
    specs: ["1985", "3.8 L", "6 CIL", "TRASEIRA"],
    summary: "Seis em linha.",
  });
  const year = testCatalogId("Chevrolet", "Opala", "Terceira geração", "Diplomata", "1985");
  const sheet = { displacementDl: 38, cylinders: 6, drive: "REAR" as const, summary: "  Seis em linha.  " };
  const added = applyCatalogChange(TEST_CATALOG_DATA, { kind: "add", level: "engine", parentId: year, id: FORD, values: sheet }) as CatalogData;
  const engines = () => added.brands[0].models[1].generations[2].versions[1].years[0].engines;
  assert.deepEqual(engines(), [{ id: FORD, displacementDl: 38, cylinders: 6, drive: "REAR", summary: "Seis em linha." }]);
  const saved = applyCatalogChange(added, { kind: "edit", level: "engine", id: FORD, values: { ...sheet, cylinders: 4 } }) as CatalogData;
  assert.equal(saved.brands[0].models[1].generations[2].versions[1].years[0].engines[0].cylinders, 4);
  assert.deepEqual(catalogChangeOf("POST", `/years/${year}/engines`, sheet, FORD), {
    status: 201,
    change: { kind: "add", level: "engine", parentId: year, id: FORD, values: sheet },
  });
  assert.deepEqual(catalogChangeOf("PATCH", `/engines/${FORD}`, sheet, FIAT)?.change, { kind: "edit", level: "engine", id: FORD, values: sheet });
  assert.equal(catalogChangeOf("DELETE", `/engines/${FORD}`, {}, FIAT), null);
});

// Says what a screen adds under each node and which request saves it: a generation under a model, a new engine's
// sheet under a year, a model under a brand, a brand, a rename and an engine's sheet; and finds a node, its siblings,
// what its form opens with and the names its engine sheet is titled with.
test("Shared: what a screen adds or renames is sent to the right route", () => {
  const nodes = catalogNodes(TEST_CATALOG.brands[0].models);
  const opala = nodes.get(OPALA)!;
  const third = nodes.get(testCatalogId("Chevrolet", "Opala", "Terceira geração"))!;
  const year = nodes.get(testCatalogId("Chevrolet", "Opala", "Terceira geração", "Diplomata", "1986"))!;
  const engine = nodes.get(TEST_ENGINES.opala41)!;
  assert.deepEqual(catalogAddUnder(opala), { editing: { kind: "add", level: "generation", parent: { level: "model", id: OPALA } } });
  assert.deepEqual(catalogAddUnder(year), { sheet: { kind: "add", year } });
  assert.deepEqual(catalogEditRequest({ kind: "add", level: "generation", parent: { level: "model", id: OPALA } }), {
    method: "POST",
    path: `/catalog/models/${OPALA}/generations`,
    taken: CATALOG_TAKEN.generation,
  });
  assert.deepEqual(catalogEditRequest({ kind: "add", level: "model", parent: { level: "brand", id: CHEVROLET } }), {
    method: "POST",
    path: `/catalog/brands/${CHEVROLET}/models`,
    taken: CATALOG_TAKEN.model,
  });
  assert.deepEqual(catalogEditRequest({ kind: "add", level: "brand", parent: { level: "brand", id: "" } }), {
    method: "POST",
    path: "/catalog/brands",
    taken: CATALOG_TAKEN.brand,
  });
  assert.deepEqual(catalogEditRequest({ kind: "rename", node: year }), { method: "PATCH", path: `/catalog/years/${year.id}`, taken: CATALOG_TAKEN.year });
  assert.deepEqual(catalogSheetRequest({ kind: "add", year }), { method: "POST", path: `/catalog/years/${year.id}/engines` });
  assert.deepEqual(catalogSheetRequest({ kind: "edit", engine }), { method: "PATCH", path: `/catalog/engines/${engine.id}` });
  assert.equal(catalogNodePath(third), `/catalog/generations/${third.id}`);
  assert.deepEqual(
    catalogSiblings(TEST_CATALOG.brands[0].models, third.id).map((each) => each.label),
    ["Primeira geração", "Segunda geração", "Terceira geração"],
  );
  assert.deepEqual(catalogSiblings(TEST_CATALOG.brands[0].models, FORD), []);
  assert.deepEqual(catalogValuesOf(third), { name: "Terceira geração", firstYear: third.firstYear, lastYear: third.lastYear });
  assert.deepEqual(catalogValuesOf(year), { year: 1986 });
  assert.deepEqual(catalogValuesOf(opala), { name: "Opala" });
  assert.deepEqual(engineSheetNames(TEST_CATALOG, CHEVROLET, engine.id), { year: 1986, brand: "Chevrolet", model: "Opala", version: "Diplomata" });
});

// Reads the fields of a node as typed: a name required, a year of four digits in the catalog's range, a generation's
// last year empty or not before the first; and an engine's sheet: litres with a comma or a dot, cylinders in range,
// a drive chosen and the summary trimmed.
test("Shared: what is typed into a node or an engine sheet is checked before it is saved", () => {
  const empty = { name: "", firstYear: "", lastYear: "", year: "" };
  assert.deepEqual(readCatalogFields("model", { ...empty, name: "Caravan" }), { values: { name: "Caravan" } });
  assert.deepEqual(readCatalogFields("brand", { ...empty, name: "  " }), { problems: { name: "Informe o nome." } });
  assert.deepEqual(readCatalogFields("year", { ...empty, year: "1990" }), { values: { year: 1990 } });
  assert.deepEqual(readCatalogFields("year", { ...empty, year: "1890" }), { problems: { year: "Use um ano de 1900 a 2100." } });
  assert.deepEqual(readCatalogFields("generation", { ...empty, name: "G2", firstYear: "1995" }), {
    values: { name: "G2", firstYear: 1995, lastYear: null },
  });
  assert.deepEqual(readCatalogFields("generation", { ...empty, name: "G2", firstYear: "1995", lastYear: "1990" }), {
    problems: { lastYear: "O último ano não pode vir antes do primeiro." },
  });
  assert.deepEqual(readCatalogFields("generation", { name: "", firstYear: "95", lastYear: "x", year: "" }), {
    problems: { name: "Informe o nome.", firstYear: "Use um ano de 1900 a 2100.", lastYear: "Use um ano de 1900 a 2100." },
  });

  assert.deepEqual(readEngineFields({ litres: "4,1", cylinders: "6", drive: "REAR", summary: "  Seis em linha. " }), {
    sheet: { displacementDl: 41, cylinders: 6, drive: "REAR", summary: "Seis em linha." },
  });
  assert.deepEqual(readEngineFields({ litres: "1.0", cylinders: "4", drive: "FRONT", summary: "" }), {
    sheet: { displacementDl: 10, cylinders: 4, drive: "FRONT", summary: "" },
  });
  assert.deepEqual(readEngineFields({ litres: "0", cylinders: "20", drive: "", summary: "" }), {
    problems: { litres: "Use uma cilindrada de 0,1 a 15,0 L.", cylinders: "Use de 1 a 16 cilindros.", drive: "Escolha a tração." },
  });
  assert.equal(litresText(41), "4,1");
});
