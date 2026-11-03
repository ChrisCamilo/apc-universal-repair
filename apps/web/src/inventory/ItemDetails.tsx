import type { Ref } from 'react'
import { ICON_SIZES, imageIcon, trashIcon } from '@apc/shared/icons'
import { formatPrice, NOT_APPLICABLE, QUANTITY_UNIT, type Item } from '@apc/shared/items'
import { brandPlaceText, originalCodesText, positionSideText, vehiclesText } from '@apc/shared/item-form'
import { ITEM_PHOTO_LIMIT } from '@apc/shared/photos'
import { Icon } from '../components/Icon.tsx'
import { ImageUpload, type UploadPhoto } from '../components/ImageUpload.tsx'
import { Heading } from '../components/Typography.tsx'
import { itemDetails } from './ItemDetails.styles.ts'

// An item's details on a phone, as in the Detalhes mockup, inside the item dialog that fills the screen: the photos of
// every brand, or "Sem fotos"; the category as a chip over the item's name; the stock and the minimum in two tiles;
// the vehicles, the position and side, and the original codes; then "Marcas · n" and a card per brand, with its name,
// code, quantity, price and where it is. Opened on a brand, as a brand's row in the desktop list does, its card is
// the one scrolled to. RemoveItemButton is the red round Excluir at the right of the dialog's title row.

type ItemDetailsProps = {
  item: Item
  /** The photos of each brand, in the item's order. */
  photos: UploadPhoto[][]
  /** The id of the brand whose card the details open scrolled to. */
  scrollToBrand?: string
  /** The card of that brand, for the owner to scroll to. */
  brandRef?: Ref<HTMLDivElement>
}

export function ItemDetails({ item, photos, scrollToBrand, brandRef }: ItemDetailsProps) {
  const { classes, ids } = itemDetails()
  const all = photos.flat()
  const noCodes = item.originalCodes.length === 0
  const noPlace = item.position === NOT_APPLICABLE && item.side === NOT_APPLICABLE
  return (
    <div className={classes.base()} data-testid={ids.base}>
      {all.length > 0 ? (
        <ImageUpload label="Fotos do item" photos={all} onPhotosChange={() => {}} limit={ITEM_PHOTO_LIMIT * item.brands.length} readOnly />
      ) : (
        <div className={classes.noPhotos()} data-testid={ids.noPhotos}>
          <Icon icon={imageIcon} size={ICON_SIZES.frame} />
          Sem fotos
        </div>
      )}
      <div className={classes.head()} data-testid={ids.head}>
        <span className={classes.category()} data-testid={ids.category}>
          {item.category}
        </span>
        <Heading level={2} className={classes.name()}>
          {item.name}
        </Heading>
      </div>
      <div className={classes.tiles()} data-testid={ids.tiles}>
        <Tile label="Em estoque" value={item.quantity} />
        <Tile label="Mínimo" value={item.minQuantity} />
      </div>
      <dl className={classes.list()} data-testid={ids.list}>
        <Detail term="Veículos" value={vehiclesText(item)} />
        <Detail term="Posição · Lado" value={positionSideText(item)} none={noPlace} />
        <Detail term="Códigos originais" value={originalCodesText(item)} none={noCodes} />
      </dl>
      <Heading level={3} className={classes.brands()}>
        {`Marcas · ${item.brands.length}`}
      </Heading>
      {item.brands.map((brand) => (
        <div
          key={brand.id}
          ref={brand.id === scrollToBrand ? brandRef : undefined}
          role="group"
          aria-label={brand.partBrand}
          className={classes.brand()}
          data-testid={ids.brand}
        >
          <span className={classes.brandName()} data-testid={ids.brandName}>
            {brand.partBrand}
          </span>
          <span className={classes.brandQuantity()} data-testid={ids.brandQuantity}>
            {brand.quantity}{' '}
            <span className={classes.unit()} data-testid={ids.unit}>
              {QUANTITY_UNIT}
            </span>
          </span>
          <span className={classes.code()} data-testid={ids.code}>
            {brand.code}
          </span>
          <span className={classes.price()} data-testid={ids.price}>
            {formatPrice(brand.unitPriceCents)}
          </span>
          <span className={classes.place()} data-testid={ids.place}>
            {brandPlaceText(brand)}
          </span>
        </div>
      ))}
    </div>
  )
}

/** The red round Excluir at the right of the details' title row, which asks to confirm deleting the item. */
export function RemoveItemButton({ onClick }: { onClick: () => void }) {
  const { classes, ids } = itemDetails()
  return (
    <button
      type="button"
      aria-label="Excluir item"
      className={classes.remove()}
      data-testid={ids.remove}
      data-tour="form-delete"
      onClick={onClick}
    >
      <Icon icon={trashIcon} size={ICON_SIZES.thumbnail} />
    </button>
  )
}

/** A tile of the stock: its label over its number and unit. */
function Tile({ label, value }: { label: string; value: number }) {
  const { classes, ids } = itemDetails()
  return (
    <div className={classes.tile()} data-testid={ids.tile}>
      <span className={classes.tileLabel()} data-testid={ids.tileLabel}>
        {label}
      </span>
      <span className={classes.tileValue()} data-testid={ids.tileValue}>
        {value}{' '}
        <span className={classes.unit()} data-testid={ids.unit}>
          {QUANTITY_UNIT}
        </span>
      </span>
    </div>
  )
}

/** A line of the details' list: its term and its value, muted when the item has none. */
function Detail({ term, value, none = false }: { term: string; value: string; none?: boolean }) {
  const { classes, ids } = itemDetails({ none })
  return (
    <>
      <dt className={classes.term()} data-testid={ids.term}>
        {term}
      </dt>
      <dd className={classes.value()} data-testid={ids.value}>
        {value}
      </dd>
    </>
  )
}
