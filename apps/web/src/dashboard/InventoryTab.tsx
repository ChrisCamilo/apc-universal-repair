import { useCallback, useEffect, useEffectEvent, useState, type ComponentProps } from 'react'
import { pencilIcon, trashIcon } from '@apc/shared/icons'
import {
  formatPrice,
  itemDetails,
  NOT_APPLICABLE,
  POSITION_NAMES,
  resultSummary,
  SIDE_NAMES,
  ITEM_STATUSES,
  STOCK_STATUS_LABELS,
  stockStatus,
  type Item,
  type ItemStatus,
} from '@apc/shared/items'
import { activeFilterCount, type FilterValues } from '@apc/shared/filters'
import { EMPTY_ITEM_FILTERS, itemFilterRows, itemListQuery } from '@apc/shared/item-filters'
import { EMPTY_ITEM_FORM, itemFormBody, itemFormOptions, type ItemForm } from '@apc/shared/item-form'
import { TUTORIAL_ITEM, type TutorialScreen } from '@apc/shared/inventory-tutorial'
import { PAGE_SIZES, pageForSize } from '@apc/shared/pagination'
import type { Sort } from '@apc/shared/table'
import { heldPhotos, ITEM_PHOTO_LIMIT } from '@apc/shared/photos'
import { Button } from '../components/Button.tsx'
import { DataTable, RowAction, TableThumbnail, TableTitle } from '../components/DataTable.tsx'
import { EmptyState, ErrorState } from '../components/EmptyState.tsx'
import { FilterChipGroup } from '../components/FilterChip.tsx'
import { ClearFilters, FilterMenu } from '../components/FilterMenu.tsx'
import type { UploadPhoto } from '../components/ImageUpload.tsx'
import { ImageViewer } from '../components/ImageViewer.tsx'
import { Pagination } from '../components/Pagination.tsx'
import { Panel } from '../components/Panel.tsx'
import { Skeleton } from '../components/Skeleton.tsx'
import { Spinner } from '../components/Spinner.tsx'
import { SearchField } from '../components/TextField.tsx'
import { DeleteItemDialog } from '../inventory/DeleteItemDialog.tsx'
import { ImportItemsDialog } from '../inventory/ImportItemsDialog.tsx'
import { ItemFormDialog } from '../inventory/ItemFormDialog.tsx'
import { ManageListsDialog } from '../inventory/ManageListsDialog.tsx'
import { API_BASE, savePhotos } from '../inventory/savePhotos.ts'
import { useItemLists } from '../inventory/useItemLists.ts'
import { useItems } from '../inventory/useItems.ts'
import { useInventoryTutorial } from './inventoryTutorialContext.ts'
import { inventoryTab, LOADING_LINES, LOADING_QUANTITY, LOADING_THUMB } from './InventoryTab.styles.ts'
import { InventoryTutorial } from './InventoryTutorial.tsx'
import { useOpenItemOnRow } from './openItemOnRowContext.ts'
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
// confirm deleting the item, and the list loads again once an item is saved or deleted. "Gerenciar listas" renames
// and deletes the categories, brands and models the form picks from; the list loads again after each change, and a
// name in use leads to its items. "Importar CSV" adds and updates many items at once from a spreadsheet, and the list
// and the lists load again. While "Abrir item ao clicar na linha" is on in the user menu, a click on a row (or
// Enter on it) opens the item's details. Each row's thumbnail shows the item's cover and opens its photos in the
// ImageViewer, where each photo removed, changed or added is saved at once and the list follows. Low and
// out-of-stock rows are tinted by the table. At phone width the row becomes a card and the columns that leave it
// show as one line under the name. The Inventory tutorial runs over the tab by itself the first time, and again from
// the user menu: it starts and ends with the test item deleted and the search, filters and sort off.

