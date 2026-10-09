import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import {
  brandsNamed,
  brandWithModel,
  CATALOG,
  ENGINE_SHEETS,
  findParts,
  firstSheet,
  locatePart,
  modelsNamed,
} from '@apc/shared/catalog';
import type { Item } from '@apc/shared/items';
import { EmptyState } from '../EmptyState';
import { ImageFrame } from '../ImageFrame';
import { Panel } from '../Panel';
import { SelectableTileGroup } from '../SelectableTile';
import { SearchField } from '../TextField';
import { TreeView } from '../TreeView';
import { Heading, NumericReadout, Text } from '../Typography';
import { useItems } from '../inventory/useItems';
import { TILE_COLUMNS, useStyles, WIDE_SCREEN } from './CatalogTab.styles';
import { PartResults } from './PartResults';

// The Catalog tab, the same as the web on a narrow screen: the brand tiles in rows (two on a phone, four from the
// web's sm width), the chosen brand's model tree, which scrolls inside its own height, and below it the chosen
// engine's sheet. A brand opens on its first engine; one with no engine yet says so where the sheet goes. The data
// is the mocked catalog of @apc/shared/catalog. The searches work as on the web: the one above the tiles narrows the
// brands by name; the one above the tree lists the inventory parts with that code (3+ letters or digits) and
// reveals the chosen part's vehicle, or a note when the catalog has no sheet for it, and otherwise narrows the tree by
// model name, moving to the first brand that has the model.

const NO_SHEET = 'Este veículo ainda não tem ficha técnica no catálogo. A peça continua cadastrada no estoque.';

export function CatalogTab() {
  const { width } = useWindowDimensions();
  const { styles, ids } = useStyles();
  const state = useItems();
  const items = state.status === 'ready' ? state.items : [];
  const [brandQuery, setBrandQuery] = useState('');
  const [query, setQuery] = useState('');
  const [brandId, setBrandId] = useState(CATALOG[0].id);
  const [engine, setEngine] = useState(() => firstSheet(CATALOG[0].models));
  const [part, setPart] = useState<Item | null>(null);
  // Bumped to draw the tree again, open on the engine of a part just chosen.
  const [revealed, setRevealed] = useState(0);
  const brand = CATALOG.find((b) => b.id === brandId)!;
  const results = findParts(items, query);
  const searchingParts = results.parts.length > 0;
  const location = searchingParts && part ? locatePart(part) : null;
  const models = modelsNamed(brand.models, searchingParts ? '' : query);
  const sheet = engine ? ENGINE_SHEETS[engine] : undefined;
  // A part for a model the catalog has no sheet for says so, instead of showing another vehicle.
  const missingVehicle = location && part?.vehicleModel && !location.engineId ? `${part.vehicleBrand} ${part.vehicleModel}` : null;

  /** Opens a brand on its first engine. */
  const openBrand = (id: string) => {
    setBrandId(id);
    setEngine(firstSheet(CATALOG.find((b) => b.id === id)!.models));
  };

  /** Reveals a part's vehicle: its brand, its engine, and the tree open on them. */
  const choosePart = (chosen: Item) => {
    setPart(chosen);
    const found = locatePart(chosen);
    if (found) {
      setBrandId(found.brandId);
      setEngine(found.engineId ?? (found.modelId ? undefined : firstSheet(CATALOG.find((b) => b.id === found.brandId)!.models)));
      setRevealed((count) => count + 1);
    }
  };

  /** Looks for parts by code first, otherwise narrows the tree by model name. */
  const search = (text: string) => {
    setQuery(text);
    const found = findParts(items, text);
    if (found.parts.length > 0) {
      choosePart(found.parts[0]);
      return;
    }
    setPart(null);
    const withModel = text.trim() ? brandWithModel(brandId, text) : null;
    if (withModel && withModel !== brandId) {
      openBrand(withModel);
    }
  };

  return (
    <View style={styles.tab} testID={ids.tab}>
      <Panel style={styles.rail}>
        <SearchField label="Procure marca" value={brandQuery} onValueChange={setBrandQuery} />
        <SelectableTileGroup
          label="Marcas"
          options={brandsNamed(brandQuery).map((b) => ({ value: b.id, label: b.name }))}
          value={brandId}
          onValueChange={openBrand}
          columns={width >= WIDE_SCREEN ? TILE_COLUMNS.wide : TILE_COLUMNS.narrow}
        />
      </Panel>
      <SearchField label="Procure modelo ou código da peça" value={query} onValueChange={search} />
      {searchingParts && <PartResults results={results} chosen={part?.id} onChoose={choosePart} />}
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
            style={styles.tree}
          />
        ) : (
          <EmptyState title="Nenhum modelo com esse nome" message="Procure por outro nome ou pelo código de uma peça do estoque." />
        )}
      </Panel>
      <ImageFrame alt={sheet ? `Foto do ${sheet.title}` : 'Foto do modelo'} emptyLabel="Sem foto do modelo" />
      <Panel>
        {missingVehicle ? (
          <EmptyState title={missingVehicle} message={NO_SHEET} />
        ) : sheet ? (
          <View style={styles.sheet} testID={ids.sheet}>
            <Heading level={3}>{sheet.title}</Heading>
            <View style={styles.specs} testID={ids.specs}>
              {sheet.specs.map((spec) => (
                <NumericReadout key={spec} tone="accent">
                  {spec}
                </NumericReadout>
              ))}
            </View>
            <Text size="sm" tone="muted" lines={5}>
              {sheet.summary}
            </Text>
          </View>
        ) : (
          <EmptyState
            title="Nenhuma ficha cadastrada"
            message={`Os veículos da ${brand.name} ainda não têm ficha técnica. Escolha outra marca.`}
          />
        )}
      </Panel>
    </View>
  );
}
