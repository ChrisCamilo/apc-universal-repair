import { useEffect, useState } from 'react'
import {
  brandsNamed,
  brandSummary,
  brandWithModel,
  CATALOG,
  CATALOG_HOME,
  ENGINE_SHEETS,
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
  type CatalogScreen,
  type FoundPart,
} from '@apc/shared/catalog'
import { chevronIcon, ICON_SIZES } from '@apc/shared/icons'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { ImageFrame } from '../components/ImageFrame'
import { Panel } from '../components/Panel'
import { SelectableTileGroup } from '../components/SelectableTile'
import { SearchField } from '../components/TextField'
import { TreeView } from '../components/TreeView'
import { Heading, NumericReadout, Text } from '../components/Typography'
import { usePhone } from '../components/usePhone.ts'
import { useItems } from '../inventory/useItems.ts'
import { catalogTab } from './CatalogTab.styles.ts'
import { PartResults } from './PartResults.tsx'
import { usePhoneHeader } from '../dashboard/phoneHeaderContext.ts'

// The Catalog tab (/catalog): the brand tiles in a rail, the chosen brand's model tree, and the detail column with
// the chosen engine's sheet. A brand opens on its first engine; one with no engine yet says so in the detail
// column. On narrow screens the tiles sit above the tree in rows and the detail column goes below it. The data is
// the mocked catalog of @apc/shared/catalog.
// The rail's search narrows the brand tiles by name. The search above the tree looks for the code of a part kept in
// the inventory first: with 3+ letters or digits of a code it lists the matching parts, and choosing one (the first
// at once) reveals its vehicle: its brand, its model pointed out, the path open and the engine chosen, or, when the
// catalog has no sheet for that vehicle, a note saying so instead of another vehicle's sheet. Otherwise it narrows
// the tree by model name, moving to the first brand that has the model, or says no brand has it. Clearing it drops
// the part list and the pointed-out model.
// On a phone (below `card:`) the tab is a stack of screens, as in the "Catálogo no celular" mockup (see
// CatalogScreen in @apc/shared/catalog): the brands, each on a line with how many models and sheets it has; a brand's
// models, as a tree whose engines say "Ver ficha"; and an engine's sheet under the path to it. A screen past the
// brands puts its brand's name and a ← in the page's header, and opens at its top. The search above the brands and
// the models looks for parts by code as above, listed as the Inventory's cards, and a tap on one clears it and opens
// the part's engine sheet, or its brand's models with its model pointed out and the note when the catalog has no sheet
// for it. Otherwise it narrows the brands to the ones with a model of that name, and the tree to those models. The
// brand search is left out.

export function CatalogTab() {
  return usePhone() ? <PhoneCatalog /> : <WideCatalog />
}

