import { useCallback, useEffect, useEffectEvent, useState, type ComponentProps } from 'react';
import { View, type ViewStyle } from 'react-native';
import { pencilIcon, trashIcon } from '@apc/shared/icons';
import {
  ITEM_STATUSES,
  itemDetails,
  resultSummary,
  STOCK_STATUS_LABELS,
  stockStatus,
  type Item,
  type ItemStatus,
} from '@apc/shared/items';
import { activeFilterCount, type FilterValues } from '@apc/shared/filters';
import { EMPTY_ITEM_FILTERS, itemFilterRows, itemListQuery } from '@apc/shared/item-filters';
import { EMPTY_ITEM_FORM, itemFormBody, itemFormOptions, type ItemForm } from '@apc/shared/item-form';
import { TUTORIAL_ITEM } from '@apc/shared/inventory-tutorial';
import { PAGE_SIZES, pageForSize } from '@apc/shared/pagination';
import type { Sort } from '@apc/shared/table';
import { heldPhotos, ITEM_PHOTO_LIMIT } from '@apc/shared/photos';
import { scales } from '@apc/shared/theme';
import { API_URL } from '../api';
import { Button } from '../Button';
import { DataTable, RowAction, TableThumbnail } from '../DataTable';
import { EmptyState, ErrorState } from '../EmptyState';
import { FilterChipGroup } from '../FilterChip';
import { ClearFilters, FilterMenu } from '../FilterMenu';
import type { UploadPhoto } from '../ImageUpload';
import { ImageViewer } from '../ImageViewer';
import { DeleteItemDialog } from '../inventory/DeleteItemDialog';
import { ImportItemsDialog } from '../inventory/ImportItemsDialog';
import { ItemFormDialog } from '../inventory/ItemFormDialog';
import { ManageListsDialog } from '../inventory/ManageListsDialog';
import { pickPhotos, savePhotos } from '../inventory/photos';
import { useItemLists } from '../inventory/useItemLists';
import { useItems } from '../inventory/useItems';
import { Pagination } from '../Pagination';
import { Panel } from '../Panel';
import { Skeleton } from '../Skeleton';
import { Spinner } from '../Spinner';
import { SearchField } from '../TextField';
import { tourTarget } from '../tourTargets';
import { NumericReadout, Text } from '../Typography';
import { useInventoryTutorial } from './inventoryTutorialContext';
import { InventoryTutorial } from './InventoryTutorial';
import { useOpenItemOnRow } from './openItemOnRowContext';
import { usePageSize } from './pageSizeContext';

// The Inventory tab, the same as the web: every item as a card, a search by name or part code, and a counter
// of the items shown, the total and the stock alerts. Low and out-of-stock cards are tinted by the table.
// "Novo item" and each card's pencil open the item form, each card's trash asks to confirm deleting the item, and
// the list loads again once an item is saved or deleted. "Gerenciar listas" renames and deletes the categories,
// brands and models the form picks from; the list loads again after each change, and a name in use leads to its
// items. "Importar CSV" adds and updates many items at once from a spreadsheet, and the list and the lists load again.
// While "Abrir item ao clicar na linha" is on in the user menu, a tap on a card opens the item's details. The
// Filtros menu, the stock status chips (one at a time) and "Limpar filtros" narrow the list the same as the web, sent
// to the API as the list query with the search, and the list shows one page of what matches, newest first, the size
// set in the user menu, moving pages as the web does. The "Ordenar" select sorts the list in the API by any of the
// web's columns, going back to the first page. While the items load, skeleton cards hold their place; when nothing is
// in stock, the empty state offers "Novo item", and when the search or the filters leave nothing, it offers to clear
// them; when the API fails, the error state offers to try again. Each card's thumbnail shows the item's cover and
// opens its photos in the ImageViewer, where each photo removed, changed or added is saved at once and the list
// follows. The Inventory tutorial runs over the tab by itself the first time, and again from the user menu: it starts
// and ends with the test item deleted and the search, filters and sort off.

