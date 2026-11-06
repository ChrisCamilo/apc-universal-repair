import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { ICON_SIZES, imageIcon, trashIcon } from '@apc/shared/icons';
import { formatPrice, NOT_APPLICABLE, QUANTITY_UNIT, type Item } from '@apc/shared/items';
import { brandPlaceText, originalCodesText, positionSideText, vehiclesText } from '@apc/shared/item-form';
import { ITEM_PHOTO_LIMIT } from '@apc/shared/photos';
import { Icon } from '../components/Icon';
import { ImageUpload, type UploadPhoto } from '../components/ImageUpload';
import { useTheme } from '../theme';
import { useStyles } from './ItemDetails.styles';
import { pickPhotos, takePhoto } from './photos';

// An item's details, the same as the web on a phone (the Detalhes mockup), inside the item dialog that fills the
// screen: the photos of every brand, or "Sem fotos"; the category as a chip over the item's name; the stock and the
// minimum in two tiles; the vehicles, the position and side, and the original codes; then "Marcas · n" and a card per
// brand, with its name, code, quantity, price and where it is. Opened on a brand, the owner scrolls to its card from
// the layouts it is told. RemoveItemButton is the red round Excluir at the right of the dialog's title row.

type ItemDetailsProps = {
  item: Item;
  /** The photos of each brand, in the item's order. */
  photos: UploadPhoto[][];
  /** The id of the brand whose card the details open scrolled to. */
  scrollToBrand?: string;
  /** Tells where the details, the brands' list and that brand's card lay out, each in its parent, to scroll to it. */
  onPlaceBrand?: (part: 'fields' | 'brands' | 'brand', y: number) => void;
};

export function ItemDetails({ item, photos, scrollToBrand, onPlaceBrand }: ItemDetailsProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const all = photos.flat();
  /** Tells the owner where a part laid out, when the details open on a brand. */
  const place = (part: 'fields' | 'brands' | 'brand') =>
    scrollToBrand && onPlaceBrand ? (event: LayoutChangeEvent) => onPlaceBrand(part, event.nativeEvent.layout.y) : undefined;
  return (
    <View style={styles.content} testID={ids.content} onLayout={place('fields')}>
      {all.length > 0 ? (
        <ImageUpload
          label="Fotos do item"
          photos={all}
          onPhotosChange={() => {}}
          limit={ITEM_PHOTO_LIMIT * item.brands.length}
          onPick={pickPhotos}
          onTake={takePhoto}
          readOnly
        />
      ) : (
        <View style={styles.noPhotos} testID={ids.noPhotos}>
          <Icon icon={imageIcon} size={ICON_SIZES.frame} color={colors.textMuted} />
          <Text style={styles.noPhotosLabel} testID={ids.noPhotosLabel}>
            Sem fotos
          </Text>
        </View>
      )}
      <View style={styles.head} testID={ids.head}>
        <Text style={styles.category} testID={ids.category}>
          {item.category}
        </Text>
        <Text accessibilityRole="header" style={styles.name} testID={ids.name}>
          {item.name}
        </Text>
      </View>
      <View style={styles.tiles} testID={ids.tiles}>
        <Tile label="Em estoque" value={item.quantity} />
        <Tile label="Mínimo" value={item.minQuantity} />
      </View>
      <View style={styles.list} testID={ids.list}>
        <Detail term="Veículos" value={vehiclesText(item)} />
        <Detail
          term="Posição · Lado"
          value={positionSideText(item)}
          none={item.position === NOT_APPLICABLE && item.side === NOT_APPLICABLE}
        />
        <Detail term="Códigos originais" value={originalCodesText(item)} none={item.originalCodes.length === 0} />
      </View>
      <Text accessibilityRole="header" style={styles.brandsTitle} testID={ids.brandsTitle}>
        {`Marcas · ${item.brands.length}`}
      </Text>
      <View style={styles.brands} testID={ids.brands} onLayout={place('brands')}>
        {item.brands.map((brand) => (
          <View
            key={brand.id}
            role="group"
            accessibilityLabel={brand.partBrand}
            onLayout={brand.id === scrollToBrand ? place('brand') : undefined}
            style={styles.brand}
            testID={ids.brand}
          >
            <View style={styles.brandRow} testID={ids.brandRow}>
              <Text style={styles.brandName} testID={ids.brandName}>
                {brand.partBrand}
              </Text>
              <Text style={styles.brandQuantity} testID={ids.brandQuantity}>
                {brand.quantity}{' '}
                <Text style={styles.unit} testID={ids.unit}>
                  {QUANTITY_UNIT}
                </Text>
              </Text>
            </View>
            <View style={styles.brandRow} testID={ids.brandRow}>
              <Text style={styles.code} testID={ids.code}>
                {brand.code}
              </Text>
              <Text style={styles.price} testID={ids.price}>
                {formatPrice(brand.unitPriceCents)}
              </Text>
            </View>
            <Text style={styles.place} testID={ids.place}>
              {brandPlaceText(brand)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The red round Excluir at the right of the details' title row, which asks to confirm deleting the item. */
export function RemoveItemButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Excluir item"
      onPress={onPress}
      style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
      testID={ids.remove}
    >
      <Icon icon={trashIcon} size={ICON_SIZES.thumbnail} color={colors.onDanger} />
    </Pressable>
  );
}

/** A tile of the stock: its label over its number and unit. */
function Tile({ label, value }: { label: string; value: number }) {
  const { styles, ids } = useStyles();
  return (
    <View style={styles.tile} testID={ids.tile}>
      <Text style={styles.tileLabel} testID={ids.tileLabel}>
        {label}
      </Text>
      <Text style={styles.tileValue} testID={ids.tileValue}>
        {value}{' '}
        <Text style={styles.unit} testID={ids.unit}>
          {QUANTITY_UNIT}
        </Text>
      </Text>
    </View>
  );
}

/** A line of the details' list: its term and its value, muted when the item has none. */
function Detail({ term, value, none = false }: { term: string; value: string; none?: boolean }) {
  const { styles, ids } = useStyles();
  return (
    <View style={styles.line} testID={ids.line}>
      <Text style={styles.term} testID={ids.term}>
        {term}
      </Text>
      <Text style={[styles.value, none && styles.valueNone]} testID={ids.value}>
        {value}
      </Text>
    </View>
  );
}
