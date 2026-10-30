import { useCallback, useEffect, useEffectEvent, useRef, useState, type ComponentProps } from 'react'
import { apiFetch } from '@apc/shared/auth'
import { chevronIcon, filterIcon, ICON_SIZES, pencilIcon, plusIcon, sortIcon, trashIcon } from '@apc/shared/icons'
import {
  brandsValue,
  formatPriceRange,
  itemCardCode,
  itemCardDetails,
  itemCodes,
  itemDetails,
  itemVehiclesText,
  NOT_APPLICABLE,
  partBrandsLabel,
  POSITION_NAMES,
  QUANTITY_UNIT,
  resultSummary,
  SIDE_NAMES,
  ITEM_STATUSES,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_SHORT,
  stockCounts,
  stockStatus,
  type Item,
  type ItemBrand,
  type ItemStatus,
} from '@apc/shared/items'
import { activeFilterCount, type FilterValues } from '@apc/shared/filters'
import {
  EMPTY_ITEM_FILTERS,
  followEntryChange,
  ITEM_SORT_OPTIONS,
  itemFilterRows,
  itemListQuery,
  matchingCount,
} from '@apc/shared/item-filters'
import { duplicateForm, EMPTY_ITEM_FORM, itemFormBody, itemFormOptions, type ItemForm } from '@apc/shared/item-form'
import { TUTORIAL_CODE, type TutorialScreen } from '@apc/shared/inventory-tutorial'
import { PAGE_SIZES, pageForSize, SCROLL_PAGE_SIZE } from '@apc/shared/pagination'
import { sortValue, type Sort } from '@apc/shared/table'
import { copiedPhotos, heldPhotos, ITEM_PHOTO_LIMIT, photoAddress } from '@apc/shared/photos'
import { API_BASE } from '../api.ts'
import { useSession } from '../auth/sessionContext.ts'
import { Button } from '../components/Button.tsx'
import { DataTable, RowAction, TableThumbnail, TableTitle } from '../components/DataTable.tsx'
import { EmptyState, ErrorState } from '../components/EmptyState.tsx'
import { FilterChipGroup } from '../components/FilterChip.tsx'
import { Icon } from '../components/Icon.tsx'
import { ClearFilters, FilterMenu } from '../components/FilterMenu.tsx'
import { FilterSheet, SortSheet } from '../components/FilterSheet.tsx'
import type { UploadPhoto } from '../components/ImageUpload.tsx'
import { ImageViewer } from '../components/ImageViewer.tsx'
import { Pagination } from '../components/Pagination.tsx'
import { Panel } from '../components/Panel.tsx'
import { Skeleton } from '../components/Skeleton.tsx'
import { Spinner } from '../components/Spinner.tsx'
import { SearchField } from '../components/TextField.tsx'
import { ToolButton } from '../components/ToolButton.tsx'
import { usePhone } from '../components/usePhone.ts'
import { DeleteItemDialog } from '../inventory/DeleteItemDialog.tsx'
import { ExportItemsDialog } from '../inventory/ExportItemsDialog.tsx'
import { ImportItemsDialog } from '../inventory/ImportItemsDialog.tsx'
import { ItemFormDialog } from '../inventory/ItemFormDialog.tsx'
import { ManageListsDialog } from '../inventory/ManageListsDialog.tsx'
import { savePhotos } from '../inventory/savePhotos.ts'
import { useItemLists } from '../inventory/useItemLists.ts'
import { useItemPages } from '../inventory/useItemPages.ts'
import { useItems } from '../inventory/useItems.ts'
import { useLowStockAlerts } from '../notifications/useLowStockAlerts.ts'
import { useInventoryTutorial } from './inventoryTutorialContext.ts'
import { inventoryTab, LOADING_LINES, LOADING_QUANTITY, LOADING_THUMB } from './InventoryTab.styles.ts'
import { InventoryTutorial } from './InventoryTutorial.tsx'
import { usePageSize } from './pageSizeContext.ts'
import { tutorialTarget } from './tutorialTarget.ts'

