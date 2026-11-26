import { useEffect, useState } from 'react'
import {
  belowBrand,
  belowNode,
  brandsNamed,
  brandSummary,
  brandWithModel,
  carFilters,
  carParts,
  carSheet,
  hasCarSheet,
  CATALOG_ADD,
  CATALOG_CHILDREN,
  CATALOG_HOME,
  catalogNodes,
  catalogSiblings,
  catalogValuesOf,
  catalogYearLimits,
  ENGINE_CLIPBOARD,
  catalogWithParts,
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
  treePath,
  type Catalog,
  type CatalogEditLevel,
  type CatalogNode,
  type CatalogScreen,
  type CatalogValues,
  type FoundPart,
} from '@apc/domain/catalog'
import type { Item } from '@apc/domain/items'
import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { CATALOG_SCREEN_TEXTS } from '@apc/domain/catalog-texts'
import { chevronIcon, closeIcon, copyIcon, ICON_SIZES, importIcon, moreIcon, pencilIcon, plusIcon, sortIcon, trashIcon } from '@apc/tokens/icons'
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
import { Switch } from '../../components/Switch'
import { SearchField } from '../../components/TextField'
import { TreeView } from '../../components/TreeView'
import { Heading, NumericReadout, Text } from '../../components/Typography'
import { usePhone } from '../../components/usePhone.ts'
import { useItems } from '../inventory/browse/useItems.ts'
import { CarParts, CarSheet } from './CarSheet.tsx'
import { catalogTab } from './CatalogTab.styles.ts'
import { EngineSheetForm } from './EngineSheetForm.tsx'
import { NodeForm } from './NodeForm.tsx'
import { PartResults } from './PartResults.tsx'
import { useCatalog } from './useCatalog.ts'
import { useCatalogEditing } from './useCatalogEditing.ts'
import { usePartsOnly } from './usePartsOnly.ts'
import { useInventoryLink } from '../dashboard/inventoryLinkContext.ts'
import { usePhoneHeader } from '../dashboard/phoneHeaderContext.ts'
import { useLocale, useMessages } from '../../app/useLocale.ts'
import { WEB_TEXTS } from '../../app/webTexts.ts'

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
// empty branch shows a dashed button to add its first. "Excluir marca" beside "Novo modelo" deletes the brand from the
// catalog with its models' trees, its vehicle brand staying in the lists, and opens the next brand. Deleting asks first,
// saying what goes with it. A catalog with no brand says so and adds the first with "Nova marca". A period (De and Até,
// "2007–2012") holds a version's engines for all its years. A period's "+", "Novo motor", opens an empty sheet in the detail column instead (see EngineSheetForm), and the engine joins the tree,
// chosen, once its sheet is saved; an engine's sheet has "Editar ficha", which turns it into the same form. Every change
// answers the whole catalog, which the tab takes as it is; a name or period another node has is said under the field.
// An engine's row has "Copiar motor", and Ctrl+C on it does the same; while an engine is copied, each period's row has
// "Colar motor", and Ctrl+V on it does the same, adding a copy of the engine and its sheet there, in any version, model
// or brand; a toast says each.
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
// rename it (a generation, with its years; a period, with De and Até), move it up or down (only where it can go), delete
// it after confirming, or close, and a period's has "Colar motor" while an engine is copied; an engine's "⋯" has
// "Copiar motor". A period's engines end with "Novo motor em <período>", and an empty branch with the button adding its first, and a
// brand's models end with "Excluir marca", which deletes the brand from the catalog and goes back to the brands. A new
// engine's sheet, and "Editar ficha" under an engine's sheet, open the sheet's form in a full-screen dialog with
// Cancelar and Salvar ficha at its foot; a new brand opens its models, and a new engine its sheet.
// A click on a model's or a version's name chooses it as well as opening or closing it, and the detail column shows its
// sheet (see CarSheet), whose engines open their sheets in the tree, and under it the parts in stock that fit it: a
// click on one opens its details in the Inventory tab, and "Ver todas as peças" opens the Inventory with the filters
// that list them (see inventoryLinkContext.ts). On a phone it is a screen of its own under the path to it, which ← leaves
// for the models open on it.
// "Só com peças", under the rail's search (on a phone, under the brands' search), shows only the models some
// part in stock fits, and the brands with one (catalogWithParts); each device remembers it (usePartsOnly). The brand
// open stays when it has a part, or the first brand opens. It can't be turned on while no part fits a vehicle, and
// adding a brand or a model turns it off, so the new one, with no part yet, shows. The tab loads the items once, for
// this and for the parts the searches and the sheets list, and waits for them when it is on.

