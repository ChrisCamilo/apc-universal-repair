import { useRef, useState, type KeyboardEvent } from 'react'
import { chevronIcon, ICON_SIZES } from '@apc/shared/icons'
import { ancestors, canOpen, isLeaf, treeKey, visibleRows, type TreeNode } from '@apc/shared/tree'
import { Icon } from './Icon.tsx'
import { treeView } from './TreeView.styles.ts'

// The model tree of the Catalog tab: model → generation → version → year → engine. A branch opens and closes
// with a click, its chevron turning and its children sliding open; an empty branch (data still to come) shows
// no chevron. A leaf is selected with a click and handed to onSelect, and the selected leaf takes the accent
// with a rule on its left, glowing where the style has a glow. Each level hangs from a hairline guide, and a
// separator stands between the top-level models. The keyboard follows the ARIA tree pattern (see treeKey in
// @apc/shared/tree), with a roving tabIndex so Tab enters the tree on the selected leaf and leaves it at once.
// The tree scrolls inside its own height, set through className, and long labels are cut short instead of
// widening it. A row can also be pointed out, such as the model of a part found by its code: it takes the accent
// like the selected leaf, and is marked aria-current for screen readers.

type TreeItemProps = { node: TreeNode; level: number; first: boolean; tree: TreeState }
// What every item needs from the tree around it.
type TreeState = {
  expanded: ReadonlySet<string>
  selected?: string
  highlighted?: string
  /** The one item Tab lands on. */
  tabbable?: string
  register: (id: string, item: HTMLLIElement | null) => void
  activate: (node: TreeNode) => void
  onFocus: (id: string) => void
}
type TreeViewProps = {
  /** Accessible name of the tree, e.g. "Modelos Chevrolet". */
  label: string
  nodes: TreeNode[]
  /** Id of the selected leaf. */
  selected?: string
  /** Called with the leaf chosen with a click, Enter or Space; the owner keeps it, e.g. for the detail panel. */
  onSelect: (id: string) => void
  /** Id of a row to point out in the accent, e.g. the model of a part found by its code. */
  highlighted?: string
  /** Branches open at first; defaults to the ones above the selected leaf. */
  defaultExpanded?: string[]
  /** Height of the tree, which scrolls inside it, e.g. "max-h-96". */
  className?: string
}

export function TreeView({ label, nodes, selected, onSelect, highlighted, defaultExpanded, className }: TreeViewProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded ?? (selected ? ancestors(nodes, selected) : [])),
  )
  // The item last focused, which Tab comes back to.
  const [focused, setFocused] = useState<string | null>(null)
  const items = useRef(new Map<string, HTMLLIElement>())
  const rows = visibleRows(nodes, expanded)
  const tabbable = (rows.find((row) => row.node.id === focused) ?? rows.find((row) => row.node.id === selected) ?? rows[0])?.node.id

  /** Opens a closed branch or closes an open one. */
  const toggle = (id: string) => {
    setExpanded((open) => {
      const next = new Set(open)
      if (!next.delete(id)) {
        next.add(id)
      }
      return next
    })
  }

  /** Selects a leaf, or opens or closes a branch. */
  const activate = (node: TreeNode) => {
    if (isLeaf(node)) {
      onSelect(node.id)
    } else if (canOpen(node)) {
      toggle(node.id)
    }
  }

  /** Moves the focus, opens and closes branches, and selects leaves from the keyboard. */
  const onKeyDown = (event: KeyboardEvent) => {
    const index = rows.findIndex((row) => row.node.id === tabbable)
    const action = index < 0 ? null : treeKey(event.key, rows, index, expanded)
    if (action === null) {
      return
    }
    event.preventDefault()
    if (action.kind === 'focus') {
      items.current.get(action.id)?.focus()
    } else if (action.kind === 'toggle') {
      toggle(action.id)
    } else {
      onSelect(action.id)
    }
  }

  const tree: TreeState = {
    expanded,
    selected,
    highlighted,
    tabbable,
    register: (id, item) => {
      if (item) {
        items.current.set(id, item)
      } else {
        items.current.delete(id)
      }
    },
    activate,
    onFocus: setFocused,
  }
  const { classes, ids } = treeView()
  return (
    <ul
      role="tree"
      aria-label={label}
      className={classes.base({ class: className })}
      data-testid={ids.base}
      onKeyDown={onKeyDown}
    >
      {nodes.map((node, index) => (
        <TreeItem key={node.id} node={node} level={1} first={index === 0} tree={tree} />
      ))}
    </ul>
  )
}

function TreeItem({ node, level, first, tree }: TreeItemProps) {
  const branch = canOpen(node)
  const leaf = isLeaf(node)
  const open = branch && tree.expanded.has(node.id)
  const selected = leaf && node.id === tree.selected
  const highlighted = node.id === tree.highlighted
  const { classes, ids } = treeView({
    separated: level === 1 && !first,
    face: level === 1 ? 'display' : leaf ? 'mono' : 'body',
    active: selected || highlighted,
    clickable: branch || leaf,
    open,
  })
  return (
    <li
      ref={(item) => tree.register(node.id, item)}
      role="treeitem"
      aria-expanded={branch ? open : undefined}
      aria-selected={leaf ? selected : undefined}
      aria-current={highlighted || undefined}
      tabIndex={node.id === tree.tabbable ? 0 : -1}
      className={classes.item()}
      data-testid={ids.item}
      onFocus={(event) => {
        if (event.target === event.currentTarget) {
          tree.onFocus(node.id)
        }
      }}
    >
      <div
        data-row
        className={classes.row()}
        data-testid={ids.row}
        onClick={() => tree.activate(node)}
      >
        {branch ? (
          <Icon icon={chevronIcon} size={ICON_SIZES.caret} className={classes.chevron()} />
        ) : (
          <span aria-hidden="true" className={classes.spacer()} data-testid={ids.spacer} />
        )}
        <span className={classes.label()} data-testid={ids.label}>
          {node.label}
        </span>
        {node.detail && (
          <span className={classes.detail()} data-testid={ids.detail}>
            {node.detail}
          </span>
        )}
      </div>
      {branch && (
        <div role="none" className={classes.group()} data-testid={ids.group}>
          <div role="none" className={classes.clip()} data-testid={ids.clip}>
            <ul role="group" className={classes.list()} data-testid={ids.list}>
              {node.children!.map((child) => (
                <TreeItem key={child.id} node={child} level={level + 1} first={false} tree={tree} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  )
}
