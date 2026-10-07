import { useState } from 'react'
import { activeFilterCount, type FilterValues } from '@apc/shared/filters'
import { cubeIcon, documentIcon, lockIcon, pencilIcon, trashIcon, userIcon } from '@apc/shared/icons'
import { formatPrice, itemDetails, matchesSearch, resultSummary, searchKey, STOCK_STATUS_LABELS, stockStatus, type Item } from '@apc/shared/items'
import { PAGE_SIZES } from '@apc/shared/pagination'
import { sortRows, type Sort } from '@apc/shared/table'
import type { TreeNode } from '@apc/shared/tree'
import { AppFrame } from '../components/AppFrame.tsx'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { DataTable, RowAction, TableThumbnail, TableTitle } from '../components/DataTable.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { FilterChipGroup } from '../components/FilterChip.tsx'
import { ClearFilters, FilterMenu } from '../components/FilterMenu.tsx'
import { ImageFrame } from '../components/ImageFrame.tsx'
import { Menu, MenuHeader, MenuItem, MenuLabel, UserBadge } from '../components/Menu.tsx'
import { Pagination } from '../components/Pagination.tsx'
import { Panel } from '../components/Panel.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { SelectableTileGroup } from '../components/SelectableTile.tsx'
import { Switch } from '../components/Switch.tsx'
import { TabPanel, Tabs } from '../components/Tabs.tsx'
import { SearchField, TextField } from '../components/TextField.tsx'
import { TreeView } from '../components/TreeView.tsx'
import { Heading, NumericReadout, Text } from '../components/Typography.tsx'

// The wireframe screens rebuilt from the design system alone, to prove it is complete before the real screens:
// the Login, and the Dashboard on its Catalog and Inventory tabs. They hold their own sample data and state, so
// searches, filters, tabs, the tree and the user menu respond, but nothing is saved or sent. Only layout
// (grid, flex, gaps, widths) is set here; every color, face, border and radius comes from the components.

