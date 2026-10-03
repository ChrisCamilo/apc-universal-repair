import type { HTMLAttributes, ReactNode } from 'react'
import { PanelContext, useInPanel } from './panelContext.ts'

// The surfaces the Dashboard nests several levels deep. Every panel pads its content, so a nested panel
// always sits inside its parent's padding and the two borders never touch or double up. A nested panel
// takes the smaller tile radius, to follow the curve of the corner around it, and leaves the top sheen to
// the outer panel, so the highlight isn't stacked.

const PANEL = 'border border-hairline-soft p-3 transition-[background-color,border-color,border-radius]'

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
  const showSheen = sheen ?? !nested
  const classes = [
    PANEL,
    nested ? 'rounded-tile' : 'rounded-panel',
    raised ? 'bg-panel-raised' : 'bg-panel',
    showSheen ? 'bg-(image:--sheen)' : '',
    className,
  ]
  return (
    <div className={classes.filter(Boolean).join(' ')} {...rest}>
      <PanelContext.Provider value={true}>{children}</PanelContext.Provider>
    </div>
  )
}

export function Divider({ className, ...rest }: DividerProps) {
  return <hr className={['mx-1 my-2 h-px border-0 bg-hairline-soft', className].filter(Boolean).join(' ')} {...rest} />
}