const ACTIONS_STYLE: ViewStyle = { flexDirection: 'row', gap: scales.space.s1 };
const COLUMNS: ComponentProps<typeof DataTable<Item>>['columns'] = [
  {
    key: 'name',
    header: 'Item',
    sortable: true,
    card: 'main',
    cell: (item) => (
      <View ref={item.code === TUTORIAL_ITEM.code ? tourTarget('tutorial-row') : undefined} collapsable={false}>
        <Text>{item.name}</Text>
        <NumericReadout tone="muted">{item.code}</NumericReadout>
        <Text size="sm" tone="muted">
          {itemDetails(item)}
        </Text>
      </View>
    ),
  },
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
    cell: (item) => <NumericReadout>{item.quantity}</NumericReadout>,
  },
];
const FILTERS_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: scales.space.s2 };
const LOADING_LINES_STYLE: ViewStyle = { flex: 1, gap: scales.space.s2 };
// The skeleton's quantity, the width of a short number.
const LOADING_QUANTITY = scales.space.s1 * 14;
const LOADING_ROW_STYLE: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: scales.space.s3 };
const LOADING_STYLE: ViewStyle = { gap: scales.space.s3, paddingVertical: scales.space.s2 };
// The skeleton's thumbnail, the size of a card's thumbnail.
const LOADING_THUMB = scales.space.s1 * 11;
// The stock status chips, outside the menu: one at a time, none for every item.
const STATUS_OPTIONS = ITEM_STATUSES.map((value) => ({ value, label: STOCK_STATUS_LABELS[value] }));
const TAB_STYLE: ViewStyle = { gap: scales.space.s3 };

/**
 * Builds the column of each card's actions: the pencil that opens the item to edit and the trash that deletes it.
 * @param onEdit Opens an item in the item form.
 * @param onDelete Asks to confirm deleting an item.
 * @returns The actions column.
 */
function actionsColumn(
  onEdit: (item: Item) => void,
  onDelete: (item: Item) => void,
): ComponentProps<typeof DataTable<Item>>['columns'][number] {
  return {
    key: 'actions',
    header: 'Ações',
    card: 'actions',
    cell: (item) => (
      <View style={ACTIONS_STYLE}>
        <View ref={item.code === TUTORIAL_ITEM.code ? tourTarget('tutorial-pencil') : undefined} collapsable={false}>
          <RowAction icon={pencilIcon} label={`Editar ${item.name}`} onPress={() => onEdit(item)} />
        </View>
        <View ref={item.code === TUTORIAL_ITEM.code ? tourTarget('tutorial-trash') : undefined} collapsable={false}>
          <RowAction icon={trashIcon} label={`Excluir ${item.name}`} tone="danger" onPress={() => onDelete(item)} />
        </View>
      </View>
    ),
  };
}

/**
 * Builds the column of each card's thumbnail: the item's cover, which opens its photos.
 * @param onOpen Opens an item's photos in the viewer.
 * @returns The photo column.
 */
function photoColumn(onOpen: (item: Item) => void): ComponentProps<typeof DataTable<Item>>['columns'][number] {
  return {
    key: 'photo',
    header: 'Foto',
    card: 'thumb',
    cell: (item) => (
      <TableThumbnail
        src={item.photos[0] && `${API_URL}${item.photos[0].thumbUrl}`}
        label={`Ver fotos de ${item.name}`}
        onOpen={() => onOpen(item)}
      />
    ),
  };
}

/**
 * Tells a card's status for the table's tint, from the item's quantity and minimum.
 * @param item Inventory item.
 * @returns The tint and the label read out, or undefined when stock is fine.
 */
function rowStatus(item: Item): { tone: 'warn' | 'danger'; label: string } | undefined {
  const status = stockStatus(item.quantity, item.minQuantity);
  return status ? { tone: status === 'out' ? 'danger' : 'warn', label: STOCK_STATUS_LABELS[status] } : undefined;
}

