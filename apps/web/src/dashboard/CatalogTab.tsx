import { useState } from 'react'
import { CATALOG, ENGINE_SHEETS, firstSheet } from '@apc/shared/catalog'
import { EmptyState } from '../components/EmptyState.tsx'
import { ImageFrame } from '../components/ImageFrame.tsx'
import { Panel } from '../components/Panel.tsx'
import { SelectableTileGroup } from '../components/SelectableTile.tsx'
import { TreeView } from '../components/TreeView.tsx'
import { Heading, NumericReadout, Text } from '../components/Typography.tsx'

// The Catalog tab (/catalog): the brand tiles in a rail, the chosen brand's model tree, and the detail column with
// the chosen engine's sheet. A brand opens on its first engine; one with no engine yet says so in the detail
// column. On narrow screens the tiles sit above the tree in rows and the detail column goes below it. The
// data is the mocked catalog of @apc/shared/catalog; the search fields come with #56.

const BRAND_OPTIONS = CATALOG.map((brand) => ({ value: brand.id, label: brand.name }))

export function CatalogTab() {
  const [brandId, setBrandId] = useState(CATALOG[0].id)
  const brand = CATALOG.find((b) => b.id === brandId)!
  const [engine, setEngine] = useState(() => firstSheet(brand.models))
  const sheet = engine ? ENGINE_SHEETS[engine] : undefined

  /** Opens a brand on its first engine. */
  const chooseBrand = (id: string) => {
    setBrandId(id)
    setEngine(firstSheet(CATALOG.find((b) => b.id === id)!.models))
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[calc(var(--spacing)*46)_minmax(0,1fr)]">
      <Panel className="grid content-start gap-3">
        <SelectableTileGroup
          label="Marcas"
          options={BRAND_OPTIONS}
          value={brandId}
          onValueChange={chooseBrand}
          className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-1"
        />
      </Panel>
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,calc(var(--spacing)*82))]">
        <Panel>
          <TreeView
            key={brandId}
            label={`Modelos ${brand.name}`}
            nodes={brand.models}
            selected={engine}
            onSelect={setEngine}
            className="max-h-96 lg:max-h-[calc(var(--spacing)*120)]"
          />
        </Panel>
        <div className="grid min-w-0 content-start gap-3">
          <ImageFrame alt={sheet ? `Foto do ${sheet.title}` : 'Foto do modelo'} emptyLabel="Sem foto do modelo" />
          <Panel className="grid gap-3">
            {sheet ? (
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
  )
}
