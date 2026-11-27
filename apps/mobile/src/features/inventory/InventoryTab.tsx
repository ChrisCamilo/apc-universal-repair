import { useCallback, useEffect, useEffectEvent, useMemo, useState, type ComponentProps } from 'react';
import { AppState, Pressable, RefreshControl, Text as RNText, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { apiFetch } from '@apc/domain/auth';
import {
  exportIcon,
  filterIcon,
  ICON_SIZES,
  importIcon,
  listIcon,
  playIcon,
  plusIcon,
  sortIcon,
} from '@apc/tokens/icons';
import {
  itemCardCode,
  itemCardDetails,
  ITEM_STATUSES,
  resultSummary,
  STOCK_STATUS_SHORT,
  stockCounts,
  stockTint,
  type Item,
  type ItemBrand,
  type ItemStatus,
} from '@apc/domain/items';
import { activeFilterCount, type FilterValues } from '@apc/ui-spec/filters';
import {
  EMPTY_ITEM_FILTERS,
  FILTER_LABELS,
  followEntryChange,
  ITEM_SORT_OPTIONS,
  itemFilterRows,
  itemListQuery,
  matchingCount,
} from '@apc/domain/item-filters';
import { duplicateForm, EMPTY_ITEM_FORM, itemFormBody, itemFormOptions, type ItemForm } from '@apc/domain/item-form';
import { INVENTORY_TUTORIALS, inventoryTutorialParts, isTestItem, TUTORIAL_CODE, TUTORIAL_ITEM } from '@apc/domain/inventory-tutorial';
import { catalogFrom, type InventoryLink } from '@apc/domain/catalog';
import { SCROLL_PAGE_SIZE, sortValue, type Sort } from '@apc/domain/list-query';
import { copiedPhotos, ITEM_PHOTO_LIMIT } from '@apc/domain/photos';
import { copyNotice } from '@apc/domain/sync-copy';
import { conflictsNotice, INVENTORY_NEEDS_SERVER, waitingNotice } from '@apc/domain/sync-queue';
import { ActionSheet } from '../../components/ActionSheet';
import { apiUrl } from '../../app/api';
import { DataTable, TableThumbnail } from '../../components/DataTable';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { FieldScrollView } from '../../components/FieldScrollView';
import { FilterChipGroup } from '../../components/FilterChip';
import { ClearFilters } from '../../components/FilterMenu';
import { FilterSheet, SortSheet } from '../../components/FilterSheet';
import { Icon } from '../../components/Icon';
import type { UploadPhoto } from '../../components/ImageUpload';
import { ImageViewer } from '../../components/ImageViewer';
import { ConflictsDialog } from '../sync/ConflictsDialog';
import { DeleteItemDialog } from './item/DeleteItemDialog';
import { ExportItemsDialog } from './transfer/ExportItemsDialog';
import { ImportItemsDialog } from './transfer/ImportItemsDialog';
import { ItemFormDialog } from './item/ItemFormDialog';
import { ManageListsDialog } from './lists/ManageListsDialog';
import { enqueue, onRefused } from '../sync/inventoryCopy';
import { pickPhotos } from './photos/photos';
import { photosOperation } from '../sync/queuedPhotos';
import { heldPhotos, keepFullPhotos, photoSource, usePhotoCache } from '../sync/photoCache';
import { useCopyPages, useInventoryCopy } from '../sync/useInventoryCopy';
import { useItemLists } from './lists/useItemLists';
import { useLowStockAlerts } from '../notifications/useLowStockAlerts';
import { Skeleton } from '../../components/Skeleton';
import { Spinner } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { SearchField } from '../../components/TextField';
import { perLocale, type Locale } from '@apc/domain/locale';
import { useLocale, useMessages } from '../../app/locale';
import { useTheme } from '../../app/theme';
import { ToolButton } from '../../components/ToolButton';
import { tourTarget } from '../../components/Tour';
import { NumericReadout, Text } from '../../components/Typography';
import { useTutorials } from '../dashboard/tutorialsContext';
import { CardTitle, StockQuantity } from './browse/ItemCard';
import { LOADING_LINES, LOADING_QUANTITY, LOADING_THUMB, useStyles } from './InventoryTab.styles';
import { InventoryTutorial } from './tutorial/InventoryTutorial';
import { useInventoryLink } from '../dashboard/inventoryLinkContext';
import { useMoreActions } from '../dashboard/moreActionsContext';
import { COMMON_TEXTS, COMPONENT_TEXTS } from '@apc/domain/app-texts';
import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts';
import { PHONE_TEXTS } from '../../app/phoneTexts';

// The Inventory tab, the same as the web's on a phone (the Estoque mockup): on the canvas, with no panel around it, a
// search by name or part code, the filters, the stock status chips with how many items each finds ("Baixo · 5"), a
// counter of the items shown, the total and the stock alerts, and every item as a card, all scrolling together. Low
// and out-of-stock cards are tinted by the table, and an item that reaches its minimum raises a warning in Alertas,
// once while it stays there (a toast too when a save or an import brought it there).
// The round "+" at the bottom right, above the bottom bar, opens the item form. A save, a delete, a new name and a
// photo changed are queued on the phone (see @apc/domain/sync-queue): they show at once, also away from the server, and
// go to it as soon as it can be reached, the tile above the list saying how many wait; a change the server refuses
// says so in a toast, and one that conflicts with what changed on the computer waits for the user to settle it, the
// tile's "Resolver conflitos" listing each (see ConflictsDialog.tsx). What another device changed shows by itself: the
// copy syncs when the app comes back to the foreground, at a pull down on the list, and every AUTO_SYNC_MS while the tab
// is on screen and nothing is open over the list. Gerenciar listas, Importar Peças, Exportar Peças and the tutorial need the server, and say so
// while it can't be reached, the tutorial not starting by itself then. A card has no pencil or trash: its details fill the screen (the Detalhes mockup), with Editar
// and Duplicar at the bottom and Excluir at the top right, which asks to confirm over them and, once the item is gone,
// closes them too. A card is an item: its
// name, its first code with its part brand or how many brands make it, and where it fits, what it is made of and its price;
// its quantity, added up over its brands, has its stock status under it (un., Baixo or Esgotado) in the card's tone. A
// tap on a card opens the item's details. "Gerenciar listas" renames, merges and deletes the
// categories, brands and models the form picks from; the list loads again after each change, the filters following a
// name renamed or merged, and a name in use leads to its items. "Importar Peças" adds and updates many items at once from a spreadsheet, and the list and the lists load again;
// "Exportar Peças" hands every item of the list as it is, on every page, to the share sheet in the same format.
// The details' Duplicar opens a new item's form filled in as a copy of it, with copies of its photos or without them. The
// round Filtros opens "Filtrar e ordenar" in a bottom sheet (the filters and the sort, applied together on "Ver n
// itens", which counts the items they would show), and the round Ordenar the sorts alone, by any of the web's columns,
// each in the accent while a filter or a sort is on, as the web does on a phone. They, the stock status chips (one at a
// time) and "Limpar filtros" narrow the list the same as the web, sent to the API as the list query with the search,
// and the list shows what matches, newest first, loading its next SCROLL_PAGE_SIZE items once it scrolls within a
// screen of its end, skeleton cards showing while they come, and saying "Fim da lista" once every item is in. A search,
// a filter or a sort starts the list over, and a save or a delete loads what it shows again, so it stays where it was. While the items load, skeleton cards hold their place; when nothing is
// in stock, the empty state offers "Novo item", and when the search or the filters leave nothing, it offers to clear
// them; when the API fails, the error state offers to try again. Each card's thumbnail shows the item's cover and
// opens its photos in the ImageViewer (a brand's card, that brand's photos), where each photo removed, changed or added is saved at once and the list
// follows. The Inventory tour runs over the tab by itself the first time, its three parts in a row, again from Mais ações,
// and a part alone from the user menu's Tutoriais: it starts and ends with the test item deleted and the search, filters
// and sort off, a part after the first making the test item it needs. The Catalog can open the tab on a part's
// details, or with the filters that list the parts that fit a car, the search and the stock status off (see
// inventoryLinkContext.ts). Gerenciar listas, Importar Peças, Exportar Peças
// and Tutorial do estoque sit in a bottom sheet the header's "⋯" opens (the Mais ações mockup), as the web does on a
// phone.

/** How often the copy syncs while the tab is on screen, in ms. */
export const AUTO_SYNC_MS = 30_000;
// The column after the item's name: its quantity, at the card's end.
const COLUMNS = perLocale((locale): ComponentProps<typeof DataTable<InventoryRow>>['columns'] => {
  return [
    { key: 'quantity', header: INVENTORY_SCREEN_TEXTS[locale].quantityShort, numeric: true, card: 'end', cell: (row) => <StockQuantity {...row.item} /> },
  ];
});
/**
 * Names the stock status chips, outside the menu (one at a time, none for every item), in short, each with how many
 * items it finds.
 * @param items Every item in stock.
 * @returns The chips' options, e.g. "Baixo · 5" and "Esgotado · 4".
 */
function statusOptions(items: readonly Item[], locale: Locale) {
  const counts = stockCounts(items);
  return ITEM_STATUSES.map((value) => ({ value, label: `${STOCK_STATUS_SHORT[locale][value]} · ${counts[value]}` }));
}

/** A card of the list: an item. */
type InventoryRow = { item: Item };

/**
 * Builds the column of each card's name: the item's name, its first code with its part brand or how many brands make
 * it, and where it fits, what it is made of and its price, each on one line.
 * @param locale The language of its header.
 * @returns The name column.
 */
function nameColumn(locale: Locale): ComponentProps<typeof DataTable<InventoryRow>>['columns'][number] {
  return {
    key: 'name',
    header: FILTER_LABELS[locale].columns.name,
    card: 'main',
    cell: ({ item }) => (
      <View ref={isTestItem(item) ? tourTarget('tutorial-row') : undefined} collapsable={false}>
        <ItemTitle item={item} />
      </View>
    ),
  };
}

/**
 * Builds the column of each card's thumbnail: the cover of the item's first brand, which opens that brand's photos.
 * @param onOpen Opens the photos of an item's brand in the viewer.
 * @param locale The language of its header and its name.
 * @returns The photo column.
 */
function photoColumn(
  onOpen: (item: Item, brand: ItemBrand) => void,
  locale: Locale,
): ComponentProps<typeof DataTable<InventoryRow>>['columns'][number] {
  const texts = INVENTORY_SCREEN_TEXTS[locale];
  return {
    key: 'photo',
    header: texts.photo,
    card: 'thumb',
    cell: ({ item }) => {
      const [brand] = item.brands;
      return (
        <TableThumbnail
          src={brand.photos[0] && photoSource(brand.photos[0], 'thumb')}
          label={texts.photos.view(item.name)}
          onOpen={() => onOpen(item, brand)}
        />
      );
    },
  };
}

type InventoryTabProps = {
  /** The logged user's id, whose low-stock warnings the tab keeps; none in tests that don't need them. */
  userId?: string;
};

export function InventoryTab({ userId = '' }: InventoryTabProps) {
  const { locale } = useLocale();
  const texts = INVENTORY_SCREEN_TEXTS[locale];
  const common = COMMON_TEXTS[locale];
  const network = PHONE_TEXTS[locale].localNetwork;
  const { styles, ids } = useStyles();
  const { colors } = useTheme();
  const [filters, setFilters] = useState<FilterValues>(EMPTY_ITEM_FILTERS);
  const [status, setStatus] = useState<ItemStatus | null>(null);
  const [search, setSearch] = useState('');
  // The column the list is sorted by, or null for the newest first.
  const [sort, setSort] = useState<Sort | null>(null);
  // How many pages the list shows, loading the next as it scrolls to its end.
  const [pages, setPages] = useState(1);
  const narrowed = search.trim() !== '' || itemListQuery(filters, status) !== '';
  const filterCount = activeFilterCount(filters);
  const sortLabel = ITEM_SORT_OPTIONS[locale].find((option) => option.value === sortValue(sort))?.label;
  // The phone's copy of the inventory, which the list reads: every item, for the counter, the filter options and the
  // form; and the pages shown of the items the search and the filters let through.
  const copy = useInventoryCopy();
  // The photos kept on the phone, which the cards and the viewer show once kept.
  usePhotoCache();
  const state = copy.items ? { status: 'ready' as const, items: copy.items } : { status: copy.offline ? ('error' as const) : ('loading' as const) };
  const listed = useCopyPages(copy, itemListQuery(filters, status, { search, pageSize: SCROLL_PAGE_SIZE, sort }), pages);
  // Each time the stock loads, warn about the items newly at or below their minimum.
  useLowStockAlerts(state.status === 'ready' ? state.items : null, userId);
  // The lists the item form picks from and creates names in, from the copy, with the names queued.
  const { lists } = copy;
  const { create: createEntry, merge: mergeEntry, rename: renameEntry, remove: removeEntry } = useItemLists(lists);
  // The catalog, from the copy, for the generations and versions the item form offers for a vehicle.
  const catalog = useMemo(() => (copy.catalog ? catalogFrom(copy.catalog, locale) : undefined), [copy.catalog, locale]);
  const toast = useToast();
  // Whether "Gerenciar listas" is open.
  const [managing, setManaging] = useState(false);
  // Whether the sheet of the other actions, which the header's "⋯" opens, is open.
  const [moreOpen, setMoreOpen] = useState(false);
  const handMore = useMoreActions();
  // Whether "Importar Peças" is open; each opening starts with no file.
  const [importer, setImporter] = useState({ open: false, session: 0 });
  // Whether "Exportar Peças" is open; each opening starts without the photo paths.
  const [exporter, setExporter] = useState({ open: false, session: 0 });
  // The item form: closed, open on a new item, an item to edit or an item's details (maybe scrolled to a brand),
  // maybe with values and photos filled in. Each opening starts a new form.
  const [form, setForm] = useState<{
    open: boolean;
    item?: Item;
    details?: boolean;
    brand?: string;
    initial?: ItemForm;
    photos?: UploadPhoto[][];
    session: number;
  }>({
    open: false,
    session: 0,
  });
  // The form as typed, and whether it shows the details, which the tutorial's steps read.
  const [typed, setTyped] = useState<{ values: ItemForm; viewing: boolean }>();
  const followForm = useCallback((values: ItemForm, viewing: boolean) => setTyped({ values, viewing }), []);
  // Whether the filter sheet is open, and the sort sheet.
  const [filtering, setFiltering] = useState(false);
  const [sorting, setSorting] = useState(false);
  const tutorial = useTutorials();
  // The parts of the tour that runs, while it runs, and the items on screen when it, or a save or delete of the user,
  // last sent a change: until the list loads again, the change is still on its way, and the tour doesn't take it as
  // left undone.
  const [tour, setTour] = useState<number[] | null>(null);
  const [sentWith, setSentWith] = useState<Item[]>();
  // The item the delete confirmation asks about, while it is open; and whether the details' own one is open.
  const [removing, setRemoving] = useState<Item>();
  const [removingShown, setRemovingShown] = useState(false);
  // The brand of an item whose photos the viewer shows, while it is open, with the photos on screen.
  const [viewer, setViewer] = useState<{ item: Item; brand: ItemBrand; photos: UploadPhoto[] }>();
  // Whether the conflicts with the computer are open; they close once the last is settled.
  const [settling, setSettling] = useState(false);
  if (settling && copy.conflicts.length === 0) {
    setSettling(false);
  }
  const items = state.status === 'ready' ? state.items : [];
  const shown = listed.status === 'ready' ? listed.items : [];
  const rows = shown.map((item): InventoryRow => ({ item }));
  const failed = state.status === 'error' || listed.status === 'error';
  // The error and the empty states sit centered in the list's room.
  const centered = failed || (listed.status === 'ready' && shown.length === 0);

  /** Changes the search, the filters, the stock status or the sort, starting the list over. */
  const narrow = (change: () => void) => {
    change();
    setPages(1);
  };

  /**
   * Loads the next items once the list scrolls within a screen of its end, unless they are on their way or all in.
   * @param event The scroll.
   */
  const scrolled = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
    const near = contentOffset.y + layoutMeasurement.height * 2 >= contentSize.height;
    if (near && listed.status === 'ready' && !listed.more && listed.items.length < listed.total) {
      setPages((count) => count + 1);
    }
  };

  /** Turns off the search, the filters and the stock status, to show every item again. */
  const clearAll = () =>
    narrow(() => {
      setSearch('');
      setFilters(EMPTY_ITEM_FILTERS);
      setStatus(null);
    });

  /** Brings the copy up to date with the server, after an item was saved or deleted, or as the list is pulled down. */
  const reload = () => {
    copy.sync();
  };
  // What another device changed shows by itself: besides when the app comes back to the foreground and at a pull down,
  // the copy syncs every AUTO_SYNC_MS while the tab is on screen, the app in the foreground and nothing open over the
  // list.
  const overlaid =
    form.open ||
    managing ||
    moreOpen ||
    importer.open ||
    exporter.open ||
    filtering ||
    sorting ||
    removing !== undefined ||
    viewer !== undefined ||
    settling ||
    tour !== null;
  const { sync } = copy;
  useEffect(() => {
    if (overlaid) {
      return;
    }
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        sync();
      }
    }, AUTO_SYNC_MS);
    return () => clearInterval(timer);
  }, [overlaid, sync]);

  /**
   * Queues the photos the viewer changed, showing them at once and going back to the ones before if they can't be queued.
   * @param photos The brand's photos after the change.
   * @returns Whether they were queued.
   */
  const changePhotos = async (photos: UploadPhoto[]) => {
    if (!viewer) {
      return false;
    }
    setViewer({ ...viewer, photos });
    const queued = await photosOperation({ itemId: viewer.item.id, brandId: viewer.brand.id, label: viewer.item.name }, viewer.brand.photos, photos)
      .then((change) => change && enqueue([change]))
      .then(
        () => true,
        () => false,
      );
    if (!queued) {
      setViewer((current) => current && { ...current, photos: viewer.photos });
      return false;
    }
    reload();
    return true;
  };

  /** Opens the item form on a new item, an item to edit, or an item's details, maybe with values and photos filled in. */
  const openForm = (item?: Item, details = false, initial?: ItemForm, photos?: UploadPhoto[][], brand?: string) => {
    // What the last form held goes with it, so the tutorial reads the new one as opened until it says otherwise.
    setTyped(undefined);
    setForm((current) => ({ open: true, item, details, brand, initial, photos, session: current.session + 1 }));
    // An item opened keeps its full photos on the phone.
    if (item) {
      keepFullPhotos(item.brands.flatMap((each) => each.photos));
    }
  };

  /**
   * Opens a card into the item's details.
   * @param row The card tapped.
   */
  const openRow = ({ item }: InventoryRow) => openForm(item, true);

  /**
   * Opens a new item's form filled in as a copy of an item, in place of its details.
   * @param item The item to copy.
   * @param withPhotos Whether each brand of the copy takes copies of its brand's photos.
   */
  const duplicate = (item: Item, withPhotos: boolean) =>
    openForm(undefined, false, duplicateForm(item), withPhotos ? item.brands.map((brand) => copiedPhotos(brand.photos, apiUrl())) : undefined);

  /** Sends an item request for the tutorial, then loads the list and the lists again. */
  const send = async (url: string, method: string, body?: unknown) => {
    setSentWith(items);
    const json = body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    await apiFetch(url, { method, ...json }).catch(() => null);
    reload();
  };

  /** Deletes the tutorial's test item, if one is left from a run that didn't end, and loads the list again. */
  const deleteTestItem = async () => {
    const found = await apiFetch(`${apiUrl()}/items?${new URLSearchParams({ q: TUTORIAL_CODE })}`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    for (const item of (found?.items ?? []) as Item[]) {
      if (isTestItem(item)) {
        await apiFetch(`${apiUrl()}/items/${item.id}`, { method: 'DELETE' }).catch(() => null);
      }
    }
    reload();
  };

  /**
   * Deletes the test item left from a run that didn't end and, for a part of the tour that needs one, makes it again.
   * @param needed Whether the part needs the test item, as a part after the first does.
   */
  const readyTestItem = async (needed: boolean) => {
    await deleteTestItem();
    if (needed) {
      const body = JSON.stringify(itemFormBody(TUTORIAL_ITEM, itemFormOptions(items, lists).colors));
      await apiFetch(`${apiUrl()}/items`, { method: 'POST', headers: { 'content-type': 'application/json' }, body }).catch(() => null);
      reload();
    }
  };

  /** Closes what is open and turns off the search, filters and sort, as the tutorial starts and ends. */
  const clearForTutorial = () => {
    setForm((current) => ({ ...current, open: false }));
    setRemoving(undefined);
    setFiltering(false);
    narrow(() => {
      setSearch('');
      setFilters(EMPTY_ITEM_FILTERS);
      setStatus(null);
      setSort(null);
    });
  };

  // The header's "⋯" opens the other actions; it goes with the tab.
  useEffect(() => {
    handMore(() => setMoreOpen(true));
    return () => handMore(null);
  }, [handMore]);

  // Run the tour by itself the first time, from its first part on, once the items are in and the server answered, and a
  // tutorial of its when one is asked for, while the server can be reached.
  const reachable = !copy.offline && !copy.syncing;
  const asked = tutorial.asked && (INVENTORY_TUTORIALS as readonly string[]).includes(tutorial.asked.id) ? tutorial.asked : null;
  if (!tour && reachable && ((tutorial.seen === false && state.status === 'ready') || asked)) {
    setTour(asked ? inventoryTutorialParts(asked.id, asked.onward) : inventoryTutorialParts('inventory-add', true));
    clearForTutorial();
  }

  // Once it runs, the tour counts as seen, and starts without a test item left from a run that didn't end; a part after
  // the first, which starts where the one before leaves the test item, makes it.
  const tutorialStarted = useEffectEvent(() => {
    tutorial.setSeen();
    tutorial.started();
    readyTestItem(tour![0] > 1);
  });
  useEffect(() => {
    if (tour) {
      tutorialStarted();
    }
  }, [tour]);

  // Asked for while the server can't be reached, the tour says it needs it.
  const askRefused = useEffectEvent(() => {
    tutorial.started();
    toast.error(INVENTORY_NEEDS_SERVER[locale].tutorial);
  });
  useEffect(() => {
    if (asked && copy.offline) {
      askRefused();
    }
  }, [asked, copy.offline]);

  // The server's refusals of changes queued are said in toasts.
  useEffect(() => onRefused((notices) => notices.forEach((notice) => toast.error(notice))), [toast]);

  // Another tab's link: the filters it sets, with the search and the stock status off, or an item's details once the
  // items are in; then it is let go.
  const { link, taken } = useInventoryLink();
  const [takenLink, setTakenLink] = useState<InventoryLink | null>(null);
  if (link && link !== takenLink && ('filters' in link || state.status === 'ready')) {
    setTakenLink(link);
    if ('filters' in link) {
      narrow(() => {
        setSearch('');
        setStatus(null);
        setFilters(link.filters);
      });
    } else {
      const item = items.find((each) => each.id === link.itemId);
      if (item) {
        openForm(item, true);
      }
    }
  }
  useEffect(() => {
    if (takenLink) {
      taken();
    }
  }, [takenLink, taken]);

  return (
    <View style={styles.panel} testID={ids.panel}>
      <FieldScrollView
        style={styles.scroll}
        contentContainerStyle={styles.tab}
        onScroll={scrolled}
        refreshControl={<RefreshControl refreshing={copy.syncing && copy.items !== null} onRefresh={reload} />}
        testID={ids.tab}
      >
        <View ref={tourTarget('search')} collapsable={false}>
          <SearchField
            label={texts.search}
            value={search}
            onValueChange={(value) => narrow(() => setSearch(value))}
          />
        </View>
        <View style={styles.filters} testID={ids.filters}>
          <View ref={tourTarget('filters')} collapsable={false}>
            <ToolButton
              icon={filterIcon}
              label={filterCount ? COMPONENT_TEXTS[locale].filterMenu.active(filterCount) : COMPONENT_TEXTS[locale].filterMenu.title}
              active={filterCount > 0}
              expanded={filtering}
              onPress={() => setFiltering(true)}
            />
          </View>
          <ToolButton
            icon={sortIcon}
            label={sort ? texts.sort(sortLabel ?? '') : COMPONENT_TEXTS[locale].filterSheet.sort}
            active={sort !== null}
            expanded={sorting}
            onPress={() => setSorting(true)}
          />
          <FilterChipGroup
            label={texts.status}
            options={statusOptions(items, locale)}
            value={status}
            onValueChange={(value) => narrow(() => setStatus(value as ItemStatus | null))}
          />
          <ClearFilters
            active={filterCount > 0 || status !== null}
            onClear={() =>
              narrow(() => {
                setFilters(EMPTY_ITEM_FILTERS);
                setStatus(null);
              })
            }
          />
        </View>
        {((copy.offline && copy.syncedAt) || copy.waiting > 0 || copy.conflicts.length > 0) && (
          <View accessibilityLiveRegion="polite" style={styles.copy} testID={ids.copy}>
            <Text size="sm">
              {[
                copy.blocked ? network.missing : copy.offline && copy.syncedAt && copyNotice(copy.syncedAt, locale),
                copy.waiting > 0 && waitingNotice(copy.waiting, locale),
                copy.conflicts.length > 0 && conflictsNotice(copy.conflicts.length, locale),
              ]
                .filter(Boolean)
                .join(' ')}
            </Text>
            {copy.blocked && (
              <Button variant="secondary" size="sm" align="start" onPress={copy.allowNetwork}>
                {network.allow}
              </Button>
            )}
            {copy.conflicts.length > 0 && (
              <Button variant="secondary" size="sm" align="start" onPress={() => setSettling(true)}>
                {PHONE_TEXTS[locale].inventory.settleConflicts}
              </Button>
            )}
          </View>
        )}
        <View style={[styles.list, centered && styles.listCentered]} testID={ids.list}>
          {failed && (
            <ErrorState
              title={texts.error.title}
              message={copy.blocked ? network.missing : texts.error.message}
              action={copy.blocked ? { label: network.allow, onPress: copy.allowNetwork } : { label: common.retry, onPress: reload }}
            />
          )}
          {!failed && listed.status === 'loading' && <LoadingRows />}
          {!failed && state.status === 'ready' && listed.status === 'ready' && (
            <>
              <NumericReadout tone="muted">{resultSummary(listed.status === 'ready' ? listed.total : 0, items, locale)}</NumericReadout>
              <DataTable
                label={texts.items}
                columns={[
                  photoColumn((item, brand) => {
                    keepFullPhotos(brand.photos);
                    setViewer({ item, brand, photos: heldPhotos(brand.photos) });
                  }, locale),
                  nameColumn(locale),
                  ...COLUMNS[locale],
                ]}
                rows={rows}
                rowKey={(row) => row.item.id}
                rowStatus={({ item }) => stockTint(item, locale)}
                onRowOpen={openRow}
                sort={sort}
                onSortChange={(next) => narrow(() => setSort(next))}
                unsortedLabel={FILTER_LABELS[locale].unsorted}
                sortSelect={false}
                empty={
                  narrowed ? (
                    <EmptyState
                      title={texts.empty.notFound.title}
                      message={texts.empty.notFound.message}
                      action={{ label: texts.empty.clear, onPress: clearAll }}
                    />
                  ) : (
                    <EmptyState
                      title={texts.empty.none.title}
                      message={texts.empty.none.message}
                      action={{ label: texts.newItem, onPress: () => openForm() }}
                    />
                  )
                }
              />
            </>
          )}
          {!failed && listed.status === 'ready' && shown.length > 0 && (
            <ListEnd done={shown.length >= listed.total} loading={listed.more} />
          )}
        </View>
      </FieldScrollView>
      <View ref={tourTarget('new-item')} collapsable={false} style={styles.fab} testID={ids.fab}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={texts.newItem}
          onPress={() => openForm()}
          style={({ pressed }) => [styles.fabButton, pressed && styles.fabButtonPressed]}
          testID={ids.fabButton}
        >
          <Icon icon={plusIcon} size={ICON_SIZES.fab} color={colors.onAccent} />
        </Pressable>
      </View>
      <FilterSheet
        open={filtering}
        onClose={() => setFiltering(false)}
        rows={(draft) => itemFilterRows(items, draft, locale)}
        values={filters}
        sort={sort}
        sortOptions={ITEM_SORT_OPTIONS[locale]}
        count={(draft) => matchingCount(items, draft, status, search)}
        onApply={(values, next) => {
          setFiltering(false);
          narrow(() => {
            setFilters(values);
            setSort(next);
          });
        }}
        applyRef={tourTarget('filter-panel')}
      />
      <SortSheet
        open={sorting}
        onClose={() => setSorting(false)}
        sort={sort}
        options={ITEM_SORT_OPTIONS[locale]}
        onSortChange={(next) => narrow(() => setSort(next))}
      />
      <ActionSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={common.moreActions}
        actions={[
          { icon: listIcon, label: texts.lists.title, onSelect: () => setManaging(true) },
          { icon: importIcon, label: texts.importItems, onSelect: () => setImporter((current) => ({ open: true, session: current.session + 1 })) },
          { icon: exportIcon, label: texts.exportItems, onSelect: () => setExporter((current) => ({ open: true, session: current.session + 1 })) },
          { icon: playIcon, label: texts.tutorial, onSelect: () => tutorial.start('inventory-add', true) },
        ]}
      />
      <ItemFormDialog
        key={`form-${form.session}`}
        open={form.open}
        item={form.item}
        details={form.details}
        scrollToBrand={form.brand}
        items={items}
        lists={lists}
        catalog={catalog}
        onCreateEntry={createEntry}
        initialForm={form.initial}
        initialPhotos={form.photos}
        onDuplicate={duplicate}
        onFormChange={followForm}
        onRemovingChange={setRemovingShown}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        onSaved={() => {
          setForm((current) => ({ ...current, open: false }));
          setSentWith(items);
          reload();
        }}
        onDeleted={() => {
          setForm((current) => ({ ...current, open: false }));
          setSentWith(items);
          reload();
        }}
      />
      <ImportItemsDialog
        key={`import-${importer.session}`}
        open={importer.open}
        lists={lists}
        onClose={() => setImporter((current) => ({ ...current, open: false }))}
        onImported={() => {
          setImporter((current) => ({ ...current, open: false }));
          reload();
        }}
        offline={copy.offline}
      />
      <ManageListsDialog
        open={managing}
        offline={copy.offline}
        lists={lists}
        items={items}
        onRename={renameEntry}
        onMerge={mergeEntry}
        onRemove={removeEntry}
        onChanged={(change) => {
          reload();
          if (change) {
            setFilters((held) => followEntryChange(held, change));
          }
        }}
        onShowItems={(entryFilters) => {
          setManaging(false);
          narrow(() => {
            setSearch('');
            setStatus(null);
            setFilters(entryFilters);
          });
        }}
        onClose={() => setManaging(false)}
      />
      <InventoryTutorial
        open={tour !== null}
        parts={tour ?? []}
        onClose={() => {
          setTour(null);
          clearForTutorial();
          deleteTestItem();
        }}
        screen={{
          form: form.open
            ? {
                item: form.item,
                viewing: typed?.viewing ?? Boolean(form.details),
                values: typed?.values ?? form.initial ?? EMPTY_ITEM_FORM,
              }
            : null,
          items,
          search,
          filters,
          filtersOpen: filtering,
          removing: removing ?? (form.open && removingShown ? form.item : undefined),
          busy: sentWith === items,
          phone: true,
          openForm,
          setSearch: (value) => narrow(() => setSearch(value)),
          applyFilters: (values) => {
            setFiltering(false);
            narrow(() => setFilters(values));
          },
          saveItem: (item, values) => {
            setForm((current) => ({ ...current, open: false }));
            const body = itemFormBody(values, itemFormOptions(items, lists).colors);
            send(item ? `${apiUrl()}/items/${item.id}` : `${apiUrl()}/items`, item ? 'PATCH' : 'POST', body);
          },
          // The details close first: a confirmation opened here would sit under their Modal.
          askDelete: (item) => {
            setForm((current) => ({ ...current, open: false }));
            setRemoving(item);
          },
          deleteItem: (item) => {
            setRemoving(undefined);
            setForm((current) => ({ ...current, open: false }));
            send(`${apiUrl()}/items/${item.id}`, 'DELETE');
          },
        }}
      />
      <ImageViewer
        open={viewer !== undefined}
        onClose={() => setViewer(undefined)}
        name={viewer?.item.name ?? ''}
        code={viewer?.brand.code ?? ''}
        caption={viewer?.item.description ?? undefined}
        photos={viewer?.photos ?? []}
        onPhotosChange={changePhotos}
        limit={ITEM_PHOTO_LIMIT}
        onPick={pickPhotos}
      />
      <ExportItemsDialog
        key={`export-${exporter.session}`}
        open={exporter.open}
        query={itemListQuery(filters, status, { search, sort })}
        count={listed.status === 'ready' ? listed.total : 0}
        narrowed={narrowed}
        offline={copy.offline}
        onClose={() => setExporter((current) => ({ ...current, open: false }))}
      />
      <ConflictsDialog open={settling} conflicts={copy.conflicts} onSettle={copy.settle} onClose={() => setSettling(false)} />
      <DeleteItemDialog
        open={removing !== undefined}
        item={removing}
        onClose={() => setRemoving(undefined)}
        onDeleted={() => {
          setRemoving(undefined);
          setSentWith(items);
          reload();
        }}
      />
    </View>
  );
}