// The Catalog tree of each brand: model → generation → version → year → engine. Most branches are still
// empty, as the catalog data comes later.
const BRANDS: { value: string; label: string; models: TreeNode[] }[] = [
  {
    value: 'chevrolet',
    label: 'Chevrolet',
    models: [
      { id: 'chevette', label: 'Chevette', children: [{ id: 'chevette-2', label: 'Segunda geração', detail: '1983–1993', children: [] }] },
      {
        id: 'opala',
        label: 'Opala',
        children: [
          { id: 'opala-1', label: 'Primeira geração', detail: '1968–1974', children: [] },
          { id: 'opala-2', label: 'Segunda geração', detail: '1975–1979', children: [] },
          {
            id: 'opala-3',
            label: 'Terceira geração',
            detail: '1980–1992',
            children: [
              { id: 'opala-3-comodoro', label: 'Comodoro', children: [] },
              {
                id: 'opala-3-diplomata',
                label: 'Diplomata',
                children: [
                  { id: 'opala-3-diplomata-1985', label: '1985', children: [] },
                  {
                    id: 'opala-3-diplomata-1986',
                    label: '1986',
                    children: [
                      { id: 'opala-diplomata-1986-2.5', label: '2.5 L 4 cilindros' },
                      { id: 'opala-diplomata-1986-4.1', label: '4.1 L 6 cilindros' },
                    ],
                  },
                ],
              },
              { id: 'opala-3-ss', label: 'SS', children: [] },
            ],
          },
        ],
      },
      { id: 'monza', label: 'Monza', children: [] },
    ],
  },
  {
    value: 'volkswagen',
    label: 'Volkswagen',
    models: ['Fusca', 'Gol', 'Passat', 'Santana'].map((name) => ({ id: searchKey(name), label: name, children: [] })),
  },
  { value: 'fiat', label: 'Fiat', models: ['147', 'Uno', 'Prêmio', 'Tempra'].map((name) => ({ id: searchKey(name), label: name, children: [] })) },
  { value: 'ford', label: 'Ford', models: ['Corcel', 'Del Rey', 'Escort', 'Maverick'].map((name) => ({ id: searchKey(name), label: name, children: [] })) },
]
// What the detail column shows for each engine.
const ENGINES: Record<string, { title: string; specs: string[]; summary: string }> = {
  'opala-diplomata-1986-2.5': {
    title: '1986 · Chevrolet Opala Diplomata 2.5',
    specs: ['1986', '2.5 L', '4 CIL', 'TRASEIRA'],
    summary:
      'Opção de entrada do Diplomata, o quatro-cilindros 2.5 usa bloco de ferro fundido e comando no bloco, ' +
      'priorizando torque em baixa sobre giro alto. Pesa menos sobre o eixo dianteiro e deixa a direção mais leve.',
  },
  'opala-diplomata-1986-4.1': {
    title: '1986 · Chevrolet Opala Diplomata 4.1',
    specs: ['1986', '4.1 L', '6 CIL', 'TRASEIRA'],
    summary:
      'O seis-cilindros em linha de 4,1 L é a configuração definitiva do Opala e o motivo de o Diplomata ter virado ' +
      'sinônimo de conforto no Brasil dos anos 80. Entrega torque farto desde a marcha lenta, com resposta longa e suave.',
  },
}
const FILTER_ROWS = [
  { key: 'cat', label: 'Categoria', allLabel: 'Todas', options: options('Arrefecimento', 'Freios', 'Ignição', 'Motor', 'Suspensão') },
  { key: 'part', label: 'Marca da peça', allLabel: 'Todas', options: options('Cofap', 'Cobreq', 'Mann', 'NGK', 'Sabó', 'Urba') },
]
const ITEMS: Item[] = [
  item({ code: 'FR-0142', name: 'Pastilha de freio dianteira', category: 'Freios', partBrand: 'Cobreq', vehicleBrand: 'Volkswagen', vehicleModel: 'Gol', position: 'D', location: 'A-2', unitPriceCents: 8990, quantity: 12, minQuantity: 4 }),
  item({ code: 'MO-0031', name: 'Junta do cabeçote', category: 'Motor', partBrand: 'Sabó', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala', location: 'B-10', unitPriceCents: 18990, quantity: 2, minQuantity: 3 }),
  item({ code: 'SU-0007', name: 'Amortecedor traseiro', category: 'Suspensão', partBrand: 'Cofap', vehicleBrand: 'Ford', vehicleModel: 'Escort', position: 'T', side: 'LE', location: 'A-10', unitPriceCents: 24900, quantity: 0, minQuantity: 2 }),
  item({ code: 'IG-0210', name: 'Cabo de vela', category: 'Ignição', partBrand: 'NGK', vehicleBrand: 'Fiat', vehicleModel: 'Uno', location: 'C-1', unitPriceCents: 6450, quantity: 7, minQuantity: 2 }),
  item({ code: 'AR-0098', name: 'Bomba d’água', category: 'Arrefecimento', partBrand: 'Urba', vehicleBrand: 'Chevrolet', vehicleModel: 'Chevette', location: 'B-3', unitPriceCents: 13240, quantity: 1, minQuantity: 2 }),
  item({ code: 'W 712/95', name: 'Filtro de óleo', category: 'Motor', partBrand: 'Mann', vehicleBrand: 'Volkswagen', location: 'A-4', unitPriceCents: 3990, quantity: 18, minQuantity: 5 }),
  item({ code: 'FR-0377', name: 'Disco de freio ventilado', category: 'Freios', partBrand: 'Cobreq', vehicleBrand: 'Chevrolet', vehicleModel: 'Monza', position: 'D', side: 'Ambos', location: 'A-3', unitPriceCents: 21500, quantity: 4, minQuantity: 2 }),
  item({ code: 'SU-0112', name: 'Bandeja de suspensão', category: 'Suspensão', partBrand: 'Cofap', vehicleBrand: 'Fiat', vehicleModel: 'Prêmio', position: 'D', side: 'LD', color: 'Preto', location: 'D-1', unitPriceCents: 15800, quantity: 3, minQuantity: 1 }),
]
const NO_FILTERS: FilterValues = { cat: [], part: [] }
const STATUS_OPTIONS = [
  { value: 'low', label: STOCK_STATUS_LABELS.low },
  { value: 'out', label: STOCK_STATUS_LABELS.out },
]
const STYLE_OPTIONS = [
  { value: 'eighties', label: 'Anos 80' },
  { value: 'gt4', label: 'GT4' },
  { value: 'bmw90', label: 'BMW 90' },
  { value: 'fiat90', label: 'Fiat 90' },
]

export type DashboardTab = 'catalog' | 'inventory'

/**
 * Finds the first engine of a brand, to show in the detail column when the brand opens.
 * @param nodes The brand's models.
 * @returns The id of its first engine with details, or undefined when it has none yet.
 */
function firstEngine(nodes: TreeNode[]): string | undefined {
  for (const node of nodes) {
    if (ENGINES[node.id]) {
      return node.id
    }
    const below = node.children && firstEngine(node.children)
    if (below) {
      return below
    }
  }
  return undefined
}

/**
 * Fills in a sample item with the fields the mockup doesn't show.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function item(fields: Partial<Item> & Pick<Item, 'code' | 'name'>): Item {
  return {
    id: fields.code,
    category: 'Motor',
    partBrand: 'Bosch',
    vehicleBrand: 'Volkswagen',
    vehicleModel: null,
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 100,
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  }
}

/**
 * Builds Select options whose value is their label.
 * @param labels Option labels.
 * @returns One option per label.
 */
function options(...labels: string[]) {
  return labels.map((label) => ({ value: label, label }))
}

/**
 * Tells a row's status for the table's tint, from the item's quantity and minimum.
 * @param row Inventory item.
 * @returns The tint and the label read out, or undefined when stock is fine.
 */
function rowStatus(row: Item): { tone: 'warn' | 'danger'; label: string } | undefined {
  const status = stockStatus(row.quantity, row.minQuantity)
  return status ? { tone: status === 'out' ? 'danger' : 'warn', label: STOCK_STATUS_LABELS[status] } : undefined
}

export function LoginScreen() {
  const [user, setUser] = useState('christian.camilo')
  const [password, setPassword] = useState('')
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-4xl items-center gap-6 md:grid-cols-2 md:gap-12">
        <Panel className="grid place-items-center py-6 md:py-12">
          <BrandMark className="h-auto w-36 md:w-56" />
        </Panel>
        <form className="grid w-full max-w-sm gap-4 max-md:justify-self-center" onSubmit={(event) => event.preventDefault()}>
          <TextField label="Usuário" kind="username" icon={userIcon} value={user} onValueChange={setUser} />
          <TextField label="Senha" kind="password" icon={lockIcon} value={password} onValueChange={setPassword} />
          <div className="grid justify-items-start gap-2">
            <Button type="submit">Entrar</Button>
            <Button type="button" variant="link">
              Esqueceu a senha?
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function DashboardScreen({ initialTab }: { initialTab: DashboardTab }) {
  const [tab, setTab] = useState<DashboardTab>(initialTab)
  return (
    <AppFrame
      navLabel="Seções do Dashboard"
      nav={
        <Tabs
          label="Seções do Dashboard"
          tabs={[
            { id: 'catalog', label: 'Catálogo', icon: documentIcon },
            { id: 'inventory', label: 'Estoque', icon: cubeIcon, count: ITEMS.length },
          ]}
          selected={tab}
          onSelect={setTab}
        />
      }
      end={<UserMenu />}
    >
      <TabPanel id="catalog" selected={tab}>
        <CatalogTab />
      </TabPanel>
      <TabPanel id="inventory" selected={tab}>
        <InventoryTab />
      </TabPanel>
    </AppFrame>
  )
}

function UserMenu() {
  const [dark, setDark] = useState(true)
  const [style, setStyle] = useState('eighties')
  const [reorder, setReorder] = useState(false)
  return (
    <Menu label="Menu do usuário" trigger={<UserBadge initials="CC" name="christian.camilo" />}>
      <MenuHeader title="christian.camilo" subtitle="Oficina APC" />
      <MenuLabel>Aparência</MenuLabel>
      <Switch checked={dark} onCheckedChange={setDark}>
        Modo escuro
      </Switch>
      <Segmented label="Tema" options={STYLE_OPTIONS} value={style} onValueChange={setStyle} />
      <MenuLabel>Abas</MenuLabel>
      <Switch checked={reorder} onCheckedChange={setReorder} description="Troque a ordem pelo puxador ou com Alt + setas">
        Arrastar para reordenar
      </Switch>
      <MenuLabel>Estoque</MenuLabel>
      <MenuItem icon={documentIcon} description="Criar, procurar, editar e excluir um item de teste" onSelect={() => {}}>
        Tutorial do estoque
      </MenuItem>
    </Menu>
  )
}

function CatalogTab() {
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [brand, setBrand] = useState(BRANDS[0].value)
  const models = BRANDS.find((b) => b.value === brand)!.models
  const [engine, setEngine] = useState(firstEngine(models))
  const shownBrands = BRANDS.filter((b) => searchKey(b.label).includes(searchKey(brandSearch.trim())))
  const shownModels = models.filter((model) => searchKey(model.label).includes(searchKey(modelSearch.trim())))
  const detail = engine ? ENGINES[engine] : undefined

  /** Opens a brand on its first engine. */
  const chooseBrand = (value: string) => {
    setBrand(value)
    setEngine(firstEngine(BRANDS.find((b) => b.value === value)!.models))
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[calc(var(--spacing)*46)_minmax(0,1fr)]">
      <Panel className="grid content-start gap-3">
        <SearchField label="Procure marca" value={brandSearch} onValueChange={setBrandSearch} />
        <SelectableTileGroup
          label="Marcas"
          options={shownBrands}
          value={brand}
          onValueChange={chooseBrand}
          className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-1"
        />
      </Panel>
      <Panel className="grid min-w-0 content-start gap-3">
        <SearchField label="Procure modelo ou código da peça" value={modelSearch} onValueChange={setModelSearch} />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,calc(var(--spacing)*82))]">
          <Panel>
            {shownModels.length > 0 ? (
              <TreeView
                key={brand}
                label={`Modelos ${BRANDS.find((b) => b.value === brand)!.label}`}
                nodes={shownModels}
                selected={engine}
                onSelect={setEngine}
                className="max-h-96 lg:max-h-[calc(var(--spacing)*120)]"
              />
            ) : (
              <EmptyState title="Nenhum modelo encontrado" message="Procure por outro nome ou escolha outra marca." />
            )}
          </Panel>
          <div className="grid min-w-0 content-start gap-3">
            <ImageFrame alt={detail ? `Foto do ${detail.title}` : 'Foto do modelo'} emptyLabel="Sem foto do modelo" />
            {detail ? (
              <Panel className="grid gap-3">
                <Heading level={3}>{detail.title}</Heading>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {detail.specs.map((spec) => (
                    <NumericReadout key={spec} tone="accent">
                      {spec}
                    </NumericReadout>
                  ))}
                </div>
                <Text size="sm" tone="muted" lines={5}>
                  {detail.summary}
                </Text>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Ver ficha técnica</Button>
                  <Button size="sm" variant="secondary">
                    Ver em 3D
                  </Button>
                </div>
              </Panel>
            ) : (
              <Panel>
                <EmptyState title="Nenhum motor escolhido" message="Abra um modelo na árvore e escolha o motor para ver a ficha." />
              </Panel>
            )}
          </div>
        </div>
      </Panel>
    </div>
  )
}

function InventoryTab() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(NO_FILTERS)
  const [status, setStatus] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0])
  const shown = ITEMS.filter(
    (row) =>
      matchesSearch(row, search) &&
      (filters.cat.length === 0 || filters.cat.includes(row.category)) &&
      (filters.part.length === 0 || filters.part.includes(row.partBrand)) &&
      (status === null || stockStatus(row.quantity, row.minQuantity) === status),
  )
  const sorted = sort ? sortRows(shown, (row) => row[sort.key as keyof Item] ?? '', sort.dir) : shown

  return (
    <Panel className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-[1_1_calc(var(--spacing)*64)]">
          <SearchField label="Procure pelo nome ou código da peça" value={search} onValueChange={setSearch} />
        </div>
        <Button>Novo item</Button>
        <Button variant="secondary">Importar CSV</Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FilterMenu label="Filtros do estoque" title="Filtrar estoque" rows={FILTER_ROWS} values={filters} onApply={setFilters} />
        <FilterChipGroup label="Situação do estoque" options={STATUS_OPTIONS} value={status} onValueChange={setStatus} />
        <ClearFilters
          active={activeFilterCount(filters) > 0 || status !== null}
          onClear={() => {
            setFilters(NO_FILTERS)
            setStatus(null)
          }}
        />
        <NumericReadout tone="muted" className="ml-auto">
          {resultSummary(shown.length, ITEMS)}
        </NumericReadout>
      </div>
      <DataTable
        label="Itens do estoque"
        rows={sorted}
        rowKey={(row) => row.id}
        rowStatus={rowStatus}
        sort={sort}
        onSortChange={setSort}
        unsortedLabel="Ordem de cadastro"
        columns={[
          { key: 'photo', header: 'Foto', headerHidden: true, card: 'thumb', cell: (row) => <TableThumbnail label={`Foto de ${row.name}`} /> },
          {
            key: 'name',
            header: 'Item',
            sortable: true,
            card: 'main',
            cell: (row) => <TableTitle title={row.name} code={row.code} details={itemDetails(row)} />,
          },
          { key: 'category', header: 'Categoria', sortable: true, cell: (row) => row.category },
          { key: 'partBrand', header: 'Marca', sortable: true, cell: (row) => row.partBrand },
          { key: 'vehicleBrand', header: 'Veículo', cell: (row) => [row.vehicleBrand, row.vehicleModel].filter(Boolean).join(' ') },
          { key: 'location', header: 'Local', cell: (row) => row.location },
          {
            key: 'unitPriceCents',
            header: 'Valor unit.',
            sortLabel: 'Valor unitário',
            numeric: true,
            sortable: true,
            cell: (row) => formatPrice(row.unitPriceCents),
          },
          { key: 'quantity', header: 'Qtd.', sortLabel: 'Quantidade', numeric: true, sortable: true, card: 'end', cell: (row) => row.quantity },
          {
            key: 'actions',
            header: 'Ações',
            headerHidden: true,
            numeric: true,
            card: 'actions',
            cell: (row) => (
              <span className="inline-flex gap-0.5">
                <RowAction icon={pencilIcon} label={`Editar ${row.name}`} onClick={() => {}} />
                <RowAction icon={trashIcon} label={`Excluir ${row.name}`} tone="danger" onClick={() => {}} />
              </span>
            ),
          },
        ]}
        empty={<EmptyState title="Nenhum item encontrado" message="Ajuste a busca ou limpe os filtros para ver o estoque inteiro." />}
      />
      <Pagination
        label="Páginas do estoque"
        page={page}
        pageSize={pageSize}
        total={shown.length}
        pageSizes={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Panel>
  )
}
