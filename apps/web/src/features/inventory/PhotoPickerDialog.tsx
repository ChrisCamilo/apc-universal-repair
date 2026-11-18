import { useState } from 'react'
import { checkIcon, chevronIcon, ICON_SIZES } from '@apc/tokens/icons'
import { PHOTO_PICKER, photoPickerTexts, photoSources } from '@apc/domain/item-form'
import { itemCardCode, type Item, type ItemPhoto } from '@apc/domain/items'
import { photoAddress, photoCount, pickPhoto } from '@apc/domain/photos'
import { API_BASE } from '../../app/api.ts'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { SearchField } from '../../components/TextField'
import { photoPicker } from './PhotoPickerDialog.styles.ts'

// The photo picker, opened from "Usar fotos de outra peça" under a brand's photos in the item form: a search by code
// (any brand's or original code, ignoring separators, as the Inventory search finds codes) lists the items with photos
// (see photoSources), the item being edited left out. A click on an item opens it in place to its photos, of every
// brand, each a checkbox; a second click closes it, and several can be open at once. Photos are checked up to the room
// the brand has, from one item or several (see pickPhoto); once full, the others are disabled and the count says so.
// "Usar n fotos" hands the checked photos over in the order they were checked, and the owner adds them to the brand as
// copies, which the API makes when the item is saved; Cancelar and Escape close it with nothing added. Each opening
// starts empty: the owner mounts a new one. On a phone it fills the screen, as every form dialog does.

type PhotoPickerDialogProps = {
  open: boolean
  onClose: () => void
  /** Every item in stock. */
  items: readonly Item[]
  /** The item being edited, whose photos aren't offered. */
  editingId?: string
  /** How many photos the brand still takes. */
  room: number
  /** Takes the photos checked, in the order they were checked. */
  onPick: (photos: ItemPhoto[]) => void
}

export function PhotoPickerDialog({ open, onClose, items, editingId, room, onPick }: PhotoPickerDialogProps) {
  const [query, setQuery] = useState('')
  // The items opened to their photos, by id.
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set())
  const [picked, setPicked] = useState<ItemPhoto[]>([])
  const found = photoSources(items, query, editingId)
  const texts = photoPickerTexts(picked.length, room)
  const full = picked.length >= room
  const { classes, ids } = photoPicker({ full })

  /** Opens an item to its photos, or closes it. */
  const toggle = (id: string) =>
    setOpened((shown) => {
      const next = new Set(shown)
      if (!next.delete(id)) {
        next.add(id)
      }
      return next
    })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={PHOTO_PICKER.open}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {PHOTO_PICKER.cancel}
          </Button>
          <Button size="sm" disabled={picked.length === 0} onClick={() => onPick(picked)}>
            {texts.use}
          </Button>
        </>
      }
    >
      <div className={classes.base()} data-testid={ids.base}>
        <SearchField label={PHOTO_PICKER.search} value={query} onValueChange={setQuery} />
        {found.items.length > 0 ? (
          <ul className={classes.list()} data-testid={ids.list}>
            {found.items.map((item) => {
              const shown = opened.has(item.id)
              const photos = item.brands.flatMap((brand) => brand.photos.map((photo, index) => ({ photo, index, brand: brand.partBrand })))
              return (
                <li key={item.id} className={classes.source()} data-testid={ids.source}>
                  <button type="button" aria-expanded={shown} className={classes.head()} data-testid={ids.head} onClick={() => toggle(item.id)}>
                    <img src={photoAddress(photos[0].photo.thumbUrl, API_BASE)} alt="" className={classes.cover()} data-testid={ids.cover} />
                    <span className={classes.text()} data-testid={ids.text}>
                      <span className={classes.name()} data-testid={ids.name}>
                        {item.name}
                      </span>
                      <span className={classes.code()} data-testid={ids.code}>
                        {itemCardCode(item)} · {photoCount(photos.length)}
                      </span>
                    </span>
                    <span aria-hidden="true" className={photoPicker({ open: shown }).classes.chevron()} data-testid={ids.chevron}>
                      <Icon icon={chevronIcon} size={ICON_SIZES.label} />
                    </span>
                  </button>
                  {shown && (
                    <div role="group" aria-label={`Fotos de ${item.name}`} className={classes.photos()} data-testid={ids.photos}>
                      {photos.map(({ photo, index, brand }) => {
                        const checked = picked.some((each) => each.id === photo.id)
                        return (
                          <button
                            key={photo.id}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`Foto ${index + 1} de ${item.name} · ${brand}`}
                            disabled={full && !checked}
                            className={classes.photo()}
                            data-testid={ids.photo}
                            onClick={() => setPicked((held) => pickPhoto(held, photo, room))}
                          >
                            <img src={photoAddress(photo.thumbUrl, API_BASE)} alt="" className={classes.image()} data-testid={ids.image} />
                            {checked && (
                              <span aria-hidden="true" className={classes.check()} data-testid={ids.check}>
                                <Icon icon={checkIcon} size={ICON_SIZES.label} />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={classes.note()} data-testid={ids.note}>
            {query.trim() ? PHOTO_PICKER.none : PHOTO_PICKER.hint}
          </p>
        )}
        {found.more > 0 && (
          <p className={classes.note()} data-testid={ids.note}>
            {PHOTO_PICKER.more(found.more)}
          </p>
        )}
        <p role="status" className={classes.count()} data-testid={ids.count}>
          {texts.count}
        </p>
      </div>
    </Dialog>
  )
}
