import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { ICONS } from '@apc/shared/icons'
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS, initialTab, orderTabs, TAB_ORDER_STORAGE_KEY } from '@apc/shared/tabs'
import { AppFrame } from '../components/AppFrame.tsx'
import { TabPanel, Tabs } from '../components/Tabs.tsx'
import { readStored, writeStored } from '../storage.ts'
import { TabReorderContext, useReorderChoice } from './tabReorderContext.ts'

// The Dashboard in the app frame: the tab bar in the header, the user menu slot at its end, and the open tab's
// panel below. Each tab is a route (/inventory…); the tab bar follows the route and remembers it, so the
// Dashboard reopens on the last tab used. While "Arrastar para reordenar" is on in the user menu, the tabs can be
// dragged (or moved with Alt + arrows) into a new order, which is saved and comes back on reload, with tabs added
// later at its end; the open tab stays open.

const TAB_IDS = DASHBOARD_TABS.map((tab) => tab.id)
// Each tab as the tab bar draws it, by id.
const TABS = Object.fromEntries(DASHBOARD_TABS.map(({ id, label, icon }) => [id, { id, label, icon: ICONS[icon] }]))

type DashboardLayoutProps = {
  /** The user menu, at the right of the header. */
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
  const reorder = useReorderChoice()
  const [order, setOrder] = useState(() => orderTabs(TAB_IDS, readStored(TAB_ORDER_STORAGE_KEY)))

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
    <TabReorderContext.Provider value={reorder}>
      <AppFrame
        navLabel="Seções do Dashboard"
        nav={
          <Tabs
            label="Seções do Dashboard"
            tabs={order.map((id) => TABS[id])}
            selected={tab}
            onSelect={(id) => navigate(`/${id}`)}
            reorderable={reorder.reorderable}
            onReorder={(ids) => {
              setOrder(ids)
              writeStored(TAB_ORDER_STORAGE_KEY, JSON.stringify(ids))
            }}
          />
        }
        end={userMenu}
      >
        <TabPanel id={tab} selected={tab}>
          <Outlet />
        </TabPanel>
      </AppFrame>
    </TabReorderContext.Provider>
  )
}
