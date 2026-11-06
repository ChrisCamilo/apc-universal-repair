import { scales } from '@apc/shared/theme';
import { createStyles } from '../../styles/createStyles';
import { displayLabel } from '../../styles/shared';
import { fontFamily, softAccent, softHairline } from '../../app/theme';

// The look of an item's details, the same as the web on a phone (the Detalhes mockup), inside the Dialog that fills
// the screen: the photos, or a dashed frame saying there are none; the category as an accent chip over the name; two
// tiles, the stock and the minimum, each a display label over its number and unit; a list of the details, each label
// in a muted column of its own, the value muted when there is none; then "Marcas · n" and a card per brand, its name
// and quantity over its code and price, and where it is under them. The tiles and the cards sit raised on the Dialog's
// panel. The header's Excluir is a 44px red circle.

/** The empty photos' frame's height, in px (h-34 on the web). */
const NO_PHOTOS_HEIGHT = scales.space.s1 * 34;
/** The list's label column, in px (the web's 112px). */
const TERM_WIDTH = scales.space.s1 * 28;
/** The item's name, in px (the web's 26px). */
const NAME_SIZE = 26;
/** A brand's code, place and price, in px (the web's 13px). */
const SMALL_SIZE = 13;

/**
 * An item's details: the content, the empty photos' frame and its text, the category and the name, the tiles with
 * their label, number and unit, the list's lines with their terms and values, the brands' heading and list, a brand's
 * card with its parts, and the header's Excluir.
 */
export const useStyles = createStyles(
  'inventory.item-details',
  {
    content: '',
    noPhotos: 'photos.none',
    noPhotosLabel: 'photos.none.label',
    head: 'head',
    category: 'head.category',
    name: 'head.name',
    tiles: 'tiles',
    tile: 'tiles.tile',
    tileLabel: 'tiles.tile.label',
    tileValue: 'tiles.tile.value',
    unit: 'tiles.tile.value.unit',
    list: 'list',
    line: 'list.line',
    term: 'list.term',
    value: 'list.value',
    brandsTitle: 'brands',
    brands: 'brands.list',
    brand: 'brands.brand',
    brandRow: 'brands.brand.row',
    brandName: 'brands.brand.name',
    brandQuantity: 'brands.brand.quantity',
    code: 'brands.brand.code',
    price: 'brands.brand.price',
    place: 'brands.brand.place',
    remove: 'remove',
  },
  (theme) => {
    const { colors } = theme;
    const body = (size: number, weight: 400 | 500 | 600 = 400) => ({
      fontFamily: fontFamily(scales.bodyFont, weight),
      fontSize: size,
      color: colors.text,
    });
    const raised = {
      borderWidth: scales.hairline,
      borderColor: softHairline(theme),
      borderRadius: theme.radiusTile,
      backgroundColor: colors.panelRaised,
      paddingHorizontal: scales.space.s3 + scales.space.s1 / 2,
      paddingVertical: scales.space.s3,
    };
    return {
      brand: { ...raised, gap: scales.space.s1 },
      brandName: body(scales.fontSize.base, 600),
      brandQuantity: body(scales.fontSize.lg, 600),
      brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: scales.space.s3 },
      brands: { gap: scales.space.s4 },
      brandsTitle: { ...displayLabel(theme, 'base'), fontFamily: fontFamily(theme.displayFont, 700), marginTop: scales.space.s1 },
      category: {
        ...displayLabel(theme, 'xs'),
        alignSelf: 'flex-start',
        overflow: 'hidden',
        borderRadius: scales.radiusPill,
        backgroundColor: softAccent(theme),
        color: colors.accent,
        paddingHorizontal: scales.space.s2 + scales.space.s1 / 2,
        paddingVertical: scales.space.s1,
      },
      code: { fontFamily: fontFamily(scales.monoFont), fontSize: SMALL_SIZE, color: colors.textMuted },
      content: { gap: scales.space.s4 },
      head: { gap: scales.space.s1 + scales.space.s1 / 2 },
      line: { flexDirection: 'row', gap: scales.space.s3 },
      list: { gap: scales.space.s2 + scales.space.s1 / 2 },
      name: { ...body(NAME_SIZE, 600), lineHeight: scales.space.s6 },
      noPhotos: {
        height: NO_PHOTOS_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        gap: scales.space.s1 + scales.space.s1 / 2,
        borderWidth: scales.hairline,
        borderStyle: 'dashed',
        borderColor: colors.hairline,
        borderRadius: theme.radiusTile,
        backgroundColor: colors.panelRaised,
      },
      noPhotosLabel: { ...body(scales.fontSize.sm), color: colors.textMuted },
      place: { fontFamily: fontFamily(scales.bodyFont), fontSize: SMALL_SIZE, color: colors.textMuted },
      price: body(scales.fontSize.sm),
      remove: {
        width: scales.touch.icon,
        height: scales.touch.icon,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scales.radiusPill,
        backgroundColor: colors.danger,
      },
      removePressed: { opacity: 0.9 },
      term: { ...body(15), width: TERM_WIDTH, color: colors.textMuted },
      tile: { ...raised, flex: 1 },
      tileLabel: { ...displayLabel(theme, 'xs'), color: colors.textMuted },
      tileValue: { ...body(scales.fontSize['2xl'], 600), lineHeight: scales.space.s1 * 7.5 },
      tiles: { flexDirection: 'row', gap: scales.space.s2 },
      unit: { ...body(scales.fontSize.sm), color: colors.textMuted },
      value: { ...body(15), flex: 1 },
      valueNone: { color: colors.textMuted },
    };
  },
);
