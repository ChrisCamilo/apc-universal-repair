import assert from "node:assert/strict";
import { test } from "node:test";
import type { Item } from "../items/items.ts";
import type { TreeNode } from "../tree/tree.ts";
import {
  brandsNamed,
  brandWithModel,
  CATALOG,
  ENGINE_SHEETS,
  findParts,
  firstSheet,
  locatePart,
  modelsNamed,
  partFit,
} from "./catalog.ts";

/**
 * Lists every node of a tree, depth first.
 * @param nodes The tree's top level.
 * @returns Every node.
 */
function allNodes(nodes: readonly TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [node, ...allNodes(node.children ?? [])]);
}

/**
 * Fills in an inventory item with the fields the catalog search doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function part(fields: Partial<Item> & Pick<Item, "code">): Item {
  return {
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
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...fields,
  };
}

// Checks every node id is unique across the whole catalog and the engines (the leaves) and the sheets match one to
// one, so the engine the tree selects always has its sheet and every sheet can be reached.
test("Shared: catalog ids are unique and every engine has its sheet", () => {
  const nodes = CATALOG.flatMap((brand) => allNodes(brand.models));
  assert.equal(new Set(nodes.map((node) => node.id)).size, nodes.length);
  const leaves = nodes.filter((node) => node.children === undefined).map((node) => node.id);
  assert.deepEqual([...leaves].sort(), Object.keys(ENGINE_SHEETS).sort());
});

// Finds the first engine with a sheet in each brand, and checks a brand with none, and an empty tree, have none.
test("Shared: firstSheet finds the first engine with a sheet, depth first", () => {
  const brand = (id: string) => CATALOG.find((b) => b.id === id)!.models;
  assert.equal(firstSheet(brand("chevrolet")), "chevrolet-opala-diplomata-1986-2.5");
  assert.equal(firstSheet(brand("volkswagen")), "volkswagen-gol-gts-1989-1.8");
  assert.equal(firstSheet(brand("ford")), undefined);
  assert.equal(firstSheet([]), undefined);
});

// Searches brands and models in another case and without accents, and checks the matching ones are listed in order
// and an empty search lists them all.
test("Shared: brands and models are found by name, ignoring case and accents", () => {
  assert.deepEqual(brandsNamed("VOLKS").map((brand) => brand.id), ["volkswagen"]);
  assert.deepEqual(brandsNamed("  ").map((brand) => brand.id), ["chevrolet", "volkswagen", "fiat", "ford"]);
  const chevrolet = CATALOG[0].models;
  assert.deepEqual(modelsNamed(chevrolet, "ópa").map((model) => model.label), ["Opala"]);
  assert.deepEqual(modelsNamed(chevrolet, "fusca"), []);
});

// Searches a model the chosen brand has, one only another brand has, and one no brand has, and checks the brand to
// show stays, moves to the first brand with the model, or is null.
test("Shared: a model search keeps the brand that has it or moves to the first that does", () => {
  assert.equal(brandWithModel("chevrolet", "opala"), "chevrolet");
  assert.equal(brandWithModel("chevrolet", "uno"), "fiat");
  assert.equal(brandWithModel("fiat", "Gol"), "volkswagen");
  assert.equal(brandWithModel("chevrolet", "Kombi"), null);
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

// Places parts in the catalog: an engine by its displacement, a model with no such engine, a model the catalog lacks,
// a part for any model of a brand, and a brand the catalog lacks.
test("Shared: a part leads to its brand, model and engine in the catalog", () => {
  assert.deepEqual(locatePart({ vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" }), {
    brandId: "chevrolet",
    modelId: "chevrolet-opala",
    engineId: "chevrolet-opala-diplomata-1986-4.1",
  });
  assert.deepEqual(locatePart({ vehicleBrand: "chevrolet", vehicleModel: "Opala 3.8" }), { brandId: "chevrolet", modelId: "chevrolet-opala", engineId: undefined });
  assert.deepEqual(locatePart({ vehicleBrand: "Ford", vehicleModel: "Escort XR3" }), { brandId: "ford", modelId: "ford-escort", engineId: undefined });
  assert.deepEqual(locatePart({ vehicleBrand: "Fiat", vehicleModel: "Palio" }), { brandId: "fiat" });
  assert.deepEqual(locatePart({ vehicleBrand: "Fiat", vehicleModel: null }), { brandId: "fiat" });
  assert.equal(locatePart({ vehicleBrand: "Toyota", vehicleModel: "Corolla" }), null);
});

// Writes the vehicle line of parts that fit an engine with a sheet, a model without one, an engine without one, any
// model of a brand, any vehicle, and a brand the catalog lacks.
test("Shared: the part list says which vehicle each part fits", () => {
  assert.equal(partFit({ vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" }), "Serve no Chevrolet Opala 4.1");
  assert.equal(partFit({ vehicleBrand: "Ford", vehicleModel: "Escort" }), "Ford Escort (modelo ainda sem ficha no catálogo)");
  assert.equal(partFit({ vehicleBrand: "Chevrolet", vehicleModel: "Opala 3.8" }), "Chevrolet Opala 3.8 (motor ainda sem ficha no catálogo)");
  assert.equal(partFit({ vehicleBrand: "Volkswagen", vehicleModel: null }), "Serve em qualquer Volkswagen");
  assert.equal(partFit({ vehicleBrand: "Universal", vehicleModel: null }), "Serve em qualquer veículo");
  assert.equal(partFit({ vehicleBrand: "Toyota", vehicleModel: "Corolla" }), "Toyota não está no catálogo");
});
