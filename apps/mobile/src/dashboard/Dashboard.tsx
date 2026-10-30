import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ICONS } from '@apc/shared/icons';
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS, orderTabs, TAB_ORDER_STORAGE_KEY } from '@apc/shared/tabs';
import { BrandMark } from '../BrandMark';
import { Tabs, useStoredTab } from '../Tabs';
import { save, themeStorage } from '../theme';
import { WorkInProgress } from '../WorkInProgress';
import { CatalogTab } from './CatalogTab';
import { MARK_SIZE, useBarStyles, useStyles } from './Dashboard.styles';
import { InventoryTab } from './InventoryTab';
import { InventoryTutorialContext, useInventoryTutorialChoice } from './inventoryTutorialContext';
import { PageSizeContext, usePageSizeChoice } from './pageSizeContext';
import { TabReorderContext, useReorderChoice } from './tabReorderContext';

// The frame of the Dashboard, the same as the web's on a phone: the open tab's header, with the APC mark and the tab's
// name as the screen's heading, the tab's content under it, scrolling its own content, and a bar at the bottom of the
// screen with the tabs in their saved order, then the user menu slot, whose menus show there as Alertas and Conta (see
// NotificationsMenu and UserMenu). The app reopens on the last tab used. While "Arrastar para reordenar" is on in the
// user menu, the bar's tabs can be picked up with a long press (or moved with the screen reader's actions) into a new
// order, which is saved and comes back, with tabs added later at its end;
// the open tab stays open. The Dashboard also holds "Itens por página", which the user menu sets and the Inventory
// tab follows, and the Inventory tutorial's state, which the Inventory tab runs (by
// itself on the user's first login, whatever the device) and the user menu replays, on the Inventory tab. A tab still being built (`wip` in
// DASHBOARD_TABS) opens behind a notice saying it isn't ready yet.

const TAB_IDS = DASHBOARD_TABS.map((tab) => tab.id);
// Each tab as the tab bar draws it, by id.
const TABS = Object.fromEntries(DASHBOARD_TABS.map(({ id, label, icon, wip }) => [id, { id, label, icon: ICONS[icon], wip }]));

type DashboardProps = {
  /** The user menu, at the end of the bottom bar: Alertas and Conta. */
  userMenu?: ReactNode;
  /** Whether the logged user has seen the Inventory tutorial; until then it runs by itself. Seen when left out. */
  tutorialSeen?: boolean;
  /** The logged user's id, whose low-stock warnings the Inventory keeps. */
  userId?: string;
  /** Marks the Inventory tutorial seen on the logged user, once it starts by itself. */
  onTutorialSeen?: () => void;
};

export function Dashboard({ userMenu, tutorialSeen = true, onTutorialSeen = () => {}, userId }: DashboardProps) {
  const screens: Record<string, ReactNode> = { inventory: <InventoryTab userId={userId} />, catalog: <CatalogTab /> };
  const { styles, ids } = useStyles();
  const bar = useBarStyles();
  const [tab, setTab] = useStoredTab(DASHBOARD_TAB_STORAGE_KEY, TAB_IDS);
  const reorder = useReorderChoice();
  const pageSize = usePageSizeChoice();
  const tutorial = useInventoryTutorialChoice(tutorialSeen, onTutorialSeen);
  const [order, setOrder] = useState<string[] | null>(null);

  // Read the saved tab order.
  useEffect(() => {
    let live = true;
    themeStorage
      .getItem(TAB_ORDER_STORAGE_KEY)
      .catch(() => null)
      .then((saved) => live && setOrder((current) => current ?? orderTabs(TAB_IDS, saved)));
    return () => {
      live = false;
    };
  }, []);

  // Render nothing until the saved tab and order are read, so the first frame already shows them.
  if (!tab || !order) {
    return null;
  }

  return (
    <TabReorderContext.Provider value={reorder}>
      <PageSizeContext.Provider value={pageSize}>
        <InventoryTutorialContext.Provider
          value={{
            ...tutorial,
            // A replay from the user menu happens on the Inventory tab.
            replay: () => {
              setTab('inventory');
              tutorial.replay();
            },
          }}
        >
          <View style={styles.page} testID={ids.page}>
            <View style={styles.header} testID={ids.header}>
              {/* The heading names the screen, so screen readers skip the mark. */}
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.mark} testID={ids.mark}>
                <BrandMark variant="compact" size={MARK_SIZE} />
              </View>
              <Text accessibilityRole="header" numberOfLines={1} style={styles.title} testID={ids.title}>
                {TABS[tab].label}
              </Text>
            </View>
            <View style={styles.content} testID={ids.content}>
              {TABS[tab].wip ? <WorkInProgress label={TABS[tab].label}>{screens[tab]}</WorkInProgress> : screens[tab]}
            </View>
            <View style={bar.styles.bar} testID={bar.ids.bar}>
              <Tabs
                label="Seções do Dashboard"
                tabs={order.map((id) => TABS[id])}
                selected={tab}
                onSelect={setTab}
                reorderable={reorder.reorderable}
                onReorder={(next) => {
                  setOrder(next);
                  save(TAB_ORDER_STORAGE_KEY, JSON.stringify(next));
                }}
                variant="bar"
              />
              {userMenu}
            </View>
          </View>
        </InventoryTutorialContext.Provider>
      </PageSizeContext.Provider>
    </TabReorderContext.Provider>
  );
}
