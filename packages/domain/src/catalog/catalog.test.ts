import assert from "node:assert/strict";
import { test } from "node:test";
import type { Item } from "../inventory/items.ts";
import {
  belowBrand,
  belowNode,
  brandMark,
  brandsNamed,
  brandSummary,
  brandWithModel,
  carFilters,
  carParts,
  catalogWithParts,
  carSheet,
  CATALOG_HOME,
  CATALOG_TAKEN,
  CATALOG_YEAR_MESSAGE,
  catalogAddUnder,
  catalogEditRequest,
  catalogFrom,
  catalogNodePath,
  catalogNodes,
  catalogSheetRequest,
  catalogSiblings,
  catalogValuesOf,
  catalogYearLimits,
  engineLabel,
  enginePath,
  engineSheet,
  engineSheetNames,
  periodLabel,
  findParts,
  joinCatalogTrees,
  firstSheet,
  itemFit,
  litresText,
  locatePart,
  modelsNamed,
  partFit,
  partScreen,
  periodsSpan,
  readCatalogFields,
  readEngineFields,
  revealedVehicle,
  screenBack,
  screenHeader,
  treePath,
  vehicleSuggestions,
  yearInput,
  type CatalogData,
  type CatalogNode,
} from "./catalog.ts";
import { testItem, type FlatItem } from "../inventory/testItems.ts";
import { EMPTY_ITEM_FILTERS } from "../inventory/itemFilters.ts";
import { applyCatalogChange, catalogChangeOf, TEST_CATALOG, TEST_CATALOG_DATA, TEST_ENGINES, testCatalogId } from "./testCatalog.ts";

const CHEVROLET = testCatalogId("Chevrolet");
const VOLKSWAGEN = testCatalogId("Volkswagen");
const FIAT = testCatalogId("Fiat");
const FORD = testCatalogId("Ford");
const OPALA = testCatalogId("Chevrolet", "Opala");
const GENERATION_3 = testCatalogId("Chevrolet", "Opala", "Terceira geração");
const DIPLOMATA = testCatalogId("Chevrolet", "Opala", "Terceira geração", "Diplomata");
// Parts in stock, each named for the vehicle it fits: an Opala of any generation and version, the third generation's
// Diplomata and Comodoro, the first generation, an "Opala 4.1" whose version has its own case and spaces, a version the
// third generation lacks, a Monza, and a Chevrolet of any model.
const FITTING: Item[] = [
  testItem({ name: "Qualquer Opala", vehicleBrand: "Chevrolet", vehicleModel: "Opala" }),
  testItem({ name: "Diplomata 80/92", vehicleBrand: "Chevrolet", vehicleModel: "Opala", firstYear: 1980, lastYear: 1992, version: "Diplomata" }),
  testItem({ name: "Comodoro 80/92", vehicleBrand: "Chevrolet", vehicleModel: "Opala", firstYear: 1980, lastYear: 1992, version: "comodoro" }),
  testItem({ name: "Opala 68/74", vehicleBrand: "Chevrolet", vehicleModel: "Opala", firstYear: 1968, lastYear: 1974 }),
  testItem({ name: "Opala 4.1 diplomata", vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1", version: "diplo mata" }),
  testItem({ name: "Caravan", vehicleBrand: "Chevrolet", vehicleModel: "Opala", version: "Caravan" }),
  testItem({ name: "Monza", vehicleBrand: "Chevrolet", vehicleModel: "Monza" }),
  testItem({ name: "Qualquer Chevrolet", vehicleBrand: "Chevrolet", vehicleModel: null }),
];

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
  assert.equal(engineLabel({ displacementDl: 10, cylinders: 4 }, "pt-BR"), "1.0 L 4 cilindros");
  const current = catalogFrom({
    brands: [{ ...TEST_CATALOG_DATA.brands[3], models: [{ id: OPALA, name: "Ka", generations: [{ id: FIAT, name: "Terceira geração", firstYear: 2014, lastYear: null, versions: [] }] }] }],
  }, "pt-BR");
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
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" }, "pt-BR"), "Serve no Chevrolet Opala 4.1");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Ford", vehicleModel: "Escort" }, "pt-BR"), "Ford Escort (modelo ainda sem ficha no catálogo)");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Chevrolet", vehicleModel: "Opala 3.8" }, "pt-BR"), "Chevrolet Opala 3.8 (motor ainda sem ficha no catálogo)");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Volkswagen", vehicleModel: null }, "pt-BR"), "Serve em qualquer Volkswagen");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Universal", vehicleModel: null }, "pt-BR"), "Serve em qualquer veículo");
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Toyota", vehicleModel: "Corolla" }, "pt-BR"), "Toyota não está no catálogo");
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
  assert.equal(itemFit(TEST_CATALOG, { vehicles: [toyota, escort, opala] }, "pt-BR"), "Serve no Chevrolet Opala 4.1 +2");
  assert.equal(itemFit(TEST_CATALOG, { vehicles: [opala] }, "pt-BR"), "Serve no Chevrolet Opala 4.1");
});

