import { useCallback, useEffect, useEffectEvent, useState, type ComponentProps } from 'react';
import { Pressable, Text as RNText, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { apiFetch } from '@apc/shared/auth';
import { filterIcon, ICON_SIZES, pencilIcon, plusIcon, sortIcon, trashIcon } from '@apc/shared/icons';
import {
  itemCardCode,
  itemCardDetails,
  ITEM_STATUSES,
  QUANTITY_UNIT,
  resultSummary,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_SHORT,
  stockCounts,
  stockStatus,
  type Item,
  type ItemBrand,
  type ItemStatus,
} from '@apc/shared/items';
import { activeFilterCount, type FilterValues } from '@apc/shared/filters';
import {
  EMPTY_ITEM_FILTERS,
  followEntryChange,
  ITEM_SORT_OPTIONS,
  itemFilterRows,
  itemListQuery,
  matchingCount,
} from '@apc/shared/item-filters';
import { duplicateForm, EMPTY_ITEM_FORM, itemFormBody, itemFormOptions, type ItemForm } from '@apc/shared/item-form';
import { isTestItem, TUTORIAL_CODE } from '@apc/shared/inventory-tutorial';
import { SCROLL_PAGE_SIZE } from '@apc/shared/pagination';
import { sortValue, type Sort } from '@apc/shared/table';
import { copiedPhotos, heldPhotos, ITEM_PHOTO_LIMIT, photoAddress } from '@apc/shared/photos';
import { API_URL } from '../api';
import { Button } from '../Button';
import { DataTable, RowAction, TableThumbnail } from '../DataTable';
import { EmptyState, ErrorState } from '../EmptyState';
import { FieldScrollView } from '../FieldScrollView';
import { FilterChipGroup } from '../FilterChip';
import { ClearFilters } from '../FilterMenu';
import { FilterSheet, SortSheet } from '../FilterSheet';
import { Icon } from '../Icon';
import type { UploadPhoto } from '../ImageUpload';
import { ImageViewer } from '../ImageViewer';
import { DeleteItemDialog } from '../inventory/DeleteItemDialog';
import { ExportItemsDialog } from '../inventory/ExportItemsDialog';
import { ImportItemsDialog } from '../inventory/ImportItemsDialog';
import { ItemFormDialog } from '../inventory/ItemFormDialog';
import { ManageListsDialog } from '../inventory/ManageListsDialog';
import { pickPhotos, savePhotos } from '../inventory/photos';
import { useItemLists } from '../inventory/useItemLists';
import { useItemPages } from '../inventory/useItemPages';
import { useItems } from '../inventory/useItems';
import { useLowStockAlerts } from '../notifications/useLowStockAlerts';
import { Skeleton } from '../Skeleton';
import { Spinner } from '../Spinner';
import { SearchField } from '../TextField';
import { useTheme } from '../theme';
import { ToolButton } from '../ToolButton';
import { tourTarget } from '../tourTargets';
import { NumericReadout, Text } from '../Typography';
import { useInventoryTutorial } from './inventoryTutorialContext';
import { LOADING_LINES, LOADING_QUANTITY, LOADING_THUMB, useStyles } from './InventoryTab.styles';
import { InventoryTutorial } from './InventoryTutorial';

// The Inventory tab, the same as the web's on a phone (the Estoque mockup): on the canvas, with no panel around it, a
// search by name or part code, the filters, the stock status chips with how many items each finds ("Baixo · 5"), a
// counter of the items shown, the total and the stock alerts, and every item as a card, all scrolling together. Low
// and out-of-stock cards are tinted by the table, and an item that reaches its minimum raises a warning in Alertas,
// once while it stays there (a toast too when a save or an import brought it there).
// The round "+" at the bottom right, above the bottom bar, and each card's pencil open the item form, each card's trash
// asks to confirm deleting the item, and the list loads again once an item is saved or deleted. A card is an item: its
// name, its first code with its part brand or how many brands make it, and where it fits, where it is and its price;
// its quantity, added up over its brands, has its stock status under it (un., Baixo or Esgotado) in the card's tone. A
// tap on a card opens the item's details. "Gerenciar listas" renames, merges and deletes the
// categories, brands and models the form picks from; the list loads again after each change, the filters following a
// name renamed or merged, and a name in use leads to its items. "Importar CSV" adds and updates many items at once from a spreadsheet, and the list and the lists load again;
// "Exportar CSV" hands every item of the list as it is, on every page, to the share sheet in the same format.
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
// follows. The Inventory tutorial runs over the tab by itself the first time, and again from the user menu: it starts
// and ends with the test item deleted and the search, filters and sort off.

// The column after the item's name: its quantity, at the card's end.
const COLUMNS: ComponentProps<typeof DataTable<InventoryRow>>['columns'] = [
  { key: 'quantity', header: 'Qtd.', numeric: true, card: 'end', cell: (row) => <Quantity item={row.item} /> },
];
/**
 * Names the stock status chips, outside the menu (one at a time, none for every item), in short, each with how many
 * items it finds.
 * @param items Every item in stock.
 * @returns The chips' options, e.g. "Baixo · 5" and "Esgotado · 4".
 */
function statusOptions(items: readonly Item[]) {
  const counts = stockCounts(items);
  return ITEM_STATUSES.map((value) => ({ value, label: `${STOCK_STATUS_SHORT[value]} · ${counts[value]}` }));
}

/** A card of the list: an item. */
type InventoryRow = { item: Item };

/**
 * Builds the column of each card's actions: the pencil that opens the item to edit and the trash that deletes it.
 * @param onEdit Opens an item in the item form.
 * @param onDelete Asks to confirm deleting an item.
 * @param ui The tab's styles and ids.
 * @returns The actions column.
 */
function actionsColumn(
  onEdit: (item: Item) => void,
  onDelete: (item: Item) => void,
  { styles, ids }: ReturnType<typeof useStyles>,
): ComponentProps<typeof DataTable<InventoryRow>>['columns'][number] {
  return {
    key: 'actions',
    header: 'Ações',
    card: 'actions',
    cell: ({ item }) => (
      <View style={styles.actions} testID={ids.actions}>
        <View ref={isTestItem(item) ? tourTarget('tutorial-pencil') : undefined} collapsable={false}>
          <RowAction icon={pencilIcon} label={`Editar ${item.name}`} onPress={() => onEdit(item)} />
        </View>
        <View ref={isTestItem(item) ? tourTarget('tutorial-trash') : undefined} collapsable={false}>
          <RowAction icon={trashIcon} label={`Excluir ${item.name}`} tone="danger" onPress={() => onDelete(item)} />
        </View>
      </View>
    ),
  };
}

/**
 * Builds the column of each card's name: the item's name, its first code with its part brand or how many brands make
 * it, and where it fits, where it is and its price, each on one line.
 * @param ui The tab's styles and ids.
 * @returns The name column.
 */
function nameColumn({ styles, ids }: ReturnType<typeof useStyles>): ComponentProps<typeof DataTable<InventoryRow>>['columns'][number] {
  return {
    key: 'name',
    header: 'Item',
    card: 'main',
    cell: ({ item }) => (
      <View ref={isTestItem(item) ? tourTarget('tutorial-row') : undefined} collapsable={false}>
        <RNText numberOfLines={1} style={styles.name} testID={ids.name}>
          {item.name}
        </RNText>
        <NumericReadout tone="muted">{itemCardCode(item)}</NumericReadout>
        <Text size="sm" tone="muted" lines={1}>
          {itemCardDetails(item)}
        </Text>
      </View>
    ),
  };
}

/**
 * Builds the column of each card's thumbnail: the cover of the item's first brand, which opens that brand's photos.
 * @param onOpen Opens the photos of an item's brand in the viewer.
 * @returns The photo column.
 */
function photoColumn(onOpen: (item: Item, brand: ItemBrand) => void): ComponentProps<typeof DataTable<InventoryRow>>['columns'][number] {
  return {
    key: 'photo',
    header: 'Foto',
    card: 'thumb',
    cell: ({ item }) => {
      const [brand] = item.brands;
      return (
        <TableThumbnail
          src={brand.photos[0] && photoAddress(brand.photos[0].thumbUrl, API_URL)}
          label={`Ver fotos de ${item.name}`}
          onOpen={() => onOpen(item, brand)}
        />
      );
    },
  };
}

/**
 * Tells a card's status for the table's tint, from the item's quantity and minimum.
 * @param row A card of the list.
 * @returns The tint and the label read out, or undefined when stock is fine.
 */
function rowStatus({ item }: InventoryRow): { tone: 'warn' | 'danger'; label: string } | undefined {
  const status = stockStatus(item.quantity, item.minQuantity);
  return status ? { tone: status === 'out' ? 'danger' : 'warn', label: STOCK_STATUS_LABELS[status] } : undefined;
}

type InventoryTabProps = {
  /** The logged user's id, whose low-stock warnings the tab keeps; none in tests that don't need them. */
  userId?: string;
};

export function InventoryTab({ userId = '' }: InventoryTabProps) {
  const ui = useStyles();
  const { styles, ids } = ui;
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
  const sortLabel = ITEM_SORT_OPTIONS.find((option) => option.value === sortValue(sort))?.label;
  // Every item, for the counter, the filter options and the form; and the pages loaded so far of the items the search
  // and the filters let through.
  const state = useItems();
  const listed = useItemPages(itemListQuery(filters, status, { search, pageSize: SCROLL_PAGE_SIZE, sort }), pages);
  // Each time the stock loads, warn about the items newly at or below their minimum.
  useLowStockAlerts(state.status === 'ready' ? state.items : null, userId);
  // The lists the item form picks from and creates names in.
  const { lists, create: createEntry, merge: mergeEntry, rename: renameEntry, remove: removeEntry, reload: reloadLists } = useItemLists();
  // Whether "Gerenciar listas" is open.
  const [managing, setManaging] = useState(false);
  // Whether "Importar CSV" is open; each opening starts with no file.
  const [importer, setImporter] = useState({ open: false, session: 0 });
  // Whether "Exportar CSV" is open; each opening starts without the photo paths.
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
  const tutorial = useInventoryTutorial();
  // Whether the tutorial runs, and the items on screen when it, or a save or delete of the user, last sent a change:
  // until the list loads again, the change is still on its way, and the tutorial doesn't take it as left undone.
  const [touring, setTouring] = useState(false);
  const [sentWith, setSentWith] = useState<Item[]>();
  // The item the delete confirmation asks about, while it is open.
  const [removing, setRemoving] = useState<Item>();
  // The brand of an item whose photos the viewer shows, while it is open, with the photos on screen.
  const [viewer, setViewer] = useState<{ item: Item; brand: ItemBrand; photos: UploadPhoto[] }>();
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

  /** Loads every item and the pages on screen again, after one was saved or deleted. */
  const reload = () => {
    state.reload();
    listed.reload();
  };

  /**
   * Saves the photos the viewer changed, showing them at once and going back to the saved ones if they can't be saved.
   * @param photos The brand's photos after the change.
   * @returns Whether they were saved.
   */
  const changePhotos = async (photos: UploadPhoto[]) => {
    if (!viewer) {
      return false;
    }
    setViewer({ ...viewer, photos });
    const saved = await savePhotos(viewer.item, viewer.brand, photos);
    if (!saved) {
      setViewer((current) => current && { ...current, photos: viewer.photos });
      return false;
    }
    const brand = saved.brands.find((each) => each.id === viewer.brand.id) ?? viewer.brand;
    setViewer((current) => current && { item: saved, brand, photos: heldPhotos(brand.photos, API_URL) });
    reload();
    return true;
  };

  /** Opens the item form on a new item, an item to edit, or an item's details, maybe with values and photos filled in. */
  const openForm = (item?: Item, details = false, initial?: ItemForm, photos?: UploadPhoto[][], brand?: string) =>
    setForm((current) => ({ open: true, item, details, brand, initial, photos, session: current.session + 1 }));

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
    openForm(undefined, false, duplicateForm(item), withPhotos ? item.brands.map((brand) => copiedPhotos(brand.photos, API_URL)) : undefined);

  /** Sends an item request for the tutorial, then loads the list and the lists again. */
  const send = async (url: string, method: string, body?: unknown) => {
    setSentWith(items);
    const json = body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    await apiFetch(url, { method, ...json }).catch(() => null);
    reload();
    reloadLists();
  };

  /** Deletes the tutorial's test item, if one is left from a run that didn't end, and loads the list again. */
  const deleteTestItem = async () => {
    const found = await apiFetch(`${API_URL}/items?${new URLSearchParams({ q: TUTORIAL_CODE })}`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    for (const item of (found?.items ?? []) as Item[]) {
      if (isTestItem(item)) {
        await apiFetch(`${API_URL}/items/${item.id}`, { method: 'DELETE' }).catch(() => null);
      }
    }
    reload();
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

  // Run the tutorial by itself the first time, once the items are in, and again when the user menu asks.
  if (!touring && ((tutorial.seen === false && state.status === 'ready') || tutorial.replayAsked)) {
    setTouring(true);
    clearForTutorial();
  }

  // Once it runs, the tutorial counts as seen, and starts without a test item left from a run that didn't end.
  const tutorialStarted = useEffectEvent(() => {
    tutorial.setSeen();
    tutorial.replayStarted();
    void deleteTestItem();
  });
  useEffect(() => {
    if (touring) {
      tutorialStarted();
    }
  }, [touring]);

  return (
    <View style={styles.panel} testID={ids.panel}>
      <FieldScrollView
        style={styles.scroll}
        contentContainerStyle={styles.tab}
        keyboardShouldPersistTaps="handled"
        onScroll={scrolled}
        testID={ids.tab}
      >
        <View ref={tourTarget('search')} collapsable={false}>
          <SearchField
            label="Procure pelo nome ou código da peça"
            value={search}
            onValueChange={(value) => narrow(() => setSearch(value))}
          />
        </View>
        <Button variant="secondary" onPress={() => setManaging(true)}>
          Gerenciar listas
        </Button>
        <Button variant="secondary" onPress={() => setImporter((current) => ({ open: true, session: current.session + 1 }))}>
          Importar CSV
        </Button>
        <Button variant="secondary" onPress={() => setExporter((current) => ({ open: true, session: current.session + 1 }))}>
          Exportar CSV
        </Button>
        <View style={styles.filters} testID={ids.filters}>
          <View ref={tourTarget('filters')} collapsable={false}>
            <ToolButton
              icon={filterIcon}
              label={filterCount ? `Filtros, ${filterCount} ${filterCount === 1 ? 'ativo' : 'ativos'}` : 'Filtros'}
              active={filterCount > 0}
              expanded={filtering}
              onPress={() => setFiltering(true)}
            />
          </View>
          <ToolButton
            icon={sortIcon}
            label={sort ? `Ordenar, ${sortLabel}` : 'Ordenar'}
            active={sort !== null}
            expanded={sorting}
            onPress={() => setSorting(true)}
          />
          <FilterChipGroup
            label="Situação do estoque"
            options={statusOptions(items)}
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
        <View style={[styles.list, centered && styles.listCentered]} testID={ids.list}>
          {failed && (
            <ErrorState
              title="Não foi possível carregar o estoque"
              message="Verifique a conexão com o servidor e tente de novo."
              action={{ label: 'Tentar de novo', onPress: reload }}
            />
          )}
          {!failed && listed.status === 'loading' && <LoadingRows />}
          {!failed && state.status === 'ready' && listed.status === 'ready' && (
            <>
              <NumericReadout tone="muted">{resultSummary(listed.status === 'ready' ? listed.total : 0, items)}</NumericReadout>
              <DataTable
                label="Itens do estoque"
                columns={[
                  photoColumn((item, brand) => setViewer({ item, brand, photos: heldPhotos(brand.photos, API_URL) })),
                  nameColumn(ui),
                  ...COLUMNS,
                  actionsColumn((item) => openForm(item), setRemoving, ui),
                ]}
                rows={rows}
                rowKey={(row) => row.item.id}
                rowStatus={rowStatus}
                onRowOpen={openRow}
                sort={sort}
                onSortChange={(next) => narrow(() => setSort(next))}
                unsortedLabel="Ordem de cadastro"
                sortSelect={false}
                empty={
                  narrowed ? (
                    <EmptyState
                      title="Nenhum item encontrado"
                      message="Ajuste a busca ou limpe os filtros para ver o estoque inteiro."
                      action={{ label: 'Limpar filtros', onPress: clearAll }}
                    />
                  ) : (
                    <EmptyState
                      title="Nenhum item cadastrado"
                      message="Cadastre a primeira peça do estoque para ela aparecer aqui."
                      action={{ label: 'Novo item', onPress: () => openForm() }}
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
          accessibilityLabel="Novo item"
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
        rows={(draft) => itemFilterRows(items, draft)}
        values={filters}
        sort={sort}
        sortOptions={ITEM_SORT_OPTIONS}
        count={(draft) => matchingCount(items, draft, status, search)}
        onApply={(values, next) => {
          setFiltering(false);
          narrow(() => {
            setFilters(values);
            setSort(next);
          });
        }}
        panelRef={tourTarget('filter-panel')}
      />
      <SortSheet
        open={sorting}
        onClose={() => setSorting(false)}
        sort={sort}
        options={ITEM_SORT_OPTIONS}
        onSortChange={(next) => narrow(() => setSort(next))}
      />
      <ItemFormDialog
        key={`form-${form.session}`}
        open={form.open}
        item={form.item}
        details={form.details}
        scrollToBrand={form.brand}
        items={items}
        lists={lists}
        onCreateEntry={createEntry}
        initialForm={form.initial}
        initialPhotos={form.photos}
        onDuplicate={duplicate}
        onFormChange={followForm}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        onSaved={() => {
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
          reloadLists();
        }}
      />
      <ManageListsDialog
        open={managing}
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
        onShowItems={(shown) => {
          setManaging(false);
          narrow(() => {
            setSearch('');
            setStatus(null);
            setFilters(shown);
          });
        }}
        onClose={() => setManaging(false)}
      />
      <InventoryTutorial
        open={touring}
        onClose={() => {
          setTouring(false);
          clearForTutorial();
          void deleteTestItem();
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
          removing,
          busy: sentWith === items,
          openForm,
          setSearch: (value) => narrow(() => setSearch(value)),
          applyFilters: (values) => {
            setFiltering(false);
            narrow(() => setFilters(values));
          },
          saveItem: (item, values) => {
            setForm((current) => ({ ...current, open: false }));
            const body = itemFormBody(values, itemFormOptions(items, lists).colors);
            void send(item ? `${API_URL}/items/${item.id}` : `${API_URL}/items`, item ? 'PATCH' : 'POST', body);
          },
          askDelete: setRemoving,
          deleteItem: (item) => {
            setRemoving(undefined);
            void send(`${API_URL}/items/${item.id}`, 'DELETE');
          },
        }}
      />
      <ImageViewer
        open={viewer !== undefined}
        onClose={() => setViewer(undefined)}
        name={viewer?.item.name ?? ''}
        code={viewer?.brand.code ?? ''}
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
        onClose={() => setExporter((current) => ({ ...current, open: false }))}
      />
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

/** A card's quantity, with its stock status under it in its tone: "un.", "Baixo" or "Esgotado". */
function Quantity({ item }: { item: Item }) {
  const { styles, ids } = useStyles();
  const status = stockStatus(item.quantity, item.minQuantity);
  const tone = status === 'out' ? styles.quantityOut : status === 'low' ? styles.quantityLow : undefined;
  return (
    <View style={styles.quantity} testID={ids.quantity}>
      <RNText style={[styles.quantityValue, tone]} testID={ids.quantityValue}>
        {item.quantity}
      </RNText>
      <RNText style={[styles.quantityTag, tone]} testID={ids.quantityTag}>
        {status ? STOCK_STATUS_SHORT[status] : QUANTITY_UNIT}
      </RNText>
    </View>
  );
}

/**
 * The end of the list as it loads more: skeleton cards while the next items come, or "Fim da lista" once every item is
 * in.
 */
function ListEnd({ done, loading }: { done: boolean; loading: boolean }) {
  const { styles, ids } = useStyles();
  if (done) {
    return (
      <RNText style={styles.end} testID={ids.end}>
        Fim da lista
      </RNText>
    );
  }
  return loading ? <LoadingRows /> : null;
}

function LoadingRows() {
  const { styles, ids } = useStyles();
  return (
    <View accessibilityState={{ busy: true }} style={styles.loading} testID={ids.loading}>
      <Spinner size="sm" label="Carregando o estoque" />
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
