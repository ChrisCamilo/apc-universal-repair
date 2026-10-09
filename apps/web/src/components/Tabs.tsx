import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { coneIcon, gripIcon, ICON_SIZES, type IconShape } from '@apc/shared/icons'
import { dropTab, moveTab, type DropSide } from '@apc/shared/tabs'
import { Icon } from './Icon.tsx'
import { tabPanel, tabs as tabsRecipe } from './Tabs.styles.ts'

// Top-level navigation of the Dashboard. The selected tab takes the accent with an underline, which glows
// where the style has a glow. Left/Right (and Home/End) move between tabs and select them, with a roving
// tabIndex so Tab enters the list on the selected tab and leaves it straight to the panel.
// Pair it with useStoredTab to reopen on the last tab used. Each TabPanel stays in the page while hidden,
// so every tab's aria-controls points somewhere, but only renders its content when selected.
// With `reorderable` on (off by default), each tab shows a grip and can be dragged: a line in the accent
// marks the side of the tab under the pointer where it will land. Alt + Left/Right moves the focused tab one
// place, and the new position is announced. The new order goes to onReorder; the owner keeps it.
// A tab still being built (`wip`) shows a cone after its label and is read out as "em construção"; it opens as any other.

type TabItem<T extends string> = {
  id: T
  label: string
  /** Leading icon from @apc/shared/icons. */
  icon?: IconShape[]
  /** Badge after the label, e.g. the number of items in stock. */
  count?: number
  /** Still being built: a cone after the label, read out as "em construção". */
  wip?: boolean
}
type TabPanelProps<T extends string> = { id: T; selected: T; children: ReactNode }
type TabsProps<T extends string> = {
  /** Accessible name of the tab list, e.g. "Seções do Dashboard". */
  label: string
  tabs: TabItem<T>[]
  selected: T
  onSelect: (id: T) => void
  /** Lets the user drag the tabs, or move the focused one with Alt + Left/Right, into a new order. */
  reorderable?: boolean
  /** Called with the tab ids in their new order; the owner keeps it and passes the tabs back in that order. */
  onReorder?: (ids: T[]) => void
}

/**
 * Finds which tab a navigation key moves to; the arrows wrap around the ends.
 * @param key Pressed key.
 * @param index Index of the focused tab.
 * @param count Number of tabs.
 * @returns Index of the tab to select, or null when the key doesn't move between tabs.
 */