// The Inventory tab (/inventory), the default tab: the items in the DataTable, a search by name or part code, the
// filters and a counter of the items shown, the total and the stock alerts. The Filtros menu narrows the list by
// category, brands, vehicle model, position and side, color and location, applied together; the Estoque baixo and
// Esgotado chips, one at a time, by stock status; and "Limpar filtros" turns them all off. The filters go to the API
// as the list query with the search, and the list shows one page of what matches, newest first: 25, 50 or 100 items,
// the default set in the user menu. A click on a column header (or the "Ordenar" select at phone width) sorts the
// list by that column in the API, a second click the other way. Changing the search, a filter or the sort goes back
// to the first page, a new item shows first on the first page, and deleting the last item of a page goes to the one
// before. While the items load, skeleton rows hold their place; when nothing is in stock, the empty state offers
// "Novo item", and when the search or the filters leave nothing, it offers to clear them; when the API fails, the
// error state offers to try again. "Novo item" and each row's pencil open the item form, each row's trash asks to
// confirm deleting the item, and the list loads again once an item is saved or deleted. A row is an item; one made by
// several brands shows them as one value (the first brand's code and part brand with how many more, a color or
// location they share or "Várias", the price from the lowest to the highest, the quantity added up, and "N marcas"),
// with a chevron at its left, in the accent: a click anywhere on it (or Enter on it) opens a row for each brand under
// it, with the brand's own values, its photos and no tint, since the stock status is the item's, and closes them
// again. A click on a brand's row opens the item's details scrolled to that brand, and one on an item of one brand
// opens its details. "Gerenciar listas" renames,
// merges and deletes the categories, brands and models the form picks from; the list loads again after each change,
// the filters following a name renamed or merged, and a name in use leads to its items. "Importar CSV" adds and updates many items at once from a spreadsheet, and the list
// and the lists load again; "Exportar CSV" saves every item of the list as it is, on every page, in the same format.
// The details' Duplicar opens a new item's form filled in as a copy of it, with copies
// of its photos or without them, its codes left blank and its stock at 0. Each row's thumbnail shows the item's cover and opens its photos in the
// ImageViewer (a brand's row, that brand's photos), where each photo removed, changed or added is saved at once and
// the list follows. Low and
// out-of-stock rows are tinted by the table, and an item that reaches its minimum raises a warning in the bell, once
// while it stays there (a toast too when a save or an import brought it there). At phone width the row becomes a card and the columns that leave it
// show as one line under the name. The Inventory tutorial runs over the tab by itself the first time, and again from
// the user menu: it starts and ends with the test item deleted and the search, filters and sort off.
// On a phone (below `card:`) the tab follows the Estoque mockup: no panel around it, and the page scrolls as a whole.
// Each card shows the item's name, its first code with its part brand or how many brands make it, and where it fits,
// where it is and its price; its quantity has its stock status under it (un., Baixo or Esgotado) in the card's tone. A
// tap on a card opens the item's details, an item of several brands too. The stock status chips name their counts
// ("Baixo · 5"), and "Novo item" is a round "+" at the bottom right, above the bottom bar. In place of the pagination
// and "Itens por página", the list loads its next SCROLL_PAGE_SIZE items once it scrolls within a screen of its end,
// skeleton cards showing while they come, and says "Fim da lista" once every item is in; a search, a filter or a sort
// starts it over, and a save or a delete loads what it shows again, so it stays where it was. Two round buttons take the
// place of the Filtros menu and the "Ordenar" select: Filtros opens "Filtrar e ordenar" in a bottom sheet (the filters
// and the sort, applied together on "Ver n itens", which counts the items they would show), and Ordenar the sorts
// alone, each in the accent while a filter or a sort is on. Gerenciar listas, Importar CSV and Exportar CSV and each
// card's pencil and trash stay until their phone forms come (#359, #360).

