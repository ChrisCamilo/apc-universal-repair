import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type SyntheticEvent } from 'react'
import { chevronIcon, ICON_SIZES } from '@apc/tokens/icons'
import { ancestors, canOpen, isLeaf, treeKey, visibleRows, type TreeNode } from '@apc/ui-spec/tree'
import { Icon } from '../Icon/Icon.tsx'
import { treeView } from './TreeView.styles.ts'

// The model tree of the Catalog tab: model → generation → version → year → engine. A branch opens and closes
// with a click, its chevron turning and its children sliding open; an empty branch (data still to come) shows
// no chevron. A leaf is selected with a click and handed to onSelect, and the selected leaf takes the accent
// with a rule on its left, glowing where the style has a glow. Each level hangs from a hairline guide, and a
// separator stands between the top-level models. The keyboard follows the ARIA tree pattern (see treeKey in
// @apc/ui-spec/tree), with a roving tabIndex so Tab enters the tree on the selected leaf and leaves it at once.
// The tree scrolls inside its own height, set through className, and long labels are cut short instead of
// widening it. A row can also be pointed out, such as the model of a part found by its code: it takes the accent
// like the selected leaf, and is marked aria-current for screen readers.
// The owner can edit the tree from it: a row can end with its own buttons (rowActions), shown while the row is
// pointed at, and on the row the keyboard is on while the focus is in the tree, so Tab reaches them from the row; a row can show something else in its place, such as a
// field to rename it (editing); a branch can end with one more line under its children (after), such as a field to
// add one more, which also shows under an empty branch; and a branch can be opened from outside, with the ones above
// it (reveal), e.g. the one something is being added to. The keys inside those keep their own meaning. A row is named
// by its label and detail alone, so the buttons it ends with don't join its name.
// The owner can also let some branches be selected (selectable), such as a model whose sheet it shows: a click, Enter
// or Space on one hands it to onSelect as well as opening or closing it, and once selected it looks like a selected
// leaf. A click on its chevron only opens or closes it, so a phone, where choosing it may lead to another screen, can
// still open it in place; there the chevron is a finger wide.
// On a phone (below `card:`) the rows are 48px tall, a finger's height, and each level is indented without the guides;
// a tag at the right of each leaf, such as "Ver ficha", can say what choosing it does, filled in the accent on the
// selected one.

type TreeItemProps = { node: TreeNode; level: number; first: boolean; tree: TreeState }
// What every item needs from the tree around it.
type TreeState = {
  expanded: ReadonlySet<string>
  selected?: string
  highlighted?: string
  leafTag?: string
  selectable?: (id: string) => boolean
  rowActions?: (id: string) => ReactNode
  editing?: TreeEditing
  after?: (id: string) => ReactNode
  /** The one item Tab lands on. */
  tabbable?: string
  /** Whether the focus is somewhere in the tree. */
  focusIn: boolean
  register: (id: string, item: HTMLLIElement | null) => void
  activate: (node: TreeNode) => void
  toggle: (id: string) => void
  onFocus: (id: string) => void
}
/** A row shown as something else, e.g. a field to rename it. */
type TreeEditing = { id: string; content: ReactNode }
type TreeViewProps = {
  /** Accessible name of the tree, e.g. "Modelos Chevrolet". */
  label: string
  nodes: TreeNode[]
  /** Id of the selected leaf, or of a selectable branch. */
  selected?: string
  /** Called with the leaf, or selectable branch, chosen with a click, Enter or Space; the owner keeps it, e.g. for the detail panel. */
  onSelect: (id: string) => void
  /** Whether a branch, by its id, is selected too when chosen, e.g. a model whose sheet the owner shows; none when left out. */
  selectable?: (id: string) => boolean
  /** Id of a row to point out in the accent, e.g. the model of a part found by its code. */
  highlighted?: string
  /** Branches open at first; defaults to the ones above the selected leaf. */
  defaultExpanded?: string[]
  /** A tag at the right of each leaf that says what choosing it does, e.g. "Ver ficha". */
  leafTag?: string
  /** Buttons at the end of a row, by its node's id, shown while it is pointed at or has the focus; none when null. */
  rowActions?: (id: string) => ReactNode
  /** A row to show as something else, e.g. a field to rename it. */
  editing?: TreeEditing
  /** One more line at the end of a branch's children, by its id, e.g. a field to add one; none when null. */
  after?: (id: string) => ReactNode
  /** A branch to open, with the ones above it, whenever it changes, e.g. the one something is added to. */
  reveal?: string
  /** Height of the tree, which scrolls inside it, e.g. "max-h-96". */
  className?: string
}

