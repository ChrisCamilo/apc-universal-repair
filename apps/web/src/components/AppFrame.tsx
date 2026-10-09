import type { ReactNode } from 'react'
import { appFrame, HEADER_MARK_SIZE } from './AppFrame.styles.ts'
import { BrandMark } from './BrandMark.tsx'

// The frame of the app's screens, such as the Dashboard: a header with the APC mark, the navigation (the
// Dashboard's Tabs) and a slot at the end for the user menu, over one soft hairline that the selected tab's
// underline sits on, and below it the content. The header stays pinned to the top on desktop and scrolls with the
// page below the card breakpoint (TABLE_CARD_BREAKPOINT), where its controls wrap into several lines. The
// navigation scrolls sideways when the tabs don't fit, and the content clips only horizontally, so menus and
// dropdowns can still drop below it.

type AppFrameProps = {
  /** Accessible name of the navigation, e.g. "Seções do Dashboard". */
  navLabel: string
  /** The navigation, e.g. the Tabs. */
  nav: ReactNode
  /** At the end of the header, e.g. the user menu. */
  end?: ReactNode
  /** The content under the header, e.g. the open tab's panel. */
  children: ReactNode
}

export function AppFrame({ navLabel, nav, end, children }: AppFrameProps) {
  const { classes, ids } = appFrame()
  return (
    <div className={classes.base()} data-testid={ids.base}>
      <header className={classes.header()} data-testid={ids.header}>
        <div className={classes.bar()} data-testid={ids.bar}>
          <h1 className={classes.brand()} data-testid={ids.brand}>
            <BrandMark variant="compact" size={HEADER_MARK_SIZE} />
          </h1>
          <nav aria-label={navLabel} className={classes.nav()} data-testid={ids.nav}>
            {nav}
          </nav>
          {end && (
            <div className={classes.end()} data-testid={ids.end}>
              {end}
            </div>
          )}
        </div>
      </header>
      <main className={classes.main()} data-testid={ids.main}>
        {children}
      </main>
    </div>
  )
}
