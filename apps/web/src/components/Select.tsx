import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { selectionSummary, toggleValue } from '@apc/shared/filters'
import { checkIcon, chevronIcon, ICON_SIZES } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'
import { select } from './Select.styles.ts'

// A pick-only dropdown with its own list instead of the native one, so the list looks the same in every
// browser and shows at most SELECT_VISIBLE_OPTIONS options (the rest by scrolling), like the Combobox.
// The button is a select-only combobox (WAI-ARIA): arrows, Home/End, Enter/Space and typing nothing.
// In a multiple choice the list shows checkboxes and stays open while the user picks; the button shows
// the first choice plus a count ("Freios +2"), with the full list in its tooltip, and "All" clears it.

type Option = { value: string; label: string }
type SelectProps = {
  /** Id of the button, for a visible <label htmlFor>. */
  id?: string
  /** Accessible name when there is no visible label. */
  'aria-label'?: string
  options: Option[]
  disabled?: boolean
} & (
  | {
      multiple: true
      /** Label of the option that clears the choice, listed first, e.g. "Todas". */
      allLabel: string
      value: string[]
      onValueChange: (value: string[]) => void
    }
  | { multiple?: false; value: string; onValueChange: (value: string) => void }
)

export function Select(props: SelectProps) {
  const { id, options, disabled } = props
  const autoId = useId()
  const buttonId = id ?? autoId
  const listId = `${buttonId}-list`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const list = useRef<HTMLUListElement>(null)
  // A multiple choice lists "All" first, with the empty value.
  const items: Option[] = props.multiple ? [{ value: '', label: props.allLabel }, ...options] : options
  const chosen = props.multiple ? options.filter((o) => props.value.includes(o.value)).map((o) => o.label) : []
  const { classes, ids } = select({ picked: Boolean(props.multiple && chosen.length), open })
  const shown = props.multiple
    ? selectionSummary(chosen, props.allLabel)
    : (options.find((o) => o.value === props.value)?.label ?? '')

  /** Tells whether an item shows as selected; "All" is selected while nothing else is. */
  const isSelected = (item: Option) =>
    props.multiple ? (item.value ? props.value.includes(item.value) : props.value.length === 0) : item.value === props.value

  /** Highlights an item and scrolls it into view, as the keyboard moves through the list. */
  const highlight = (index: number) => {
    setActive(index)
    list.current?.children[index]?.scrollIntoView({ block: 'nearest' })
  }

  /** Opens the list on the first item (multiple) or the chosen one (single), or closes it. */
  const toggle = (show: boolean) => {
    setOpen(show)
    setActive(show ? (props.multiple ? 0 : Math.max(0, items.findIndex(isSelected))) : -1)
  }

  /** Picks an item: a multiple choice toggles it and stays open, a single choice takes it and closes. */
  const pick = (index: number) => {
    const { value } = items[index]
    if (props.multiple) {
      props.onValueChange(value ? toggleValue(props.value, value, options.map((o) => o.value)) : [])
      return
    }
    props.onValueChange(value)
    toggle(false)
  }

  /** Moves through the list and picks with the keyboard; Escape closes only the list. */
  const onKeyDown = (event: KeyboardEvent) => {
    const { key } = event
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        toggle(true)
      }
      return
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      highlight(Math.min(items.length - 1, Math.max(0, active + (key === 'ArrowDown' ? 1 : -1))))
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault()
      highlight(key === 'Home' ? 0 : items.length - 1)
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      pick(active)
    } else if (key === 'Escape') {
      // Close only the list, not a menu around it.
      event.preventDefault()
      event.stopPropagation()
      toggle(false)
    }
  }

  return (
    <div className={classes.base()} data-testid={ids.base}>
      <button
        id={buttonId}
        type="button"
        role="combobox"
        aria-label={props['aria-label']}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        title={chosen.length > 1 ? chosen.join(', ') : undefined}
        disabled={disabled}
        className={classes.button()}
        data-testid={ids.button}
        onClick={() => toggle(!open)}
        onBlur={() => toggle(false)}
        onKeyDown={onKeyDown}
      >
        <span className={classes.shown()} data-testid={ids.shown}>
          {shown}
        </span>
        <Icon icon={chevronIcon} size={ICON_SIZES.caret} className={classes.chevron()} />
      </button>
      {open && (
        <ul ref={list} id={listId} role="listbox" aria-multiselectable={props.multiple || undefined} className={classes.list()} data-testid={ids.list}>
          {items.map((item, index) => {
            const selected = isSelected(item)
            return (
              <li
                key={item.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                data-active={index === active || undefined}
                className={classes.option()}
                data-testid={ids.option}
                // Keep the focus on the button, so the list stays open and the keyboard keeps working.
                onMouseDown={(event) => {
                  event.preventDefault()
                  pick(index)
                }}
              >
                {props.multiple && (
                  <span
                    aria-hidden="true"
                    className={classes.box({ selected })}
                    data-testid={ids.box}
                  >
                    {selected && <Icon icon={checkIcon} size={ICON_SIZES.mark} />}
                  </span>
                )}
                <span className={classes.text()} data-testid={ids.text}>
                  {item.label}
                </span>
                {!props.multiple && selected && <Icon icon={checkIcon} size={ICON_SIZES.caret} className={classes.check()} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
