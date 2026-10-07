import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { ICONS } from '@apc/shared/icons';
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS } from '@apc/shared/tabs';
import { scales } from '@apc/shared/theme';
import { BrandMark } from '../BrandMark';
import { softHairline } from '../Panel';
import { Tabs, useStoredTab } from '../Tabs';
import { useTheme, type ActiveTheme } from '../theme';
import { InventoryTab } from './InventoryTab';

// The frame of the Dashboard, the same as the web: a header with the APC mark, the tab bar and the user menu
// slot, and below it the content of the open tab. The app reopens on the last tab used. On a phone the
// header wraps and scrolls away with the page, and the tab bar scrolls sideways when the tabs don't fit.

const CONTENT_STYLE: ViewStyle = { paddingHorizontal: scales.space.s4, paddingVertical: scales.space.s3 };
const MARK_STYLE: ViewStyle = { paddingBottom: scales.space.s2 };
const MENU_SLOT_STYLE: ViewStyle = { marginLeft: 'auto', paddingBottom: scales.space.s2 };
const PAGE_STYLE: ViewStyle = { flex: 1 };
// The tab bar's scroll box clips, so it reaches 1dp down over the header's hairline, where the selected tab's
// underline sits.
const TAB_BAR_CONTENT_STYLE: ViewStyle = { paddingBottom: scales.hairline };
const TAB_BAR_STYLE: ViewStyle = { flexGrow: 0, marginBottom: -scales.hairline };
const TAB_IDS = DASHBOARD_TABS.map((tab) => tab.id);
const TAB_SCREENS: Record<string, ReactNode> = { inventory: <InventoryTab /> };

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

  // Render nothing until the saved tab is read, so the first frame is already the right tab.
  if (!tab) {
    return null;
  }

  return (
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
            tabs={DASHBOARD_TABS.map(({ id, label, icon }) => ({ id, label, icon: ICONS[icon] }))}
            selected={tab}
            onSelect={setTab}
          />
        </ScrollView>
        {userMenu && <View style={MENU_SLOT_STYLE}>{userMenu}</View>}
      </View>
      <View style={CONTENT_STYLE}>{TAB_SCREENS[tab]}</View>
    </ScrollView>
  );
}