function keyTarget(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowLeft':
      return (index - 1 + count) % count
    case 'ArrowRight':
      return (index + 1) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/**
 * Names the element id of a tab's panel, which the tab controls.
 * @param id Tab id.
 * @returns Element id, e.g. "panel-stock".
 */
function panelElementId(id: string): string {
  return `panel-${id}`
}

/**
 * Names the element id of a tab, which its panel points back to.
 * @param id Tab id.
 * @returns Element id, e.g. "tab-stock".
 */
function tabElementId(id: string): string {
  return `tab-${id}`
}

export function Tabs<T extends string>({ label, tabs, selected, onSelect, reorderable = false, onReorder }: TabsProps<T>) {
  const buttons = useRef(new Map<T, HTMLButtonElement>())
  // The tab moved with the keyboard, to focus again once it is drawn in its new place.
  const moved = useRef<T | null>(null)
  const [dragging, setDragging] = useState<T | null>(null)
  const list = tabsRecipe()
  const [drop, setDrop] = useState<{ id: T; side: DropSide } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const ids = tabs.map((tab) => tab.id)

  // Keep the focus on a tab moved with the keyboard.
  useEffect(() => {
    if (moved.current) {
      buttons.current.get(moved.current)?.focus()
      moved.current = null
    }
  }, [tabs])

  /** Hands the new order to the owner and says where the tab went. */
  const reorder = (next: T[], id: T) => {
    onReorder?.(next)
    const tab = tabs.find((t) => t.id === id)!
    setAnnouncement(`Aba ${tab.label} na posição ${next.indexOf(id) + 1} de ${next.length}`)
  }

  /** Marks the side of the tab under the pointer where the dragged tab will land. */
  const onDragOver = (event: DragEvent, id: T) => {
    if (dragging === null || dragging === id) {
      return
    }
    event.preventDefault()
    const box = event.currentTarget.getBoundingClientRect()
    const side: DropSide = event.clientX > box.left + box.width / 2 ? 'after' : 'before'
    if (drop?.id !== id || drop.side !== side) {
      setDrop({ id, side })
    }
  }

  /** Puts the dragged tab on the marked side of the tab it was dropped on. */
  const onDrop = (event: DragEvent, id: T) => {
    if (dragging === null || drop?.id !== id) {
      return
    }
    event.preventDefault()
    reorder(dropTab(ids, dragging, id, drop.side), dragging)
    setDragging(null)
    setDrop(null)
  }

  /** Selects and focuses the tab a navigation key moves to; with Alt, moves the tab itself. */
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (reorderable && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      // Alt + Left is also the browser's Back: the tab moves instead.
      event.preventDefault()
      const id = tabs[index].id
      const next = moveTab(ids, id, event.key === 'ArrowLeft' ? -1 : 1)
      if (next) {
        moved.current = id
        reorder(next, id)
      }
      return
    }
    const target = keyTarget(event.key, index, tabs.length)
    if (target === null) {
      return
    }
    event.preventDefault()
    const { id } = tabs[target]
    onSelect(id)
    buttons.current.get(id)?.focus()
  }

  return (
    <>
      <div role="tablist" aria-label={label} className={list.classes.base()} data-testid={list.ids.base}>
        {tabs.map((tab, index) => {
          const isSelected = tab.id === selected
          const { classes, ids } = tabsRecipe({
            reorderable,
            dragging: dragging === tab.id,
            drop: drop?.id === tab.id ? drop.side : 'none',
          })
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node) {
                  buttons.current.set(tab.id, node)
                } else {
                  buttons.current.delete(tab.id)
                }
              }}
              type="button"
              role="tab"
              id={tabElementId(tab.id)}
              aria-selected={isSelected}
              aria-label={tab.wip ? `${tab.label}, em construção` : undefined}
              aria-controls={panelElementId(tab.id)}
              tabIndex={isSelected ? 0 : -1}
              aria-keyshortcuts={reorderable ? 'Alt+ArrowLeft Alt+ArrowRight' : undefined}
              draggable={reorderable || undefined}
              className={classes.tab()}
              data-testid={ids.tab}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              onDragStart={(event) => {
                setDragging(tab.id)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', tab.id)
              }}
              onDragOver={(event) => onDragOver(event, tab.id)}
              onDrop={(event) => onDrop(event, tab.id)}
              onDragEnd={() => {
                setDragging(null)
                setDrop(null)
              }}
            >
              {reorderable && (
                <span aria-hidden="true" className={classes.grip()} data-testid={ids.grip}>
                  <Icon icon={gripIcon} size={ICON_SIZES.inline} />
                </span>
              )}
              {tab.icon && <Icon icon={tab.icon} size={ICON_SIZES.label} />}
              {tab.label}
              {tab.wip && (
                <span aria-hidden="true" className={classes.wip()} data-testid={ids.wip}>
                  <Icon icon={coneIcon} size={ICON_SIZES.compact} />
                </span>
              )}
              {tab.count !== undefined && (
                <span className={classes.count()} data-testid={ids.count}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <span role="status" className={list.classes.status()} data-testid={list.ids.status}>
        {announcement}
      </span>
    </>
  )
}

export function TabPanel<T extends string>({ id, selected, children }: TabPanelProps<T>) {
  const isSelected = id === selected
  const { classes, ids } = tabPanel()
  return (
    <div
      role="tabpanel"
      id={panelElementId(id)}
      aria-labelledby={tabElementId(id)}
      tabIndex={0}
      hidden={!isSelected}
      className={classes.base()}
      data-testid={ids.base}
    >
      {isSelected && children}
    </div>
  )
}
