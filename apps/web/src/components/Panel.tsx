import type { HTMLAttributes, ReactNode } from 'react'
import { divider, panel } from './Panel.styles.ts'
import { PanelContext, useInPanel } from './panelContext.ts'

// The surfaces the Dashboard nests several levels deep. Every panel pads its content, so a nested panel
// always sits inside its parent's padding and the two borders never touch or double up. A nested panel
// takes the smaller tile radius, to follow the curve of the corner around it, and leaves the top sheen to
// the outer panel, so the highlight isn't stacked.

type DividerProps = Omit<HTMLAttributes<HTMLHRElement>, 'children'>
type PanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Raised fill (panel-raised), for a surface that stands out from the one around it. */
  raised?: boolean
  /** Top-down highlight; on by default for outer panels and off for nested ones. */
  sheen?: boolean
  children: ReactNode
}

export function Panel({ raised = false, sheen, className, children, ...rest }: PanelProps) {
  const nested = useInPanel()
  const { classes, ids } = panel({ nested, raised, sheen: sheen ?? !nested })
  return (
    <div className={classes.base({ class: className })} data-testid={ids.base} {...rest}>
      <PanelContext.Provider value={true}>{children}</PanelContext.Provider>
    </div>
  )
}

export function Divider({ className, ...rest }: DividerProps) {
  const { classes, ids } = divider()
  return <hr className={classes.base({ class: className })} data-testid={ids.base} {...rest} />
}
