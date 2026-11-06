// Tree behavior shared by the web and mobile TreeView: which branches open first, which rows are on screen,
// and where the keyboard moves on the web. The Catalog tab's tree has five levels, model → generation →
// version → year → engine, but nothing here depends on the depth.

/**
 * A node of the tree. A node with `children` is a branch, even with an empty list (its data is still to come):
 * an empty branch shows no chevron and can't be opened or selected. A node without `children` is a leaf, the
 * only kind that can be selected.
 */
export type TreeNode = {
  id: string;
  label: string;
  /** Muted text after the label, e.g. the years of a generation, "1980–1992". */
  detail?: string;
  children?: TreeNode[];
};
/** A row on screen: its node, its depth (1 for the top level) and the id of its parent branch. */
export type TreeRow = { node: TreeNode; level: number; parent: string | null };
/** What a key does: move the focus to a row, open or close a branch, or select a leaf. */
export type TreeAction = { kind: "focus" | "toggle" | "select"; id: string };

/**
 * Lists the branches above a node, so they can be opened to show it, e.g. the selected leaf.
 * @param nodes Top-level nodes.
 * @param id Id of the node to find.
 * @returns Ids of its ancestors from the top level down; empty when it is on the top level or not in the tree.
 */
export function ancestors(nodes: readonly TreeNode[], id: string): string[] {
  return pathTo(nodes, id)?.slice(0, -1) ?? [];
}

/**
 * Tells whether a node is a branch with something inside, which shows a chevron and opens.
 * @param node Node to check.
 * @returns True when it has at least one child.
 */
export function canOpen(node: TreeNode): boolean {
  return (node.children?.length ?? 0) > 0;
}

/**
 * Tells whether a node is a leaf, which can be selected.
 * @param node Node to check.
 * @returns True when it has no `children` at all.
 */
export function isLeaf(node: TreeNode): boolean {
  return node.children === undefined;
}

/**
 * Finds the way down to a node.
 * @param nodes Nodes to search, with their children.
 * @param id Id of the node to find.
 * @returns Ids from the top of `nodes` down to the node itself, or null when it isn't there.
 */
function pathTo(nodes: readonly TreeNode[], id: string): string[] | null {
  for (const node of nodes) {
    if (node.id === id) {
      return [node.id];
    }
    const below = node.children ? pathTo(node.children, id) : null;
    if (below) {
      return [node.id, ...below];
    }
  }
  return null;
}

/**
 * Finds what a key does on the focused row, following the tree pattern of the ARIA Authoring Practices: Up and
 * Down move between rows on screen; Right opens a closed branch or goes into an open one; Left closes an open
 * branch or goes up to the parent; Home and End go to the first and last rows; Enter and Space select a leaf or
 * open and close a branch.
 * @param key Pressed key.
 * @param rows Rows on screen, in order.
 * @param index Index of the focused row.
 * @param expanded Ids of the open branches.
 * @returns The action, or null when the key does nothing there.
 */
export function treeKey(key: string, rows: readonly TreeRow[], index: number, expanded: ReadonlySet<string>): TreeAction | null {
  const { node, parent } = rows[index];
  const open = expanded.has(node.id);
  switch (key) {
    case "ArrowDown":
      return index < rows.length - 1 ? { kind: "focus", id: rows[index + 1].node.id } : null;
    case "ArrowUp":
      return index > 0 ? { kind: "focus", id: rows[index - 1].node.id } : null;
    case "ArrowRight":
      if (!canOpen(node)) {
        return null;
      }
      return open ? { kind: "focus", id: node.children![0].id } : { kind: "toggle", id: node.id };
    case "ArrowLeft":
      if (canOpen(node) && open) {
        return { kind: "toggle", id: node.id };
      }
      return parent === null ? null : { kind: "focus", id: parent };
    case "Home":
      return { kind: "focus", id: rows[0].node.id };
    case "End":
      return { kind: "focus", id: rows[rows.length - 1].node.id };
    case "Enter":
    case " ":
      if (isLeaf(node)) {
        return { kind: "select", id: node.id };
      }
      return canOpen(node) ? { kind: "toggle", id: node.id } : null;
    default:
      return null;
  }
}

/**
 * Lists the rows on screen: every top-level node, and the children of each open branch, depth first.
 * @param nodes Top-level nodes.
 * @param expanded Ids of the open branches.
 * @param level Depth of `nodes`; 1 for the top level.
 * @param parent Id of the branch holding `nodes`, or null on the top level.
 * @returns The rows in the order they are drawn.
 */
export function visibleRows(
  nodes: readonly TreeNode[],
  expanded: ReadonlySet<string>,
  level = 1,
  parent: string | null = null,
): TreeRow[] {
  return nodes.flatMap((node) => [
    { node, level, parent },
    ...(canOpen(node) && expanded.has(node.id) ? visibleRows(node.children!, expanded, level + 1, node.id) : []),
  ]);
}