export function TreeView({
  label,
  nodes,
  selected,
  onSelect,
  selectable,
  highlighted,
  defaultExpanded,
  leafTag,
  rowActions,
  editing,
  after,
  reveal,
  className,
}: TreeViewProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded ?? (selected ? ancestors(nodes, selected) : [])),
  )
  // The item last focused, which Tab comes back to, and whether the focus is in the tree.
  const [focused, setFocused] = useState<string | null>(null)
  const [focusIn, setFocusIn] = useState(false)
  const items = useRef(new Map<string, HTMLLIElement>())
  const rows = visibleRows(nodes, expanded)
  const tabbable = (rows.find((row) => row.node.id === focused) ?? rows.find((row) => row.node.id === selected) ?? rows[0])?.node.id

  // A branch the owner reveals opens, with the ones above it.
  useEffect(() => {
    if (reveal) {
      setExpanded((open) => new Set([...open, ...ancestors(nodes, reveal), reveal]))
    }
    // Only a new branch to reveal opens it: the nodes change on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

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

  /** Selects a leaf, or opens or closes a branch, selecting it too when it is selectable. */
  const activate = (node: TreeNode) => {
    if (isLeaf(node)) {
      onSelect(node.id)
      return
    }
    if (selectable?.(node.id)) {
      onSelect(node.id)
    }
    if (canOpen(node)) {
      toggle(node.id)
    }
  }

  /** Moves the focus, opens and closes branches, and selects leaves and selectable branches from the keyboard. */
  const onKeyDown = (event: KeyboardEvent) => {
    // A row's buttons and fields keep their keys.
    if ((event.target as HTMLElement).getAttribute('role') !== 'treeitem') {
      return
    }
    const index = rows.findIndex((row) => row.node.id === tabbable)
    const node = rows[index]?.node
    if (node && !isLeaf(node) && selectable?.(node.id) && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      activate(node)
      return
    }
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
    leafTag,
    selectable,
    rowActions,
    editing,
    after,
    tabbable,
    focusIn,
    register: (id, item) => {
      if (item) {
        items.current.set(id, item)
      } else {
        items.current.delete(id)
      }
    },
    activate,
    toggle,
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
      onFocus={() => setFocusIn(true)}
      onBlur={(event) => setFocusIn(event.currentTarget.contains(event.relatedTarget))}
    >
      {nodes.map((node, index) => (
        <TreeItem key={node.id} node={node} level={1} first={index === 0} tree={tree} />
      ))}
    </ul>
  )
}

/**
 * Keeps a click or a key inside a row's own buttons and fields from opening, closing or selecting the row.
 * @param event The click or key.
 */
function keepInside(event: SyntheticEvent) {
  event.stopPropagation()
}

function TreeItem({ node, level, first, tree }: TreeItemProps) {
  const branch = canOpen(node)
  const leaf = isLeaf(node)
  const extra = node.children && tree.after?.(node.id)
  // An empty branch with a line after it shows it, though it has nothing to open.
  const open = (branch && tree.expanded.has(node.id)) || (!branch && Boolean(extra))
  const editing = tree.editing?.id === node.id ? tree.editing.content : null
  const actions = !editing && tree.rowActions?.(node.id)
  const labelId = useId()
  const choosable = leaf || Boolean(tree.selectable?.(node.id))
  const selected = choosable && node.id === tree.selected
  const highlighted = node.id === tree.highlighted
  const { classes, ids } = treeView({
    actionsShown: tree.focusIn && node.id === tree.tabbable,
    separated: level === 1 && !first,
    face: level === 1 ? 'display' : leaf ? 'mono' : 'body',
    active: selected || highlighted,
    clickable: branch || choosable,
    open,
  })
  return (
    <li
      ref={(item) => tree.register(node.id, item)}
      role="treeitem"
      aria-expanded={branch ? open : undefined}
      aria-selected={choosable ? selected : undefined}
      aria-current={highlighted || undefined}
      aria-labelledby={editing ? undefined : node.detail ? `${labelId} ${labelId}-detail` : labelId}
      tabIndex={node.id === tree.tabbable ? 0 : -1}
      className={classes.item()}
      data-testid={ids.item}
      onFocus={(event) => {
        if (event.target === event.currentTarget) {
          tree.onFocus(node.id)
        }
      }}
    >
      <div data-row className={classes.row()} data-testid={ids.row} onClick={editing ? undefined : () => tree.activate(node)}>
        {editing ? (
          <div className={classes.editing()} data-testid={ids.editing} onClick={keepInside} onKeyDown={keepInside}>
            {editing}
          </div>
        ) : branch && choosable ? (
          <span
            aria-hidden="true"
            className={classes.toggle()}
            data-testid={ids.toggle}
            onClick={(event) => {
              event.stopPropagation()
              tree.toggle(node.id)
            }}
          >
            <Icon icon={chevronIcon} size={ICON_SIZES.caret} className={classes.chevron()} />
          </span>
        ) : branch ? (
          <Icon icon={chevronIcon} size={ICON_SIZES.caret} className={classes.chevron()} />
        ) : (
          <span aria-hidden="true" className={classes.spacer()} data-testid={ids.spacer} />
        )}
        {!editing && (
          <>
            <span id={labelId} className={classes.label()} data-testid={ids.label}>
              {node.label}
            </span>
            {node.detail && (
              <span id={`${labelId}-detail`} className={classes.detail()} data-testid={ids.detail}>
                {node.detail}
              </span>
            )}
            {leaf && tree.leafTag && (
              <span aria-hidden="true" className={classes.tag()} data-testid={ids.tag}>
                {tree.leafTag}
              </span>
            )}
          </>
        )}
        {actions && (
          <span data-actions className={classes.actions()} data-testid={ids.actions} onClick={keepInside} onKeyDown={keepInside}>
            {actions}
          </span>
        )}
      </div>
      {(branch || extra) && (
        <div role="none" className={classes.group()} data-testid={ids.group}>
          <div role="none" className={classes.clip()} data-testid={ids.clip}>
            <ul role="group" className={classes.list()} data-testid={ids.list}>
              {node.children!.map((child) => (
                <TreeItem key={child.id} node={child} level={level + 1} first={false} tree={tree} />
              ))}
              {extra && (
                <li role="none" className={classes.after()} data-testid={ids.after} onClick={keepInside} onKeyDown={keepInside}>
                  {extra}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </li>
  )
}
