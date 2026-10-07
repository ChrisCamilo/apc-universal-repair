import { useRef, useState, type KeyboardEvent } from 'react'
import { chevronIcon } from '@apc/shared/icons'
import { ancestors, canOpen, isLeaf, treeKey, visibleRows, type TreeNode } from '@apc/shared/tree'
import { Icon } from './Icon.tsx'

// The model tree of the Catalog tab: model → generation → version → year → engine. A branch opens and closes
// with a click, its chevron turning and its children sliding open; an empty branch (data still to come) shows
// no chevron. A leaf is selected with a click and handed to onSelect, and the selected leaf takes the accent
// with a rule on its left, glowing where the style has a glow. Each level hangs from a hairline guide, and a
// separator stands between the top-level models. The keyboard follows the ARIA tree pattern (see treeKey in
// @apc/shared/tree), with a roving tabIndex so Tab enters the tree on the selected leaf and leaves it at once.
// The tree scrolls inside its own height, set through className, and long labels are cut short instead of
// widening it.

const CHEVRON_SIZE = 12
// A branch's children open by growing the one grid row they sit in from nothing to their full height. They show
// at once when it opens, so the keyboard can move into them straight away, and hide only once it has closed.
const GROUP_CLOSED = 'invisible grid grid-rows-[0fr] transition-[grid-template-rows,visibility] motion-reduce:transition-none'
// The box that cuts the children off while they open reaches a little past them, so the focus ring of a row
// inside isn't cut off too.
const GROUP_CLIP = '-m-1 min-h-0 overflow-hidden p-1'
// Guide hanging under the chevron's center: the row's padding plus half the chevron.
const GROUP_LIST = 'ml-3.5 border-l border-hairline-soft pl-2'
const GROUP_OPEN = 'visible grid grid-rows-[1fr] transition-[grid-template-rows] motion-reduce:transition-none'
const ROW = 'relative flex min-w-0 items-center gap-2 overflow-hidden rounded-tile px-2 py-1 text-sm transition-[color,background-color,box-shadow]'
const SELECTED =
  'bg-accent-soft font-medium text-accent shadow-glow ' +
  "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent before:content-['']"
// The separator above every top-level model but the first, the same as Divider.
const SEPARATOR = "before:mx-1 before:my-2 before:block before:h-px before:bg-hairline-soft before:content-['']"

type TreeItemProps = { node: TreeNode; level: number; first: boolean; tree: TreeState }
// What every item needs from the tree around it.
type TreeState = {
  expanded: ReadonlySet<string>
  selected?: string
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
  /** Branches open at first; defaults to the ones above the selected leaf. */
  defaultExpanded?: string[]
  /** Height of the tree, which scrolls inside it, e.g. "max-h-96". */
  className?: string
}

/**
 * Picks a row's typeface by its level: the display face for the top-level models, the mono face for the
 * leaves (the engines, read like a spec) and the body face in between.
 * @param node The row's node.
 * @param level Its depth; 1 for the top level.
 * @returns Font classes.
 */
function rowFont(node: TreeNode, level: number): string {
  if (level === 1) {
    return 'font-display font-semibold uppercase tracking-display'
  }
  return isLeaf(node) ? 'font-mono' : ''
}

export function TreeView({ label, nodes, selected, onSelect, defaultExpanded, className }: TreeViewProps) {
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
  return (
    <ul
      role="tree"
      aria-label={label}
      className={['min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-1', className].filter(Boolean).join(' ')}
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
  return (
    <li
      ref={(item) => tree.register(node.id, item)}
      role="treeitem"
      aria-expanded={branch ? open : undefined}
      aria-selected={leaf ? selected : undefined}
      tabIndex={node.id === tree.tabbable ? 0 : -1}
      className={['outline-none [&:focus-visible>[data-row]]:shadow-ring', level === 1 && !first ? SEPARATOR : ''].join(' ')}
      onFocus={(event) => {
        if (event.target === event.currentTarget) {
          tree.onFocus(node.id)
        }
      }}
    >
      <div
        data-row
        className={[
          ROW,
          rowFont(node, level),
          selected ? SELECTED : 'text-text hover:bg-panel-raised',
          branch || leaf ? 'cursor-pointer' : 'cursor-default',
        ].join(' ')}
        onClick={() => tree.activate(node)}
      >
        {branch ? (
          <Icon
            icon={chevronIcon}
            size={CHEVRON_SIZE}
            className={`shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
          />
        ) : (
          <span aria-hidden="true" className="w-3 shrink-0" />
        )}
        <span className="min-w-0 truncate">{node.label}</span>
        {node.detail && <span className="shrink-0 font-mono text-xs font-normal text-text-muted">{node.detail}</span>}
      </div>
      {branch && (
        <div role="none" className={open ? GROUP_OPEN : GROUP_CLOSED}>
          <div role="none" className={GROUP_CLIP}>
            <ul role="group" className={GROUP_LIST}>
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