// Walks a phone's screens from an engine's sheet back to the brands and checks ← opens the brand's models on the
// engine, then the brands, where there is nowhere to go back to; each screen's title row names the tab or the brand,
// and where its ← goes.
test("Shared: on a phone ← goes back from the sheet to the models, then the brands", () => {
  const sheet = { view: "sheet", brandId: CHEVROLET, engineId: TEST_ENGINES.opala41 } as const;
  const models = screenBack(sheet)!;
  assert.deepEqual(models, { view: "models", brandId: CHEVROLET, nodeId: TEST_ENGINES.opala41 });
  assert.deepEqual(screenBack(models), CATALOG_HOME);
  assert.equal(screenBack(CATALOG_HOME), null);
  assert.deepEqual(screenHeader(TEST_CATALOG, CATALOG_HOME, "pt-BR"), { title: "Catálogo" });
  assert.deepEqual(screenHeader(TEST_CATALOG, models, "pt-BR"), { title: "Chevrolet", back: "Voltar às marcas" });
  assert.deepEqual(screenHeader(TEST_CATALOG, sheet, "pt-BR"), { title: "Chevrolet", back: "Voltar aos modelos" });
});

// Goes back from a model's sheet on a phone and checks ← opens the brand's models on that model, named as from an
// engine's sheet.
test("Shared: on a phone ← goes back from a model's sheet to the models open on it", () => {
  const car = { view: "car", brandId: CHEVROLET, nodeId: OPALA } as const;
  assert.deepEqual(screenBack(car), { view: "models", brandId: CHEVROLET, nodeId: OPALA });
  assert.deepEqual(screenHeader(TEST_CATALOG, car, "pt-BR"), { title: "Chevrolet", back: "Voltar aos modelos" });
});

// Builds the Opala's sheet and its Diplomata's: the model lists its three generations with their short years and the
// third one's versions, and the engines under it by version and year; the version, its generation and its engines by
// year; a model with no engine yet lists none.
test("Shared: a model's and a version's sheets list their generations and engines", () => {
  assert.deepEqual(carSheet(TEST_CATALOG, CHEVROLET, OPALA), {
    level: "model",
    title: "Chevrolet Opala",
    generations: [
      { id: testCatalogId("Chevrolet", "Opala", "Primeira geração"), name: "Primeira geração", years: "68/74", versions: [] },
      { id: testCatalogId("Chevrolet", "Opala", "Segunda geração"), name: "Segunda geração", years: "75/79", versions: [] },
      { id: GENERATION_3, name: "Terceira geração", years: "80/92", versions: ["Comodoro", "Diplomata", "SS"] },
    ],
    engines: [
      { id: TEST_ENGINES.opala25, label: "Diplomata 1986 · 2.5 L 4 cilindros" },
      { id: TEST_ENGINES.opala41, label: "Diplomata 1986 · 4.1 L 6 cilindros" },
    ],
  });
  assert.deepEqual(carSheet(TEST_CATALOG, CHEVROLET, DIPLOMATA), {
    level: "version",
    title: "Chevrolet Opala Diplomata",
    generations: [{ id: GENERATION_3, name: "Terceira geração", years: "80/92", versions: [] }],
    engines: [
      { id: TEST_ENGINES.opala25, label: "1986 · 2.5 L 4 cilindros" },
      { id: TEST_ENGINES.opala41, label: "1986 · 4.1 L 6 cilindros" },
    ],
  });
  assert.deepEqual(carSheet(TEST_CATALOG, CHEVROLET, testCatalogId("Chevrolet", "Monza")).engines, []);
});