/** The ids of the phone's node and sheet forms, which the buttons of their sheet and dialog send. */
const NODE_FORM_ID = 'catalog-node-form'
const SHEET_FORM_ID = 'catalog-sheet-form'

/** What both layouts take: the whole catalog, the items in stock, whether to show only the vehicles they fit, and the change handlers. */
type CatalogProps = {
  catalog: Catalog
  items: readonly Item[]
  partsOnly: boolean
  onPartsOnly: (on: boolean) => void
  onChanged: (catalog: Catalog) => void
}

export function CatalogTab() {
  const state = useCatalog()
  const stock = useItems()
  const [partsOnly, setPartsOnly] = usePartsOnly()
  const phone = usePhone()
  const { classes, ids } = catalogTab()
  const texts = useMessages(CATALOG_SCREEN_TEXTS)
  const common = useMessages(COMMON_TEXTS)
  const items = stock.status === 'ready' ? stock.items : []
  const waiting = partsOnly && stock.status === 'loading'
  if (state.status === 'ready' && state.catalog.brands.length > 0 && !waiting) {
    const props = { catalog: state.catalog, items, partsOnly, onPartsOnly: setPartsOnly, onChanged: state.replace }
    return phone ? <PhoneCatalog {...props} /> : <WideCatalog {...props} />
  }
  return (
    <div className={classes.status()} data-testid={ids.status}>
      {(state.status === 'loading' || (state.status === 'ready' && waiting)) && <Spinner label={texts.loading} />}
      {state.status === 'error' && (
        <ErrorState
          title={texts.error.title}
          message={texts.error.message}
          action={{ label: common.retry, onClick: state.reload }}
        />
      )}
      {state.status === 'ready' && !waiting && <EmptyCatalog onChanged={state.replace} />}
    </div>
  )
}

/** A catalog with no brand: says so, and adds the first. */
function EmptyCatalog({ onChanged }: { onChanged: (catalog: Catalog) => void }) {
  const editor = useCatalogEditing({ onChanged })
  const texts = useMessages(CATALOG_SCREEN_TEXTS)
  return (
    <>
      <EmptyState title={texts.empty.title} message={texts.empty.message} />
      {editor.editing ? (
        <NodeForm
          level="brand"
          label={texts.newBrand}
          error={editor.error}
          saving={editor.saving}
          onSave={(values) => void editor.save(values)}
          onCancel={() => editor.edit(null)}
        />
      ) : (
        <Button variant="ghost" size="sm" icon={plusIcon} onClick={() => editor.edit({ kind: 'add', level: 'brand', parent: { level: 'brand', id: '' } })}>
          {texts.newBrand}
        </Button>
      )}
    </>
  )
}