// The table's cells, styled once: the recipe has no variants they change.
const CELLS = inventoryTab()
// The columns after the item's name, each reading the row as one item (see rowItem).
const COLUMNS: ComponentProps<typeof DataTable<InventoryRow>>['columns'] = [
  { key: 'category', sortable: true, header: 'Categoria', cell: (row) => row.item.category },
  { key: 'partBrand', sortable: true, header: 'Marca', cell: (row) => partBrandsLabel(rowItem(row)) },
  {
    key: 'vehicle',
    header: 'Veículo',
    sortable: true,
    // The first vehicle, and how many more the item fits, every one in the tooltip.
    cell: ({ item }) => {
      const [first, ...others] = item.vehicles
      return (
        <span className={CELLS.classes.vehicle()} data-testid={CELLS.ids.vehicle} title={others.length > 0 ? itemVehiclesText(item) : undefined}>
          <span>{first.vehicleBrand}</span>
          <span className={CELLS.classes.model()} data-testid={CELLS.ids.model}>
            {first.vehicleModel ?? 'qualquer modelo'}
            {others.length > 0 && ` +${others.length}`}
          </span>
        </span>
      )
    },
  },
  { key: 'position', sortable: true, header: 'Posição', cell: ({ item }) => <Coded value={item.position} name={POSITION_NAMES[item.position]} /> },
  { key: 'side', sortable: true, header: 'Lado', cell: ({ item }) => <Coded value={item.side} name={SIDE_NAMES[item.side]} /> },
  {
    key: 'color',
    sortable: true,
    header: 'Cor',
    cell: (row) => {
      const color = brandsValue(rowItem(row), 'color')!
      return <Coded value={color} name={color === NOT_APPLICABLE ? 'Cor não se aplica' : color} />
    },
  },
  {
    key: 'location',
    sortable: true,
    header: 'Local',
    cell: (row) => (
      <span className={CELLS.classes.location()} data-testid={CELLS.ids.location}>
        {brandsValue(rowItem(row), 'location')}
      </span>
    ),
  },
  {
    key: 'price',
    header: 'Valor unit.',
    sortLabel: 'Valor unitário',
    sortable: true,
    numeric: true,
    cell: (row) => (
      <span className={CELLS.classes.price()} data-testid={CELLS.ids.price}>
        {formatPriceRange(rowItem(row))}
      </span>
    ),
  },
  { key: 'quantity', header: 'Qtd.', sortLabel: 'Quantidade', sortable: true, numeric: true, card: 'end', cell: (row) => <Quantity row={row} /> },
]
// The stock status chips, outside the menu: one at a time, none for every item.
const STATUS_OPTIONS = ITEM_STATUSES.map((value) => ({ value, label: STOCK_STATUS_LABELS[value] }))

/**
 * Names the stock status chips on a phone in short, each with how many items it finds.
 * @param items Every item in stock.
 * @returns The chips' options, e.g. "Baixo · 5" and "Esgotado · 4".
 */
function phoneStatusOptions(items: readonly Item[]) {
  const counts = stockCounts(items)
  return ITEM_STATUSES.map((value) => ({ value, label: `${STOCK_STATUS_SHORT[value]} · ${counts[value]}` }))
}

/** A row of the list: an item, or one of its brands, under it once the item is opened. */
type InventoryRow = { item: Item; brand?: ItemBrand }

/**
 * Reads a row as one item: the item itself, or for a brand's row an item of that brand alone, with its quantity.
 * @param row A row of the list.
 * @returns What the row's cells show.
 */
function rowItem(row: InventoryRow): Item {
  return row.brand ? { ...row.item, brands: [row.brand], quantity: row.brand.quantity } : row.item
}

/**
 * Tells a row's status for the table's tint, from the item's quantity and minimum.
 * @param row A row of the list; a brand's row is never tinted (see DataTable's rowNested).
 * @returns The tint and the label read out, or undefined when stock is fine.
 */
function rowStatus({ item }: InventoryRow): { tone: 'warn' | 'danger'; label: string } | undefined {
  const status = stockStatus(item.quantity, item.minQuantity)
  return status ? { tone: status === 'out' ? 'danger' : 'warn', label: STOCK_STATUS_LABELS[status] } : undefined
}