// Lists the parts that fit the Opala, its third generation and its Diplomata: any Opala fits the model, by its name
// alone or followed by an engine; the generation takes those with its years or none, and a version of it or none; the
// version only its own name, ignoring case and spaces. Another model, or a brand of any model, fits none.
test("Shared: the parts in stock that fit a model, a generation and a version", () => {
  const names = (nodeId: string) => carParts(TEST_CATALOG, CHEVROLET, nodeId, FITTING).map((item) => item.name);
  assert.deepEqual(names(OPALA), ["Qualquer Opala", "Diplomata 80/92", "Comodoro 80/92", "Opala 68/74", "Opala 4.1 diplomata", "Caravan"]);
  assert.deepEqual(names(GENERATION_3), ["Qualquer Opala", "Diplomata 80/92", "Comodoro 80/92", "Opala 4.1 diplomata"]);
  assert.deepEqual(names(DIPLOMATA), ["Qualquer Opala", "Diplomata 80/92", "Opala 4.1 diplomata"]);
  assert.deepEqual(carParts(TEST_CATALOG, CHEVROLET, testCatalogId("Chevrolet", "Chevette"), FITTING), []);
});

// Keeps only the vehicles the parts in stock fit: the Opala and the Monza, under Chevrolet, while the Chevette, which
// only a Chevrolet of any model fits, and the brands left with no model go, the sheets staying; with no part, no brand
// is left.
test("Shared: the catalog of the vehicles some part fits", () => {
  const kept = catalogWithParts(TEST_CATALOG, FITTING);
  assert.deepEqual(
    kept.brands.map((brand) => [brand.name, brand.models.map((model) => model.label)]),
    [["Chevrolet", ["Opala", "Monza"]]],
  );
  assert.equal(kept.sheets, TEST_CATALOG.sheets);
  assert.deepEqual(catalogWithParts(TEST_CATALOG, []).brands, []);
});

// Sets the filters that list every part fitting the Opala and its Diplomata: the brands and models of the vehicles
// that fit, as the items hold them, and for the version their generations and versions; every other filter is off.
test("Shared: the filters of a model and a version list the parts that fit it", () => {
  assert.deepEqual(carFilters(TEST_CATALOG, CHEVROLET, OPALA, FITTING), {
    ...EMPTY_ITEM_FILTERS,
    vehicleBrand: ["Chevrolet"],
    vehicleModel: ["Chevrolet|Opala", "Chevrolet|Opala 4.1"],
  });
  assert.deepEqual(carFilters(TEST_CATALOG, CHEVROLET, DIPLOMATA, FITTING), {
    ...EMPTY_ITEM_FILTERS,
    vehicleBrand: ["Chevrolet"],
    vehicleModel: ["Chevrolet|Opala", "Chevrolet|Opala 4.1"],
    generation: ["1980-1992"],
    version: ["Diplomata", "diplo mata"],
  });
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
    TEST_CATALOG.brands.map((brand) => brandSummary(TEST_CATALOG, brand, "pt-BR")),
    ["3 modelos · 2 fichas técnicas", "3 modelos · 1 ficha técnica", "3 modelos · 1 ficha técnica", "3 modelos · sem ficha técnica ainda"],
  );
  assert.equal(
    brandSummary(TEST_CATALOG, { id: "x", name: "X", mark: "X", models: [{ id: "x-1", label: "Um", level: "model", children: [] }] }, "pt-BR"),
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
  assert.equal(belowNode(opala, "pt-BR"), "3 gerações, 3 versões, 2 períodos, 2 motores com ficha");
  assert.equal(belowNode(opala.children![2].children![1], "pt-BR"), "2 períodos, 2 motores com ficha");
  assert.equal(belowNode(opala.children![0], "pt-BR"), null);
});

