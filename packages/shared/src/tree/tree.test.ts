import assert from "node:assert/strict";
import { test } from "node:test";
import { ancestors, canOpen, isLeaf, treeKey, visibleRows, type TreeNode } from "./tree.ts";

const TREE: TreeNode[] = [
  {
    id: "opala",
    label: "Opala",
    children: [
      { id: "gen1", label: "Primeira geração", detail: "1968–1974", children: [] },
      {
        id: "gen3",
        label: "Terceira geração",
        detail: "1980–1992",
        children: [
          {
            id: "diplomata",
            label: "Diplomata",
            children: [{ id: "1986", label: "1986", children: [{ id: "4.1", label: "4.1 L 6 cilindros" }] }],
          },
        ],
      },
    ],
  },
  { id: "chevette", label: "Chevette", children: [] },
];

/**
 * Lists the ids of the rows on screen.
 * @param expanded Ids of the open branches.
 * @returns Row ids in order.
 */
function ids(expanded: string[]): string[] {
  return visibleRows(TREE, new Set(expanded)).map((row) => row.node.id);
}

/**
 * Presses a key on a row of the tree with some branches open.
 * @param key Pressed key.
 * @param id Id of the focused row.
 * @param expanded Ids of the open branches.
 * @returns What the key does.
 */
function press(key: string, id: string, expanded: string[]) {
  const open = new Set(expanded);
  const rows = visibleRows(TREE, open);
  return treeKey(key, rows, rows.findIndex((row) => row.node.id === id), open);
}

// Finds the branches above a deep leaf, a middle branch and a top-level node, and checks a missing id has none.
test("Shared: ancestors lists the branches above a node from the top down", () => {
  assert.deepEqual(ancestors(TREE, "4.1"), ["opala", "gen3", "diplomata", "1986"]);
  assert.deepEqual(ancestors(TREE, "gen1"), ["opala"]);
  assert.deepEqual(ancestors(TREE, "chevette"), []);
  assert.deepEqual(ancestors(TREE, "fusca"), []);
});

// Tells the three kinds of node apart: a branch with children opens, an empty branch neither opens nor is a
// leaf, and a node without children is a leaf.
test("Shared: branches, empty branches and leaves are told apart", () => {
  assert.equal(canOpen(TREE[0]), true);
  assert.equal(isLeaf(TREE[0]), false);
  assert.equal(canOpen(TREE[1]), false);
  assert.equal(isLeaf(TREE[1]), false);
  const leaf = { id: "4.1", label: "4.1 L 6 cilindros" };
  assert.equal(canOpen(leaf), false);
  assert.equal(isLeaf(leaf), true);
});

// Opens branches one by one and checks only the children of open branches are listed, depth first, with their
// level and parent, and that an open branch inside a closed one stays out of sight.
test("Shared: visible rows follow the open branches depth first", () => {
  assert.deepEqual(ids([]), ["opala", "chevette"]);
  assert.deepEqual(ids(["opala"]), ["opala", "gen1", "gen3", "chevette"]);
  assert.deepEqual(ids(["gen3"]), ["opala", "chevette"]);
  assert.deepEqual(ids(["opala", "gen3", "diplomata", "1986"]), ["opala", "gen1", "gen3", "diplomata", "1986", "4.1", "chevette"]);
  const leaf = visibleRows(TREE, new Set(["opala", "gen3", "diplomata", "1986"]))[5];
  assert.deepEqual([leaf.level, leaf.parent], [5, "1986"]);
});

// Moves up and down the rows on screen, and checks the ends stop there and Home and End jump to them.
test("Shared: Up, Down, Home and End move between the rows on screen", () => {
  const open = ["opala"];
  assert.deepEqual(press("ArrowDown", "opala", open), { kind: "focus", id: "gen1" });
  assert.deepEqual(press("ArrowDown", "gen3", open), { kind: "focus", id: "chevette" });
  assert.deepEqual(press("ArrowUp", "chevette", open), { kind: "focus", id: "gen3" });
  assert.equal(press("ArrowDown", "chevette", open), null);
  assert.equal(press("ArrowUp", "opala", open), null);
  assert.deepEqual(press("Home", "gen3", open), { kind: "focus", id: "opala" });
  assert.deepEqual(press("End", "opala", open), { kind: "focus", id: "chevette" });
});

// Presses Right and Left on closed, open and empty branches and on a leaf, and checks Right opens or goes in,
// Left closes or goes up to the parent, and neither does anything where there is nowhere to go.
test("Shared: Right opens or goes in and Left closes or goes up", () => {
  assert.deepEqual(press("ArrowRight", "opala", []), { kind: "toggle", id: "opala" });
  assert.deepEqual(press("ArrowRight", "opala", ["opala"]), { kind: "focus", id: "gen1" });
  assert.equal(press("ArrowRight", "chevette", []), null);
  assert.equal(press("ArrowRight", "4.1", ["opala", "gen3", "diplomata", "1986"]), null);
  assert.deepEqual(press("ArrowLeft", "opala", ["opala"]), { kind: "toggle", id: "opala" });
  assert.deepEqual(press("ArrowLeft", "gen3", ["opala"]), { kind: "focus", id: "opala" });
  assert.deepEqual(press("ArrowLeft", "4.1", ["opala", "gen3", "diplomata", "1986"]), { kind: "focus", id: "1986" });
  assert.equal(press("ArrowLeft", "chevette", []), null);
});

// Presses Enter and Space on a leaf, a branch and an empty branch, and checks the leaf is selected, the branch
// opens or closes and the empty branch does nothing; other keys do nothing either.
test("Shared: Enter and Space select a leaf or open and close a branch", () => {
  const open = ["opala", "gen3", "diplomata", "1986"];
  assert.deepEqual(press("Enter", "4.1", open), { kind: "select", id: "4.1" });
  assert.deepEqual(press(" ", "4.1", open), { kind: "select", id: "4.1" });
  assert.deepEqual(press("Enter", "gen3", open), { kind: "toggle", id: "gen3" });
  assert.deepEqual(press(" ", "opala", []), { kind: "toggle", id: "opala" });
  assert.equal(press("Enter", "gen1", ["opala"]), null);
  assert.equal(press("a", "opala", []), null);
});
