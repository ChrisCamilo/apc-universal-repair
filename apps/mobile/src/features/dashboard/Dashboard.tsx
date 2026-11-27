import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { InventoryLink } from '@apc/domain/catalog';
import { ICON_SIZES, ICONS, moreIcon } from '@apc/tokens/icons';
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS, orderTabs, TAB_ORDER_STORAGE_KEY } from '@apc/ui-spec/tabs';
import { BackButton } from '../../components/BackButton';
import { BrandMark } from '../../components/BrandMark';
import { Icon } from '../../components/Icon';
import { Tabs, useStoredTab } from '../../components/Tabs';
import { save, themeStorage, useTheme } from '../../app/theme';
import { WorkInProgress } from '../../components/WorkInProgress';
import { CatalogTab } from '../catalog/CatalogTab';
import { MARK_SIZE, useBarStyles, useStyles } from './Dashboard.styles';
import { InventoryTab } from '../inventory/InventoryTab';
import { TutorialsContext, useTutorialsChoice } from './tutorialsContext';
import { syncBadge } from '../sync/syncStatus';
import { InventoryCopyProvider, useInventoryCopy } from '../sync/useInventoryCopy';
import { InventoryLinkContext, type InventoryLinks } from './inventoryLinkContext';
import { MoreActionsContext } from './moreActionsContext';
import { PhoneHeaderContext, type PhoneHeader } from './phoneHeaderContext';
import { TabReorderContext, useReorderChoice } from './tabReorderContext';
import { COMMON_TEXTS, DASHBOARD_TEXTS } from '@apc/domain/app-texts';
import { perLocale } from '@apc/domain/locale';
import { TUTORIALS } from '@apc/domain/tutorials';
import { useLocale } from '../../app/locale';
import { tourTarget } from '../../components/Tour';
import { ExplanationTour } from './ExplanationTour';

// The frame of the Dashboard, the same as the web's on a phone: the open tab's header, with the APC mark and the tab's
// name as the screen's heading, the tab's content under it, scrolling its own content, and a bar at the bottom of the
// screen with the tabs in their saved order, then the user menu slot, whose menus show there as Alertas and Conta (see
// NotificationsMenu and UserMenu). The app reopens on the last tab used. While "Arrastar para reordenar" is on in the
// user menu, the bar's tabs can be picked up with a long press (or moved with the screen reader's actions) into a new
// order, which is saved and comes back, with tabs added later at its end;
// the open tab stays open. The Dashboard also holds the tutorials' state: a tutorial the user menu's Tutoriais starts
// opens its tab, which runs it, as the Inventory tab runs its tour by itself on the user's first login, whatever the
// device (see tutorialsContext.ts); an explanation the Dashboard runs itself, over its tab if it has one (see
// ExplanationTour.tsx). A tab still being built (`wip` in
// DASHBOARD_TABS) opens behind a notice saying it isn't ready yet. The open tab may put a "⋯" at the right of its name,
// which opens what the tab hands over (see moreActionsContext.ts), such as the Inventory's other actions. A tab gone a
// screen deeper, such as the Catalog's models of a brand, puts that screen's title there, with a ← in place of the mark
// (see phoneHeaderContext.ts). A tab can open the Inventory on what it shows, such as a part the Catalog lists, which
// the Dashboard holds until the Inventory takes it (see inventoryLinkContext.ts). The Dashboard also holds the phone's
// copy of the inventory (see useInventoryCopy.tsx), which the tabs and the user menu read and which keeps syncing
// whatever tab is open; the header says, under the tab's name, while a sync runs, while the server can't be reached or
// the phone lacks the local network access, and how many changes wait to be sent (see syncStatus.ts).

