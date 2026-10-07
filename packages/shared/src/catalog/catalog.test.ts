import assert from "node:assert/strict";
import { test } from "node:test";
import type { TreeNode } from "../tree/tree.ts";
import { CATALOG, ENGINE_SHEETS, firstSheet } from "./catalog.ts";

/**
 * Lists every node of a tree, depth first.
 * @param nodes The tree's top level.
 * @returns Every node.
 */
function allNodes(nodes: readonly TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [node, ...allNodes(node.children ?? [])]);
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
