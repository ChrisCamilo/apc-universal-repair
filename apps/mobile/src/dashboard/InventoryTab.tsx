import { useCallback, useEffect, useEffectEvent, useState, type ComponentProps } from 'react';
import { ScrollView, View } from 'react-native';
import { apiFetch } from '@apc/shared/auth';
import { chevronIcon, ICON_SIZES, pencilIcon, trashIcon } from '@apc/shared/icons';
import {
  itemCodes,
  ITEM_STATUSES,
  itemDetails,
  resultSummary,
  STOCK_STATUS_LABELS,
  stockStatus,
  type Item,
  type ItemBrand,
  type ItemStatus,
} from '@apc/shared/items';
import { activeFilterCount, type FilterValues } from '@apc/shared/filters';
import { EMPTY_ITEM_FILTERS, followEntryChange, itemFilterRows, itemListQuery } from '@apc/shared/item-filters';
import { duplicateForm, EMPTY_ITEM_FORM, itemFormBody, itemFormOptions, type ItemForm } from '@apc/shared/item-form';
import { isTestItem, TUTORIAL_CODE } from '@apc/shared/inventory-tutorial';
import { PAGE_SIZES, pageForSize } from '@apc/shared/pagination';
import type { Sort } from '@apc/shared/table';
import { copiedPhotos, heldPhotos, ITEM_PHOTO_LIMIT } from '@apc/shared/photos';
import { API_URL } from '../api';
import { Button } from '../Button';
import { DataTable, RowAction, TableThumbnail } from '../DataTable';
import { EmptyState, ErrorState } from '../EmptyState';
import { FilterChipGroup } from '../FilterChip';
import { ClearFilters, FilterMenu } from '../FilterMenu';
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
import { useItems } from '../inventory/useItems';
import { useLowStockAlerts } from '../notifications/useLowStockAlerts';
import { Pagination } from '../Pagination';
import { Panel } from '../Panel';
import { Skeleton } from '../Skeleton';
import { Spinner } from '../Spinner';
import { SearchField } from '../TextField';
import { useTheme } from '../theme';
import { tourTarget } from '../tourTargets';
import { NumericReadout, Text } from '../Typography';
import { useInventoryTutorial } from './inventoryTutorialContext';
import { LOADING_LINES, LOADING_QUANTITY, LOADING_THUMB, useStyles } from './InventoryTab.styles';
import { InventoryTutorial } from './InventoryTutorial';
import { usePageSize } from './pageSizeContext';

// The Inventory tab, the same as the web: every item as a card, a search by name or part code, and a counter
// of the items shown, the total and the stock alerts. Low and out-of-stock cards are tinted by the table, and an item
// that reaches its minimum raises a warning in the bell, once while it stays there (a toast too when a save or an
// import brought it there).
// "Novo item" and each card's pencil open the item form, each card's trash asks to confirm deleting the item, and
// the list loads again once an item is saved or deleted. A card is an item; one made by several brands shows their
// codes, the quantity added up and "N marcas", with a chevron at its left in the accent: a tap anywhere on it opens a
// card for each brand under it, indented, with the brand's own part brand, code, quantity and photos, no tint (the
// stock status is the item's) and no actions, and closes them again. A tap on a brand's card opens the item's details
// scrolled to that brand, and one on an item of one brand opens its details. "Gerenciar listas" renames, merges and deletes the
// categories, brands and models the form picks from; the list loads again after each change, the filters following a
// name renamed or merged, and a name in use leads to its items. "Importar CSV" adds and updates many items at once from a spreadsheet, and the list and the lists load again;
// "Exportar CSV" hands every item of the list as it is, on every page, to the share sheet in the same format.
// The details' Duplicar opens a new item's form filled in as a copy of it, with copies of its photos or without them. The
// Filtros menu, the stock status chips (one at a time) and "Limpar filtros" narrow the list the same as the web, sent
// to the API as the list query with the search, and the list shows one page of what matches, newest first, the size
// set in the user menu, moving pages as the web does. The "Ordenar" select sorts the list in the API by any of the
// web's columns, going back to the first page. While the items load, skeleton cards hold their place; when nothing is
// in stock, the empty state offers "Novo item", and when the search or the filters leave nothing, it offers to clear
// them; when the API fails, the error state offers to try again. Each card's thumbnail shows the item's cover and
// opens its photos in the ImageViewer (a brand's card, that brand's photos), where each photo removed, changed or added is saved at once and the list
// follows. The Inventory tutorial runs over the tab by itself the first time, and again from the user menu: it starts
// and ends with the test item deleted and the search, filters and sort off.

