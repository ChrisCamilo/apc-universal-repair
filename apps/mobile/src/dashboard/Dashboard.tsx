import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { ICONS } from '@apc/shared/icons';
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS, orderTabs, TAB_ORDER_STORAGE_KEY } from '@apc/shared/tabs';
import { scales } from '@apc/shared/theme';
import { BrandMark } from '../BrandMark';
import { softHairline } from '../Panel';
import { Tabs, useStoredTab } from '../Tabs';
import { save, themeStorage, useTheme, type ActiveTheme } from '../theme';
import { CatalogTab } from './CatalogTab';
import { InventoryTab } from './InventoryTab';
import { OpenItemOnRowContext, useOpenItemOnRowChoice } from './openItemOnRowContext';
import { TabReorderContext, useReorderChoice } from './tabReorderContext';

// The frame of the Dashboard, the same as the web: a header with the APC mark, the tab bar and the user menu
// slot, and below it the content of the open tab. The app reopens on the last tab used. On a phone the
// header wraps and scrolls away with the page, and the tab bar scrolls sideways when the tabs don't fit. While
// "Arrastar para reordenar" is on in the user menu, the tabs can be picked up with a long press (or moved with
// the screen reader's actions) into a new order, which is saved and comes back, with tabs added later at its end;
// the open tab stays open. The Dashboard also holds "Abrir item ao clicar na linha", which the user menu switches and
// the Inventory tab's cards follow.

const CONTENT_STYLE: ViewStyle = { paddingHorizontal: scales.space.s4, paddingVertical: scales.space.s3 };
const MARK_STYLE: ViewStyle = { paddingBottom: scales.space.s2 };
const MENU_SLOT_STYLE: ViewStyle = { marginLeft: 'auto', paddingBottom: scales.space.s2 };
const PAGE_STYLE: ViewStyle = { flex: 1 };
// The tab bar's scroll box clips, so it reaches 1dp down over the header's hairline, where the selected tab's
// underline sits.
const TAB_BAR_CONTENT_STYLE: ViewStyle = { paddingBottom: scales.hairline };
const TAB_BAR_STYLE: ViewStyle = { flexGrow: 0, marginBottom: -scales.hairline };
const TAB_IDS = DASHBOARD_TABS.map((tab) => tab.id);
const TAB_SCREENS: Record<string, ReactNode> = { inventory: <InventoryTab />, catalog: <CatalogTab /> };
// Each tab as the tab bar draws it, by id.
const TABS = Object.fromEntries(DASHBOARD_TABS.map(({ id, label, icon }) => [id, { id, label, icon: ICONS[icon] }]));

type DashboardProps = {
  /** The user menu, at the right of the header. */
  userMenu?: ReactNode;
};

/**
 * Styles the header row: the mark, the tab bar and the user menu, wrapping over a soft hairline.
 * @param theme Active theme.
 * @returns Style for the header View.
 */
function headerStyle(theme: ActiveTheme): ViewStyle {
  return {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    columnGap: scales.space.s5,
    rowGap: scales.space.s3,
    marginHorizontal: scales.space.s4,
    paddingTop: scales.space.s3,
    borderBottomWidth: scales.hairline,
    borderBottomColor: softHairline(theme),
  };
}

export function Dashboard({ userMenu }: DashboardProps) {
  const theme = useTheme();
  const [tab, setTab] = useStoredTab(DASHBOARD_TAB_STORAGE_KEY, TAB_IDS);
  const reorder = useReorderChoice();
  const openItemOnRow = useOpenItemOnRowChoice();
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
        <ScrollView style={[PAGE_STYLE, { backgroundColor: theme.colors.canvas }]}>
          <View style={headerStyle(theme)}>
            <View accessibilityRole="header" style={MARK_STYLE}>
              <BrandMark variant="compact" size={32} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={TAB_BAR_STYLE}
              contentContainerStyle={TAB_BAR_CONTENT_STYLE}
              testID="dashboard-tab-bar"
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
            {userMenu && <View style={MENU_SLOT_STYLE}>{userMenu}</View>}
          </View>
          <View style={CONTENT_STYLE}>{TAB_SCREENS[tab]}</View>
        </ScrollView>
      </OpenItemOnRowContext.Provider>
    </TabReorderContext.Provider>
  );
}