const TAB_IDS = DASHBOARD_TABS.map((tab) => tab.id);
// Each tab as the tab bar draws it, by id.
const TABS = perLocale((locale) =>
  Object.fromEntries(DASHBOARD_TABS.map(({ id, label, icon, wip }) => [id, { id, label: (DASHBOARD_TEXTS[locale].tabs as Record<string, string>)[id] ?? label, icon: ICONS[icon], wip }])),
);

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
  const { locale } = useLocale();
  const texts = DASHBOARD_TEXTS[locale];
  const common = COMMON_TEXTS[locale];
  const tabsOf = TABS[locale];
  const { styles, ids } = useStyles();
  const bar = useBarStyles();
  const [tab, setTab] = useStoredTab(DASHBOARD_TAB_STORAGE_KEY, TAB_IDS);
  const reorder = useReorderChoice();
  const tutorials = useTutorialsChoice(tutorialSeen, onTutorialSeen);
  const [order, setOrder] = useState<string[] | null>(null);
  const { colors } = useTheme();
  // What the header's "⋯" opens, as the open tab hands it over; none without a "⋯".
  const [more, setMore] = useState<(() => void) | null>(null);
  const handMore = useCallback((open: (() => void) | null) => setMore(() => open), []);
  // The title row of the open tab's deeper screen; the tab's name under the mark without it.
  const [header, setHeader] = useState<PhoneHeader | null>(null);
  // What another tab asked the Inventory to show, until the Inventory takes it.
  const [link, setLink] = useState<InventoryLink | null>(null);
  const takeLink = useCallback(() => setLink(null), []);

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

  const links: InventoryLinks = {
    link,
    open: (next) => {
      setLink(next);
      setTab('inventory');
    },
    taken: takeLink,
  };

  return (
    <InventoryCopyProvider>
      <TabReorderContext.Provider value={reorder}>
        <TutorialsContext.Provider
          value={{
            ...tutorials,
            // A tutorial runs on its feature's tab, if it has one.
            start: (id, onward) => {
              const opens = TUTORIALS.find((tutorial) => tutorial.id === id)!.tab;
              if (opens) {
                setTab(opens);
              }
              tutorials.start(id, onward);
            },
          }}
        >
          <MoreActionsContext.Provider value={handMore}>
            <PhoneHeaderContext.Provider value={setHeader}>
              <InventoryLinkContext.Provider value={links}>
                <View style={styles.page} testID={ids.page}>
                  <View style={[styles.header, header && styles.headerBack]} testID={ids.header}>
                    {header ? (
                      <BackButton label={header.back.label} onPress={header.back.onPress} />
                    ) : (
                      // The heading names the screen, so screen readers skip the mark.
                      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.mark} testID={ids.mark}>
                        <BrandMark variant="compact" size={MARK_SIZE} />
                      </View>
                    )}
                    <View style={styles.heading} testID={ids.heading}>
                      <Text accessibilityRole="header" numberOfLines={1} style={styles.title} testID={ids.title}>
                        {header?.title ?? tabsOf[tab].label}
                      </Text>
                      <SyncBadge />
                    </View>
                    {more && (
                      <Pressable
                        ref={tourTarget('more-actions')}
                        accessibilityRole="button"
                        accessibilityLabel={common.moreActions}
                        onPress={more}
                        style={({ pressed }) => [styles.more, pressed && styles.morePressed]}
                        testID={ids.more}
                      >
                        {({ pressed }) => <Icon icon={moreIcon} size={ICON_SIZES.fab} color={pressed ? colors.accent : colors.text} />}
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.content} testID={ids.content}>
                    {tabsOf[tab].wip ? <WorkInProgress label={tabsOf[tab].label}>{screens[tab]}</WorkInProgress> : screens[tab]}
                  </View>
                  <View style={bar.styles.bar} testID={bar.ids.bar}>
                    <Tabs
                      label={texts.sections}
                      tabs={order.map((id) => tabsOf[id])}
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
                <ExplanationTour id={tutorials.explaining} onClose={tutorials.explained} />
              </InventoryLinkContext.Provider>
            </PhoneHeaderContext.Provider>
          </MoreActionsContext.Provider>
        </TutorialsContext.Provider>
      </TabReorderContext.Provider>
    </InventoryCopyProvider>
  );
}

/** The copy's sync status under the tab's name, while one is worth saying. */
function SyncBadge() {
  const { styles, ids } = useStyles();
  const status = syncBadge(useInventoryCopy(), useLocale().locale);
  if (!status) {
    return null;
  }
  return (
    <View accessibilityLiveRegion="polite" style={styles.sync} testID={ids.sync}>
      <Text numberOfLines={1} style={styles.syncText} testID={ids.syncText}>
        {status}
      </Text>
    </View>
  );
}