// Makes the API's changes on the test catalog in memory: a brand added once, a model of one name and a period of the same
// years once each, though periods may overlap, a generation renamed with its years and its versions kept, a move up and one past the top, a delete
// with what is under it, and a node that isn't there; the catalog given is left as it was.
test("Shared: the catalog's changes are made in memory under the API's rules", () => {
  const added = applyCatalogChange(TEST_CATALOG_DATA, { kind: "addBrand", id: FORD, name: "renault" });
  assert.notEqual(added, "taken");
  assert.deepEqual((added as CatalogData).brands.at(-1), { id: FORD, name: "Renault", mark: "RE", models: [] });
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { kind: "addBrand", id: FORD, name: "FIAT" }), "taken");
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { kind: "add", level: "model", parentId: CHEVROLET, id: FIAT, values: { name: "opala" } }), "taken");
  const diplomata = testCatalogId("Chevrolet", "Opala", "Terceira geração", "Diplomata");
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { kind: "add", level: "year", parentId: diplomata, id: FIAT, values: { year: 1986, lastYear: 1986 } }), "taken");
  const overlapping = applyCatalogChange(TEST_CATALOG_DATA, { kind: "add", level: "year", parentId: diplomata, id: FIAT, values: { year: 1986, lastYear: 1990 } });
  assert.deepEqual((overlapping as CatalogData).brands[0].models[1].generations[2].versions[1].years.at(-1), { id: FIAT, year: 1986, lastYear: 1990, engines: [] });

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
  assert.deepEqual(catalogChangeOf("PATCH", `/years/${FIAT}`, { year: 1990, lastYear: 1992 }, FORD)?.change, {
    kind: "edit",
    level: "year",
    id: FIAT,
    values: { year: 1990, lastYear: 1992 },
  });
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
  const names = { year: "1985", brand: "Chevrolet", model: "Opala", version: "Diplomata" };
  assert.deepEqual(engineSheet(names, { displacementDl: 38, cylinders: 6, drive: "REAR", summary: "Seis em linha." }, "pt-BR"), {
    title: "1985 · Chevrolet Opala Diplomata 3.8",
    specs: ["1985", "3.8 L", "6 CIL", "TRASEIRA"],
    summary: "Seis em linha.",
  });
  assert.equal(engineSheet({ ...names, year: "2007–2012" }, { displacementDl: 14, cylinders: 4, drive: "FRONT", summary: "" }, "pt-BR").title, "2007–2012 · Chevrolet Opala Diplomata 1.4");
  assert.deepEqual([periodLabel(2007, 2012), periodLabel(1986, 1986)], ["2007–2012", "1986"]);
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
  assert.deepEqual(catalogEditRequest({ kind: "add", level: "generation", parent: { level: "model", id: OPALA } }, "pt-BR"), {
    method: "POST",
    path: `/catalog/models/${OPALA}/generations`,
    taken: CATALOG_TAKEN["pt-BR"].generation,
  });
  assert.deepEqual(catalogEditRequest({ kind: "add", level: "model", parent: { level: "brand", id: CHEVROLET } }, "pt-BR"), {
    method: "POST",
    path: `/catalog/brands/${CHEVROLET}/models`,
    taken: CATALOG_TAKEN["pt-BR"].model,
  });
  assert.deepEqual(catalogEditRequest({ kind: "add", level: "brand", parent: { level: "brand", id: "" } }, "pt-BR"), {
    method: "POST",
    path: "/catalog/brands",
    taken: CATALOG_TAKEN["pt-BR"].brand,
  });
  assert.deepEqual(catalogEditRequest({ kind: "rename", node: year }, "pt-BR"), { method: "PATCH", path: `/catalog/years/${year.id}`, taken: CATALOG_TAKEN["pt-BR"].year });
  assert.deepEqual(catalogSheetRequest({ kind: "add", year }), { method: "POST", path: `/catalog/years/${year.id}/engines` });
  assert.deepEqual(catalogSheetRequest({ kind: "edit", engine }), { method: "PATCH", path: `/catalog/engines/${engine.id}` });
  assert.equal(catalogNodePath(third), `/catalog/generations/${third.id}`);
  assert.deepEqual(
    catalogSiblings(TEST_CATALOG.brands[0].models, third.id).map((each) => each.label),
    ["Primeira geração", "Segunda geração", "Terceira geração"],
  );
  assert.deepEqual(catalogSiblings(TEST_CATALOG.brands[0].models, FORD), []);
  assert.deepEqual(catalogValuesOf(third), { name: "Terceira geração", firstYear: third.firstYear, lastYear: third.lastYear });
  assert.deepEqual(catalogValuesOf(year), { year: 1986, lastYear: 1986 });
  assert.deepEqual(catalogValuesOf(opala), { name: "Opala" });
  assert.deepEqual(engineSheetNames(TEST_CATALOG, CHEVROLET, engine.id), { year: "1986", brand: "Chevrolet", model: "Opala", version: "Diplomata" });
});

