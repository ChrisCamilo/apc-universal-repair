import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { IconShape } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'

// Top-level navigation of the Dashboard. The selected tab takes the accent with an underline, which glows
// where the style has a glow. Left/Right (and Home/End) move between tabs and select them, with a roving
// tabIndex so Tab enters the list on the selected tab and leaves it straight to the panel.
// Pair it with useStoredTab to reopen on the last tab used. Each TabPanel stays in the page while hidden,
// so every tab's aria-controls points somewhere, but only renders its content when selected.

const COUNT =
  'rounded-pill border border-hairline px-2 font-mono text-xs font-medium tracking-normal tabular-nums ' +
  'text-text-muted transition-colors group-aria-selected:border-[color-mix(in_srgb,var(--accent)_45%,transparent)] ' +
  'group-aria-selected:text-accent'
const TAB =
  'group relative inline-flex cursor-pointer items-center gap-2 rounded-tile border-0 bg-transparent px-2.5 pt-2.5 pb-3 ' +
  'font-display text-sm font-semibold uppercase tracking-display text-text-muted outline-none transition-colors ' +
  'not-aria-selected:hover:text-text aria-selected:text-accent focus-visible:shadow-ring sm:px-3.5 ' +
  "after:absolute after:inset-x-2.5 after:-bottom-px after:h-0.5 after:rounded-pill after:content-[''] " +
  'after:transition-[background-color,box-shadow] aria-selected:after:bg-accent aria-selected:after:shadow-glow'

type TabItem<T extends string> = {
  id: T
  label: string
  /** Leading icon from @apc/shared/icons. */
  icon?: IconShape[]
  /** Badge after the label, e.g. the number of items in stock. */
  count?: number
}
type TabPanelProps<T extends string> = { id: T; selected: T; children: ReactNode }
type TabsProps<T extends string> = {
  /** Accessible name of the tab list, e.g. "Seções do Dashboard". */
  label: string
  tabs: TabItem<T>[]
  selected: T
  onSelect: (id: T) => void
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

export function Tabs<T extends string>({ label, tabs, selected, onSelect }: TabsProps<T>) {
  const buttons = useRef(new Map<T, HTMLButtonElement>())
  /** Selects and focuses the tab a navigation key moves to. */
  const onKeyDown = (event: KeyboardEvent, index: number) => {
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
    <div role="tablist" aria-label={label} className="flex gap-1">
      {tabs.map((tab, index) => {
        const isSelected = tab.id === selected
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
            aria-controls={panelElementId(tab.id)}
            tabIndex={isSelected ? 0 : -1}
            className={TAB}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.icon && <Icon icon={tab.icon} size={15} />}
            {tab.label}
            {tab.count !== undefined && <span className={COUNT}>{tab.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel<T extends string>({ id, selected, children }: TabPanelProps<T>) {
  const isSelected = id === selected
  return (
    <div
      role="tabpanel"
      id={panelElementId(id)}
      aria-labelledby={tabElementId(id)}
      tabIndex={0}
      hidden={!isSelected}
      className="outline-none focus-visible:shadow-ring"
    >
      {isSelected && children}
    </div>
  )
}
