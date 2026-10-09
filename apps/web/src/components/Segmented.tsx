import { useId, useRef, type KeyboardEvent } from 'react'
import { useMenu } from './menuContext.ts'
import { arrowTarget } from './radioKeys.ts'
import { segmented } from './Segmented.styles.ts'

// A compact single choice, e.g. the theme. The chosen option fills with the accent, glowing where the style
// has a glow. On its own it is a radio group: one Tab stop on the chosen option, and the arrows move the
// choice. Inside a Menu it becomes a labeled row of menuitemradio items that the menu's arrows reach, and
// choosing one keeps the menu open.

type SegmentedProps = {
  /** Accessible name of the group; inside a menu it is also the row's visible label. */
  label: string
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  /** Short explanation under the label, inside a menu. */
  description?: string
}

export function Segmented({ label, options, value, onValueChange, description }: SegmentedProps) {
  const menu = useMenu()
  const id = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const { classes, ids } = segmented({ inMenu: menu !== null })

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
      className={classes.base()}
      data-testid={ids.base}
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
            className={classes.option({ on })}
            data-testid={ids.option}
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
    <div className={classes.row()} data-testid={ids.row}>
      <span className={classes.text()} data-testid={ids.text}>
        <span id={`${id}-label`}>{label}</span>
        {description && (
          <small id={`${id}-note`} className={classes.description()} data-testid={ids.description}>
            {description}
          </small>
        )}
      </span>
      {group}
    </div>
  )
}
