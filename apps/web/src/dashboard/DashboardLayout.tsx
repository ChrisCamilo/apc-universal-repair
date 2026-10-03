import { useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { ICONS } from '@apc/shared/icons'
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS, initialTab } from '@apc/shared/tabs'
import { BrandMark } from '../components/BrandMark.tsx'
import { TabPanel, Tabs } from '../components/Tabs.tsx'
import { readStored, writeStored } from '../storage.ts'

// The frame of the Dashboard: a header with the APC mark, the tab bar and the user menu slot, and below it
// the content area the open tab renders into. Each tab is a route (/inventory…); the tab bar follows the
// route and remembers it, so the Dashboard reopens on the last tab used. The header stays pinned to the top
// on desktop and scrolls with the page below 720px, where its controls wrap into several lines. The tab bar
// scrolls sideways when the tabs don't fit, and the content frame clips only horizontally, so menus and
// dropdowns can still drop below it.

const TAB_IDS = DASHBOARD_TABS.map((tab) => tab.id)

type DashboardLayoutProps = {
  /** The user menu, at the right of the header (#41). */
  userMenu?: ReactNode
}

/**
 * Reads which tab a path opens.
 * @param pathname Location path, e.g. "/inventory".
 * @returns The tab id, or undefined when the path is not a tab.
 */
function tabOfPath(pathname: string): string | undefined {
  const segment = pathname.split('/')[1]
  return TAB_IDS.includes(segment) ? segment : undefined
}

export function DashboardLayout({ userMenu }: DashboardLayoutProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const tab = tabOfPath(pathname)

  // Remember the open tab, so "/" reopens it next time.
  useEffect(() => {
    if (tab) {
      writeStored(DASHBOARD_TAB_STORAGE_KEY, tab)
    }
  }, [tab])

  if (!tab) {
    return <Navigate to={`/${initialTab(TAB_IDS, readStored(DASHBOARD_TAB_STORAGE_KEY))}`} replace />
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="z-40 bg-canvas px-4 pt-3 sm:px-6 min-[720px]:sticky min-[720px]:top-0">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-hairline-soft">
          <h1 className="m-0 flex pb-2.5">
            <BrandMark variant="compact" size={32} />
          </h1>
          {/* The scroll box clips both ways, so it reaches 1px down over the header's border, where the selected
              tab's underline sits. */}
          <nav aria-label="Seções do Dashboard" className="-mb-px max-w-full min-w-0 overflow-x-auto overflow-y-hidden pb-px">
            <Tabs
              label="Seções do Dashboard"
              tabs={DASHBOARD_TABS.map(({ id, label, icon }) => ({ id, label, icon: ICONS[icon] }))}
              selected={tab}
              onSelect={(id) => navigate(`/${id}`)}
            />
          </nav>
          {userMenu && <div className="ml-auto pb-2">{userMenu}</div>}
        </div>
      </header>
      <main className="overflow-x-clip px-4 py-3 sm:px-6">
        <TabPanel id={tab} selected={tab}>
          <Outlet />
        </TabPanel>
      </main>
    </div>
  )
}
