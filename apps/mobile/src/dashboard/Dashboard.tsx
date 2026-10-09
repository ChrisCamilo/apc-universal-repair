import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ICONS } from '@apc/shared/icons';
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS, orderTabs, TAB_ORDER_STORAGE_KEY } from '@apc/shared/tabs';
import { BrandMark } from '../BrandMark';
import { Tabs, useStoredTab } from '../Tabs';
import { save, themeStorage } from '../theme';
import { CatalogTab } from './CatalogTab';
import { MARK_SIZE, useStyles } from './Dashboard.styles';
import { InventoryTab } from './InventoryTab';
import { InventoryTutorialContext, useInventoryTutorialChoice } from './inventoryTutorialContext';
import { OpenItemOnRowContext, useOpenItemOnRowChoice } from './openItemOnRowContext';
import { PageSizeContext, usePageSizeChoice } from './pageSizeContext';
import { TabReorderContext, useReorderChoice } from './tabReorderContext';

// The frame of the Dashboard, the same as the web: a header with the APC mark, the tab bar and the user menu
// slot, and below it the content of the open tab. The app reopens on the last tab used. On a phone the
// header wraps and scrolls away with the page, and the tab bar scrolls sideways when the tabs don't fit. While
// "Arrastar para reordenar" is on in the user menu, the tabs can be picked up with a long press (or moved with
// the screen reader's actions) into a new order, which is saved and comes back, with tabs added later at its end;
// the open tab stays open. The Dashboard also holds "Abrir item ao clicar na linha" and "Itens por página", which the
// user menu sets and the Inventory tab follows, and the Inventory tutorial's state, which the Inventory tab runs (by
// itself the first time) and the user menu replays, on the Inventory tab.

const TAB_IDS = DASHBOARD_TABS.map((tab) => tab.id);
const TAB_SCREENS: Record<string, ReactNode> = { inventory: <InventoryTab />, catalog: <CatalogTab /> };
// Each tab as the tab bar draws it, by id.
const TABS = Object.fromEntries(DASHBOARD_TABS.map(({ id, label, icon }) => [id, { id, label, icon: ICONS[icon] }]));

type DashboardProps = {
  /** The user menu, at the right of the header. */
  userMenu?: ReactNode;
};

export function Dashboard({ userMenu }: DashboardProps) {
  const { styles, ids } = useStyles();
  const [tab, setTab] = useStoredTab(DASHBOARD_TAB_STORAGE_KEY, TAB_IDS);
  const reorder = useReorderChoice();
  const openItemOnRow = useOpenItemOnRowChoice();
  const pageSize = usePageSizeChoice();
  const tutorial = useInventoryTutorialChoice();
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
      <OpenItemOnRowContext.Provider value={openItemOnRow}>
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
            <ScrollView style={styles.page} testID={ids.page}>
              <View style={styles.header} testID={ids.header}>
                <View accessibilityRole="header" style={styles.mark} testID={ids.mark}>
                  <BrandMark variant="compact" size={MARK_SIZE} />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tabBar}
                  contentContainerStyle={styles.tabBarContent}
                  testID={ids.tabBar}
                >
                  <Tabs
                    label="Seções do Dashboard"
                    tabs={order.map((id) => TABS[id])}
                    selected={tab}
                    onSelect={setTab}
                    reorderable={reorder.reorderable}
                    onReorder={(ids) => {
                      setOrder(ids);
                      save(TAB_ORDER_STORAGE_KEY, JSON.stringify(ids));
                    }}
                  />
                </ScrollView>
                {userMenu && (
                  <View style={styles.menu} testID={ids.menu}>
                    {userMenu}
                  </View>
                )}
              </View>
              <View style={styles.content} testID={ids.content}>
                {TAB_SCREENS[tab]}
              </View>
            </ScrollView>
          </InventoryTutorialContext.Provider>
        </PageSizeContext.Provider>
      </OpenItemOnRowContext.Provider>
    </TabReorderContext.Provider>
  );
}