/** The Catalog from a tablet up: the rail, the tree and the detail column, with the tree edited in place. */
function WideCatalog({ catalog: all, items, partsOnly: wanted, onPartsOnly, onChanged }: CatalogProps) {
  const { locale } = useLocale()
  const texts = CATALOG_SCREEN_TEXTS[locale]
  const common = COMMON_TEXTS[locale]
  const web = WEB_TEXTS[locale].catalog
  const { classes, ids } = catalogTab()
  const withParts = catalogWithParts(all, items)
  const partsOnly = wanted && withParts.brands.length > 0
  const catalog = partsOnly ? withParts : all
  const [brandQuery, setBrandQuery] = useState('')
  const [query, setQuery] = useState('')
  const [chosenBrand, setBrandId] = useState(catalog.brands[0].id)
  // The brand open, or the first when it isn't shown.
  const brandId = catalog.brands.some((b) => b.id === chosenBrand) ? chosenBrand : catalog.brands[0].id
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
    onBrandRemoved: (changed) => {
      if (changed.brands.length > 0) {
        openBrandOf(changed, changed.brands[Math.min(catalog.brands.findIndex((b) => b.id === brandId), changed.brands.length - 1)].id)
      }
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
  const links = useInventoryLink()
  // The model or version chosen, whose sheet and parts the detail column shows.
  const chosen = engine ? nodes.get(engine) : undefined
  const car = chosen && hasCarSheet(chosen) ? chosen : undefined

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

  /** Shows only the vehicles some part fits, or all of them, opening the first brand when the open one goes. */
  const showPartsOnly = (on: boolean) => {
    onPartsOnly(on)
    const next = on ? withParts : all
    if (!next.brands.some((b) => b.id === brandId)) {
      openBrandOf(next, next.brands[0].id)
    }
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
      limits={editing ? catalogYearLimits(brand.models, editing) : undefined}
      error={editor.error}
      saving={editor.saving}
      onSave={(values) => void editor.save(values)}
      onCancel={() => editor.edit(null)}
    />
  )

  /**
   * A row's buttons: add the level under it, paste the engine copied into a period, rename it, move it up or down,
   * delete it; an engine's copies it.
   */
  const rowActions = (id: string) => {
    const node = nodes.get(id)
    if (!node) {
      return null
    }
    if (node.level === 'engine') {
      return <RowAction icon={copyIcon} label={`${ENGINE_CLIPBOARD[locale].copy} ${node.label}`} onClick={() => editor.copyEngine(node)} />
    }
    const siblings = catalogSiblings(brand.models, id)
    const at = siblings.findIndex((each) => each.id === id)
    return (
      <>
        <RowAction icon={plusIcon} label={texts.addIn(CATALOG_ADD[locale][node.level], node.label)} onClick={() => editor.addUnder(node)} />
        {node.level === 'year' && editor.copied && (
          <RowAction icon={importIcon} label={texts.addIn(ENGINE_CLIPBOARD[locale].paste, node.label)} onClick={() => void editor.pasteEngine(node)} />
        )}
        <RowAction
          icon={pencilIcon}
          label={node.level === 'year' ? web.yearsOf(node.label) : common.renameNamed(node.label)}
          onClick={() => editor.edit({ kind: 'rename', node })}
        />
        <RowAction
          icon={chevronIcon}
          iconClassName={classes.up()}
          label={web.moveUp(node.label)}
          disabled={at === 0}
          onClick={() => void editor.move(node, 'up')}
        />
        <RowAction
          icon={chevronIcon}
          iconClassName={classes.down()}
          label={web.moveDown(node.label)}
          disabled={at === siblings.length - 1}
          onClick={() => void editor.move(node, 'down')}
        />
        <RowAction icon={trashIcon} tone="danger" label={common.deleteNamed(node.label)} onClick={() => editor.askRemove(node)} />
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
      return form(child.level as CatalogEditLevel, texts.addIn(CATALOG_ADD[locale][node.level], node.label))
    }
    return node.children?.length === 0 ? (
      <Button variant="dashed" size="sm" icon={plusIcon} onClick={() => editor.addUnder(node)}>
        {texts.addIn(CATALOG_ADD[locale][node.level], node.label)}
      </Button>
    ) : null
  }

  return (
    <div className={classes.base()} data-testid={ids.base}>
      <Panel className={classes.rail()}>
        <SearchField label={web.searchBrand} value={brandQuery} onValueChange={setBrandQuery} />
        <Switch checked={partsOnly} onCheckedChange={showPartsOnly} disabled={withParts.brands.length === 0}>
          {texts.partsOnly}
        </Switch>
        <SelectableTileGroup
          label={texts.brands}
          options={brandsNamed(catalog, brandQuery).map((b) => ({ value: b.id, label: b.name }))}
          value={brandId}
          onValueChange={openBrand}
          className={classes.brands()}
        />
        {editing?.kind === 'add' && editing.level === 'brand' ? (
          form('brand', texts.newBrand)
        ) : (
          <Button
            variant="ghost"
            size="sm"
            icon={plusIcon}
            onClick={() => {
              onPartsOnly(false)
              editor.edit({ kind: 'add', level: 'brand', parent: { level: 'brand', id: '' } })
            }}
          >
            {texts.newBrand}
          </Button>
        )}
      </Panel>
      <div className={classes.main()} data-testid={ids.main}>
        <SearchField label={texts.searchModel} value={query} onValueChange={search} />
        {searchingParts && <PartResults catalog={catalog} results={results} chosen={part?.id} onChoose={choosePart} />}
        <div className={classes.body()} data-testid={ids.body}>
          <Panel className={classes.models()}>
            <div className={classes.modelsHead()} data-testid={ids.modelsHead}>
              <h3 className={classes.modelsTitle()} data-testid={ids.modelsTitle}>
                {texts.modelsCount(brand.models.length)}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                icon={plusIcon}
                onClick={() => {
                  onPartsOnly(false)
                  editor.edit({ kind: 'add', level: 'model', parent: { level: 'brand', id: brandId } })
                }}
              >
                {texts.newModel}
              </Button>
              <Button variant="ghost" size="sm" icon={trashIcon} onClick={() => editor.askRemoveBrand(brand)}>
                {texts.deleteBrand}
              </Button>
            </div>
            {editing?.kind === 'add' && editing.level === 'model' && form('model', texts.addIn(texts.newModel, brand.name))}
            {models.length > 0 ? (
              <TreeView
                key={`${brandId}-${revealed}`}
                label={texts.models(brand.name)}
                nodes={models}
                selected={engine}
                onSelect={setEngine}
                selectable={(id) => hasCarSheet(nodes.get(id))}
                highlighted={location?.modelId}
                defaultExpanded={location?.modelId && !location.engineId ? [location.modelId] : undefined}
                rowActions={rowActions}
                onRowKey={(id, event) => {
                  const node = nodes.get(id)
                  const key = (event.ctrlKey || event.metaKey) && !event.altKey ? event.key.toLowerCase() : ''
                  if (key === 'c' && node?.level === 'engine') {
                    editor.copyEngine(node)
                    return true
                  }
                  if (key === 'v' && node?.level === 'year' && editor.copied) {
                    void editor.pasteEngine(node)
                    return true
                  }
                  return false
                }}
                editing={
                  editing?.kind === 'rename'
                    ? {
                        id: editing.node.id,
                        content: form(editing.node.level as CatalogEditLevel, common.renameNamed(editing.node.label), catalogValuesOf(editing.node)),
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
            {!sheetEditing && (
              <ImageFrame
                alt={sheet ? texts.sheetPhoto(sheet.title) : car ? texts.sheetPhoto(carSheet(catalog, brandId, car.id).title) : texts.modelPhoto}
                emptyLabel={texts.noModelPhoto}
              />
            )}
            <Panel className={classes.sheet()}>
              {sheetEditing ? (
                <EngineSheetForm
                  key={sheetEditing.kind === 'add' ? sheetEditing.year.id : sheetEditing.engine.id}
                  label={sheetEditing.kind === 'add' ? texts.newEngine(sheetEditing.year.label) : texts.sheetOf(sheetEditing.engine.label)}
                  names={engineSheetNames(catalog, brandId, sheetEditing.kind === 'add' ? sheetEditing.year.id : sheetEditing.engine.id)}
                  initial={sheetEditing.kind === 'edit' ? sheetEditing.engine.sheet : undefined}
                  saving={editor.saving}
                  onSave={(values) => void editor.saveSheet(values)}
                  onCancel={() => editor.editSheet(null)}
                />
              ) : car ? (
                <CarSheet
                  catalog={catalog}
                  brandId={brandId}
                  nodeId={car.id}
                  onEngine={(id) => {
                    setEngine(id)
                    setRevealed((count) => count + 1)
                  }}
                />
              ) : missingVehicle ? (
                <EmptyState title={missingVehicle} message={NO_SHEET_MESSAGE[locale]} />
              ) : sheet ? (
                <>
                  <div className={classes.sheetHead()} data-testid={ids.sheetHead}>
                    <Heading level={3}>{sheet.title}</Heading>
                    <Button variant="secondary" size="sm" icon={pencilIcon} onClick={() => editor.editSheet({ kind: 'edit', engine: nodes.get(engine!)! })}>
                      {texts.editSheet}
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
                <EmptyState title={texts.noBrandSheet(brand.name).title} message={texts.noBrandSheet(brand.name).message} />
              )}
            </Panel>
            {car && !sheetEditing && (
              <Panel className={classes.sheet()}>
                <CarParts
                  parts={carParts(catalog, brandId, car.id, items)}
                  onPart={(item) => links.open({ itemId: item.id })}
                  onAll={() => links.open({ filters: carFilters(catalog, brandId, car.id, items) })}
                />
              </Panel>
            )}
          </div>
        </div>
      </div>
      <DeleteDialog
        name={removing?.label}
        below={removing && belowNode(removing, locale)}
        saving={editor.saving}
        onCancel={() => editor.askRemove(undefined)}
        onConfirm={() => void editor.remove()}
      />
      <DeleteDialog
        name={editor.removingBrand?.name}
        below={editor.removingBrand && belowBrand(editor.removingBrand, locale)}
        saving={editor.saving}
        onCancel={() => editor.askRemoveBrand(undefined)}
        onConfirm={() => void editor.removeBrand()}
      />
    </div>
  )
}

/** The Catalog on a phone: one screen at a time, the brands, a brand's models or an engine's sheet, edited in sheets. */
function PhoneCatalog({ catalog: all, items, partsOnly: wanted, onPartsOnly, onChanged }: CatalogProps) {
  const { locale } = useLocale()
  const texts = CATALOG_SCREEN_TEXTS[locale]
  const common = COMMON_TEXTS[locale]
  const setHeader = usePhoneHeader()
  const { classes, ids } = catalogTab()
  const withParts = catalogWithParts(all, items)
  const partsOnly = wanted && withParts.brands.length > 0
  const catalog = partsOnly ? withParts : all
  const [screen, setScreen] = useState<CatalogScreen>(CATALOG_HOME)
  const [query, setQuery] = useState('')
  const links = useInventoryLink()
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
    onBrandRemoved: () => setScreen(CATALOG_HOME),
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
    const { title, back } = screenHeader(catalog, screen, locale)
    const before = screenBack(screen)
    setHeader(back && before ? { title, back: { label: back, onClick: () => setScreen(before) } } : null)
    return () => setHeader(null)
  }, [catalog, screen, setHeader, locale])

  /** Opens the screen a part leads to, its engine's sheet or its brand's models, done with the search. */
  const choosePart = (part: FoundPart) => {
    const next = partScreen(catalog, part.item)
    if (next) {
      setQuery('')
      setScreen(next)
    }
  }

  /**
   * The actions of the node whose sheet is open: add under it, paste the engine copied into a period, rename it, move it
   * up or down, delete it, close; an engine's copy it.
   */
  const actions = () => {
    if (!acting || !brand) {
      return []
    }
    if (acting.level === 'engine') {
      return [
        { icon: copyIcon, label: ENGINE_CLIPBOARD[locale].copy, onSelect: () => editor.copyEngine(acting) },
        { icon: closeIcon, label: common.close, onSelect: () => {} },
      ]
    }
    const siblings = catalogSiblings(brand.models, acting.id)
    const at = siblings.findIndex((each) => each.id === acting.id)
    return [
      { icon: plusIcon, label: CATALOG_ADD[locale][acting.level as CatalogEditLevel], onSelect: () => editor.addUnder(acting) },
      ...(acting.level === 'year' && editor.copied ? [{ icon: importIcon, label: ENGINE_CLIPBOARD[locale].paste, onSelect: () => void editor.pasteEngine(acting) }] : []),
      {
        icon: pencilIcon,
        label: acting.level === 'generation' ? texts.renameAndYears : acting.level === 'year' ? texts.years : texts.rename,
        onSelect: () => editor.edit({ kind: 'rename', node: acting }),
      },
      ...(at > 0 ? [{ icon: sortIcon, label: texts.moveUp, onSelect: () => void editor.move(acting, 'up') }] : []),
      ...(at < siblings.length - 1 ? [{ icon: sortIcon, label: texts.moveDown, onSelect: () => void editor.move(acting, 'down') }] : []),
      { icon: trashIcon, label: texts.deleteMore, onSelect: () => editor.askRemove(acting) },
      { icon: closeIcon, label: common.close, onSelect: () => {} },
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
        {texts.addIn(CATALOG_ADD[locale][node.level], node.label)}
      </Button>
    )
  }

  /** What the sheet of what is being added or renamed is titled. */
  const editTitle = () => {
    if (!editing) {
      return ''
    }
    if (editing.kind === 'rename') {
      return common.renameNamed(editing.node.label)
    }
    const parent = editing.parent.level === 'brand' ? undefined : nodes.get(editing.parent.id)
    const add = editing.level === 'brand' ? texts.newBrand : CATALOG_ADD[locale][editing.parent.level]
    return parent ? texts.addIn(add, parent.label) : editing.level === 'model' && brand ? texts.addIn(add, brand.name) : add
  }

  const search = (
    <>
      <SearchField label={texts.searchModel} value={query} onValueChange={setQuery} />
      {searchingParts && <PartResults catalog={catalog} results={results} onChoose={choosePart} />}
    </>
  )

  /** The screen on show. */
  const content = () => {
    if (screen.view === 'car') {
      const path = enginePath(catalog, screen.brandId, screen.nodeId)
      return (
        <div className={classes.screen()} data-testid={ids.screen}>
          {path && (
            <p className={classes.path()} data-testid={ids.path}>
              {path}
            </p>
          )}
          <ImageFrame alt={texts.sheetPhoto(carSheet(catalog, screen.brandId, screen.nodeId).title)} emptyLabel={texts.noModelPhoto} />
          <CarSheet catalog={catalog} brandId={screen.brandId} nodeId={screen.nodeId} onEngine={(engineId) => setScreen({ view: 'sheet', brandId: screen.brandId, engineId })} />
          <CarParts
            parts={carParts(catalog, screen.brandId, screen.nodeId, items)}
            onPart={(item) => links.open({ itemId: item.id })}
            onAll={() => links.open({ filters: carFilters(catalog, screen.brandId, screen.nodeId, items) })}
          />
        </div>
      )
    }

    if (screen.view === 'sheet') {
      const sheet = catalog.sheets[screen.engineId]
      return (
        <div className={classes.screen()} data-testid={ids.screen}>
          <p className={classes.path()} data-testid={ids.path}>
            {enginePath(catalog, screen.brandId, screen.engineId)}
          </p>
          <ImageFrame alt={texts.sheetPhoto(sheet.title)} emptyLabel={texts.noModelPhoto} />
          <Heading level={2}>{sheet.title}</Heading>
          <dl className={classes.readouts()} data-testid={ids.readouts}>
            {sheet.specs.map((spec, index) => (
              <div key={ENGINE_SPEC_LABELS[locale][index]} className={classes.readout()} data-testid={ids.readout}>
                <dt className={classes.readoutLabel()} data-testid={ids.readoutLabel}>
                  {ENGINE_SPEC_LABELS[locale][index]}
                </dt>
                <dd className={classes.readoutValue()} data-testid={ids.readoutValue}>
                  <NumericReadout tone="accent">{spec}</NumericReadout>
                </dd>
              </div>
            ))}
          </dl>
          <Text tone="muted">{sheet.summary}</Text>
          <Button variant="secondary" icon={pencilIcon} onClick={() => editor.editSheet({ kind: 'edit', engine: nodes.get(screen.engineId)! })}>
            {texts.editSheet}
          </Button>
        </div>
      )
    }

    if (screen.view === 'models') {
      const { brandId, modelId, nodeId, missing } = screen
      const models = modelsNamed(brand!.models, modelQuery)
      return (
        <div className={classes.screen()} data-testid={ids.screen}>
          {search}
          {missing && (
            <Panel>
              <EmptyState title={missing} message={NO_SHEET_MESSAGE[locale]} />
            </Panel>
          )}
          <div className={classes.screenHead()} data-testid={ids.screenHead}>
            <h2 className={classes.heading()} data-testid={ids.heading}>
              {texts.modelsCount(models.length)}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              icon={plusIcon}
              onClick={() => {
                onPartsOnly(false)
                editor.edit({ kind: 'add', level: 'model', parent: { level: 'brand', id: brandId } })
              }}
            >
              {texts.newModel}
            </Button>
          </div>
          {models.length > 0 ? (
            <TreeView
              key={`${brandId}-${modelId}-${nodeId}`}
              label={texts.models(brand!.name)}
              nodes={models}
              selected={nodeId}
              onSelect={(id) => setScreen(hasCarSheet(nodes.get(id)) ? { view: 'car', brandId, nodeId: id } : { view: 'sheet', brandId, engineId: id })}
              selectable={(id) => hasCarSheet(nodes.get(id))}
              highlighted={modelId}
              defaultExpanded={nodeId ? treePath(catalog, brandId, nodeId).map((node) => node.id) : modelId ? [modelId] : undefined}
              leafTag={texts.viewSheet}
              rowActions={(id) => {
                const node = nodes.get(id)
                return node ? <RowAction icon={moreIcon} label={texts.actionsOf(node.label)} onClick={() => setActing(node)} /> : null
              }}
              after={after}
              reveal={editing?.kind === 'add' && editing.parent.level !== 'brand' ? editing.parent.id : undefined}
              className={classes.screenTree()}
            />
          ) : (
            <NoModel none={brand!.models.length === 0} />
          )}
          <Button variant="secondary" icon={trashIcon} onClick={() => editor.askRemoveBrand(brand)}>
            {texts.deleteBrand}
          </Button>
        </div>
      )
    }

    // The brands that have a model with the name searched, every brand without a search.
    const brands = catalog.brands.filter((each) => modelsNamed(each.models, modelQuery).length > 0)
    return (
      <div className={classes.screen()} data-testid={ids.screen}>
        {search}
        <Switch checked={partsOnly} onCheckedChange={onPartsOnly} disabled={withParts.brands.length === 0}>
          {texts.partsOnly}
        </Switch>
        <div className={classes.screenHead()} data-testid={ids.screenHead}>
          <h2 className={classes.heading()} data-testid={ids.heading}>
            {texts.brandsCount(brands.length)}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            icon={plusIcon}
            onClick={() => {
              onPartsOnly(false)
              editor.edit({ kind: 'add', level: 'brand', parent: { level: 'brand', id: '' } })
            }}
          >
            {texts.newBrand}
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
                      {brandSummary(catalog, each, locale)}
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
              {common.cancel}
            </Button>
            <Button type="submit" form={NODE_FORM_ID} loading={editor.saving}>
              {editing?.kind === 'rename' ? common.save : common.add}
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
              limits={catalogYearLimits(brand?.models ?? [], editing)}
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
        title={sheetEditing?.kind === 'add' ? texts.newEngine(sheetEditing.year.label) : texts.sheetOf(sheetEditing?.engine.label ?? '')}
        closable
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => editor.editSheet(null)}>
              {common.cancel}
            </Button>
            <Button type="submit" size="sm" form={SHEET_FORM_ID} loading={editor.saving}>
              {texts.saveSheet}
            </Button>
          </>
        }
      >
        {sheetEditing && brand && (
          <EngineSheetForm
            id={SHEET_FORM_ID}
            actions={false}
            label={sheetEditing.kind === 'add' ? texts.newEngine(sheetEditing.year.label) : texts.sheetOf(sheetEditing.engine.label)}
            names={engineSheetNames(catalog, brand.id, sheetEditing.kind === 'add' ? sheetEditing.year.id : sheetEditing.engine.id)}
            initial={sheetEditing.kind === 'edit' ? sheetEditing.engine.sheet : undefined}
            saving={editor.saving}
            onSave={(values) => void editor.saveSheet(values)}
            onCancel={() => editor.editSheet(null)}
          />
        )}
      </Dialog>
      <DeleteDialog
        name={editor.removing?.label}
        below={editor.removing && belowNode(editor.removing, locale)}
        saving={editor.saving}
        onCancel={() => editor.askRemove(undefined)}
        onConfirm={() => void editor.remove()}
      />
      <DeleteDialog
        name={editor.removingBrand?.name}
        below={editor.removingBrand && belowBrand(editor.removingBrand, locale)}
        saving={editor.saving}
        onCancel={() => editor.askRemoveBrand(undefined)}
        onConfirm={() => void editor.removeBrand()}
      />
    </>
  )
}

/** Asks to confirm deleting a node or a brand of the catalog, saying what goes with it and that the inventory's parts stay. */
function DeleteDialog({
  name,
  below,
  saving,
  onCancel,
  onConfirm,
}: {
  name?: string
  below?: string | null
  saving: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const texts = useMessages(CATALOG_SCREEN_TEXTS)
  const common = useMessages(COMMON_TEXTS)
  return (
    <Dialog
      open={name !== undefined}
      onClose={onCancel}
      title={texts.deleteTitle(name ?? '')}
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {common.cancel}
          </Button>
          <Button variant="danger" size="sm" loading={saving} onClick={onConfirm}>
            {common.delete}
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {texts.deleteText(below ?? null)}
      </Text>
    </Dialog>
  )
}

/** Says no model has the name searched, or, for a brand with none yet, where to add the first. */
function NoModel({ none = false }: { none?: boolean }) {
  const texts = useMessages(CATALOG_SCREEN_TEXTS)
  const { title, message } = none ? texts.noModel : texts.noModelNamed
  return <EmptyState title={title} message={message} />
}
