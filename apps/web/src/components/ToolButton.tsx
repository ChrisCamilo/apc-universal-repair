import type { ButtonHTMLAttributes } from 'react'
import { ICON_SIZES, type IconShape } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'
import { toolButton } from './ToolButton.styles.ts'

// A round icon button of a phone's toolbar, such as the Inventory's Filtros and Ordenar, which open a bottom sheet.
// It has no text of its own, so its label names it, and says what is on, e.g. "Filtros, 1 ativo"; while something is
// on it is drawn in the accent, with a dot (see ToolButton.styles.ts).

type ToolButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconShape[]
  /** Accessible name, e.g. "Ordenar, Local (A → Z)". */
  label: string
  /** Whether what it opens is on, e.g. a filter or a sort. */
  active?: boolean
}

export function ToolButton({ icon, label, active = false, ...rest }: ToolButtonProps) {
  const { classes, ids } = toolButton({ active })
  return (
    <button type="button" aria-label={label} aria-haspopup="dialog" className={classes.base()} data-testid={ids.base} {...rest}>
      <Icon icon={icon} size={ICON_SIZES.thumbnail} />
      {active && <span aria-hidden="true" className={classes.dot()} data-testid={ids.dot} />}
    </button>
  )
}