/**
 * The end of the list as it loads more: skeleton cards while the next items come, or "Fim da lista" once every item is
 * in.
 */
function ListEnd({ done, loading }: { done: boolean; loading: boolean }) {
  const { styles, ids } = useStyles();
  const texts = useMessages(INVENTORY_SCREEN_TEXTS);
  if (done) {
    return (
      <RNText style={styles.end} testID={ids.end}>
        {texts.end}
      </RNText>
    );
  }
  return loading ? <LoadingRows /> : null;
}

function LoadingRows() {
  const { styles, ids } = useStyles();
  const texts = useMessages(INVENTORY_SCREEN_TEXTS);
  return (
    <View accessibilityState={{ busy: true }} style={styles.loading} testID={ids.loading}>
      <Spinner size="sm" label={texts.loading} />
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} style={styles.loadingRow} testID={ids.loadingRow}>
          <Skeleton shape="block" width={LOADING_THUMB} height={LOADING_THUMB} />
          <View style={styles.loadingLines} testID={ids.loadingLines}>
            {LOADING_LINES.map((width) => (
              <Skeleton key={width} width={width} />
            ))}
          </View>
          <Skeleton width={LOADING_QUANTITY} />
        </View>
      ))}
    </View>
  );
}

/** An item's name on its card, with its code and details in the language chosen. */
function ItemTitle({ item }: { item: Item }) {
  const { locale } = useLocale();
  return <CardTitle name={item.name} code={itemCardCode(item, locale)} details={itemCardDetails(item, locale)} />;
}
