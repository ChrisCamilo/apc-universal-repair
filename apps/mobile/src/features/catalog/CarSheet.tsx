import type { ComponentProps } from 'react';
import { Text as RNText, View } from 'react-native';
import { carSheet, type Catalog } from '@apc/domain/catalog';
import { itemCardCode, itemCardDetails, stockTint, type Item } from '@apc/domain/items';
import { filterIcon } from '@apc/tokens/icons';
import { Button } from '../../components/Button';
import { DataTable, TableThumbnail } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { Heading } from '../../components/Typography';
import { useLocale, useMessages } from '../../app/locale';
import { CardTitle, StockQuantity } from '../inventory/browse/ItemCard';
import { photoSource } from '../sync/photoCache';
import { useStyles } from './CarSheet.styles';
import { CATALOG_SCREEN_TEXTS } from '@apc/domain/catalog-texts';
import { perLocale } from '@apc/domain/locale';

// A model's or a version's sheet in the Catalog, the same as the web on a phone (see carSheet in @apc/domain/catalog):
// its title; a model's brand and its generations, each with its years ("85/90") and versions; a version's generation
// and years; and its engines with sheets, each a link that opens its engine's sheet, or a note when it has none yet.
// Under it, CarParts lists the parts in stock that fit it as the Inventory's cards: photo, name, code, where it fits,
// where it is and its price, and quantity with its stock status, tinted by it. A press on one opens its details in the
// Inventory, and "Ver todas as peças" opens the Inventory with the filters that list them; with none, a note says so.

// A part's card: its photo, its name, code and details, and its quantity.
const PART_COLUMNS = perLocale((locale): ComponentProps<typeof DataTable<Item>>['columns'] => {
  const texts = CATALOG_SCREEN_TEXTS[locale];
  return [
    {
      key: 'photo',
      header: texts.photo,
      card: 'thumb',
      cell: (item) => {
        const photo = item.brands.flatMap((brand) => brand.photos)[0];
        return <TableThumbnail src={photo && photoSource(photo, 'thumb')} label={texts.photoOf(item.name)} />;
      },
    },
    {
      key: 'name',
      header: texts.item,
      card: 'main',
      cell: (item) => <PartTitle item={item} />,
    },
    { key: 'quantity', header: texts.quantity, numeric: true, card: 'end', cell: (item) => <StockQuantity {...item} /> },
  ];
});

type CarSheetProps = {
  catalog: Catalog;
  brandId: string;
  /** A model or a version of the brand's tree. */
  nodeId: string;
  /** Opens an engine's sheet. */
  onEngine: (id: string) => void;
};

type CarPartsProps = {
  /** The parts in stock that fit the car. */
  parts: Item[];
  /** Opens a part's details in the Inventory. */
  onPart: (item: Item) => void;
  /** Opens the Inventory with the filters that list the parts. */
  onAll: () => void;
};

export function CarSheet({ catalog, brandId, nodeId, onEngine }: CarSheetProps) {
  const { styles, ids } = useStyles();
  const texts = useMessages(CATALOG_SCREEN_TEXTS);
  const sheet = carSheet(catalog, brandId, nodeId);
  const brand = catalog.brands.find((each) => each.id === brandId)!;
  return (
    <View style={styles.sheet} testID={ids.sheet}>
      <Heading level={2}>{sheet.title}</Heading>
      {sheet.level === 'model' && (
        <View style={styles.fact} testID={ids.fact}>
          <RNText style={styles.term} testID={ids.term}>
            {texts.brand}
          </RNText>
          <RNText style={styles.value} testID={ids.value}>
            {brand.name}
          </RNText>
        </View>
      )}
      <View style={styles.fact} testID={ids.fact}>
        <RNText style={styles.term} testID={ids.term}>
          {sheet.level === 'model' ? texts.generations : texts.generation}
        </RNText>
        {sheet.generations.length > 0 ? (
          sheet.generations.map((generation) => (
            <View key={generation.id} style={styles.generation} testID={ids.generation}>
              <RNText style={styles.value} testID={ids.value}>
                {`${generation.name} `}
                <RNText style={styles.years} testID={ids.years}>
                  {generation.years}
                </RNText>
              </RNText>
              {generation.versions.length > 0 && (
                <RNText style={styles.versions} testID={ids.versions}>
                  {generation.versions.join(', ')}
                </RNText>
              )}
            </View>
          ))
        ) : (
          <RNText style={styles.value} testID={ids.value}>
            {texts.noGenerations}
          </RNText>
        )}
      </View>
      <View style={styles.fact} testID={ids.fact}>
        <RNText style={styles.term} testID={ids.term}>
          {texts.engines}
        </RNText>
        {sheet.engines.length > 0 ? (
          sheet.engines.map((engine) => (
            <View key={engine.id} style={styles.engine} testID={ids.engine}>
              <Button variant="link" size="sm" onPress={() => onEngine(engine.id)}>
                {engine.label}
              </Button>
            </View>
          ))
        ) : (
          <RNText style={styles.value} testID={ids.value}>
            {texts.noEngines}
          </RNText>
        )}
      </View>
    </View>
  );
}

export function CarParts({ parts, onPart, onAll }: CarPartsProps) {
  const { styles, ids } = useStyles();
  const { locale } = useLocale();
  return (
    <View style={styles.parts} testID={ids.parts}>
      <RNText accessibilityRole="header" style={styles.heading} testID={ids.heading}>
        {CATALOG_SCREEN_TEXTS[locale].parts.count(parts.length)}
      </RNText>
      {parts.length > 0 ? (
        <>
          <DataTable
            label={CATALOG_SCREEN_TEXTS[locale].parts.title}
            columns={PART_COLUMNS[locale]}
            rows={parts}
            rowKey={(item) => item.id}
            rowStatus={(item) => stockTint(item, locale)}
            onRowOpen={onPart}
            sort={null}
            onSortChange={() => {}}
            unsortedLabel=""
            empty={null}
            sortSelect={false}
          />
          <Button variant="secondary" icon={filterIcon} onPress={onAll}>
            {CATALOG_SCREEN_TEXTS[locale].parts.all}
          </Button>
        </>
      ) : (
        <EmptyState title={CATALOG_SCREEN_TEXTS[locale].parts.empty.title} message={CATALOG_SCREEN_TEXTS[locale].parts.empty.message} />
      )}
    </View>
  );
}

/** A part's name, with its code and details in the language chosen. */
function PartTitle({ item }: { item: Item }) {
  const { locale } = useLocale();
  return (
    <View>
      <CardTitle name={item.name} code={itemCardCode(item, locale)} details={itemCardDetails(item, locale)} />
    </View>
  );
}