// The columns after the item's name, each reading the card as one item (see rowItem).
const COLUMNS: ComponentProps<typeof DataTable<InventoryRow>>['columns'] = [
  // The card shows these in the line under the name; they are here so "Ordenar" sorts by them, as the web's columns do.
  ...(
    [
      ['category', 'Categoria'],
      ['partBrand', 'Marca'],
      ['vehicle', 'Veículo'],
      ['position', 'Posição'],
      ['side', 'Lado'],
      ['color', 'Cor'],
      ['location', 'Local'],
    ] as const
  ).map(([key, header]) => ({ key, header, sortable: true, cell: () => null })),
  { key: 'price', header: 'Valor unit.', sortLabel: 'Valor unitário', sortable: true, numeric: true, cell: () => null },
  {
    key: 'quantity',
    header: 'Qtd.',
    sortLabel: 'Quantidade',
    sortable: true,
    numeric: true,
    card: 'end',
    cell: (row) => <NumericReadout>{rowItem(row).quantity}</NumericReadout>,
  },
];
// The stock status chips, outside the menu: one at a time, none for every item.
const STATUS_OPTIONS = ITEM_STATUSES.map((value) => ({ value, label: STOCK_STATUS_LABELS[value] }));

/** A card of the list: an item, or one of its brands, under it once the item is opened. */
type InventoryRow = { item: Item; brand?: ItemBrand };

/**
 * Builds the column of each card's actions: the pencil that opens the item to edit and the trash that deletes it; a
 * brand's card has none, since the item's card edits and deletes the item with its brands.
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
    cell: ({ item, brand }) =>
      !brand && (
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
 * Builds the column of each card's chevron, at its left: on an item of several brands, in the accent, turned down
 * while its brands' cards are open.
 * @param opened The items opened into their brands' cards, by id.
 * @param accent The accent color.
 * @param ui The tab's styles and ids.
 * @returns The chevron column.
 */
function chevronColumn(
  opened: ReadonlySet<string>,
  accent: string,
  { styles, ids }: ReturnType<typeof useStyles>,
): ComponentProps<typeof DataTable<InventoryRow>>['columns'][number] {
  return {
    key: 'expand',
    header: 'Expandir',
    card: 'lead',
    cell: (row) =>
      !row.brand &&
      row.item.brands.length > 1 && (
        <View style={[styles.chevron, opened.has(row.item.id) && styles.chevronOpen]} testID={ids.chevron}>
          <Icon icon={chevronIcon} size={ICON_SIZES.label} color={accent} />
        </View>
      ),
  };
}

/**
 * Builds the column of each card's name: an item's name, codes and details, with "N marcas" when it has several; or
 * a brand's part brand, code and details.
 * @param ui The tab's styles and ids.
 * @returns The name column.
 */
function nameColumn({ styles, ids }: ReturnType<typeof useStyles>): ComponentProps<typeof DataTable<InventoryRow>>['columns'][number] {
  return {
    key: 'name',
    header: 'Item',
    sortable: true,
    card: 'main',
    cell: (row) =>
      row.brand ? (
        <View>
          <Text>{row.brand.partBrand}</Text>
          <NumericReadout tone="muted">{row.brand.code}</NumericReadout>
          <Text size="sm" tone="muted">
            {itemDetails(rowItem(row))}
          </Text>
        </View>
      ) : (
        <View ref={isTestItem(row.item) ? tourTarget('tutorial-row') : undefined} collapsable={false}>
          <Text>{row.item.name}</Text>
          <NumericReadout tone="muted">{itemCodes(row.item)}</NumericReadout>
          <Text size="sm" tone="muted">
            {itemDetails(row.item)}
          </Text>
          {row.item.brands.length > 1 && (
            <View style={styles.brands} testID={ids.brands}>
              <NumericReadout tone="accent">{`${row.item.brands.length} marcas`}</NumericReadout>
            </View>
          )}
        </View>
      ),
  };
}