// Reads the fields of a node as typed: a name required, a period's years of four digits in the catalog's range (the
// message saying so, and a field keeping only four digits as it is typed), its last
// year empty for a single year or not before the first, a generation's last year empty or not before the first; and an engine's sheet: litres with a comma or a dot, cylinders in range,
// a drive chosen and the summary trimmed.
test("Shared: what is typed into a node or an engine sheet is checked before it is saved", () => {
  const empty = { name: "", firstYear: "", lastYear: "", year: "" };
  assert.deepEqual(readCatalogFields("model", { ...empty, name: "Caravan" }, "pt-BR"), { values: { name: "Caravan" } });
  assert.deepEqual(readCatalogFields("brand", { ...empty, name: "  " }, "pt-BR"), { problems: { name: "Informe o nome." } });
  assert.deepEqual(readCatalogFields("year", { ...empty, year: "1990" }, "pt-BR"), { values: { year: 1990, lastYear: 1990 } });
  assert.deepEqual(readCatalogFields("year", { ...empty, year: "2007", lastYear: "2012" }, "pt-BR"), { values: { year: 2007, lastYear: 2012 } });
  assert.deepEqual(readCatalogFields("year", { ...empty, year: "2007", lastYear: "2004" }, "pt-BR"), {
    problems: { lastYear: "O último ano não pode vir antes do primeiro." },
  });
  assert.deepEqual(readCatalogFields("year", { ...empty, year: "2007", lastYear: "12" }, "pt-BR"), { problems: { lastYear: CATALOG_YEAR_MESSAGE["pt-BR"] } });
  assert.deepEqual(readCatalogFields("year", { ...empty, year: "1890" }, "pt-BR"), { problems: { year: CATALOG_YEAR_MESSAGE["pt-BR"] } });
  assert.equal(CATALOG_YEAR_MESSAGE["pt-BR"], "Use o ano com 4 dígitos, de 1900 a 2100, como 1968.");
  assert.deepEqual(["19a68", "196855", "68", ""].map(yearInput), ["1968", "1968", "68", ""]);
  assert.deepEqual(readCatalogFields("generation", { ...empty, name: "G2", firstYear: "1995" }, "pt-BR"), {
    values: { name: "G2", firstYear: 1995, lastYear: null },
  });
  assert.deepEqual(readCatalogFields("generation", { ...empty, name: "G2", firstYear: "1995", lastYear: "1990" }, "pt-BR"), {
    problems: { lastYear: "O último ano não pode vir antes do primeiro." },
  });
  assert.deepEqual(readCatalogFields("generation", { name: "", firstYear: "95", lastYear: "x", year: "" }, "pt-BR"), {
    problems: { name: "Informe o nome.", firstYear: CATALOG_YEAR_MESSAGE["pt-BR"], lastYear: CATALOG_YEAR_MESSAGE["pt-BR"] },
  });

  assert.deepEqual(readEngineFields({ litres: "4,1", cylinders: "6", drive: "REAR", summary: "  Seis em linha. " }, "pt-BR"), {
    sheet: { displacementDl: 41, cylinders: 6, drive: "REAR", summary: "Seis em linha." },
  });
  assert.deepEqual(readEngineFields({ litres: "1.0", cylinders: "4", drive: "FRONT", summary: "" }, "pt-BR"), {
    sheet: { displacementDl: 10, cylinders: 4, drive: "FRONT", summary: "" },
  });
  assert.deepEqual(readEngineFields({ litres: "0", cylinders: "20", drive: "", summary: "" }, "pt-BR"), {
    problems: { litres: "Use uma cilindrada de 0,1 a 15,0 L.", cylinders: "Use de 1 a 16 cilindros.", drive: "Escolha a tração." },
  });
  assert.equal(litresText(41), "4,1");
});

