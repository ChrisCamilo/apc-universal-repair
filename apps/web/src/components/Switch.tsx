import type { ReactNode } from 'react'
import { MENU_ITEM_CLASSES, useMenu } from './menuContext.ts'

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
  if (menu) {
    return (
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        tabIndex={-1}
        disabled={disabled}
        className={MENU_ITEM_CLASSES}
        onClick={() => onCheckedChange(!checked)}
      >
        <span className="grid">
          {children}
          {description && <small className="text-xs leading-snug text-text-muted">{description}</small>}
        </span>
        <Track on={checked} />
      </button>
    )
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="inline-flex cursor-pointer items-center gap-2 rounded-pill font-body text-sm text-text outline-none focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => onCheckedChange(!checked)}
    >
      {children}
      <Track on={checked} />
    </button>
  )
}

function Track({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-testid="switch-track"
      className={`relative h-5 w-8.5 shrink-0 rounded-pill border transition-[background-color,border-color] ${
        on ? 'border-accent bg-accent-soft' : 'border-hairline bg-panel-raised'
      }`}
    >
      <span
        data-testid="switch-knob"
        className={`absolute top-0.5 left-0.5 size-3.5 rounded-pill transition-[translate,background-color] ${
          on ? 'translate-x-3.5 bg-accent shadow-glow' : 'bg-text-muted'
        }`}
      />
    </span>
  )
}