/** The Catalog from a tablet up: the rail, the tree and the detail column. */
function WideCatalog() {
  const state = useItems()
  const { classes, ids } = catalogTab()
  const items = state.status === 'ready' ? state.items : []
  const [brandQuery, setBrandQuery] = useState('')
  const [query, setQuery] = useState('')
  const [brandId, setBrandId] = useState(CATALOG[0].id)
  const [engine, setEngine] = useState(() => firstSheet(CATALOG[0].models))
  const [part, setPart] = useState<FoundPart | null>(null)
  // Bumped to draw the tree again, open on the engine of a part just chosen.
  const [revealed, setRevealed] = useState(0)
  const brand = CATALOG.find((b) => b.id === brandId)!
  const results = findParts(items, query)
  const searchingParts = results.parts.length > 0
  // The vehicle of the chosen part the catalog shows: the one it knows best, of a part of several.
  const vehicle = part && revealedVehicle(part.item)
  const location = searchingParts && vehicle ? locatePart(vehicle) : null
  const models = modelsNamed(brand.models, searchingParts ? '' : query)
  const sheet = engine ? ENGINE_SHEETS[engine] : undefined
  // A part for a model the catalog has no sheet for says so, instead of showing another vehicle.
  const missingVehicle = location && vehicle?.vehicleModel && !location.engineId ? `${vehicle.vehicleBrand} ${vehicle.vehicleModel}` : null

  /** Opens a brand on its first engine. */
  const openBrand = (id: string) => {
    setBrandId(id)
    setEngine(firstSheet(CATALOG.find((b) => b.id === id)!.models))
  }

  /** Reveals a part's vehicle: its brand, its engine, and the tree open on them. */
  const choosePart = (chosen: FoundPart) => {
    setPart(chosen)
    const found = locatePart(revealedVehicle(chosen.item))
    if (found) {
      setBrandId(found.brandId)
      setEngine(found.engineId ?? (found.modelId ? undefined : firstSheet(CATALOG.find((b) => b.id === found.brandId)!.models)))
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
    const withModel = text.trim() ? brandWithModel(brandId, text) : null
    if (withModel && withModel !== brandId) {
      openBrand(withModel)
    }
  }

  return (
    <div className={classes.base()} data-testid={ids.base}>
      <Panel className={classes.rail()}>
        <SearchField label="Procure marca" value={brandQuery} onValueChange={setBrandQuery} />
        <SelectableTileGroup
          label="Marcas"
          options={brandsNamed(brandQuery).map((b) => ({ value: b.id, label: b.name }))}
          value={brandId}
          onValueChange={openBrand}
          className={classes.brands()}
        />
      </Panel>
      <div className={classes.main()} data-testid={ids.main}>
        <SearchField label="Procure modelo ou código da peça" value={query} onValueChange={search} />
        {searchingParts && <PartResults results={results} chosen={part?.id} onChoose={choosePart} />}
        <div className={classes.body()} data-testid={ids.body}>
          <Panel>
            {models.length > 0 ? (
              <TreeView
                key={`${brandId}-${revealed}`}
                label={`Modelos ${brand.name}`}
                nodes={models}
                selected={engine}
                onSelect={setEngine}
                highlighted={location?.modelId}
                defaultExpanded={location?.modelId && !location.engineId ? [location.modelId] : undefined}
                className={classes.tree()}
              />
            ) : (
              <EmptyState title="Nenhum modelo com esse nome" message="Procure por outro nome ou pelo código de uma peça do estoque." />
            )}
          </Panel>
          <div className={classes.detail()} data-testid={ids.detail}>
            <ImageFrame alt={sheet ? `Foto do ${sheet.title}` : 'Foto do modelo'} emptyLabel="Sem foto do modelo" />
            <Panel className={classes.sheet()}>
              {missingVehicle ? (
                <EmptyState title={missingVehicle} message={NO_SHEET_MESSAGE} />
              ) : sheet ? (
                <>
                  <Heading level={3}>{sheet.title}</Heading>
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
    </div>
  )
}

/** The Catalog on a phone: one screen at a time, the brands, a brand's models or an engine's sheet. */
function PhoneCatalog() {
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
    const { title, back } = screenHeader(screen)
    const before = screenBack(screen)
    setHeader(back && before ? { title, back: { label: back, onClick: () => setScreen(before) } } : null)
    return () => setHeader(null)
  }, [screen, setHeader])

  /** Opens the screen a part leads to, its engine's sheet or its brand's models, done with the search. */
  const choosePart = (part: FoundPart) => {
    const next = partScreen(part.item)
    if (next) {
      setQuery('')
      setScreen(next)
    }
  }

  const search = (
    <>
      <SearchField label="Procure modelo ou código da peça" value={query} onValueChange={setQuery} />
      {searchingParts && <PartResults results={results} onChoose={choosePart} />}
    </>
  )

  if (screen.view === 'sheet') {
    const sheet = ENGINE_SHEETS[screen.engineId]
    return (
      <div className={classes.screen()} data-testid={ids.screen}>
        <p className={classes.path()} data-testid={ids.path}>
          {enginePath(screen.brandId, screen.engineId)}
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
    const brand = CATALOG.find((b) => b.id === brandId)!
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
  const brands = CATALOG.filter((brand) => modelsNamed(brand.models, modelQuery).length > 0)
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
                    {brandSummary(brand)}
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
