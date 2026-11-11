import { useEffect, useState } from 'react'
import {
  belowNode,
  brandsNamed,
  brandSummary,
  brandWithModel,
  CATALOG_BRANDS_PATH,
  CATALOG_CHILDREN,
  CATALOG_ENGINES_PATH,
  CATALOG_HOME,
  CATALOG_LEVEL_PATHS,
  changeCatalog,
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
  treePath,
  type Catalog,
  type CatalogEditLevel,
  type CatalogEngineInput,
  type CatalogNode,
  type CatalogScreen,
  type CatalogValues,
  type EngineSheetNames,
  type FoundPart,
} from '@apc/domain/catalog'
import { chevronIcon, ICON_SIZES, pencilIcon, plusIcon, trashIcon } from '@apc/tokens/icons'
import { Button } from '../../components/Button'
import { RowAction } from '../../components/DataTable'
import { Dialog } from '../../components/Dialog'
import { EmptyState, ErrorState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { ImageFrame } from '../../components/ImageFrame'
import { Panel } from '../../components/Panel'
import { SelectableTileGroup } from '../../components/SelectableTile'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'
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

/** What a change of the catalog that failed says. */
const CATALOG_FAILED = 'Não foi possível salvar no catálogo. Tente de novo.'
/** What is said under the field when the API refuses a name or year another node has, by what is added or renamed. */
const TAKEN: Record<CatalogEditLevel | 'brand', string> = {
  brand: 'Essa marca já está no catálogo.',
  model: 'Já existe um modelo com esse nome nessa marca.',
  generation: CATALOG_FAILED,
  version: CATALOG_FAILED,
  year: 'Essa versão já tem esse ano.',
}

/** What is being added, under which parent, or renamed. */
type Editing =
  | { kind: 'add'; level: CatalogEditLevel | 'brand'; parent: { level: 'brand' | Exclude<CatalogEditLevel, 'year'>; id: string } }
  | { kind: 'rename'; node: CatalogNode }
/** The engine sheet being filled in: a new engine's under a year, or an engine's own. */
type SheetEditing = { kind: 'add'; year: CatalogNode } | { kind: 'edit'; engine: CatalogNode }

/**
 * Reads the names an engine's sheet is titled with, from the path to a node of the brand's tree.
 * @param catalog The catalog.
 * @param brandId The brand.
 * @param nodeId The year, or an engine of it.
 * @returns The year, brand, model and version.
 */
function sheetNames(catalog: Catalog, brandId: string, nodeId: string): EngineSheetNames {
  const [model, , version, year] = treePath(catalog, brandId, nodeId)
  return { year: Number(year.label), brand: catalog.brands.find((brand) => brand.id === brandId)!.name, model: model.label, version: version.label }
}

/**
 * Finds the siblings of a node of a brand's tree, itself included.
 * @param models The brand's models.
 * @param id The node.
 * @returns The list it is in, or empty when the tree hasn't it.
 */
function siblingsOf(models: readonly CatalogNode[], id: string): readonly CatalogNode[] {
  if (models.some((node) => node.id === id)) {
    return models
  }
  for (const node of models) {
    const found = siblingsOf(node.children ?? [], id)
    if (found.length > 0) {
      return found
    }
  }
  return []
}

/**
 * Lists every node of a brand's tree by its id.
 * @param models The brand's models.
 * @returns The nodes, by id.
 */
function treeNodes(models: readonly CatalogNode[]): Map<string, CatalogNode> {
  const nodes = new Map<string, CatalogNode>()
  /** Adds some nodes and everything under them. */
  const add = (list: readonly CatalogNode[]) => {
    for (const node of list) {
      nodes.set(node.id, node)
      add(node.children ?? [])
    }
  }
  add(models)
  return nodes
}

/**
 * Reads what a node is renamed from: its name, a generation's years, or a year's number.
 * @param node The node.
 * @returns What its row opens with.
 */
function valuesOf(node: CatalogNode): CatalogValues {
  if (node.level === 'year') {
    return { year: Number(node.label) }
  }
  return node.level === 'generation' ? { name: node.label, firstYear: node.firstYear, lastYear: node.lastYear } : { name: node.label }
}

export function CatalogTab() {
  const state = useCatalog()
  const phone = usePhone()
  const { classes, ids } = catalogTab()
  if (state.status === 'ready' && state.catalog.brands.length > 0) {
    return phone ? <PhoneCatalog catalog={state.catalog} /> : <WideCatalog catalog={state.catalog} onChanged={state.replace} />
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
  const toast = useToast()
  const { classes, ids } = catalogTab()
  const items = state.status === 'ready' ? state.items : []
  const [brandQuery, setBrandQuery] = useState('')
  const [query, setQuery] = useState('')
  const [brandId, setBrandId] = useState(catalog.brands[0].id)
  const [engine, setEngine] = useState(() => firstSheet(catalog, catalog.brands[0].models))
  const [part, setPart] = useState<FoundPart | null>(null)
  // Bumped to draw the tree again, open on the engine of a part just chosen.
  const [revealed, setRevealed] = useState(0)
  // What is being added or renamed, why it couldn't be saved, and the node whose deletion is being confirmed.
  const [editing, setEditing] = useState<Editing | null>(null)
  const [editError, setEditError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<CatalogNode>()
  const [sheetEditing, setSheetEditing] = useState<SheetEditing | null>(null)
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
  const nodes = treeNodes(brand.models)
  const removingBelow = removing && belowNode(removing)

  /** Opens a brand on its first engine. */
  const openBrand = (id: string) => {
    setBrandId(id)
    setEngine(firstSheet(catalog, catalog.brands.find((b) => b.id === id)!.models))
    setEditing(null)
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

  /** Starts adding or renaming something, in place of anything else being edited. */
  const edit = (next: Editing) => {
    setEditing(next)
    setEditError(undefined)
    setSheetEditing(null)
  }

  /** Opens an engine's sheet as a form in the detail column, a new engine's or one's own. */
  const editSheet = (next: SheetEditing) => {
    setSheetEditing(next)
    setEditing(null)
  }

  /** Saves the sheet being filled in: adds the new engine, chosen in the tree, or saves the engine's sheet again. */
  const saveSheet = async (sheet: CatalogEngineInput) => {
    if (!sheetEditing) {
      return
    }
    const adding = sheetEditing.kind === 'add'
    const path = adding ? `${CATALOG_LEVEL_PATHS.year}/${sheetEditing.year.id}/${CATALOG_CHILDREN.year.segment}` : `${CATALOG_ENGINES_PATH}/${sheetEditing.engine.id}`
    const changed = await change(adding ? 'POST' : 'PATCH', path, sheet)
    if (!changed) {
      return
    }
    setSheetEditing(null)
    if (adding) {
      const year = treeNodes(changed.brands.find((b) => b.id === brandId)!.models).get(sheetEditing.year.id)
      setEngine(year?.children?.at(-1)?.id)
      setRevealed((count) => count + 1)
    }
  }

  /**
   * Sends a change of the catalog and takes the catalog it answers, or says why it couldn't be made.
   * @param method The change's method.
   * @param path Its path.
   * @param body What it sends.
   * @param taken What to say under the field when the API refuses a name or year another node has.
   * @returns The catalog after the change, or null when it wasn't made.
   */
  const change = async (method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: object, taken?: string): Promise<Catalog | null> => {
    setSaving(true)
    const result = await changeCatalog('/api', method, path, body)
    setSaving(false)
    if (result === 'taken') {
      setEditError(taken ?? CATALOG_FAILED)
      return null
    }
    if (!result) {
      toast.error(CATALOG_FAILED)
      return null
    }
    onChanged(result)
    return result
  }

  /** Saves what is being added or renamed, from the row's fields. */
  const save = async (values: CatalogValues) => {
    if (!editing) {
      return
    }
    if (editing.kind === 'rename') {
      const { node } = editing
      const changed = await change('PATCH', `${CATALOG_LEVEL_PATHS[node.level as CatalogEditLevel]}/${node.id}`, values, TAKEN[node.level as CatalogEditLevel])
      if (changed) {
        setEditing(null)
      }
      return
    }
    const parentPath = editing.parent.level === 'brand' ? CATALOG_BRANDS_PATH : CATALOG_LEVEL_PATHS[editing.parent.level]
    const path = editing.level === 'brand' ? CATALOG_BRANDS_PATH : `${parentPath}/${editing.parent.id}/${CATALOG_CHILDREN[editing.parent.level].segment}`
    const changed = await change('POST', path, values, TAKEN[editing.level])
    if (changed) {
      setEditing(null)
      if (editing.level === 'brand') {
        openBrandOf(changed, changed.brands.at(-1)!.id)
      }
    }
  }

  /** Opens a brand of a catalog just changed, on its first engine. */
  const openBrandOf = (changed: Catalog, id: string) => {
    setBrandId(id)
    setEngine(firstSheet(changed, changed.brands.find((b) => b.id === id)!.models))
  }

  /** Moves a node up or down among its siblings. */
  const move = (node: CatalogNode, direction: 'up' | 'down') =>
    change('POST', `${CATALOG_LEVEL_PATHS[node.level as CatalogEditLevel]}/${node.id}/move`, { direction })

  /** Deletes the node whose deletion was confirmed, with what is under it. */
  const remove = async () => {
    if (!removing) {
      return
    }
    const deleted = await change('DELETE', `${CATALOG_LEVEL_PATHS[removing.level as CatalogEditLevel]}/${removing.id}`)
    if (deleted) {
      toast.success(`“${removing.label}” saiu do catálogo.`)
      setRemoving(undefined)
    }
  }

  /** The row that adds a node, or renames one. */
  const form = (level: CatalogEditLevel | 'brand', label: string, initial?: CatalogValues) => (
    <NodeForm
      level={level}
      label={label}
      initial={initial}
      error={editError}
      saving={saving}
      onSave={(values) => void save(values)}
      onCancel={() => setEditing(null)}
    />
  )

  /** A row's buttons: add the level under it, rename it, move it up or down, delete it; none for an engine. */
  const rowActions = (id: string) => {
    const node = nodes.get(id)
    if (!node || node.level === 'engine') {
      return null
    }
    const siblings = siblingsOf(brand.models, id)
    const at = siblings.findIndex((each) => each.id === id)
    const child = CATALOG_CHILDREN[node.level]
    return (
      <>
        <RowAction icon={plusIcon} label={`${child.add} em ${node.label}`} onClick={() => addUnder(node)} />
        <RowAction icon={pencilIcon} label={`Renomear ${node.label}`} onClick={() => edit({ kind: 'rename', node })} />
        <RowAction icon={chevronIcon} iconClassName={classes.up()} label={`Mover ${node.label} para cima`} disabled={at === 0} onClick={() => void move(node, 'up')} />
        <RowAction
          icon={chevronIcon}
          iconClassName={classes.down()}
          label={`Mover ${node.label} para baixo`}
          disabled={at === siblings.length - 1}
          onClick={() => void move(node, 'down')}
        />
        <RowAction icon={trashIcon} tone="danger" label={`Excluir ${node.label}`} onClick={() => setRemoving(node)} />
      </>
    )
  }

  /** Starts adding the level under a node: a row in the tree, or a year's new engine's sheet in the detail column. */
  const addUnder = (node: CatalogNode) => {
    if (node.level === 'year') {
      editSheet({ kind: 'add', year: node })
      return
    }
    const level = CATALOG_CHILDREN[node.level as Exclude<CatalogEditLevel, 'year'>].level as CatalogEditLevel
    edit({ kind: 'add', level, parent: { level: node.level as Exclude<CatalogEditLevel, 'year'>, id: node.id } })
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
      <Button variant="dashed" size="sm" icon={plusIcon} onClick={() => addUnder(node)}>
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
          <Button variant="ghost" size="sm" icon={plusIcon} onClick={() => edit({ kind: 'add', level: 'brand', parent: { level: 'brand', id: '' } })}>
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
                onClick={() => edit({ kind: 'add', level: 'model', parent: { level: 'brand', id: brandId } })}
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
                        content: form(editing.node.level as CatalogEditLevel, `Renomear ${editing.node.label}`, valuesOf(editing.node)),
                      }
                    : undefined
                }
                after={after}
                reveal={editing?.kind === 'add' && editing.level !== 'brand' && editing.level !== 'model' ? editing.parent.id : undefined}
                className={classes.tree()}
              />
            ) : (
              <EmptyState title="Nenhum modelo com esse nome" message="Procure por outro nome ou pelo código de uma peça do estoque." />
            )}
          </Panel>
          <div className={classes.detail()} data-testid={ids.detail}>
            {!sheetEditing && <ImageFrame alt={sheet ? `Foto do ${sheet.title}` : 'Foto do modelo'} emptyLabel="Sem foto do modelo" />}
            <Panel className={classes.sheet()}>
              {sheetEditing ? (
                <EngineSheetForm
                  key={sheetEditing.kind === 'add' ? sheetEditing.year.id : sheetEditing.engine.id}
                  label={sheetEditing.kind === 'add' ? `Novo motor em ${sheetEditing.year.label}` : `Ficha do ${sheetEditing.engine.label}`}
                  names={sheetNames(catalog, brandId, sheetEditing.kind === 'add' ? sheetEditing.year.id : sheetEditing.engine.id)}
                  initial={sheetEditing.kind === 'edit' ? sheetEditing.engine.sheet : undefined}
                  saving={saving}
                  onSave={(values) => void saveSheet(values)}
                  onCancel={() => setSheetEditing(null)}
                />
              ) : missingVehicle ? (
                <EmptyState title={missingVehicle} message={NO_SHEET_MESSAGE} />
              ) : sheet ? (
                <>
                  <div className={classes.sheetHead()} data-testid={ids.sheetHead}>
                    <Heading level={3}>{sheet.title}</Heading>
                    <Button variant="secondary" size="sm" icon={pencilIcon} onClick={() => editSheet({ kind: 'edit', engine: nodes.get(engine!)! })}>
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
      <Dialog
        open={removing !== undefined}
        onClose={() => setRemoving(undefined)}
        title={`Excluir “${removing?.label ?? ''}”?`}
        size="confirm"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRemoving(undefined)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" loading={saving} onClick={() => void remove()}>
              Excluir
            </Button>
          </>
        }
      >
        <Text size="sm" tone="muted">
          {removingBelow ? `Vão junto ${removingBelow}. ` : ''}As peças do estoque continuam cadastradas. Isso não pode ser desfeito.
        </Text>
      </Dialog>
    </div>
  )
}

/** The Catalog on a phone: one screen at a time, the brands, a brand's models or an engine's sheet. */
function PhoneCatalog({ catalog }: { catalog: Catalog }) {
  const state = useItems()
  const setHeader = usePhoneHeader()
  const { classes, ids } = catalogTab()
  const items = state.status === 'ready' ? state.items : []
  const [screen, setScreen] = useState<CatalogScreen>(CATALOG_HOME)
  const [query, setQuery] = useState('')
  const results = findParts(items, query)
  const searchingParts = results.parts.length > 0
  const modelQuery = searchingParts ? '' : query

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

  const search = (
    <>
      <SearchField label="Procure modelo ou código da peça" value={query} onValueChange={setQuery} />
      {searchingParts && <PartResults catalog={catalog} results={results} onChoose={choosePart} />}
    </>
  )

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
      </div>
    )
  }

  if (screen.view === 'models') {
    const { brandId, modelId, engineId, missing } = screen
    const brand = catalog.brands.find((b) => b.id === brandId)!
    const models = modelsNamed(brand.models, modelQuery)
    return (
      <div className={classes.screen()} data-testid={ids.screen}>
        {search}
        {missing && (
          <Panel>
            <EmptyState title={missing} message={NO_SHEET_MESSAGE} />
          </Panel>
        )}
        <h2 className={classes.heading()} data-testid={ids.heading}>
          Modelos · {models.length}
        </h2>
        {models.length > 0 ? (
          <TreeView
            key={`${brandId}-${modelId}-${engineId}`}
            label={`Modelos ${brand.name}`}
            nodes={models}
            selected={engineId}
            onSelect={(id) => setScreen({ view: 'sheet', brandId, engineId: id })}
            highlighted={modelId}
            defaultExpanded={modelId && !engineId ? [modelId] : undefined}
            leafTag="Ver ficha"
            className={classes.screenTree()}
          />
        ) : (
          <NoModel />
        )}
      </div>
    )
  }

  // The brands that have a model with the name searched, every brand without a search.
  const brands = catalog.brands.filter((brand) => modelsNamed(brand.models, modelQuery).length > 0)
  return (
    <div className={classes.screen()} data-testid={ids.screen}>
      {search}
      <h2 className={classes.heading()} data-testid={ids.heading}>
        Marcas · {brands.length}
      </h2>
      {brands.length > 0 ? (
        <ul className={classes.brandList()} data-testid={ids.brandList}>
          {brands.map((brand) => (
            <li key={brand.id}>
              <button
                type="button"
                className={classes.brand()}
                data-testid={ids.brand}
                onClick={() => setScreen({ view: 'models', brandId: brand.id })}
              >
                <span aria-hidden="true" className={classes.mark()} data-testid={ids.mark}>
                  {brand.mark}
                </span>
                <span className={classes.brandText()} data-testid={ids.brandText}>
                  <span className={classes.brandName()} data-testid={ids.brandName}>
                    {brand.name}
                  </span>
                  <span className={classes.brandMeta()} data-testid={ids.brandMeta}>
                    {brandSummary(catalog, brand)}
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

/** Says no model has the name searched. */
function NoModel() {
  return <EmptyState title="Nenhum modelo com esse nome" message="Procure por outro nome ou pelo código de uma peça do estoque." />
}
