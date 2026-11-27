import type { ReactNode } from 'react'
import { bottomBar } from './DashboardLayout.styles.ts'

// An entry of the Dashboard's bottom bar on a phone that isn't a tab, such as Alertas or Conta: a button with its
// picture in the pill over its label, the same as the tabs beside it (see DashboardLayout.styles.ts). It opens what it
// names; its owner holds what opens.

type BottomBarItemProps = {
  /** The label under the pill, e.g. "Alertas". */
  label: string
  /** The accessible name, when the label alone doesn't say enough, e.g. "Alertas, 2 não lidas". */
  name?: string
  /** Whether what it opens (a sheet or a full screen) is open, for screen readers. */
  expanded: boolean
  onClick: () => void
  /** The picture in the pill, e.g. the bell with its badge. */
  children: ReactNode
  /** Names the item for a tutorial to point at. */
  'data-tour'?: string
}

export function BottomBarItem({ label, name, expanded, onClick, children, 'data-tour': tour }: BottomBarItemProps) {
  const { classes, ids } = bottomBar()
  return (
    <button
      type="button"
      aria-label={name}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      className={classes.item()}
      data-testid={ids.item}
      data-tour={tour}
      onClick={onClick}
    >
      <span className={classes.pill()} data-testid={ids.pill}>
        {children}
      </span>
      <span className={classes.label()} data-testid={ids.label}>
        {label}
      </span>
    </button>
  )
}
