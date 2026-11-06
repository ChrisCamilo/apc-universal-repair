import { Text as RNText, View } from 'react-native';
import { QUANTITY_UNIT, STOCK_STATUS_SHORT, stockStatus } from '@apc/shared/items';
import { NumericReadout, Text } from '../components/Typography';
import { useStyles } from './InventoryTab.styles';

// The parts of an item's card in a list, the Inventory's look: its title, with the item's name, a code and a line of
// details, and its quantity with its stock status under it in its tone, "un.", "Baixo" or "Esgotado". The Inventory's
// list and the Catalog's parts found by code show them.

type CardTitleProps = {
  /** The item's name. */
  name: string;
  /** The code line, e.g. "N-1210 · Cobreq". */
  code: string;
  /** Where it fits, where it is and its price. */
  details: string;
};

/** A card's title: the item's name, its code and its details, each on one line. */
export function CardTitle({ name, code, details }: CardTitleProps) {
  const { styles, ids } = useStyles();
  return (
    <>
      <RNText numberOfLines={1} style={styles.name} testID={ids.name}>
        {name}
      </RNText>
      <NumericReadout tone="muted">{code}</NumericReadout>
      <Text size="sm" tone="muted" lines={1}>
        {details}
      </Text>
    </>
  );
}

/** A card's quantity, with its stock status under it in its tone. */
export function StockQuantity({ quantity, minQuantity }: { quantity: number; minQuantity: number }) {
  const { styles, ids } = useStyles();
  const status = stockStatus(quantity, minQuantity);
  const tone = status === 'out' ? styles.quantityOut : status === 'low' ? styles.quantityLow : undefined;
  return (
    <View style={styles.quantity} testID={ids.quantity}>
      <RNText style={[styles.quantityValue, tone]} testID={ids.quantityValue}>
        {quantity}
      </RNText>
      <RNText style={[styles.quantityTag, tone]} testID={ids.quantityTag}>
        {status ? STOCK_STATUS_SHORT[status] : QUANTITY_UNIT}
      </RNText>
    </View>
  );
}
