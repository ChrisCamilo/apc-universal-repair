import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of an item's details on a phone, as in the Detalhes mockup, inside the Dialog that fills the screen: the
// photos, or a dashed frame saying there are none; the category as an accent chip over the name; two tiles, the stock
// and the minimum, each a display label over its number and unit; a list of the details, each label in a muted
// column of its own, the value muted when there is none; then "Marcas · n" and a card per brand, its name and quantity
// over its code and price, and where it is under them. The tiles and the cards sit raised on the Dialog's panel. The
// header's Excluir is a 44px red circle.

/**
 * An item's details on a phone: the content, the empty photos' frame, the category and the name, the tiles with their
 * label, number and unit, the list with its terms and values, the brands' heading, a brand's card with its parts, and
 * the header's Excluir.
 */
export const itemDetails = recipe(
  'inventory.item-details',
  tv({
    slots: {
      base: 'grid gap-4',
      noPhotos: 'grid h-34 place-items-center content-center gap-1.5 rounded-tile border border-dashed border-hairline bg-panel-raised font-body text-sm text-text-muted',
      head: 'grid gap-1.5',
      category: `justify-self-start rounded-pill bg-accent-soft px-2.5 py-1 text-xs ${DISPLAY_LABEL} text-accent`,
      name: 'm-0 font-body text-[26px]/8 font-semibold tracking-normal normal-case text-text',
      tiles: 'grid grid-cols-2 gap-2',
      tile: 'grid rounded-tile border border-hairline-soft bg-panel-raised px-3.5 py-3',
      tileLabel: `text-xs ${DISPLAY_LABEL} text-text-muted`,
      tileValue: 'font-body text-2xl/7.5 font-semibold text-text',
      unit: 'font-body text-sm font-normal text-text-muted',
      list: 'm-0 grid grid-cols-[calc(var(--spacing)*28)_minmax(0,1fr)] gap-x-3 gap-y-2.5 font-body text-[15px]/5',
      term: 'text-text-muted',
      value: 'm-0',
      brands: `m-0 mt-1 text-base ${DISPLAY_LABEL} font-bold text-text`,
      brand: 'grid scroll-mt-16 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-tile border border-hairline-soft bg-panel-raised px-3.5 py-3 font-body',
      brandName: 'text-base font-semibold text-text',
      brandQuantity: 'text-right text-lg font-semibold text-text',
      code: 'font-mono text-[13px] text-text-muted',
      price: 'text-right text-sm text-text',
      place: 'col-span-2 text-[13px] text-text-muted',
      remove: [
        'grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-danger p-0 text-on-danger outline-none',
        'transition-opacity hover:opacity-90 focus-visible:shadow-ring',
      ],
    },
    variants: {
      // A detail the item doesn't have, e.g. "Nenhum".
      none: { true: { value: 'text-text-muted' }, false: { value: 'text-text' } },
    },
    defaultVariants: { none: false },
  }),
  {
    base: '',
    noPhotos: 'photos.none',
    head: 'head',
    category: 'head.category',
    name: 'head.name',
    tiles: 'tiles',
    tile: 'tiles.tile',
    tileLabel: 'tiles.tile.label',
    tileValue: 'tiles.tile.value',
    unit: 'tiles.tile.value.unit',
    list: 'list',
    term: 'list.term',
    value: 'list.value',
    brands: 'brands',
    brand: 'brands.brand',
    brandName: 'brands.brand.name',
    brandQuantity: 'brands.brand.quantity',
    code: 'brands.brand.code',
    price: 'brands.brand.price',
    place: 'brands.brand.place',
    remove: 'remove',
  },
)
