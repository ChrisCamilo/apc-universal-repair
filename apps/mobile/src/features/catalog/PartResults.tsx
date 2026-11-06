import { Text as RNText, View } from 'react-native';
import type { ComponentProps } from 'react';
import { type FoundPart, type PartResults as Results } from '@apc/domain/catalog';
import { itemCardDetails, stockTint } from '@apc/domain/items';
import { photoAddress } from '@apc/domain/photos';
import { apiUrl } from '../../app/api';
import { DataTable, TableThumbnail } from '../../components/DataTable';
import { Text } from '../../components/Typography';
import { CardTitle, StockQuantity } from '../inventory/ItemCard';
import { useStyles } from './PartResults.styles';

// The inventory parts a Catalog search by code found, the same as the web on a phone (the "Catálogo no celular"
// mockup): the Inventory's cards under a heading, each brand of an item whose code matched, or its original code, with
// its photo, its name, the code found with its part brand, where it fits, where it is and its price, and its quantity
// with its stock status, tinted by it. A press on one opens its vehicle (see CatalogTab). When more parts matched than
// fit, a line says how many more.

// A found part's card, the columns of the Inventory's card: its photo, its name, code and details, and its quantity.
const CARD_COLUMNS: ComponentProps<typeof DataTable<FoundPart>>['columns'] = [
  {
    key: 'photo',
    header: 'Foto',
    card: 'thumb',
    cell: (part) => {
      const photo = partBrand(part).photos[0];
      return <TableThumbnail src={photo && photoAddress(photo.thumbUrl, apiUrl())} label={`Foto de ${part.item.name}`} />;
    },
  },
  {
    key: 'name',
    header: 'Item',
    card: 'main',
    cell: (part) => (
      <View>
        <CardTitle name={part.item.name} code={`${part.code} · ${partBrand(part).partBrand}`} details={itemCardDetails(part.item)} />
      </View>
    ),
  },
  { key: 'quantity', header: 'Qtd.', numeric: true, card: 'end', cell: (part) => <StockQuantity {...part.item} /> },
];

type PartResultsProps = {
  results: Results;
  onChoose: (part: FoundPart) => void;
};

/**
 * Finds the brand of a found part's item whose code matched, or its first brand when an original code matched.
 * @param part A found part.
 * @returns The item's brand.
 */
function partBrand({ id, item }: FoundPart) {
  return item.brands.find((brand) => brand.id === id) ?? item.brands[0];
}

export function PartResults({ results, onChoose }: PartResultsProps) {
  const { styles, ids } = useStyles();
  const { parts, more } = results;
  return (
    <View style={styles.box} testID={ids.box}>
      <RNText accessibilityRole="header" style={styles.heading} testID={ids.heading}>
        {parts.length === 1 ? 'Peça do estoque com esse código' : 'Peças do estoque com esse código'}
      </RNText>
      <Text size="sm" tone="muted">
        Toque na peça para abrir o veículo dela no catálogo.
      </Text>
      <DataTable
        label="Peças do estoque com esse código"
        columns={CARD_COLUMNS}
        rows={parts}
        rowKey={(part) => part.id}
        rowStatus={(part) => stockTint(part.item)}
        onRowOpen={onChoose}
        sort={null}
        onSortChange={() => {}}
        unsortedLabel=""
        empty={null}
        sortSelect={false}
      />
      {more > 0 && (
        <Text size="sm" tone="muted">
          {`Mais ${more}. Digite mais do código para afinar.`}
        </Text>
      )}
    </View>
  );
}
