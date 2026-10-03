import { useId, useRef, type KeyboardEvent } from 'react'
import { useMenu } from './menuContext.ts'

// A compact single choice, e.g. the theme. The chosen option fills with the accent, glowing where the style
// has a glow. On its own it is a radio group: one Tab stop on the chosen option, and the arrows move the
// choice. Inside a Menu it becomes a labeled row of menuitemradio items that the menu's arrows reach, and
// choosing one keeps the menu open.

const OPTION =
  'cursor-pointer rounded-pill py-1 font-display text-xs font-semibold uppercase tracking-display outline-none ' +
  'transition-[background-color,color,box-shadow] focus-visible:shadow-ring'
// Inside a menu the options pack tighter, so four of them fit the menu's width on one line.
const OPTION_PADDING = { menu: 'px-2', alone: 'px-3' }
const OPTION_STATE = {
  on: 'bg-accent text-on-accent shadow-glow',
  off: 'text-text-muted hover:text-text',
}

type SegmentedProps = {
  /** Accessible name of the group; inside a menu it is also the row's visible label. */
  label: string
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  /** Short explanation under the label, inside a menu. */
  description?: string
}

/**
 * Finds the option an arrow key moves the choice to in a radio group; the arrows wrap around the ends.
 * @param key Pressed key.
 * @param index Index of the chosen option.
 * @param count Number of options.
 * @returns Index of the option to choose, or null when the key doesn't move the choice.
 */
function arrowTarget(key: string, index: number, count: number): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return (index + 1) % count
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return (index - 1 + count) % count
  }
  return null
}

export function Segmented({ label, options, value, onValueChange, description }: SegmentedProps) {
  const menu = useMenu()
  const id = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  /** Moves the choice with the arrows and follows it with the focus, outside a menu. */
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = arrowTarget(event.key, index, options.length)
    if (menu || target === null) {
      return
    }
    event.preventDefault()
    onValueChange(options[target].value)
    buttons.current[target]?.focus()
  }

  const group = (
    <span
      role={menu ? 'group' : 'radiogroup'}
      aria-label={menu ? undefined : label}
      aria-labelledby={menu ? `${id}-label` : undefined}
      aria-describedby={menu && description ? `${id}-note` : undefined}
      className="inline-flex gap-0.5 rounded-pill border border-hairline bg-panel p-0.5"
    >
      {options.map((option, index) => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role={menu ? 'menuitemradio' : 'radio'}
            aria-checked={on}
            tabIndex={menu ? -1 : on ? 0 : -1}
            className={`${OPTION} ${menu ? OPTION_PADDING.menu : OPTION_PADDING.alone} ${on ? OPTION_STATE.on : OPTION_STATE.off}`}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
          </button>
        )
      })}
    </span>
  )

  if (!menu) {
    return group
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-2 py-2 font-body text-sm text-text">
      <span className="grid">
        <span id={`${id}-label`}>{label}</span>
        {description && (
          <small id={`${id}-note`} className="text-xs leading-snug text-text-muted">
            {description}
          </small>
        )}
      </span>
      {group}
    </div>
  )
}