/**
 * Builds the column of each card's thumbnail: the cover of the item's first brand, or of the card's brand, which
 * opens that brand's photos.
 * @param onOpen Opens the photos of an item's brand in the viewer.
 * @returns The photo column.
 */
function photoColumn(onOpen: (item: Item, brand: ItemBrand) => void): ComponentProps<typeof DataTable<InventoryRow>>['columns'][number] {
  return {
    key: 'photo',
    header: 'Foto',
    card: 'thumb',
    cell: (row) => {
      const [brand] = rowItem(row).brands;
      return (
        <TableThumbnail
          src={brand.photos[0] && `${API_URL}${brand.photos[0].thumbUrl}`}
          label={row.brand ? `Ver fotos de ${row.item.name} ${brand.partBrand}` : `Ver fotos de ${row.item.name}`}
          onOpen={() => onOpen(row.item, brand)}
        />
      );
    },
  };
}

/**
 * Reads a card as one item: the item itself, or for a brand's card an item of that brand alone, with its quantity.
 * @param row A card of the list.
 * @returns What the card's cells show.
 */
function rowItem(row: InventoryRow): Item {
  return row.brand ? { ...row.item, brands: [row.brand], quantity: row.brand.quantity } : row.item;
}

/**
 * Tells a card's status for the table's tint, from the item's quantity and minimum.
 * @param row A card of the list; a brand's card is never tinted (see DataTable's rowNested).
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
  const [page, setPage] = useState(1);
  const { pageSize: defaultSize } = usePageSize();
  const [pageSize, setPageSize] = useState(defaultSize);
  // A new default from the user menu also applies to the list on screen, keeping its first item in view.
  const [appliedDefault, setAppliedDefault] = useState(defaultSize);
  if (appliedDefault !== defaultSize) {
    setAppliedDefault(defaultSize);
    setPageSize(defaultSize);
    setPage(pageForSize(page, pageSize, defaultSize));
  }
  const narrowed = search.trim() !== '' || itemListQuery(filters, status) !== '';
  // Every item, for the counter, the filter options and the form; and the page of the items the search and the
  // filters let through.
  const state = useItems();
  const listed = useItems(itemListQuery(filters, status, { search, page, pageSize, sort }));
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
  // Whether the Filtros menu is open.
  const [filtering, setFiltering] = useState(false);
  const tutorial = useInventoryTutorial();
  // Whether the tutorial runs, and the items on screen when it, or a save or delete of the user, last sent a change:
  // until the list loads again, the change is still on its way, and the tutorial doesn't take it as left undone.
  const [touring, setTouring] = useState(false);
  const [sentWith, setSentWith] = useState<Item[]>();
  // The item the delete confirmation asks about, while it is open.
  const [removing, setRemoving] = useState<Item>();
  // The brand of an item whose photos the viewer shows, while it is open, with the photos on screen.
  const [viewer, setViewer] = useState<{ item: Item; brand: ItemBrand; photos: UploadPhoto[] }>();
  // The items opened into their brands' cards, by id.
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const items = state.status === 'ready' ? state.items : [];
  const shown = listed.status === 'ready' ? listed.items : [];
  const rows = shown.flatMap((item): InventoryRow[] => [
    { item },
    ...(opened.has(item.id) && item.brands.length > 1 ? item.brands.map((brand) => ({ item, brand })) : []),
  ]);
  const failed = state.status === 'error' || listed.status === 'error';
  // The list's total as last loaded, so the pagination keeps its pages while the next page loads; none on an error.
  const [loadedTotal, setLoadedTotal] = useState(0);
  if (listed.status === 'ready' && listed.total !== loadedTotal) {
    setLoadedTotal(listed.total);
  }
  // The error and the empty states sit centered in the list's room.
  const centered = failed || (listed.status === 'ready' && shown.length === 0);

  /** Changes the search, the filters, the stock status or the sort, going back to the first page. */
  const narrow = (change: () => void) => {
    change();
    setPage(1);
  };

  /** Turns off the search, the filters and the stock status, to show every item again. */
  const clearAll = () =>
    narrow(() => {
      setSearch('');
      setFilters(EMPTY_ITEM_FILTERS);
      setStatus(null);
    });

  /** Loads every item and the page on screen again, after one was saved or deleted. */
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

  /** Opens an item into its brands' cards, or closes it. */
  const toggleBrands = (id: string) =>
    setOpened((held) => {
      const next = new Set(held);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  /** Opens the item form on a new item, an item to edit, or an item's details, maybe with values and photos filled in. */
  const openForm = (item?: Item, details = false, initial?: ItemForm, photos?: UploadPhoto[][], brand?: string) =>
    setForm((current) => ({ open: true, item, details, brand, initial, photos, session: current.session + 1 }));

  /**
   * Opens a card: an item of several brands into its brands' cards, or closes it; an item of one brand into its
   * details; a brand's card into the item's details, scrolled to that brand.
   * @param row The card tapped.
   */
  const openRow = ({ item, brand }: InventoryRow) => {
    if (brand) {
      openForm(item, true, undefined, undefined, brand.id);
    } else if (item.brands.length > 1) {
      toggleBrands(item.id);
    } else {
      openForm(item, true);
    }
  };

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
    <Panel style={styles.panel}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.tab} keyboardShouldPersistTaps="handled" testID={ids.tab}>
        <View ref={tourTarget('search')} collapsable={false}>
          <SearchField
            label="Procure pelo nome ou código da peça"
            value={search}
            onValueChange={(value) => narrow(() => setSearch(value))}
          />
        </View>
        <View ref={tourTarget('new-item')} collapsable={false}>
          <Button onPress={() => openForm()}>Novo item</Button>
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
            <FilterMenu
              label="Filtros do estoque"
              title="Filtrar estoque"
              rows={(draft) => itemFilterRows(items, draft)}
              values={filters}
              onApply={(values) => narrow(() => setFilters(values))}
              open={filtering}
              onOpenChange={setFiltering}
              panelRef={tourTarget('filter-panel')}
            />
          </View>
          <FilterChipGroup
            label="Situação do estoque"
            options={STATUS_OPTIONS}
            value={status}
            onValueChange={(value) => narrow(() => setStatus(value as ItemStatus | null))}
          />
          <ClearFilters
            active={activeFilterCount(filters) > 0 || status !== null}
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
                  chevronColumn(opened, colors.accent, ui),
                  photoColumn((item, brand) => setViewer({ item, brand, photos: heldPhotos(brand.photos, API_URL) })),
                  nameColumn(ui),
                  ...COLUMNS,
                  actionsColumn((item) => openForm(item), setRemoving, ui),
                ]}
                rows={rows}
                rowKey={(row) => (row.brand ? `${row.item.id}:${row.brand.id}` : row.item.id)}
                rowStatus={rowStatus}
                rowNested={(row) => row.brand !== undefined}
                rowExpanded={(row) => (!row.brand && row.item.brands.length > 1 ? opened.has(row.item.id) : undefined)}
                onRowOpen={openRow}
                sort={sort}
                onSortChange={(next) => narrow(() => setSort(next))}
                unsortedLabel="Ordem de cadastro"
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
        </View>
      </ScrollView>
      <Pagination
        label="Páginas do estoque"
        page={page}
        pageSize={pageSize}
        total={failed ? 0 : loadedTotal}
        pageSizes={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
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
          // A new item is the newest, first on the first page.
          if (!form.item) {
            setPage(1);
          }
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
          setPage(1);
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
          // The last item of a page leaves it empty: the page before takes its place.
          if (shown.length === 1 && page > 1) {
            setPage(page - 1);
          }
          setRemoving(undefined);
          setSentWith(items);
          reload();
        }}
      />
    </Panel>
  );
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
