import { useState } from 'react'
import {
  brandsNamed,
  brandWithModel,
  CATALOG,
  ENGINE_SHEETS,
  findParts,
  firstSheet,
  locatePart,
  modelsNamed,
} from '@apc/shared/catalog'
import type { Item } from '@apc/shared/items'
import { EmptyState } from '../components/EmptyState.tsx'
import { ImageFrame } from '../components/ImageFrame.tsx'
import { Panel } from '../components/Panel.tsx'
import { SelectableTileGroup } from '../components/SelectableTile.tsx'
import { SearchField } from '../components/TextField.tsx'
import { TreeView } from '../components/TreeView.tsx'
import { Heading, NumericReadout, Text } from '../components/Typography.tsx'
import { useItems } from '../inventory/useItems.ts'
import { PartResults } from './PartResults.tsx'

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

const NO_SHEET = 'Este veículo ainda não tem ficha técnica no catálogo. A peça continua cadastrada no estoque.'

export function CatalogTab() {
  const state = useItems()
  const items = state.status === 'ready' ? state.items : []
  const [brandQuery, setBrandQuery] = useState('')
  const [query, setQuery] = useState('')
  const [brandId, setBrandId] = useState(CATALOG[0].id)
  const [engine, setEngine] = useState(() => firstSheet(CATALOG[0].models))
  const [part, setPart] = useState<Item | null>(null)
  // Bumped to draw the tree again, open on the engine of a part just chosen.
  const [revealed, setRevealed] = useState(0)
  const brand = CATALOG.find((b) => b.id === brandId)!
  const results = findParts(items, query)
  const searchingParts = results.parts.length > 0
  const location = searchingParts && part ? locatePart(part) : null
  const models = modelsNamed(brand.models, searchingParts ? '' : query)
  const sheet = engine ? ENGINE_SHEETS[engine] : undefined
  // A part for a model the catalog has no sheet for says so, instead of showing another vehicle.
  const missingVehicle = location && part?.vehicleModel && !location.engineId ? `${part.vehicleBrand} ${part.vehicleModel}` : null

  /** Opens a brand on its first engine. */
  const openBrand = (id: string) => {
    setBrandId(id)
    setEngine(firstSheet(CATALOG.find((b) => b.id === id)!.models))
  }

  /** Reveals a part's vehicle: its brand, its engine, and the tree open on them. */
  const choosePart = (chosen: Item) => {
    setPart(chosen)
    const found = locatePart(chosen)
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
    <div className="grid gap-3 lg:grid-cols-[calc(var(--spacing)*46)_minmax(0,1fr)]">
      <Panel className="grid content-start gap-3">
        <SearchField label="Procure marca" value={brandQuery} onValueChange={setBrandQuery} />
        <SelectableTileGroup
          label="Marcas"
          options={brandsNamed(brandQuery).map((b) => ({ value: b.id, label: b.name }))}
          value={brandId}
          onValueChange={openBrand}
          className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-1"
        />
      </Panel>
      <div className="grid min-w-0 content-start gap-3">
        <SearchField label="Procure modelo ou código da peça" value={query} onValueChange={search} />
        {searchingParts && <PartResults results={results} chosen={part?.id} onChoose={choosePart} />}
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,calc(var(--spacing)*82))]">
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
                className="max-h-96 lg:max-h-[calc(var(--spacing)*120)]"
              />
            ) : (
              <EmptyState title="Nenhum modelo com esse nome" message="Procure por outro nome ou pelo código de uma peça do estoque." />
            )}
          </Panel>
          <div className="grid min-w-0 content-start gap-3">
            <ImageFrame alt={sheet ? `Foto do ${sheet.title}` : 'Foto do modelo'} emptyLabel="Sem foto do modelo" />
            <Panel className="grid gap-3">
              {missingVehicle ? (
                <EmptyState title={missingVehicle} message={NO_SHEET} />
              ) : sheet ? (
                <>
                  <Heading level={3}>{sheet.title}</Heading>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
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