// Keeps a period inside its generation's years, which count as inside: in the Opala's first generation (1968–1974) a
// period of 1968–1974, 1970 or 1970–1972 is saved, and one of 1967–1975, 1975 or 1972–1975 is refused under the field
// outside; a generation still made takes any period from its first year on. A generation keeps the years its periods
// cover. The form finds those limits for a period added or renamed (its generation's) and a generation renamed (its
// periods'), none for a version; and the stand-in refuses the same as the API.
test("Shared: a period stays inside its generation's years, and a generation keeps its periods'", () => {
  const empty = { name: "", firstYear: "", lastYear: "", year: "" };
  const first = { generation: { firstYear: 1968, lastYear: 1974 } };
  const outside = "O período tem de ficar dentro dos anos da geração: de 1968 a 1974.";
  /** Reads a period typed under the first generation. */
  const period = (year: string, lastYear = "") => readCatalogFields("year", { ...empty, year, lastYear }, "pt-BR", first);
  assert.deepEqual(period("1968", "1974"), { values: { year: 1968, lastYear: 1974 } });
  assert.deepEqual(period("1970"), { values: { year: 1970, lastYear: 1970 } });
  assert.deepEqual(period("1970", "1972"), { values: { year: 1970, lastYear: 1972 } });
  assert.deepEqual(period("1967", "1975"), { problems: { year: outside, lastYear: outside } });
  assert.deepEqual(period("1975"), { problems: { year: outside } });
  assert.deepEqual(period("1972", "1975"), { problems: { lastYear: outside } });
  const stillMade = { generation: { firstYear: 2019, lastYear: null } };
  assert.deepEqual(readCatalogFields("year", { ...empty, year: "2030" }, "pt-BR", stillMade), { values: { year: 2030, lastYear: 2030 } });
  assert.deepEqual(readCatalogFields("year", { ...empty, year: "2018", lastYear: "2020" }, "pt-BR", stillMade), {
    problems: { year: "O período tem de ficar dentro dos anos da geração: de 2019 em diante." },
  });

  const periods = { periods: { year: 1969, lastYear: 1974 } };
  const around = "Os períodos desta geração vão de 1969 a 1974.";
  /** Reads the first generation's years as typed, its periods covering 1969–1974. */
  const generation = (firstYear: string, lastYear: string) => readCatalogFields("generation", { ...empty, name: "G1", firstYear, lastYear }, "pt-BR", periods);
  assert.deepEqual(generation("1969", "1974"), { values: { name: "G1", firstYear: 1969, lastYear: 1974 } });
  assert.deepEqual(generation("1968", ""), { values: { name: "G1", firstYear: 1968, lastYear: null } });
  assert.deepEqual(generation("1970", "1973"), { problems: { firstYear: around, lastYear: around } });
  assert.deepEqual(readCatalogFields("generation", { ...empty, name: "G1", firstYear: "1971" }, "pt-BR", { periods: { year: 1970, lastYear: 1970 } }), {
    problems: { firstYear: "Os períodos desta geração são de 1970." },
  });
  assert.deepEqual(periodsSpan([{ year: 1986, lastYear: 1986 }, { year: 1980, lastYear: 1984 }]), { year: 1980, lastYear: 1986 });
  assert.equal(periodsSpan([]), null);

  const models = TEST_CATALOG.brands[0].models;
  const nodes = catalogNodes(models);
  const third = { generation: { firstYear: 1980, lastYear: 1992 } };
  assert.deepEqual(catalogYearLimits(models, { kind: "add", level: "year", parent: { level: "version", id: DIPLOMATA } }), third);
  const period1986 = nodes.get(DIPLOMATA)!.children![1];
  assert.deepEqual(catalogYearLimits(models, { kind: "rename", node: period1986 }), third);
  assert.deepEqual(catalogYearLimits(models, { kind: "rename", node: nodes.get(GENERATION_3)! }), { periods: { year: 1985, lastYear: 1986 } });
  assert.deepEqual(catalogYearLimits(models, { kind: "rename", node: nodes.get(DIPLOMATA)! }), {});
  assert.deepEqual(catalogYearLimits(models, { kind: "add", level: "version", parent: { level: "generation", id: GENERATION_3 } }), {});

  const added = { kind: "add" as const, level: "year" as const, parentId: DIPLOMATA, id: FIAT };
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { ...added, values: { year: 1979, lastYear: 1985 } }), "invalid");
  assert.notEqual(applyCatalogChange(TEST_CATALOG_DATA, { ...added, values: { year: 1980, lastYear: 1992 } }), "invalid");
  const narrowed = { name: "Terceira geração", firstYear: 1986, lastYear: 1992 };
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { kind: "edit", level: "generation", id: GENERATION_3, values: narrowed }), "invalid");
  assert.equal(applyCatalogChange(TEST_CATALOG_DATA, { kind: "edit", level: "year", id: period1986.id, values: { year: 1986, lastYear: 1993 } }), "invalid");
});

