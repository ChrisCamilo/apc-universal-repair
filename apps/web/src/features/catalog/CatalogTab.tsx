import { useEffect, useState } from 'react'
import {
  belowNode,
  brandsNamed,
  brandSummary,
  brandWithModel,
  CATALOG_CHILDREN,
  CATALOG_HOME,
  catalogNodes,
  catalogSiblings,
  catalogValuesOf,
  engineSheetNames,
  ENGINE_SPEC_LABELS,
  enginePath,
  findParts,
  firstSheet,
  locatePart,
  modelsNamed,
  NO_SHEET_MESSAGE,
  partScreen,
  revealedVehicle,
  screenBack,
  screenHeader,
  type Catalog,
  type CatalogEditLevel,
  type CatalogNode,
  type CatalogScreen,
  type CatalogValues,
  type FoundPart,
} from '@apc/domain/catalog'
import { chevronIcon, closeIcon, ICON_SIZES, moreIcon, pencilIcon, plusIcon, sortIcon, trashIcon } from '@apc/tokens/icons'
import { ActionSheet } from '../../components/ActionSheet'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { RowAction } from '../../components/DataTable'
import { Dialog } from '../../components/Dialog'
import { EmptyState, ErrorState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { ImageFrame } from '../../components/ImageFrame'
import { Panel } from '../../components/Panel'
import { SelectableTileGroup } from '../../components/SelectableTile'
import { Spinner } from '../../components/Spinner'
import { SearchField } from '../../components/TextField'
import { TreeView } from '../../components/TreeView'
import { Heading, NumericReadout, Text } from '../../components/Typography'
import { usePhone } from '../../components/usePhone.ts'
import { useItems } from '../inventory/useItems.ts'
import { catalogTab } from './CatalogTab.styles.ts'
import { EngineSheetForm } from './EngineSheetForm.tsx'
import { NodeForm } from './NodeForm.tsx'
import { PartResults } from './PartResults.tsx'
import { useCatalog } from './useCatalog.ts'
import { useCatalogEditing } from './useCatalogEditing.ts'
import { usePhoneHeader } from '../dashboard/phoneHeaderContext.ts'

// The Catalog tab (/catalog): the brand tiles in a rail, the chosen brand's model tree, and the detail column with
// the chosen engine's sheet. A brand opens on its first engine; one with no engine yet says so in the detail
// column. On narrow screens the tiles sit above the tree in rows and the detail column goes below it. The catalog
// comes from the API (useCatalog): while it loads the tab shows a spinner, and when it can't be loaded, why, with a
// button to try again.
// The rail's search narrows the brand tiles by name. The search above the tree looks for the code of a part kept in
// the inventory first: with 3+ letters or digits of a code it lists the matching parts, and choosing one (the first
// at once) reveals its vehicle: its brand, its model pointed out, the path open and the engine chosen, or, when the
// catalog has no sheet for that vehicle, a note saying so instead of another vehicle's sheet. Otherwise it narrows
// the tree by model name, moving to the first brand that has the model, or says no brand has it. Clearing it drops
// the part list and the pointed-out model.
// The tree is edited in place (see @apc/domain/catalog): "Nova marca" under the tiles adds a brand, "Novo modelo" over
// the tree a model, and each branch, while pointed at or focused, has buttons that add the level under it, rename it,
// move it up or down and delete it. What is added or renamed is typed in a row inside the tree (see NodeForm), and an
// empty branch shows a dashed button to add its first. Deleting asks first, saying what goes with it. A year's "+",
// "Novo motor", opens an empty sheet in the detail column instead (see EngineSheetForm), and the engine joins the tree,
// chosen, once its sheet is saved; an engine's sheet has "Editar ficha", which turns it into the same form. Every change
// answers the whole catalog, which the tab takes as it is; a name or year another node has is said under the field.
// On a phone (below `card:`) the tab is a stack of screens, as in the "Catálogo no celular" mockup (see
// CatalogScreen in @apc/domain/catalog): the brands, each on a line with how many models and sheets it has; a brand's
// models, as a tree whose engines say "Ver ficha"; and an engine's sheet under the path to it. A screen past the
// brands puts its brand's name and a ← in the page's header, and opens at its top. The search above the brands and
// the models looks for parts by code as above, listed as the Inventory's cards, and a tap on one clears it and opens
// the part's engine sheet, or its brand's models with its model pointed out and the note when the catalog has no sheet
// for it. Otherwise it narrows the brands to the ones with a model of that name, and the tree to those models. The
// brand search is left out.
// A phone edits the catalog in sheets, with the same changes as above (see useCatalogEditing): "Nova marca" beside the
// brands' heading and "Novo modelo" beside the models' open a bottom sheet with the new node's fields, Cancelar and
// Adicionar. Each branch has a "⋯", always in view, opening an action sheet with its name: add the level under it,
// rename it (a generation, with its years), move it up or down (only where it can go), delete it after confirming, or
// close. A year's engines end with "Novo motor em <ano>", and an empty branch with the button adding its first. A new
// engine's sheet, and "Editar ficha" under an engine's sheet, open the sheet's form in a full-screen dialog with
// Cancelar and Salvar ficha at its foot; a new brand opens its models, and a new engine its sheet.

/** The ids of the phone's node and sheet forms, which the buttons of their sheet and dialog send. */
const NODE_FORM_ID = 'catalog-node-form'
const SHEET_FORM_ID = 'catalog-sheet-form'

export function CatalogTab() {
  const state = useCatalog()
  const phone = usePhone()
  const { classes, ids } = catalogTab()
  if (state.status === 'ready' && state.catalog.brands.length > 0) {
    return phone ? <PhoneCatalog catalog={state.catalog} onChanged={state.replace} /> : <WideCatalog catalog={state.catalog} onChanged={state.replace} />
  }
  return (
    <div className={classes.status()} data-testid={ids.status}>
      {state.status === 'loading' && <Spinner label="Carregando o catálogo" />}
      {state.status === 'error' && (
        <ErrorState
          title="Não foi possível carregar o catálogo"
          message="Verifique a conexão com o servidor e tente de novo."
          action={{ label: 'Tentar de novo', onClick: state.reload }}
        />
      )}
      {state.status === 'ready' && <EmptyState title="Nenhuma marca no catálogo" message="As marcas do catálogo aparecem aqui." />}
    </div>
  )
}

/** The Catalog from a tablet up: the rail, the tree and the detail column, with the tree edited in place. */
function WideCatalog({ catalog, onChanged }: { catalog: Catalog; onChanged: (catalog: Catalog) => void }) {
  const state = useItems()
  const { classes, ids } = catalogTab()
  const items = state.status === 'ready' ? state.items : []
  const [brandQuery, setBrandQuery] = useState('')
  const [query, setQuery] = useState('')
  const [brandId, setBrandId] = useState(catalog.brands[0].id)
  const [engine, setEngine] = useState(() => firstSheet(catalog, catalog.brands[0].models))
  const [part, setPart] = useState<FoundPart | null>(null)
  // Bumped to draw the tree again, open on the engine of a part just chosen.
  const [revealed, setRevealed] = useState(0)
  const editor = useCatalogEditing({
    onChanged,
    onBrandAdded: (changed) => openBrandOf(changed, changed.brands.at(-1)!.id),
    onEngineAdded: (changed, yearId) => {
      setEngine(catalogNodes(changed.brands.find((b) => b.id === brandId)!.models).get(yearId)?.children?.at(-1)?.id)
      setRevealed((count) => count + 1)
    },
  })
  const { editing, sheet: sheetEditing, removing } = editor
  const brand = catalog.brands.find((b) => b.id === brandId)!
  const results = findParts(items, query)
  const searchingParts = results.parts.length > 0
  // The vehicle of the chosen part the catalog shows: the one it knows best, of a part of several.
  const vehicle = part && revealedVehicle(catalog, part.item)
  const location = searchingParts && vehicle ? locatePart(catalog, vehicle) : null
  const models = modelsNamed(brand.models, searchingParts ? '' : query)
  const sheet = engine ? catalog.sheets[engine] : undefined
  // A part for a model the catalog has no sheet for says so, instead of showing another vehicle.
  const missingVehicle = location && vehicle?.vehicleModel && !location.engineId ? `${vehicle.vehicleBrand} ${vehicle.vehicleModel}` : null
  const nodes = catalogNodes(brand.models)

  /** Opens a brand on its first engine. */
  const openBrand = (id: string) => {
    setBrandId(id)
    setEngine(firstSheet(catalog, catalog.brands.find((b) => b.id === id)!.models))
    editor.edit(null)
  }

  /** Opens a brand of a catalog just changed, on its first engine. */
  const openBrandOf = (changed: Catalog, id: string) => {
    setBrandId(id)
    setEngine(firstSheet(changed, changed.brands.find((b) => b.id === id)!.models))
  }

  /** Reveals a part's vehicle: its brand, its engine, and the tree open on them. */
  const choosePart = (chosen: FoundPart) => {
    setPart(chosen)
    const found = locatePart(catalog, revealedVehicle(catalog, chosen.item))
    if (found) {
      setBrandId(found.brandId)
      setEngine(found.engineId ?? (found.modelId ? undefined : firstSheet(catalog, catalog.brands.find((b) => b.id === found.brandId)!.models)))
      setRevealed((count) => count + 1)
    }
  }

  /** Looks for parts by code first, otherwise narrows the tree by model name. */
  const search = (text: string) => {
    setQuery(text)
    const found = findParts(items, text)
    if (found.parts.length > 0) {
      choosePart(found.parts[0])
      return
    }
    setPart(null)
    const withModel = text.trim() ? brandWithModel(catalog, brandId, text) : null
    if (withModel && withModel !== brandId) {
      openBrand(withModel)
    }
  }

  /** The row that adds a node, or renames one. */
  const form = (level: CatalogEditLevel | 'brand', label: string, initial?: CatalogValues) => (
    <NodeForm
      level={level}
      label={label}
      initial={initial}
      error={editor.error}
      saving={editor.saving}
      onSave={(values) => void editor.save(values)}
      onCancel={() => editor.edit(null)}
    />
  )

  /** A row's buttons: add the level under it, rename it, move it up or down, delete it; none for an engine. */
  const rowActions = (id: string) => {
    const node = nodes.get(id)
    if (!node || node.level === 'engine') {
      return null
    }
    const siblings = catalogSiblings(brand.models, id)
    const at = siblings.findIndex((each) => each.id === id)
    const child = CATALOG_CHILDREN[node.level]
    return (
      <>
        <RowAction icon={plusIcon} label={`${child.add} em ${node.label}`} onClick={() => editor.addUnder(node)} />
        <RowAction icon={pencilIcon} label={`Renomear ${node.label}`} onClick={() => editor.edit({ kind: 'rename', node })} />
        <RowAction
          icon={chevronIcon}
          iconClassName={classes.up()}
          label={`Mover ${node.label} para cima`}
          disabled={at === 0}
          onClick={() => void editor.move(node, 'up')}
        />
        <RowAction
          icon={chevronIcon}
          iconClassName={classes.down()}
          label={`Mover ${node.label} para baixo`}
          disabled={at === siblings.length - 1}
          onClick={() => void editor.move(node, 'down')}
        />
        <RowAction icon={trashIcon} tone="danger" label={`Excluir ${node.label}`} onClick={() => editor.askRemove(node)} />
      </>
    )
  }

  /** The line after a branch's children: the row adding one more under it, or the button to add the first. */
  const after = (id: string) => {
    const node = nodes.get(id)
    if (!node || node.level === 'engine') {
      return null
    }
    const child = CATALOG_CHILDREN[node.level]
    if (node.level !== 'year' && editing?.kind === 'add' && editing.level !== 'brand' && editing.parent.id === id) {
      return form(child.level as CatalogEditLevel, `${child.add} em ${node.label}`)
    }
    return node.children?.length === 0 ? (
      <Button variant="dashed" size="sm" icon={plusIcon} onClick={() => editor.addUnder(node)}>
        {`${child.add} em ${node.label}`}
      </Button>
    ) : null
  }

  return (
    <div className={classes.base()} data-testid={ids.base}>
      <Panel className={classes.rail()}>
        <SearchField label="Procure marca" value={brandQuery} onValueChange={setBrandQuery} />
        <SelectableTileGroup
          label="Marcas"
          options={brandsNamed(catalog, brandQuery).map((b) => ({ value: b.id, label: b.name }))}
          value={brandId}
          onValueChange={openBrand}
          className={classes.brands()}
        />
        {editing?.kind === 'add' && editing.level === 'brand' ? (
          form('brand', 'Nova marca')
        ) : (
          <Button variant="ghost" size="sm" icon={plusIcon} onClick={() => editor.edit({ kind: 'add', level: 'brand', parent: { level: 'brand', id: '' } })}>
            Nova marca
          </Button>
        )}
      </Panel>
      <div className={classes.main()} data-testid={ids.main}>
        <SearchField label="Procure modelo ou código da peça" value={query} onValueChange={search} />
        {searchingParts && <PartResults catalog={catalog} results={results} chosen={part?.id} onChoose={choosePart} />}
        <div className={classes.body()} data-testid={ids.body}>
          <Panel className={classes.models()}>
            <div className={classes.modelsHead()} data-testid={ids.modelsHead}>
              <h3 className={classes.modelsTitle()} data-testid={ids.modelsTitle}>
                Modelos · {brand.models.length}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                icon={plusIcon}
                onClick={() => editor.edit({ kind: 'add', level: 'model', parent: { level: 'brand', id: brandId } })}
              >
                Novo modelo
              </Button>
            </div>
            {editing?.kind === 'add' && editing.level === 'model' && form('model', `Novo modelo em ${brand.name}`)}
            {models.length > 0 ? (
              <TreeView
                key={`${brandId}-${revealed}`}
                label={`Modelos ${brand.name}`}
                nodes={models}
                selected={engine}
                onSelect={setEngine}
                highlighted={location?.modelId}
                defaultExpanded={location?.modelId && !location.engineId ? [location.modelId] : undefined}
                rowActions={rowActions}
                editing={
                  editing?.kind === 'rename'
                    ? {
                        id: editing.node.id,
                        content: form(editing.node.level as CatalogEditLevel, `Renomear ${editing.node.label}`, catalogValuesOf(editing.node)),
                      }
                    : undefined
                }
                after={after}
                reveal={editing?.kind === 'add' && editing.level !== 'brand' && editing.level !== 'model' ? editing.parent.id : undefined}
                className={classes.tree()}
              />
            ) : (
              <NoModel none={brand.models.length === 0} />
            )}
          </Panel>
          <div className={classes.detail()} data-testid={ids.detail}>
            {!sheetEditing && <ImageFrame alt={sheet ? `Foto do ${sheet.title}` : 'Foto do modelo'} emptyLabel="Sem foto do modelo" />}
            <Panel className={classes.sheet()}>
              {sheetEditing ? (
                <EngineSheetForm
                  key={sheetEditing.kind === 'add' ? sheetEditing.year.id : sheetEditing.engine.id}
                  label={sheetEditing.kind === 'add' ? `Novo motor em ${sheetEditing.year.label}` : `Ficha do ${sheetEditing.engine.label}`}
                  names={engineSheetNames(catalog, brandId, sheetEditing.kind === 'add' ? sheetEditing.year.id : sheetEditing.engine.id)}
                  initial={sheetEditing.kind === 'edit' ? sheetEditing.engine.sheet : undefined}
                  saving={editor.saving}
                  onSave={(values) => void editor.saveSheet(values)}
                  onCancel={() => editor.editSheet(null)}
                />
              ) : missingVehicle ? (
                <EmptyState title={missingVehicle} message={NO_SHEET_MESSAGE} />
              ) : sheet ? (
                <>
                  <div className={classes.sheetHead()} data-testid={ids.sheetHead}>
                    <Heading level={3}>{sheet.title}</Heading>
                    <Button variant="secondary" size="sm" icon={pencilIcon} onClick={() => editor.editSheet({ kind: 'edit', engine: nodes.get(engine!)! })}>
                      Editar ficha
                    </Button>
                  </div>
                  <div className={classes.specs()} data-testid={ids.specs}>
                    {sheet.specs.map((spec) => (
                      <NumericReadout key={spec} tone="accent">
                        {spec}
                      </NumericReadout>
                    ))}
                  </div>
                  <Text size="sm" tone="muted" lines={5}>
                    {sheet.summary}
                  </Text>
                </>
              ) : (
                <EmptyState
                  title="Nenhuma ficha cadastrada"
                  message={`Os veículos da ${brand.name} ainda não têm ficha técnica. Escolha outra marca.`}
                />
              )}
            </Panel>
          </div>
        </div>
      </div>
      <DeleteNodeDialog node={removing} saving={editor.saving} onCancel={() => editor.askRemove(undefined)} onConfirm={() => void editor.remove()} />
    </div>
  )
}

/** The Catalog on a phone: one screen at a time, the brands, a brand's models or an engine's sheet, edited in sheets. */
function PhoneCatalog({ catalog, onChanged }: { catalog: Catalog; onChanged: (catalog: Catalog) => void }) {
  const state = useItems()
  const setHeader = usePhoneHeader()
  const { classes, ids } = catalogTab()
  const items = state.status === 'ready' ? state.items : []
  const [screen, setScreen] = useState<CatalogScreen>(CATALOG_HOME)
  const [query, setQuery] = useState('')
  // The node whose actions are open in a bottom sheet.
  const [acting, setActing] = useState<CatalogNode>()
  const editor = useCatalogEditing({
    onChanged,
    onBrandAdded: (changed) => setScreen({ view: 'models', brandId: changed.brands.at(-1)!.id }),
    onEngineAdded: (changed, yearId) => {
      if (screen.view !== 'brands') {
        const engineId = catalogNodes(changed.brands.find((b) => b.id === screen.brandId)!.models).get(yearId)?.children?.at(-1)?.id
        setScreen(engineId ? { view: 'sheet', brandId: screen.brandId, engineId } : screen)
      }
    },
  })
  const { editing, sheet: sheetEditing } = editor
  const results = findParts(items, query)
  const searchingParts = results.parts.length > 0
  const modelQuery = searchingParts ? '' : query
  const brand = screen.view === 'brands' ? undefined : catalog.brands.find((b) => b.id === screen.brandId)
  const nodes = catalogNodes(brand?.models ?? [])

  // Each screen opens at its top, with its title and ← in the page's header; the brands keep the tab's name.
  useEffect(() => {
    window.scrollTo(0, 0)
    const { title, back } = screenHeader(catalog, screen)
    const before = screenBack(screen)
    setHeader(back && before ? { title, back: { label: back, onClick: () => setScreen(before) } } : null)
    return () => setHeader(null)
  }, [catalog, screen, setHeader])

  /** Opens the screen a part leads to, its engine's sheet or its brand's models, done with the search. */
  const choosePart = (part: FoundPart) => {
    const next = partScreen(catalog, part.item)
    if (next) {
      setQuery('')
      setScreen(next)
    }
  }

  /** The actions of the node whose sheet is open: add under it, rename it, move it up or down, delete it, close. */
  const actions = () => {
    if (!acting || !brand) {
      return []
    }
    const siblings = catalogSiblings(brand.models, acting.id)
    const at = siblings.findIndex((each) => each.id === acting.id)
    return [
      { icon: plusIcon, label: CATALOG_CHILDREN[acting.level as CatalogEditLevel].add, onSelect: () => editor.addUnder(acting) },
      { icon: pencilIcon, label: acting.level === 'generation' ? 'Renomear e mudar os anos' : 'Renomear', onSelect: () => editor.edit({ kind: 'rename', node: acting }) },
      ...(at > 0 ? [{ icon: sortIcon, label: 'Mover para cima', onSelect: () => void editor.move(acting, 'up') }] : []),
      ...(at < siblings.length - 1 ? [{ icon: sortIcon, label: 'Mover para baixo', onSelect: () => void editor.move(acting, 'down') }] : []),
      { icon: trashIcon, label: 'Excluir…', onSelect: () => editor.askRemove(acting) },
      { icon: closeIcon, label: 'Fechar', onSelect: () => {} },
    ]
  }

  /** The line after a branch's children: a year's "Novo motor", or the button to add an empty branch's first. */
  const after = (id: string) => {
    const node = nodes.get(id)
    if (!node || node.level === 'engine' || (node.level !== 'year' && node.children?.length !== 0)) {
      return null
    }
    return (
      <Button variant="dashed" size="sm" icon={plusIcon} onClick={() => editor.addUnder(node)}>
        {`${CATALOG_CHILDREN[node.level].add} em ${node.label}`}
      </Button>
    )
  }

  /** What the sheet of what is being added or renamed is titled. */
  const editTitle = () => {
    if (!editing) {
      return ''
    }
    if (editing.kind === 'rename') {
      return `Renomear ${editing.node.label}`
    }
    const parent = editing.parent.level === 'brand' ? undefined : nodes.get(editing.parent.id)
    const add = editing.level === 'brand' ? 'Nova marca' : CATALOG_CHILDREN[editing.parent.level].add
    return parent ? `${add} em ${parent.label}` : editing.level === 'model' && brand ? `${add} em ${brand.name}` : add
  }

  const search = (
    <>
      <SearchField label="Procure modelo ou código da peça" value={query} onValueChange={setQuery} />
      {searchingParts && <PartResults catalog={catalog} results={results} onChoose={choosePart} />}
    </>
  )

  /** The screen on show. */
  const content = () => {
    if (screen.view === 'sheet') {
      const sheet = catalog.sheets[screen.engineId]
      return (
        <div className={classes.screen()} data-testid={ids.screen}>
          <p className={classes.path()} data-testid={ids.path}>
            {enginePath(catalog, screen.brandId, screen.engineId)}
          </p>
          <ImageFrame alt={`Foto do ${sheet.title}`} emptyLabel="Sem foto do modelo" />
          <Heading level={2}>{sheet.title}</Heading>
          <dl className={classes.readouts()} data-testid={ids.readouts}>
            {sheet.specs.map((spec, index) => (
              <div key={ENGINE_SPEC_LABELS[index]} className={classes.readout()} data-testid={ids.readout}>
                <dt className={classes.readoutLabel()} data-testid={ids.readoutLabel}>
                  {ENGINE_SPEC_LABELS[index]}
                </dt>
                <dd className={classes.readoutValue()} data-testid={ids.readoutValue}>
                  <NumericReadout tone="accent">{spec}</NumericReadout>
                </dd>
              </div>
            ))}
          </dl>
          <Text tone="muted">{sheet.summary}</Text>
          <Button variant="secondary" icon={pencilIcon} onClick={() => editor.editSheet({ kind: 'edit', engine: nodes.get(screen.engineId)! })}>
            Editar ficha
          </Button>
        </div>
      )
    }

    if (screen.view === 'models') {
      const { brandId, modelId, engineId, missing } = screen
      const models = modelsNamed(brand!.models, modelQuery)
      return (
        <div className={classes.screen()} data-testid={ids.screen}>
          {search}
          {missing && (
            <Panel>
              <EmptyState title={missing} message={NO_SHEET_MESSAGE} />
            </Panel>
          )}
          <div className={classes.screenHead()} data-testid={ids.screenHead}>
            <h2 className={classes.heading()} data-testid={ids.heading}>
              Modelos · {models.length}
            </h2>
            <Button variant="ghost" size="sm" icon={plusIcon} onClick={() => editor.edit({ kind: 'add', level: 'model', parent: { level: 'brand', id: brandId } })}>
              Novo modelo
            </Button>
          </div>
          {models.length > 0 ? (
            <TreeView
              key={`${brandId}-${modelId}-${engineId}`}
              label={`Modelos ${brand!.name}`}
              nodes={models}
              selected={engineId}
              onSelect={(id) => setScreen({ view: 'sheet', brandId, engineId: id })}
              highlighted={modelId}
              defaultExpanded={modelId && !engineId ? [modelId] : undefined}
              leafTag="Ver ficha"
              rowActions={(id) => {
                const node = nodes.get(id)
                return node && node.level !== 'engine' ? <RowAction icon={moreIcon} label={`Ações de ${node.label}`} onClick={() => setActing(node)} /> : null
              }}
              after={after}
              reveal={editing?.kind === 'add' && editing.parent.level !== 'brand' ? editing.parent.id : undefined}
              className={classes.screenTree()}
            />
          ) : (
            <NoModel none={brand!.models.length === 0} />
          )}
        </div>
      )
    }

    // The brands that have a model with the name searched, every brand without a search.
    const brands = catalog.brands.filter((each) => modelsNamed(each.models, modelQuery).length > 0)
    return (
      <div className={classes.screen()} data-testid={ids.screen}>
        {search}
        <div className={classes.screenHead()} data-testid={ids.screenHead}>
          <h2 className={classes.heading()} data-testid={ids.heading}>
            Marcas · {brands.length}
          </h2>
          <Button variant="ghost" size="sm" icon={plusIcon} onClick={() => editor.edit({ kind: 'add', level: 'brand', parent: { level: 'brand', id: '' } })}>
            Nova marca
          </Button>
        </div>
        {brands.length > 0 ? (
          <ul className={classes.brandList()} data-testid={ids.brandList}>
            {brands.map((each) => (
              <li key={each.id}>
                <button type="button" className={classes.brand()} data-testid={ids.brand} onClick={() => setScreen({ view: 'models', brandId: each.id })}>
                  <span aria-hidden="true" className={classes.mark()} data-testid={ids.mark}>
                    {each.mark}
                  </span>
                  <span className={classes.brandText()} data-testid={ids.brandText}>
                    <span className={classes.brandName()} data-testid={ids.brandName}>
                      {each.name}
                    </span>
                    <span className={classes.brandMeta()} data-testid={ids.brandMeta}>
                      {brandSummary(catalog, each)}
                    </span>
                  </span>
                  <Icon icon={chevronIcon} size={ICON_SIZES.prominent} className={classes.chevron()} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <NoModel />
        )}
      </div>
    )
  }

  return (
    <>
      {content()}
      <ActionSheet open={acting !== undefined} onClose={() => setActing(undefined)} title={acting?.label ?? ''} actions={actions()} />
      <BottomSheet
        open={editing !== null}
        onClose={() => editor.edit(null)}
        title={editTitle()}
        footer={
          <div className={classes.sheetButtons()} data-testid={ids.sheetButtons}>
            <Button variant="secondary" onClick={() => editor.edit(null)}>
              Cancelar
            </Button>
            <Button type="submit" form={NODE_FORM_ID} loading={editor.saving}>
              {editing?.kind === 'rename' ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        }
      >
        {editing && (
          <div className={classes.sheetBody()} data-testid={ids.sheetBody}>
            <NodeForm
              id={NODE_FORM_ID}
              buttons={false}
              level={editing.kind === 'rename' ? (editing.node.level as CatalogEditLevel) : editing.level}
              label={editTitle()}
              initial={editing.kind === 'rename' ? catalogValuesOf(editing.node) : undefined}
              error={editor.error}
              saving={editor.saving}
              onSave={(values) => void editor.save(values)}
              onCancel={() => editor.edit(null)}
            />
          </div>
        )}
      </BottomSheet>
      <Dialog
        open={sheetEditing !== null}
        onClose={() => editor.editSheet(null)}
        title={sheetEditing?.kind === 'add' ? `Novo motor em ${sheetEditing.year.label}` : `Ficha do ${sheetEditing?.engine.label ?? ''}`}
        closable
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => editor.editSheet(null)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" form={SHEET_FORM_ID} loading={editor.saving}>
              Salvar ficha
            </Button>
          </>
        }
      >
        {sheetEditing && brand && (
          <EngineSheetForm
            id={SHEET_FORM_ID}
            actions={false}
            label={sheetEditing.kind === 'add' ? `Novo motor em ${sheetEditing.year.label}` : `Ficha do ${sheetEditing.engine.label}`}
            names={engineSheetNames(catalog, brand.id, sheetEditing.kind === 'add' ? sheetEditing.year.id : sheetEditing.engine.id)}
            initial={sheetEditing.kind === 'edit' ? sheetEditing.engine.sheet : undefined}
            saving={editor.saving}
            onSave={(values) => void editor.saveSheet(values)}
            onCancel={() => editor.editSheet(null)}
          />
        )}
      </Dialog>
      <DeleteNodeDialog node={editor.removing} saving={editor.saving} onCancel={() => editor.askRemove(undefined)} onConfirm={() => void editor.remove()} />
    </>
  )
}

/** Asks to confirm deleting a node, saying what goes with it and that the inventory's parts stay. */
function DeleteNodeDialog({ node, saving, onCancel, onConfirm }: { node?: CatalogNode; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  const below = node && belowNode(node)
  return (
    <Dialog
      open={node !== undefined}
      onClose={onCancel}
      title={`Excluir “${node?.label ?? ''}”?`}
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" loading={saving} onClick={onConfirm}>
            Excluir
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {below ? `Vão junto ${below}. ` : ''}As peças do estoque continuam cadastradas. Isso não pode ser desfeito.
      </Text>
    </Dialog>
  )
}

/** Says no model has the name searched, or, for a brand with none yet, where to add the first. */
function NoModel({ none = false }: { none?: boolean }) {
  return none ? (
    <EmptyState title="Nenhum modelo nessa marca" message="Adicione o primeiro em Novo modelo." />
  ) : (
    <EmptyState title="Nenhum modelo com esse nome" message="Procure por outro nome ou pelo código de uma peça do estoque." />
  )
}