export function InventoryTab() {
  const { classes, ids } = inventoryTab()
  const [filters, setFilters] = useState<FilterValues>(EMPTY_ITEM_FILTERS)
  const [status, setStatus] = useState<ItemStatus | null>(null)
  const [search, setSearch] = useState('')
  // The column the list is sorted by, or null for the newest first.
  const [sort, setSort] = useState<Sort | null>(null)
  const [page, setPage] = useState(1)
  const { pageSize: defaultSize } = usePageSize()
  const [pageSize, setPageSize] = useState(defaultSize)
  // A new default from the user menu also applies to the list on screen, keeping its first item in view.
  const [appliedDefault, setAppliedDefault] = useState(defaultSize)
  if (appliedDefault !== defaultSize) {
    setAppliedDefault(defaultSize)
    setPageSize(defaultSize)
    setPage(pageForSize(page, pageSize, defaultSize))
  }
  const narrowed = search.trim() !== '' || itemListQuery(filters, status) !== ''
  const filterCount = activeFilterCount(filters)
  const sortLabel = ITEM_SORT_OPTIONS.find((option) => option.value === sortValue(sort))?.label
  const phone = usePhone()
  // On a phone, how many pages the list shows, loading the next as it scrolls to its end.
  const [pages, setPages] = useState(1)
  // Every item, for the counter, the filter options and the form; and the items the search and the filters let
  // through: a page of them on the desktop, the pages loaded so far on a phone.
  const state = useItems()
  const paged = useItems(itemListQuery(filters, status, { search, page, pageSize, sort }), !phone)
  const scrolled = useItemPages(itemListQuery(filters, status, { search, pageSize: SCROLL_PAGE_SIZE, sort }), pages, phone)
  const listed = phone ? scrolled : paged
  const { user } = useSession()
  // Each time the stock loads, warn about the items newly at or below their minimum.
  useLowStockAlerts(state.status === 'ready' ? state.items : null, user?.id ?? '')
  // The lists the item form picks from and creates names in.
  const { lists, create: createEntry, merge: mergeEntry, rename: renameEntry, remove: removeEntry, reload: reloadLists } = useItemLists()
  // Whether "Gerenciar listas" is open.
  const [managing, setManaging] = useState(false)
  // Whether "Importar CSV" is open; each opening starts with no file.
  const [importer, setImporter] = useState({ open: false, session: 0 })
  // Whether "Exportar CSV" is open; each opening starts without the photo paths.
  const [exporter, setExporter] = useState({ open: false, session: 0 })
  // The item form: closed, open on a new item, an item to edit or an item's details (maybe scrolled to a brand),
  // maybe with values and photos filled in. Each opening starts a new form.
  const [form, setForm] = useState<{
    open: boolean
    item?: Item
    details?: boolean
    brand?: string
    initial?: ItemForm
    photos?: UploadPhoto[][]
    session: number
  }>({
    open: false,
    session: 0,
  })
  // The form as typed, and whether it shows the details, which the tutorial's steps read.
  const [typed, setTyped] = useState<{ values: ItemForm; viewing: boolean }>()
  const followForm = useCallback((values: ItemForm, viewing: boolean) => setTyped({ values, viewing }), [])
  // Whether the Filtros menu (a phone's filter sheet) is open, and a phone's sort sheet.
  const [filtering, setFiltering] = useState(false)
  const [sorting, setSorting] = useState(false)
  const tutorial = useInventoryTutorial()
  // Whether the tutorial runs, and the items on screen when it, or a save or delete of the user, last sent a change:
  // until the list loads again, the change is still on its way, and the tutorial doesn't take it as left undone.
  const [touring, setTouring] = useState(false)
  const [sentWith, setSentWith] = useState<Item[]>()
  // The item the delete confirmation asks about, while it is open.
  const [removing, setRemoving] = useState<Item>()
  // The brand of an item whose photos the viewer shows, while it is open, with the photos on screen.
  const [viewer, setViewer] = useState<{ item: Item; brand: ItemBrand; photos: UploadPhoto[] }>()
  // The items opened into their brands' rows, by id.
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set())
  const items = state.status === 'ready' ? state.items : []
  const shown = listed.status === 'ready' ? listed.items : []
  const rows = shown.flatMap((item): InventoryRow[] => [
    { item },
    ...(opened.has(item.id) && item.brands.length > 1 ? item.brands.map((brand) => ({ item, brand })) : []),
  ])
  const failed = state.status === 'error' || listed.status === 'error'
  // The list's total as last loaded, so the pagination keeps its pages while the next page loads; none on an error.
  const [loadedTotal, setLoadedTotal] = useState(0)
  if (listed.status === 'ready' && listed.total !== loadedTotal) {
    setLoadedTotal(listed.total)
  }

  /** Changes the search, the filters, the stock status or the sort, going back to the first page. */
  const narrow = (change: () => void) => {
    change()
    setPage(1)
    setPages(1)
  }

  /** Turns off the search, the filters and the stock status, to show every item again. */
  const clearAll = () =>
    narrow(() => {
      setSearch('')
      setFilters(EMPTY_ITEM_FILTERS)
      setStatus(null)
    })

  /** Loads every item and the page on screen again, after one was saved or deleted. */
  const reload = () => {
    state.reload()
    listed.reload()
  }

  /**
   * Saves the photos the viewer changed, showing them at once and going back to the saved ones if they can't be saved.
   * @param photos The brand's photos after the change.
   * @returns Whether they were saved.
   */
  const changePhotos = async (photos: UploadPhoto[]) => {
    if (!viewer) {
      return false
    }
    setViewer({ ...viewer, photos })
    const saved = await savePhotos(viewer.item, viewer.brand, photos)
    if (!saved) {
      setViewer((current) => current && { ...current, photos: viewer.photos })
      return false
    }
    const brand = saved.brands.find((each) => each.id === viewer.brand.id) ?? viewer.brand
    setViewer((current) => current && { item: saved, brand, photos: heldPhotos(brand.photos, API_BASE) })
    reload()
    return true
  }

  /** Opens an item into its brands' rows, or closes it. */
  const toggleBrands = (id: string) =>
    setOpened((held) => {
      const next = new Set(held)
      if (!next.delete(id)) {
        next.add(id)
      }
      return next
    })

  /** Opens the item form on a new item, an item to edit, or an item's details, maybe with values and photos filled in. */
  const openForm = (item?: Item, details = false, initial?: ItemForm, photos?: UploadPhoto[][], brand?: string) =>
    setForm((current) => ({ open: true, item, details, brand, initial, photos, session: current.session + 1 }))

  /**
   * Opens a row: an item of several brands into its brands' rows, or closes it; an item of one brand into its
   * details; a brand's row into the item's details, scrolled to that brand.
   * @param row The row clicked, or the one Enter was pressed on.
   */
  const openRow = ({ item, brand }: InventoryRow) => {
    if (brand) {
      openForm(item, true, undefined, undefined, brand.id)
    } else if (item.brands.length > 1 && !phone) {
      toggleBrands(item.id)
    } else {
      openForm(item, true)
    }
  }

  /**
   * Opens a new item's form filled in as a copy of an item, in place of its details.
   * @param item The item to copy.
   * @param withPhotos Whether each brand of the copy takes copies of its brand's photos.
   */
  const duplicate = (item: Item, withPhotos: boolean) =>
    openForm(undefined, false, duplicateForm(item), withPhotos ? item.brands.map((brand) => copiedPhotos(brand.photos, API_BASE)) : undefined)

  /** Sends an item request for the tutorial, then loads the list and the lists again. */
  const send = async (url: string, method: string, body?: unknown) => {
    setSentWith(items)
    const json = body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    await apiFetch(url, { method, ...json }).catch(() => null)
    reload()
    reloadLists()
  }

  /** Deletes the tutorial's test item, if one is left from a run that didn't end, and loads the list again. */
  const deleteTestItem = async () => {
    const found = await apiFetch(`${API_BASE}/items?${new URLSearchParams({ q: TUTORIAL_CODE })}`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
    for (const item of (found?.items ?? []) as Item[]) {
      if (item.brands.some((brand) => brand.code === TUTORIAL_CODE)) {
        await apiFetch(`${API_BASE}/items/${item.id}`, { method: 'DELETE' }).catch(() => null)
      }
    }
    reload()
  }

  /** Closes what is open and turns off the search, filters and sort, as the tutorial starts and ends. */
  const clearForTutorial = () => {
    setForm((current) => ({ ...current, open: false }))
    setRemoving(undefined)
    setFiltering(false)
    narrow(() => {
      setSearch('')
      setFilters(EMPTY_ITEM_FILTERS)
      setStatus(null)
      setSort(null)
    })
  }

  // Run the tutorial by itself the first time, once the items are in, and again when the user menu asks.
  if (!touring && ((!tutorial.seen && state.status === 'ready') || tutorial.replayAsked)) {
    setTouring(true)
    clearForTutorial()
  }

  // Once it runs, the tutorial counts as seen, and starts without a test item left from a run that didn't end.
  const tutorialStarted = useEffectEvent(() => {
    tutorial.setSeen()
    tutorial.replayStarted()
    void deleteTestItem()
  })
  useEffect(() => {
    if (touring) {
      tutorialStarted()
    }
  }, [touring])

  // The tab as the tutorial sees it, and what "Fazer por mim" does on it.
  const testItem = items.find((item) => item.brands.some((brand) => brand.code === TUTORIAL_CODE))
  const screen: TutorialScreen<Element> = {
    form: form.open
      ? { item: form.item, viewing: typed?.viewing ?? Boolean(form.details), values: typed?.values ?? form.initial ?? EMPTY_ITEM_FORM }
      : null,
    items,
    search,
    filters,
    filtersOpen: filtering,
    removing,
    busy: sentWith === items,
    target: (name) => tutorialTarget(name, TUTORIAL_CODE, testItem?.name),
    openForm,
    setSearch: (value) => narrow(() => setSearch(value)),
    applyFilters: (values) => {
      setFiltering(false)
      narrow(() => setFilters(values))
    },
    saveItem: (item, values) => {
      setForm((current) => ({ ...current, open: false }))
      const body = itemFormBody(values, itemFormOptions(items, lists).colors)
      void send(item ? `${API_BASE}/items/${item.id}` : `${API_BASE}/items`, item ? 'PATCH' : 'POST', body)
    },
    askDelete: setRemoving,
    deleteItem: (item) => {
      setRemoving(undefined)
      void send(`${API_BASE}/items/${item.id}`, 'DELETE')
    },
  }

  return (
    <Panel className={classes.base()}>
      <div className={classes.body()} data-testid={ids.body}>
        <div className={classes.toolbar()} data-testid={ids.toolbar}>
          <div className={classes.search()} data-testid={ids.search}>
            <SearchField
              data-tour="search"
              label="Procure pelo nome ou código da peça"
              value={search}
              onValueChange={(value) => narrow(() => setSearch(value))}
            />
          </div>
          <div className={classes.buttons()} data-testid={ids.buttons}>
            <Button variant="secondary" onClick={() => setManaging(true)}>
              Gerenciar listas
            </Button>
            <Button variant="secondary" onClick={() => setImporter((current) => ({ open: true, session: current.session + 1 }))}>
              Importar CSV
            </Button>
            <Button variant="secondary" onClick={() => setExporter((current) => ({ open: true, session: current.session + 1 }))}>
              Exportar CSV
            </Button>
            {!phone && (
              <Button data-tour="new-item" onClick={() => openForm()}>
                Novo item
              </Button>
            )}
          </div>
        </div>
        <div className={classes.filters()} data-testid={ids.filters}>
          {phone ? (
            <>
              <ToolButton
                icon={filterIcon}
                label={filterCount ? `Filtros, ${filterCount} ${filterCount === 1 ? 'ativo' : 'ativos'}` : 'Filtros'}
                active={filterCount > 0}
                aria-expanded={filtering}
                data-tour="filters"
                onClick={() => setFiltering(true)}
              />
              <ToolButton
                icon={sortIcon}
                label={sort ? `Ordenar, ${sortLabel}` : 'Ordenar'}
                active={sort !== null}
                aria-expanded={sorting}
                onClick={() => setSorting(true)}
              />
            </>
          ) : (
            <FilterMenu
              label="Filtros do estoque"
              title="Filtrar estoque"
              rows={(draft) => itemFilterRows(items, draft)}
              values={filters}
              onApply={(values) => narrow(() => setFilters(values))}
              open={filtering}
              onOpenChange={setFiltering}
            />
          )}
          <FilterChipGroup
            label="Situação do estoque"
            options={phone ? phoneStatusOptions(state.status === 'ready' ? state.items : []) : STATUS_OPTIONS}
            value={status}
            onValueChange={(value) => narrow(() => setStatus(value as ItemStatus | null))}
          />
          <ClearFilters
            active={filterCount > 0 || status !== null}
            onClear={() =>
              narrow(() => {
                setFilters(EMPTY_ITEM_FILTERS)
                setStatus(null)
              })
            }
          />
          {state.status === 'ready' && listed.status === 'ready' && (
            <p className={classes.count()} data-testid={ids.count}>
              {resultSummary(listed.status === 'ready' ? listed.total : 0, items)}
            </p>
          )}
        </div>
        <div className={inventoryTab({ centered: failed }).classes.list()} data-testid={ids.list}>
          {failed && (
            <ErrorState
              title="Não foi possível carregar o estoque"
              message="Verifique a conexão com o servidor e tente de novo."
              action={{ label: 'Tentar de novo', onClick: reload }}
            />
          )}
          {!failed && listed.status === 'loading' && <LoadingRows />}
          {!failed && listed.status === 'ready' && (
            <DataTable
              fill
              label="Itens do estoque"
              columns={[
                {
                  key: 'expand',
                  header: 'Expandir',
                  headerHidden: true,
                  card: 'lead',
                  // An item of several brands: a chevron that turns down while its brands' rows are open.
                  cell: (row) =>
                    !phone &&
                    !row.brand &&
                    row.item.brands.length > 1 && (
                      <span aria-hidden="true" className={inventoryTab({ open: opened.has(row.item.id) }).classes.chevron()} data-testid={ids.chevron}>
                        <Icon icon={chevronIcon} size={ICON_SIZES.label} />
                      </span>
                    ),
                },
                {
                  key: 'photo',
                  header: 'Foto',
                  headerHidden: true,
                  card: 'thumb',
                  cell: (row) => {
                    const [brand] = rowItem(row).brands
                    return (
                      <TableThumbnail
                        src={brand.photos[0] && photoAddress(brand.photos[0].thumbUrl, API_BASE)}
                        label={row.brand ? `Ver fotos de ${row.item.name} ${brand.partBrand}` : `Ver fotos de ${row.item.name}`}
                        onOpen={() => setViewer({ item: row.item, brand, photos: heldPhotos(brand.photos, API_BASE) })}
                      />
                    )
                  },
                },
                {
                  key: 'name',
                  header: 'Item',
                  sortable: true,
                  card: 'main',
                  cell: (row) =>
                    row.brand ? (
                      <TableTitle title={row.brand.partBrand} code={row.brand.code} details={itemDetails(rowItem(row))} />
                    ) : phone ? (
                      <TableTitle title={row.item.name} code={itemCardCode(row.item)} details={itemCardDetails(row.item)} />
                    ) : (
                      <span className={classes.title()} data-testid={ids.title}>
                        <TableTitle title={row.item.name} code={itemCodes(row.item)} details={itemDetails(row.item)} />
                        {row.item.brands.length > 1 && (
                          <span className={classes.brands()} data-testid={ids.brands}>
                            {row.item.brands.length} marcas
                          </span>
                        )}
                      </span>
                    ),
                },
                ...COLUMNS,
                {
                  key: 'actions',
                  header: 'Ações',
                  headerHidden: true,
                  numeric: true,
                  card: 'actions',
                  // A brand's row has none: the item's row edits and deletes the item with its brands.
                  cell: ({ item, brand }) =>
                    !brand && (
                      <span className={classes.actions()} data-testid={ids.actions}>
                        <RowAction icon={pencilIcon} label={`Editar ${item.name}`} onClick={() => openForm(item)} />
                        <RowAction
                          icon={trashIcon}
                          label={`Excluir ${item.name}`}
                          tone="danger"
                          onClick={() => setRemoving(item)}
                        />
                      </span>
                    ),
                },
              ]}
              rows={rows}
              rowKey={(row) => (row.brand ? `${row.item.id}:${row.brand.id}` : row.item.id)}
              rowStatus={rowStatus}
              rowNested={(row) => row.brand !== undefined}
              rowExpanded={(row) => (!phone && !row.brand && row.item.brands.length > 1 ? opened.has(row.item.id) : undefined)}
              onRowOpen={openRow}
              sort={sort}
              onSortChange={(next) => narrow(() => setSort(next))}
              unsortedLabel="Ordem de cadastro"
              sortSelect={!phone}
              empty={
                narrowed ? (
                  <EmptyState
                    title="Nenhum item encontrado"
                    message="Ajuste a busca ou limpe os filtros para ver o estoque inteiro."
                    action={{ label: 'Limpar filtros', onClick: clearAll }}
                  />
                ) : (
                  <EmptyState
                    title="Nenhum item cadastrado"
                    message="Cadastre a primeira peça do estoque para ela aparecer aqui."
                    action={{ label: 'Novo item', onClick: () => openForm() }}
                  />
                )
              }
            />
          )}
          {!failed && listed.status === 'ready' && phone && listed.items.length > 0 && (
            <ListEnd count={listed.items.length} total={listed.total} loading={scrolled.status === 'ready' && scrolled.more} onNear={() => setPages((count) => count + 1)} />
          )}
        </div>
      </div>
      {!phone && (
        <Pagination
          label="Páginas do estoque"
          page={page}
          pageSize={pageSize}
          total={failed ? 0 : loadedTotal}
          pageSizes={PAGE_SIZES}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
      {phone && (
        <button
          type="button"
          aria-label="Novo item"
          data-tour="new-item"
          className={classes.fab()}
          data-testid={ids.fab}
          onClick={() => openForm()}
        >
          <Icon icon={plusIcon} size={ICON_SIZES.fab} />
        </button>
      )}
      {phone && (
        <>
          <FilterSheet
            open={filtering}
            onClose={() => setFiltering(false)}
            rows={(draft) => itemFilterRows(items, draft)}
            values={filters}
            sort={sort}
            sortOptions={ITEM_SORT_OPTIONS}
            count={(draft) => matchingCount(items, draft, status, search)}
            onApply={(values, next) => {
              setFiltering(false)
              narrow(() => {
                setFilters(values)
                setSort(next)
              })
            }}
          />
          <SortSheet
            open={sorting}
            onClose={() => setSorting(false)}
            sort={sort}
            options={ITEM_SORT_OPTIONS}
            onSortChange={(next) => narrow(() => setSort(next))}
          />
        </>
      )}
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
            setPage(1)
          }
          setForm((current) => ({ ...current, open: false }))
          setSentWith(items)
          reload()
        }}
      />
      <ImportItemsDialog
        key={`import-${importer.session}`}
        open={importer.open}
        lists={lists}
        onClose={() => setImporter((current) => ({ ...current, open: false }))}
        onImported={() => {
          setImporter((current) => ({ ...current, open: false }))
          setPage(1)
          reload()
          reloadLists()
        }}
      />
      <ExportItemsDialog
        key={`export-${exporter.session}`}
        open={exporter.open}
        query={itemListQuery(filters, status, { search, sort })}
        count={listed.status === 'ready' ? listed.total : 0}
        narrowed={narrowed}
        onClose={() => setExporter((current) => ({ ...current, open: false }))}
      />
      <ManageListsDialog
        open={managing}
        lists={lists}
        items={items}
        onRename={renameEntry}
        onMerge={mergeEntry}
        onRemove={removeEntry}
        onChanged={(change) => {
          reload()
          if (change) {
            setFilters((held) => followEntryChange(held, change))
          }
        }}
        onShowItems={(shown) => {
          setManaging(false)
          narrow(() => {
            setSearch('')
            setStatus(null)
            setFilters(shown)
          })
        }}
        onClose={() => setManaging(false)}
      />
      <InventoryTutorial
        open={touring}
        onClose={() => {
          setTouring(false)
          clearForTutorial()
          void deleteTestItem()
        }}
        screen={screen}
      />
      <ImageViewer
        open={viewer !== undefined}
        onClose={() => setViewer(undefined)}
        name={viewer?.item.name ?? ''}
        code={viewer?.brand.code ?? ''}
        photos={viewer?.photos ?? []}
        onPhotosChange={changePhotos}
        limit={ITEM_PHOTO_LIMIT}
      />
      <DeleteItemDialog
        open={removing !== undefined}
        item={removing}
        onClose={() => setRemoving(undefined)}
        onDeleted={() => {
          // The last item of a page leaves it empty: the page before takes its place.
          if (shown.length === 1 && page > 1) {
            setPage(page - 1)
          }
          setRemoving(undefined)
          setSentWith(items)
          reload()
        }}
      />
    </Panel>
  )
}

