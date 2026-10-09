import type { ReactNode } from 'react'
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
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="z-40 bg-canvas px-4 pt-3 sm:px-6 card:sticky card:top-0">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-hairline-soft">
          <h1 className="m-0 flex pb-2.5">
            <BrandMark variant="compact" size={32} />
          </h1>
          {/* The scroll box clips both ways, so it reaches 1px down over the header's border, where the selected
              tab's underline sits. */}
          <nav aria-label={navLabel} className="-mb-px max-w-full min-w-0 overflow-x-auto overflow-y-hidden pb-px">
            {nav}
          </nav>
          {end && <div className="ml-auto pb-2">{end}</div>}
        </div>
      </header>
      <main className="overflow-x-clip px-4 py-3 sm:px-6">{children}</main>
    </div>
  )
}