export function InventoryTab() {
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
  // The lists the item form picks from and creates names in.
  const { lists, create: createEntry, rename: renameEntry, remove: removeEntry, reload: reloadLists } = useItemLists();
  // Whether "Gerenciar listas" is open.
  const [managing, setManaging] = useState(false);
  // Whether "Importar CSV" is open; each opening starts with no file.
  const [importer, setImporter] = useState({ open: false, session: 0 });
  const { opensOnRow } = useOpenItemOnRow();
  // The item form: closed, open on a new item, an item to edit or an item's details, maybe with values filled in.
  // Each opening starts a new form.
  const [form, setForm] = useState<{ open: boolean; item?: Item; details?: boolean; initial?: ItemForm; session: number }>({
    open: false,
    session: 0,
  });
  // The form as typed, and whether it shows the details, which the tutorial's steps read.
  const [typed, setTyped] = useState<{ values: ItemForm; viewing: boolean }>();
  const followForm = useCallback((values: ItemForm, viewing: boolean) => setTyped({ values, viewing }), []);
  // Whether the Filtros menu is open.
  const [filtering, setFiltering] = useState(false);
  const tutorial = useInventoryTutorial();
  // Whether the tutorial runs, and the items on screen when it last sent a change: until the list loads again, the
  // change is still on its way.
  const [touring, setTouring] = useState(false);
  const [sentWith, setSentWith] = useState<Item[]>();
  // The item the delete confirmation asks about, while it is open.
  const [removing, setRemoving] = useState<Item>();
  // The item whose photos the viewer shows, while it is open, with the photos on screen.
  const [viewer, setViewer] = useState<{ item: Item; photos: UploadPhoto[] }>();
  const items = state.status === 'ready' ? state.items : [];
  const shown = listed.status === 'ready' ? listed.items : [];
  const failed = state.status === 'error' || listed.status === 'error';

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
   * @param photos The item's photos after the change.
   * @returns Whether they were saved.
   */
  const changePhotos = async (photos: UploadPhoto[]) => {
    if (!viewer) {
      return false;
    }
    setViewer({ ...viewer, photos });
    const saved = await savePhotos(viewer.item, photos);
    if (!saved) {
      setViewer((current) => current && { ...current, photos: viewer.photos });
      return false;
    }
    setViewer((current) => current && { item: saved, photos: heldPhotos(saved.photos, API_URL) });
    reload();
    return true;
  };

  /** Opens the item form on a new item, an item to edit, or an item's details, maybe with values filled in. */
  const openForm = (item?: Item, details = false, initial?: ItemForm) =>
    setForm((current) => ({ open: true, item, details, initial, session: current.session + 1 }));

  /** Sends an item request for the tutorial, then loads the list and the lists again. */
  const send = async (url: string, method: string, body?: unknown) => {
    setSentWith(items);
    const json = body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    await fetch(url, { method, ...json }).catch(() => null);
    reload();
    reloadLists();
  };

  /** Deletes the tutorial's test item, if one is left from a run that didn't end, and loads the list again. */
  const deleteTestItem = async () => {
    const found = await fetch(`${API_URL}/items?${new URLSearchParams({ q: TUTORIAL_ITEM.code })}`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    for (const item of (found?.items ?? []) as Item[]) {
      if (item.code === TUTORIAL_ITEM.code) {
        await fetch(`${API_URL}/items/${item.id}`, { method: 'DELETE' }).catch(() => null);
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
    <Panel>
      <View style={TAB_STYLE}>
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
        <View style={FILTERS_STYLE}>
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
                photoColumn((item) => setViewer({ item, photos: heldPhotos(item.photos, API_URL) })),
                ...COLUMNS,
                actionsColumn((item) => openForm(item), setRemoving),
              ]}
              rows={shown}
              rowKey={(item) => item.id}
              rowStatus={rowStatus}
              onRowOpen={opensOnRow ? (item) => openForm(item, true) : undefined}
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
            <Pagination
              label="Páginas do estoque"
              page={page}
              pageSize={pageSize}
              total={listed.total}
              pageSizes={PAGE_SIZES}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </View>
      <ItemFormDialog
        key={`form-${form.session}`}
        open={form.open}
        item={form.item}
        details={form.details}
        items={items}
        lists={lists}
        onCreateEntry={createEntry}
        initialForm={form.initial}
        onFormChange={followForm}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        onSaved={() => {
          // A new item is the newest, first on the first page.
          if (!form.item) {
            setPage(1);
          }
          setForm((current) => ({ ...current, open: false }));
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
        onRemove={removeEntry}
        onChanged={reload}
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
        opensOnRow={opensOnRow}
      />
      <ImageViewer
        open={viewer !== undefined}
        onClose={() => setViewer(undefined)}
        name={viewer?.item.name ?? ''}
        code={viewer?.item.code ?? ''}
        photos={viewer?.photos ?? []}
        onPhotosChange={changePhotos}
        limit={ITEM_PHOTO_LIMIT}
        onPick={pickPhotos}
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
          reload();
        }}
      />
    </Panel>
  );
}

function LoadingRows() {
  return (
    <View accessibilityState={{ busy: true }} style={LOADING_STYLE}>
      <Spinner size="sm" label="Carregando o estoque" />
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} testID="loading-row" style={LOADING_ROW_STYLE}>
          <Skeleton shape="block" width={LOADING_THUMB} height={LOADING_THUMB} />
          <View style={LOADING_LINES_STYLE}>
            <Skeleton width="40%" />
            <Skeleton width="20%" />
          </View>
          <Skeleton width={LOADING_QUANTITY} />
        </View>
      ))}
    </View>
  );
}
