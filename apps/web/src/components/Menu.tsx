import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { chevronIcon, ICON_SIZES, type IconShape } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'
import { menu as menuRecipe, menuHeader, menuItem, menuLabel, userBadge } from './Menu.styles.ts'
import { MenuContext, useMenu } from './menuContext.ts'

// A dropdown menu, such as the Dashboard's user menu: a trigger button and a popover anchored under it.
// Up/Down (and Home/End) move between the items; checkbox and radio items (Switch, Segmented) keep the menu
// open when chosen, and only plain action items (MenuItem) close it. A click outside, Escape or the trigger
// closes the menu and puts the focus back on the trigger. UserBadge is the user menu's trigger content: the
// initials on the accent, then the username, which phones leave out to save room.

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
  const { classes, ids } = menuRecipe({ align, open })

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
    <div ref={root} className={classes.base()} data-testid={ids.base}>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={classes.trigger()}
        data-testid={ids.trigger}
        onClick={() => setOpen((shown) => !shown)}
      >
        {trigger}
        <Icon icon={chevronIcon} size={ICON_SIZES.caret} className={classes.chevron()} />
      </button>
      {open && (
        <div
          ref={popover}
          id={menuId}
          role="menu"
          aria-label={label}
          className={classes.popover()}
          data-testid={ids.popover}
          onKeyDown={onKeyDown}
        >
          <MenuContext.Provider value={{ close }}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  )
}

export function MenuHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { classes, ids } = menuHeader()
  return (
    <div className={classes.base()} data-testid={ids.base}>
      <b className={classes.title()} data-testid={ids.title}>
        {title}
      </b>
      {subtitle && (
        <small className={classes.subtitle()} data-testid={ids.subtitle}>
          {subtitle}
        </small>
      )}
    </div>
  )
}

export function MenuItem({ onSelect, description, icon, children }: MenuItemProps) {
  const menu = useMenu()
  const { classes, ids } = menuItem()
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={classes.base()}
      data-testid={ids.base}
      onClick={() => {
        onSelect()
        menu?.close()
      }}
    >
      <span className={classes.text()} data-testid={ids.text}>
        {children}
        {description && (
          <small className={classes.description()} data-testid={ids.description}>
            {description}
          </small>
        )}
      </span>
      {icon && <Icon icon={icon} size={ICON_SIZES.prominent} className={classes.icon()} />}
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  const { classes, ids } = menuLabel()
  return (
    <p className={classes.base()} data-testid={ids.base}>
      {children}
    </p>
  )
}

export function UserBadge({ initials, name }: { initials: string; name: string }) {
  const { classes, ids } = userBadge()
  return (
    <>
      <span aria-hidden="true" className={classes.initials()} data-testid={ids.initials}>
        {initials}
      </span>
      <span className={classes.name()} data-testid={ids.name}>
        {name}
      </span>
    </>
  )
}