type ListEndProps = {
  /** How many items the list shows. */
  count: number
  /** How many match in all. */
  total: number
  /** Whether the next items are on their way. */
  loading: boolean
  /** Asks for the next items. */
  onNear: () => void
}

/**
 * The end of a phone's list as it loads more: skeleton cards while the next items come, a mark that asks for them once
 * it is within a screen of the window's bottom, or "Fim da lista" once every item is in.
 */
function ListEnd({ count, total, loading, onNear }: ListEndProps) {
  const { classes, ids } = inventoryTab()
  const mark = useRef<HTMLDivElement>(null)
  const near = useEffectEvent(onNear)
  const done = count >= total

  // Watch the mark again after each load: one still within a screen of the bottom asks for more at once.
  useEffect(() => {
    const element = mark.current
    if (!element || done || loading) {
      return
    }
    const watch = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && near(), { rootMargin: '0px 0px 100% 0px' })
    watch.observe(element)
    return () => watch.disconnect()
  }, [count, done, loading])

  if (done) {
    return (
      <p className={classes.end()} data-testid={ids.end}>
        Fim da lista
      </p>
    )
  }
  return (
    <>
      {loading && <LoadingRows />}
      <div ref={mark} className={classes.more()} data-testid={ids.more} />
    </>
  )
}

