import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { ICON_SIZES, ICONS, moreIcon } from '@apc/shared/icons'
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS, initialTab, orderTabs, TAB_ORDER_STORAGE_KEY } from '@apc/shared/tabs'
import { AppFrame } from '../components/AppFrame.tsx'
import { HEADER_MARK_SIZE } from '../components/AppFrame.styles.ts'
import { BrandMark } from '../components/BrandMark.tsx'
import { Icon } from '../components/Icon.tsx'
import { TabPanel, Tabs } from '../components/Tabs.tsx'
import { usePhone } from '../components/usePhone.ts'
import { WorkInProgress } from '../components/WorkInProgress.tsx'
import { readStored, writeStored } from '../storage.ts'
import { bottomBar, phoneDashboard } from './DashboardLayout.styles.ts'
import { InventoryTutorialContext, useInventoryTutorialChoice } from './inventoryTutorialContext.ts'
import { MoreActionsContext } from './moreActionsContext.ts'
import { PageSizeContext, usePageSizeChoice } from './pageSizeContext.ts'
import { TabReorderContext, useReorderChoice } from './tabReorderContext.ts'

// The Dashboard in the app frame: the tab bar in the header, the user menu slot at its end, and the open tab's
// panel below. Each tab is a route (/inventory…); the tab bar follows the route and remembers it, so the
// Dashboard reopens on the last tab used. While "Arrastar para reordenar" is on in the user menu, the tabs can be
// dragged (or moved with Alt + arrows) into a new order, which is saved and comes back on reload, with tabs added
// later at its end; the open tab stays open. The Dashboard also holds "Itens por página", which the user menu sets
// and the Inventory tab follows, and the Inventory tutorial's state, which the
// Inventory tab runs (by itself the first time) and the user menu replays. A tab still being built (`wip` in
// DASHBOARD_TABS) opens blurred behind a notice saying it isn't ready yet.
// On a phone (below `card:`) the header gives way to the phone layout (see DashboardLayout.styles.ts): the open tab's
// header, with the APC mark and the tab's name as the page's heading, over its content, and a bar fixed at the bottom
// of the screen with the tabs in their saved order, then the user menu slot, whose menus show there as Alertas and
// Conta (see NotificationsMenu and UserMenu). The open tab may put a "⋯" at the right of its name, which opens what the
// tab hands over (see moreActionsContext.ts), such as the Inventory's other actions.

const TAB_IDS = DASHBOARD_TABS.map((tab) => tab.id)
// Each tab as the tab bar draws it, by id.
const TABS = Object.fromEntries(DASHBOARD_TABS.map(({ id, label, icon, wip }) => [id, { id, label, icon: ICONS[icon], wip }]))

type DashboardLayoutProps = {
  /** The user menu, at the right of the header, or at the end of the bottom bar on a phone. */
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
  const pageSize = usePageSizeChoice()
  const tutorial = useInventoryTutorialChoice()
  const [order, setOrder] = useState(() => orderTabs(TAB_IDS, readStored(TAB_ORDER_STORAGE_KEY)))
  const phone = usePhone()
  // What the header's "⋯" opens, as the open tab hands it over; none without a "⋯".
  const [more, setMore] = useState<(() => void) | null>(null)
  const handMore = useCallback((open: (() => void) | null) => setMore(() => open), [])

  // Remember the open tab, so "/" reopens it next time.
  useEffect(() => {
    if (tab) {
      writeStored(DASHBOARD_TAB_STORAGE_KEY, tab)
    }
  }, [tab])

  if (!tab) {
    return <Navigate to={`/${initialTab(TAB_IDS, readStored(DASHBOARD_TAB_STORAGE_KEY))}`} replace />
  }

  const tabs = (
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
      variant={phone ? 'bar' : 'line'}
    />
  )
  const panel = (
    <TabPanel id={tab} selected={tab}>
      {TABS[tab].wip ? (
        <WorkInProgress label={TABS[tab].label}>
          <Outlet />
        </WorkInProgress>
      ) : (
        <Outlet />
      )}
    </TabPanel>
  )

  return (
    <TabReorderContext.Provider value={reorder}>
      <PageSizeContext.Provider value={pageSize}>
        <InventoryTutorialContext.Provider value={tutorial}>
          <MoreActionsContext.Provider value={handMore}>
            {phone ? (
              <PhoneDashboard title={TABS[tab].label} tabs={tabs} end={userMenu} more={more}>
                {panel}
              </PhoneDashboard>
            ) : (
              <AppFrame navLabel="Seções do Dashboard" nav={tabs} end={userMenu}>
                {panel}
              </AppFrame>
            )}
          </MoreActionsContext.Provider>
        </InventoryTutorialContext.Provider>
      </PageSizeContext.Provider>
    </TabReorderContext.Provider>
  )
}

type PhoneDashboardProps = {
  /** The open tab's name, the page's heading. */
  title: string
  /** The tabs, drawn as the bar. */
  tabs: ReactNode
  /** At the end of the bar, e.g. Alertas and Conta. */
  end?: ReactNode
  /** What the "⋯" at the right of the header opens; no "⋯" without it. */
  more: (() => void) | null
  /** The open tab's panel. */
  children: ReactNode
}

/** The Dashboard on a phone: the open tab's header and content, and the bottom bar. */
function PhoneDashboard({ title, tabs, end, more, children }: PhoneDashboardProps) {
  const { classes, ids } = phoneDashboard()
  const bar = bottomBar()
  return (
    <div className={classes.base()} data-testid={ids.base}>
      <header className={classes.header()} data-testid={ids.header}>
        <BrandMark variant="compact" size={HEADER_MARK_SIZE} aria-hidden />
        <h1 className={classes.title()} data-testid={ids.title}>
          {title}
        </h1>
        {more && (
          <button type="button" aria-label="Mais ações" aria-haspopup="dialog" className={classes.more()} data-testid={ids.more} onClick={more}>
            <Icon icon={moreIcon} size={ICON_SIZES.fab} />
          </button>
        )}
      </header>
      <main className={classes.main()} data-testid={ids.main}>
        {children}
      </main>
      <nav aria-label="Seções do Dashboard" className={bar.classes.base()} data-testid={bar.ids.base}>
        {tabs}
        {end}
      </nav>
    </div>
  )
}
