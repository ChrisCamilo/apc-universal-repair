import { useState } from 'react';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';
import { CATALOG, ENGINE_SHEETS, firstSheet } from '@apc/shared/catalog';
import { scales } from '@apc/shared/theme';
import { EmptyState } from '../EmptyState';
import { ImageFrame } from '../ImageFrame';
import { Panel } from '../Panel';
import { SelectableTileGroup } from '../SelectableTile';
import { TreeView } from '../TreeView';
import { Heading, NumericReadout, Text } from '../Typography';

// The Catalog tab, the same as the web on a narrow screen: the brand tiles in rows (two on a phone, four from the
// web's sm width), the chosen brand's model tree, which scrolls inside its own height, and below it the chosen
// engine's sheet. A brand opens on its first engine; one with no engine yet says so where the sheet goes. The data
// is the mocked catalog of @apc/shared/catalog; the search fields come with #56.

const BRAND_OPTIONS = CATALOG.map((brand) => ({ value: brand.id, label: brand.name }));
const SHEET_STYLE: ViewStyle = { gap: scales.space.s3 };
const SPECS_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', columnGap: scales.space.s3, rowGap: scales.space.s1 };
const TAB_STYLE: ViewStyle = { gap: scales.space.s3 };
// The tree's height before it scrolls, as on the web (max-h-96).
const TREE_STYLE: ViewStyle = { maxHeight: scales.space.s1 * 96 };
/** Screen width from which the brand tiles sit four to a row: the web's sm breakpoint. */
const WIDE_SCREEN = 640;

export function CatalogTab() {
  const { width } = useWindowDimensions();
  const [brandId, setBrandId] = useState(CATALOG[0].id);
  const brand = CATALOG.find((b) => b.id === brandId)!;
  const [engine, setEngine] = useState(() => firstSheet(brand.models));
  const sheet = engine ? ENGINE_SHEETS[engine] : undefined;

  /** Opens a brand on its first engine. */
  const chooseBrand = (id: string) => {
    setBrandId(id);
    setEngine(firstSheet(CATALOG.find((b) => b.id === id)!.models));
  };

  return (
    <View style={TAB_STYLE}>
      <Panel>
        <SelectableTileGroup
          label="Marcas"
          options={BRAND_OPTIONS}
          value={brandId}
          onValueChange={chooseBrand}
          columns={width >= WIDE_SCREEN ? 4 : 2}
        />
      </Panel>
      <Panel>
        <TreeView
          key={brandId}
          label={`Modelos ${brand.name}`}
          nodes={brand.models}
          selected={engine}
          onSelect={setEngine}
          style={TREE_STYLE}
        />
      </Panel>
      <ImageFrame alt={sheet ? `Foto do ${sheet.title}` : 'Foto do modelo'} emptyLabel="Sem foto do modelo" />
      <Panel>
        {sheet ? (
          <View style={SHEET_STYLE}>
            <Heading level={3}>{sheet.title}</Heading>
            <View style={SPECS_STYLE}>
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