function LoadingRows() {
  const { classes, ids } = inventoryTab()
  return (
    <div aria-busy="true" className={classes.loading()} data-testid={ids.loading}>
      <Spinner size="sm" label="Carregando o estoque" className={classes.spinner()} />
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className={classes.loadingRow()} data-testid={ids.loadingRow}>
          <Skeleton shape="block" width={LOADING_THUMB} height={LOADING_THUMB} />
          <div className={classes.loadingLines()} data-testid={ids.loadingLines}>
            {LOADING_LINES.map((width) => (
              <Skeleton key={width} width={width} />
            ))}
          </div>
          <Skeleton width={LOADING_QUANTITY} />
        </div>
      ))}
    </div>
  )
}

/**
 * Shows a row's quantity; on a phone's card, with its stock status under it, in its tone: "un.", "Baixo" or
 * "Esgotado".
 */
function Quantity({ row }: { row: InventoryRow }) {
  const phone = usePhone()
  const { quantity, minQuantity } = rowItem(row)
  // A brand's row is never tinted, since the stock status is the item's.
  const status = row.brand ? null : stockStatus(quantity, minQuantity)
  const { classes, ids } = inventoryTab({ stock: status ?? 'ok' })
  if (!phone) {
    return quantity
  }
  return (
    <span className={classes.quantity()} data-testid={ids.quantity}>
      <span className={classes.quantityValue()} data-testid={ids.quantityValue}>
        {quantity}
      </span>
      <span className={classes.quantityTag()} data-testid={ids.quantityTag}>
        {status ? STOCK_STATUS_SHORT[status] : QUANTITY_UNIT}
      </span>
    </span>
  )
}

function Coded({ value, name }: { value: string; name: string }) {
  const { classes, ids } = inventoryTab({ muted: value === NOT_APPLICABLE })
  return (
    <span title={name} className={classes.coded()} data-testid={ids.coded}>
      {value}
    </span>
  )
}