// Offers a vehicle's generations and versions in the item form: the Opala's in the catalog, its model found as a part's
// is ("Opala 4.1" → Opala), each generation with its number among the model's, oldest first, and the versions of the
// generation typed (by its number and years or its years alone), none before one is; a model the catalog lacks, or no
// model, offers none.
test("Shared: the item form offers the catalog's generations, numbered, and the versions of the one chosen", () => {
  const opala = { vehicleBrand: "chevrolet", vehicleModel: "opala 4.1" };
  assert.deepEqual(vehicleSuggestions(TEST_CATALOG, opala), { generations: ["G1 - 68/74", "G2 - 75/79", "G3 - 80/92"], versions: [] });
  assert.deepEqual(vehicleSuggestions(TEST_CATALOG, { ...opala, generation: "G3 - 80/92" }).versions, ["Comodoro", "Diplomata", "SS"]);
  assert.deepEqual(vehicleSuggestions(TEST_CATALOG, { ...opala, generation: "1980-1992" }).versions, ["Comodoro", "Diplomata", "SS"]);
  assert.deepEqual(vehicleSuggestions(TEST_CATALOG, { ...opala, generation: "G1 - 68/74" }).versions, []);
  assert.deepEqual(vehicleSuggestions(TEST_CATALOG, { vehicleBrand: "Chevrolet", vehicleModel: "Caravan" }), { generations: [], versions: [] });
  assert.deepEqual(vehicleSuggestions(TEST_CATALOG, { vehicleBrand: "Chevrolet", vehicleModel: "" }), { generations: [], versions: [] });
});