// The table's cells, styled once: the recipe has no variants they change.
const CELLS = inventoryTab()
const COLUMNS: ComponentProps<typeof DataTable<Item>>['columns'] = [
  {
    key: 'name',
    header: 'Item',
    sortable: true,
    card: 'main',
    cell: (item) => <TableTitle title={item.name} code={item.code} details={itemDetails(item)} />,
  },
  { key: 'category', sortable: true, header: 'Categoria', cell: (item) => item.category },
  { key: 'partBrand', sortable: true, header: 'Marca', cell: (item) => item.partBrand },
  {
    key: 'vehicle',
    header: 'Veículo',
    sortable: true,
    cell: (item) => (
      <span className={CELLS.classes.vehicle()} data-testid={CELLS.ids.vehicle}>
        <span>{item.vehicleBrand}</span>
        <span className={CELLS.classes.model()} data-testid={CELLS.ids.model}>
          {item.vehicleModel ?? 'qualquer modelo'}
        </span>
      </span>
    ),
  },
  { key: 'position', sortable: true, header: 'Posição', cell: (item) => <Coded value={item.position} name={POSITION_NAMES[item.position]} /> },
  { key: 'side', sortable: true, header: 'Lado', cell: (item) => <Coded value={item.side} name={SIDE_NAMES[item.side]} /> },
  { key: 'color', sortable: true, header: 'Cor', cell: (item) => <Coded value={item.color} name={item.color === NOT_APPLICABLE ? 'Cor não se aplica' : item.color} /> },
  {
    key: 'location',
    sortable: true,
    header: 'Local',
    cell: (item) => (
      <span className={CELLS.classes.location()} data-testid={CELLS.ids.location}>
        {item.location}
      </span>
    ),
  },
  {
    key: 'price',
    header: 'Valor unit.',
    sortLabel: 'Valor unitário',
    sortable: true,
    numeric: true,
    cell: (item) => (
      <span className={CELLS.classes.price()} data-testid={CELLS.ids.price}>
        {formatPrice(item.unitPriceCents)}
      </span>
    ),
  },
  { key: 'quantity', header: 'Qtd.', sortLabel: 'Quantidade', sortable: true, numeric: true, card: 'end', cell: (item) => item.quantity },
]
// The stock status chips, outside the menu: one at a time, none for every item.
const STATUS_OPTIONS = ITEM_STATUSES.map((value) => ({ value, label: STOCK_STATUS_LABELS[value] }))

/**
 * Tells a row's status for the table's tint, from the item's quantity and minimum.
 * @param item Inventory item.
 * @returns The tint and the label read out, or undefined when stock is fine.
 */
