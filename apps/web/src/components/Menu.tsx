import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { chevronIcon, type IconShape } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'
import { MENU_ITEM_CLASSES, MenuContext, useMenu } from './menuContext.ts'

// A dropdown menu, such as the Dashboard's user menu: a trigger button and a popover anchored under it.
// Up/Down (and Home/End) move between the items; checkbox and radio items (Switch, Segmented) keep the menu
// open when chosen, and only plain action items (MenuItem) close it. A click outside, Escape or the trigger
// closes the menu and puts the focus back on the trigger.

const ITEMS_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'

type MenuItemProps = {
  /** Runs the action; the menu closes afterwards. */
  onSelect: () => void
  /** Short explanation under the label. */
  description?: string
  /** Icon at the end of the item. */
  icon?: IconShape[]
  children: ReactNode
}
type MenuProps = {
  /** Accessible name of the trigger and the menu, e.g. "Menu do usuário". */
  label: string
  /** Content of the trigger button, e.g. the avatar and the user name. */
  trigger: ReactNode
  /** Side the popover lines up with: the trigger's start or its end (default, for menus on the right). */
  align?: 'start' | 'end'
  children: ReactNode
}

/**
 * Finds the item a navigation key moves to; Up and Down wrap around the ends.
 * @param key Pressed key.
 * @param index Index of the focused item, or -1.
 * @param count Number of items.
 * @returns Index of the item to focus, or null when the key doesn't move between items.
 */
function keyTarget(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowDown':
      return (index + 1) % count
    case 'ArrowUp':
      return (index - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

export function Menu({ label, trigger, align = 'end', children }: MenuProps) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLDivElement>(null)

  /** Closes the menu and puts the focus back on the trigger. */
  const close = () => {
    setOpen(false)
    button.current?.focus()
  }

  /** Moves the focus between items with the keyboard; Escape closes the menu. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    const items = [...(popover.current?.querySelectorAll<HTMLElement>(ITEMS_SELECTOR) ?? [])]
    const target = keyTarget(event.key, items.indexOf(document.activeElement as HTMLElement), items.length)
    if (target !== null) {
      event.preventDefault()
      items[target].focus()
    }
  }

  // Move the focus to the first item when the menu opens.
  useEffect(() => {
    if (open) {
      popover.current?.querySelector<HTMLElement>(ITEMS_SELECTOR)?.focus()
    }
  }, [open])

  // A press anywhere outside the menu closes it.
  useEffect(() => {
    if (!open) {
      return
    }
    const closeOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])

  return (
    <div ref={root} className="relative inline-block h-fit">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-pill border py-1 pr-2.5 pl-1 text-text outline-none transition-[background-color,border-color,box-shadow] hover:border-accent hover:bg-accent-soft focus-visible:shadow-ring ${
          open ? 'border-accent bg-accent-soft' : 'border-hairline-soft'
        }`}
        onClick={() => setOpen((shown) => !shown)}
      >
        {trigger}
        <Icon icon={chevronIcon} size={12} className={`text-text-muted transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>
      {open && (
        <div
          ref={popover}
          id={menuId}
          role="menu"
          aria-label={label}
          className={`absolute top-full z-30 mt-1 grid w-[min(calc(var(--spacing)*72.5),calc(100vw-var(--spacing)*16))] gap-0.5 rounded-panel border border-hairline-soft bg-panel bg-(image:--sheen) p-2 shadow-pop ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
          onKeyDown={onKeyDown}
        >
          <MenuContext.Provider value={{ close }}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  )
}

export function MenuHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-1 grid border-b border-hairline-soft px-2 pt-2 pb-3">
      <b className="font-mono text-sm font-medium">{title}</b>
      {subtitle && <small className="text-xs text-text-muted">{subtitle}</small>}
    </div>
  )
}

export function MenuItem({ onSelect, description, icon, children }: MenuItemProps) {
  const menu = useMenu()
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={MENU_ITEM_CLASSES}
      onClick={() => {
        onSelect()
        menu?.close()
      }}
    >
      <span className="grid">
        {children}
        {description && <small className="text-xs leading-snug text-text-muted">{description}</small>}
      </span>
      {icon && <Icon icon={icon} size={18} className="shrink-0 text-accent" />}
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mx-2 mt-2 mb-0.5 font-display text-xs font-semibold uppercase tracking-display text-text-muted">{children}</p>
  )
}