// Deletes a catalog brand in memory, and checks its models' trees go with it, the rail closes up, and a brand that
// isn't there is missing; reads the request that deletes one; and says what deleting a brand takes, its models counted.
test("Shared: a brand is deleted from the catalog with its models' trees", () => {
  const deleted = applyCatalogChange(TEST_CATALOG_DATA, { kind: "deleteBrand", id: CHEVROLET }) as CatalogData;
  assert.deepEqual(deleted.brands.map((brand) => brand.name), ["Volkswagen", "Fiat", "Ford"]);
  assert.equal(applyCatalogChange(deleted, { kind: "deleteBrand", id: CHEVROLET }), "missing");
  assert.deepEqual(catalogChangeOf("DELETE", `/brands/${CHEVROLET}`, {}, FORD), { status: 200, change: { kind: "deleteBrand", id: CHEVROLET } });
  assert.equal(belowBrand(TEST_CATALOG.brands[0], "pt-BR"), "3 modelos, 4 gerações, 3 versões, 2 períodos, 2 motores com ficha");
  assert.equal(belowBrand({ ...TEST_CATALOG.brands[0], models: [] }, "pt-BR"), null);
});

// Joins one model's tree into another's: the generation of the same name and years becomes one, so do the version of
// the same name in it and the year of the same number in that, the engines of the joined year are added together, and a
// version, a year and a generation the kept tree hasn't come after its own; the steps move each of those and drop the
// joined twins once their children moved.
test("Shared: two models' trees join, the matching nodes made one and nothing lost", () => {
  const engine = (id: string, displacementDl: number) => ({ id, displacementDl, cylinders: 4, drive: "FRONT" as const, summary: "" });
  const kept = {
    id: "model-kept",
    generations: [
      { id: "g3", name: "Terceira", firstYear: 1980, lastYear: 1992, versions: [{ id: "v-comodoro", name: "Comodoro", years: [{ id: "y85", year: 1985, lastYear: 1985, engines: [engine("e1", 25)] }] }] },
      { id: "g2", name: "Segunda", firstYear: 1975, lastYear: 1979, versions: [] },
    ],
  };
  const merged = {
    generations: [
      {
        id: "m-g3",
        name: "terceira",
        firstYear: 1980,
        lastYear: 1992,
        versions: [
          {
            id: "m-comodoro",
            name: "COMODORO",
            years: [
              { id: "m-y85", year: 1985, lastYear: 1985, engines: [engine("e2", 41)] },
              { id: "m-y86", year: 1986, lastYear: 1986, engines: [engine("e3", 41)] },
            ],
          },
          { id: "m-diplomata", name: "Diplomata", years: [] },
        ],
      },
      { id: "m-g4", name: "Quarta", firstYear: 1993, lastYear: null, versions: [] },
    ],
  };
  const { generations, steps } = joinCatalogTrees(kept, merged);
  assert.deepEqual(generations.map((each) => each.id), ["g3", "g2", "m-g4"]);
  assert.deepEqual(generations[0].versions.map((each) => each.id), ["v-comodoro", "m-diplomata"]);
  assert.deepEqual(generations[0].versions[0].years.map((each) => [each.id, each.engines.map((one) => one.id)]), [
    ["y85", ["e1", "e2"]],
    ["m-y86", ["e3"]],
  ]);
  assert.deepEqual(steps, [
    { kind: "move", level: "engine", id: "e2", parentId: "y85" },
    { kind: "drop", level: "year", id: "m-y85", into: "y85" },
    { kind: "move", level: "year", id: "m-y86", parentId: "v-comodoro" },
    { kind: "drop", level: "version", id: "m-comodoro", into: "v-comodoro" },
    { kind: "move", level: "version", id: "m-diplomata", parentId: "g3" },
    { kind: "drop", level: "generation", id: "m-g3", into: "g3" },
    { kind: "move", level: "generation", id: "m-g4", parentId: "model-kept" },
  ]);
  assert.deepEqual(kept.generations[0].versions.map((each) => each.id), ["v-comodoro"]);
});
