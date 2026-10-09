import type { ReactNode } from 'react'
import { useMenu } from './menuContext.ts'
import { switchControl } from './Switch.styles.ts'

// An on/off control: a pill track whose knob slides over to the accent when on, glowing where the style has
// a glow. On its own it is a switch (role="switch"); inside a Menu it becomes a full-width menuitemcheckbox
// with a description, and choosing it keeps the menu open. Both say whether it is on with aria-checked.

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Visible label, which is also the accessible name. */
  children: ReactNode
  /** Short explanation under the label, inside a menu. */
  description?: string
  disabled?: boolean
}

export function Switch({ checked, onCheckedChange, children, description, disabled }: SwitchProps) {
  const menu = useMenu()
  const { classes, ids } = switchControl({ on: checked })
  const track = (
    <span aria-hidden="true" className={classes.track()} data-testid={ids.track}>
      <span className={classes.knob()} data-testid={ids.knob} />
    </span>
  )

  if (menu) {
    return (
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        tabIndex={-1}
        disabled={disabled}
        className={classes.item()}
        data-testid={ids.item}
        onClick={() => onCheckedChange(!checked)}
      >
        <span className={classes.text()} data-testid={ids.text}>
          {children}
          {description && (
            <small className={classes.description()} data-testid={ids.description}>
              {description}
            </small>
          )}
        </span>
        {track}
      </button>
    )
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={classes.base()}
      data-testid={ids.base}
      onClick={() => onCheckedChange(!checked)}
    >
      {children}
      {track}
    </button>
  )
}