function rowStatus(item: Item): { tone: 'warn' | 'danger'; label: string } | undefined {
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
  // Every item, for the counter, the filter options and the form; and the page of the items the search and the
  // filters let through.
  const state = useItems()
  const listed = useItems(itemListQuery(filters, status, { search, page, pageSize, sort }))
  // The lists the item form picks from and creates names in.
  const { lists, create: createEntry, rename: renameEntry, remove: removeEntry, reload: reloadLists } = useItemLists()
  // Whether "Gerenciar listas" is open.
  const [managing, setManaging] = useState(false)
  // Whether "Importar CSV" is open; each opening starts with no file.
  const [importer, setImporter] = useState({ open: false, session: 0 })
  const { opensOnRow } = useOpenItemOnRow()
  // The item form: closed, open on a new item, an item to edit or an item's details, maybe with values filled in.
  // Each opening starts a new form.
  const [form, setForm] = useState<{ open: boolean; item?: Item; details?: boolean; initial?: ItemForm; session: number }>({
    open: false,
    session: 0,
  })
  // The form as typed, and whether it shows the details, which the tutorial's steps read.
  const [typed, setTyped] = useState<{ values: ItemForm; viewing: boolean }>()
  const followForm = useCallback((values: ItemForm, viewing: boolean) => setTyped({ values, viewing }), [])
  // Whether the Filtros menu is open.
  const [filtering, setFiltering] = useState(false)
  const tutorial = useInventoryTutorial()
  // Whether the tutorial runs, and the items on screen when it last sent a change: until the list loads again, the
  // change is still on its way.
  const [touring, setTouring] = useState(false)
  const [sentWith, setSentWith] = useState<Item[]>()
  // The item the delete confirmation asks about, while it is open.
  const [removing, setRemoving] = useState<Item>()
  // The item whose photos the viewer shows, while it is open, with the photos on screen.
  const [viewer, setViewer] = useState<{ item: Item; photos: UploadPhoto[] }>()
  const items = state.status === 'ready' ? state.items : []
  const shown = listed.status === 'ready' ? listed.items : []
  const failed = state.status === 'error' || listed.status === 'error'

  /** Changes the search, the filters, the stock status or the sort, going back to the first page. */
  const narrow = (change: () => void) => {
    change()
    setPage(1)
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
   * @param photos The item's photos after the change.
   * @returns Whether they were saved.
   */
  const changePhotos = async (photos: UploadPhoto[]) => {
    if (!viewer) {
      return false
    }
    setViewer({ ...viewer, photos })
    const saved = await savePhotos(viewer.item, photos)
    if (!saved) {
      setViewer((current) => current && { ...current, photos: viewer.photos })
      return false
    }
    setViewer((current) => current && { item: saved, photos: heldPhotos(saved.photos, API_BASE) })
    reload()
    return true
  }

  /** Opens the item form on a new item, an item to edit, or an item's details, maybe with values filled in. */
  const openForm = (item?: Item, details = false, initial?: ItemForm) =>
    setForm((current) => ({ open: true, item, details, initial, session: current.session + 1 }))

  /** Sends an item request for the tutorial, then loads the list and the lists again. */
  const send = async (url: string, method: string, body?: unknown) => {
    setSentWith(items)
    const json = body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    await fetch(url, { method, ...json }).catch(() => null)
    reload()
    reloadLists()
  }

  /** Deletes the tutorial's test item, if one is left from a run that didn't end, and loads the list again. */
  const deleteTestItem = async () => {
    const found = await fetch(`${API_BASE}/items?${new URLSearchParams({ q: TUTORIAL_ITEM.code })}`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
    for (const item of (found?.items ?? []) as Item[]) {
      if (item.code === TUTORIAL_ITEM.code) {
        await fetch(`${API_BASE}/items/${item.id}`, { method: 'DELETE' }).catch(() => null)
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
  const testItem = items.find((item) => item.code === TUTORIAL_ITEM.code)
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
    target: (name) => tutorialTarget(name, TUTORIAL_ITEM.code, testItem?.name),
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
      <div className={classes.toolbar()} data-testid={ids.toolbar}>
        <div className={classes.search()} data-testid={ids.search}>
          <SearchField
            data-tour="search"
            label="Procure pelo nome ou código da peça"
            value={search}
            onValueChange={(value) => narrow(() => setSearch(value))}
          />
        </div>
        <Button variant="secondary" onClick={() => setManaging(true)}>
          Gerenciar listas
        </Button>
        <Button variant="secondary" onClick={() => setImporter((current) => ({ open: true, session: current.session + 1 }))}>
          Importar CSV
        </Button>
        <Button data-tour="new-item" onClick={() => openForm()}>
          Novo item
        </Button>
      </div>
      <div className={classes.filters()} data-testid={ids.filters}>
        <FilterMenu
          label="Filtros do estoque"
          title="Filtrar estoque"
          rows={(draft) => itemFilterRows(items, draft)}
          values={filters}
          onApply={(values) => narrow(() => setFilters(values))}
          open={filtering}
          onOpenChange={setFiltering}
        />
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
      {failed && (
        <ErrorState
          title="Não foi possível carregar o estoque"
          message="Verifique a conexão com o servidor e tente de novo."
          action={{ label: 'Tentar de novo', onClick: reload }}
        />
      )}
      {!failed && listed.status === 'loading' && <LoadingRows />}
      {!failed && listed.status === 'ready' && (
        <>
          <DataTable
            label="Itens do estoque"
            columns={[
              {
                key: 'photo',
                header: 'Foto',
                headerHidden: true,
                card: 'thumb',
                cell: (item) => (
                  <TableThumbnail
                    src={item.photos[0] && `${API_BASE}${item.photos[0].thumbUrl}`}
                    label={`Ver fotos de ${item.name}`}
                    onOpen={() => setViewer({ item, photos: heldPhotos(item.photos, API_BASE) })}
                  />
                ),
              },
              ...COLUMNS,
              {
                key: 'actions',
                header: 'Ações',
                headerHidden: true,
                numeric: true,
                card: 'actions',
                cell: (item) => (
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
            setPage(1)
          }
          setForm((current) => ({ ...current, open: false }))
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
      <ManageListsDialog
        open={managing}
        lists={lists}
        items={items}
        onRename={renameEntry}
        onRemove={removeEntry}
        onChanged={reload}
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
          reload()
        }}
      />
    </Panel>
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

function Coded({ value, name }: { value: string; name: string }) {
  const { classes, ids } = inventoryTab({ muted: value === NOT_APPLICABLE })
  return (
    <span title={name} className={classes.coded()} data-testid={ids.coded}>
      {value}
    </span>
  )
}
