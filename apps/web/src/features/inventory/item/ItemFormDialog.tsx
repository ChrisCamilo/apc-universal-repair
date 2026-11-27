import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@apc/domain/auth'
import { EMPTY_CATALOG, vehicleSuggestions, type Catalog } from '@apc/domain/catalog'
import { copyIcon, pencilIcon, plusIcon, trashIcon } from '@apc/tokens/icons'
import { capitalizeFirst, codeKey, colorText, findOption, itemSchema, MAX_QUANTITY, POSITIONS, SIDES, type Item, type ItemBrand } from '@apc/domain/items'
import {
  BRAND_FIELD_LABELS,
  brandDetailTexts,
  changedVehicle,
  codeTakenError,
  codeTakenMessage,
  colorInput,
  descriptionInput,
  EMPTY_BRAND_FORM,
  EMPTY_ITEM_FORM,
  EMPTY_VEHICLE_FORM,
  hasFormErrors,
  ITEM_FIELD_LABELS,
  ITEM_NOTE_LABELS,
  ITEM_UNCHANGED_MESSAGE,
  itemGoneMessage,
  itemDetailTexts,
  itemFormBody,
  itemFormChanged,
  itemFormErrors,
  itemFormOf,
  itemFormOptions,
  itemNoteTexts,
  modelsOfBrand,
  ORIGINAL_CODES_LABEL,
  originalCodeMessages,
  originalCodesText,
  PHOTO_PICKER,
  POSITION_CHOICES,
  PRICE_PLACEHOLDER,
  priceMask,
  quantityInput,
  SIDE_CHOICES,
  VEHICLE_FIELD_LABELS,
  VEHICLES_LABEL,
  vehiclesText,
  type BrandField,
  type ItemBrandFormErrors,
  type ItemField,
  type ItemForm,
  type ItemFormErrors,
  type NoteField,
  type VehicleField,
} from '@apc/domain/item-form'
import { findEntry, ITEM_LIST_TEXTS, type ItemListKind, type ItemLists } from '@apc/domain/lists'
import { copiedPhotos, heldPhotos, ITEM_PHOTO_LIMIT, photoParts, photosChanged } from '@apc/domain/photos'
import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts'
import type { Locale } from '@apc/domain/locale'
import { Button } from '../../../components/Button'
import { Combobox } from '../../../components/Combobox'
import { RowAction } from '../../../components/DataTable'
import { Dialog } from '../../../components/Dialog'
import { FieldValue } from '../../../components/FieldValue'
import { API_BASE } from '../../../app/api.ts'
import { ImageUpload, type UploadPhoto } from '../../../components/ImageUpload'
import { Segmented } from '../../../components/Segmented'
import { Stepper } from '../../../components/Stepper'
import { TextField } from '../../../components/TextField'
import { useToast } from '../../../components/Toast'
import { usePhone } from '../../../components/usePhone.ts'
import { Heading, Label, Text } from '../../../components/Typography'
import { CodeListField } from './CodeListField.tsx'
import { DuplicateItemDialog } from './DuplicateItemDialog.tsx'
import { PhotoPickerDialog } from '../photos/PhotoPickerDialog.tsx'
import { ItemDetails, RemoveItemButton } from './ItemDetails.tsx'
import { itemFormDialog } from './ItemFormDialog.styles.ts'
import { savePhotos } from '../photos/savePhotos.ts'
import type { CreateListEntry } from '../lists/useItemLists.ts'
import { VehiclesField } from './VehiclesField.tsx'
import { useLocale } from '../../../app/useLocale.ts'
import { refusalReason } from '@apc/domain/refusals'

// The form that creates a new item or edits one, in a dialog whose content scrolls while Cancel and Save stay at the
// bottom: first what the item's brands share (name, category, a short description of up to 30 characters, cut there
// as it is typed or pasted and counted from 20 on, the part's material, the vehicles it fits, position, side, the minimum stock
// and the
// vehicle maker's original codes, typed as chips, each shown with its message when a brand of the item or another item
// has it; see CodeListField), then a
// section for each brand that makes the part, with its photos, part brand, code, quantity, unit price, color and
// location. Each vehicle is a line of its brand, its model, and optionally its generation ("85/90") and version ("1.6
// GLX"), which offer the catalog's generations of that model, numbered ("G1 - 85/90"), and the versions of the one
// chosen, and take any text, a new one joining the catalog when the item is saved; the generation is read as years
// (see readGeneration); the dialog is wide, so the four fit on one line. The fields open one after the other: the brand
// opens the model, the model the generation and the generation the version, and emptying one clears those after it
// (see changedVehicle). "Adicionar veículo" adds a blank line and "Adicionar marca"
// a blank brand, and each line's or brand's trash, in red, takes it out while another is left. Category, part brands and
// the vehicles' brands and models are comboboxes of the lists the API keeps, where "+ Criar" adds a new name to its
// list, picks it and says so in a toast; a line's model only lists its brand's models, is created under that brand,
// stays locked until a brand of the list is chosen and clears when the brand changes to one without it. A vehicle
// twice in the item, or Universal with others, is refused on its line. A name not in its list can't be saved: the field points to "+ Criar". A code turns uppercase while
// typing and says at once when another item uses it; a color turns uppercase while typing too (see colorInput); the texts start with a capital letter when leaving the field and
// again on save; the quantities take whole numbers only, up to a million, and a pasted fraction or text is refused,
// saying so; and the price always shows in reais, digits filling from the cents, a pasted price read with a dot or a
// comma alike, up to a million (see priceMask). Saving checks the required fields, a part brand or code repeated in
// the item and a code another item uses, then sends the item with its brands to the API, shows a toast and hands the
// saved item over, then sends each brand's photos when they changed: up to 3 a brand, the first the cover, as its
// ImageUpload field holds them; while a brand has room, "Usar fotos de outra peça" under them adds copies of other items'
// photos, checked in the photo picker (see PhotoPickerDialog). When the item is saved but its photos aren't, a warning toast says so; an edit that
// changes nothing isn't sent, and an info toast says so; an item another device deleted meanwhile says so and closes. Opened on an item's details, the same dialog shows each field
// as text in the form's layout, a section for each brand (scrolled to one when opened on it, as a brand's row in the
// list does), with Fechar and Editar: nothing can be changed or saved
// until Editar unlocks the fields in place, on the first one, and the buttons turn into Cancelar and Salvar
// alterações, which save like the edit form. The details may also offer Duplicar, which asks whether the copy takes the
// photos too (see DuplicateItemDialog) and hands the answer over. The owner may open it with values and photos filled
// in, as a duplicated item's are, and follow what is typed, as
// the Inventory tutorial does, whose tour points at the name and at the first brand's code and quantity; the details
// list the vehicles apart, under Veículos. On a phone (below `card:`) the details follow the Detalhes mockup (see
// ItemDetails): a ← back to the list in place of the × and Fechar, the red round Excluir at the right, which asks the
// owner to delete the item, and Duplicar and Editar sharing the bottom, each with its icon. The form itself follows the
// Novo item mockup there: the × and "Novo item", or the item's name, on top, and the fields in one column, the name not
// started on (see Dialog); the vehicles as chips (see VehiclesField), the position and side in full words with N/A, the
// minimum as a stepper (see Stepper), a raised card for each brand with Tirar foto and Galeria (see ImageUpload), its
// part brand and code, then its quantity and price side by side, and its color and location; "Adicionar marca" dashed
// after them, and only "Salvar item", or "Salvar alterações", across the bottom.

const POSITION_OPTIONS = POSITIONS.map((value) => ({ value, label: value }))
const SIDE_OPTIONS = SIDES.map((value) => ({ value, label: value }))

type ItemFormDialogProps = {
  open: boolean
  /** The item to edit; a new item when left out. */
  item?: Item
  /** Opens on the item's details, read-only until Editar. */
  details?: boolean
  /** The id of the brand whose section the details open scrolled to, e.g. a brand's row clicked in the list. */
  scrollToBrand?: string
  /** Every item in stock, for the colors and the code check. */
  items: Item[]
  /** The lists the comboboxes pick from. */
  lists: ItemLists
  /** The vehicle catalog, for the generations and versions a vehicle's fields offer; none while it isn't loaded. */
  catalog?: Catalog
  /** Creates a name in one of the lists. */
  onCreateEntry: CreateListEntry
  onClose: () => void
  /** Called with the item as the API saved it. */
  onSaved: (item: Item) => void
  /** Called when the item edited is gone, deleted on another device meanwhile; a toast already said so. */
  onGone?: (item: Item) => void
  /** Values the form opens with instead of the item's own, e.g. filled in by the tutorial. */
  initialForm?: ItemForm
  /** Each brand's photos the form opens with instead of the item's own, e.g. a duplicated item's copies. */
  initialPhotos?: UploadPhoto[][]
  /** Offers Duplicar in the details, called with the item and whether the copy takes the photos too. */
  onDuplicate?: (item: Item, withPhotos: boolean) => void
  /** Called with the form as typed, whether it shows the details and each brand's photos, on each change, e.g. for the tutorial. */
  onFormChange?: (form: ItemForm, viewing: boolean, photos: readonly UploadPhoto[][]) => void
  /** Offers Excluir in a phone's details, called with the item; the owner asks to confirm. */
  onDelete?: (item: Item) => void
}

/**
 * Names a brand's section, and its photos, for the screen and screen readers.
 * @param index The brand's place in the form.
 * @param count How many brands the form has.
 * @param locale The language.
 * @returns E.g. "Marca 2", and "Fotos da marca 2"; the photos of an item of one brand are the item's.
 */
function brandNames(index: number, count: number, locale: Locale): { section: string; photos: string } {
  const texts = INVENTORY_SCREEN_TEXTS[locale].form
  return { section: texts.brand(index + 1), photos: count === 1 ? texts.photos : texts.brandPhotos(index + 1) }
}

export function ItemFormDialog({
  open,
  item,
  details = false,
  scrollToBrand,
  items,
  lists,
  catalog = EMPTY_CATALOG,
  onCreateEntry,
  onClose,
  onSaved,
  onGone,
  initialForm,
  initialPhotos,
  onDuplicate,
  onFormChange,
  onDelete,
}: ItemFormDialogProps) {
  const { locale } = useLocale()
  const texts = INVENTORY_SCREEN_TEXTS[locale]
  const common = COMMON_TEXTS[locale]
  const toast = useToast()
  const phone = usePhone()
  const [viewing, setViewing] = useState(details && item !== undefined)
  const name = useRef<HTMLInputElement>(null)
  // The section of the brand the details open scrolled to.
  const scrolledBrand = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<ItemForm>(() => initialForm ?? (item ? itemFormOf(item) : EMPTY_ITEM_FORM))
  // Each brand's photos, in the order of the form's brands; a brand the form fills in for the item keeps its own.
  const [photos, setPhotos] = useState<UploadPhoto[][]>(
    () => initialPhotos ?? form.brands.map((brand) => heldPhotos(item?.brands.find((held) => held.id === brand.id)?.photos ?? [], API_BASE)),
  )
  const [errors, setErrors] = useState<ItemFormErrors>({})
  const [saving, setSaving] = useState(false)
  // Whether Duplicar's question is open.
  const [asking, setAsking] = useState(false)
  // The brand whose photos the photo picker adds to, while it is open; each opening starts a new picker.
  const [picker, setPicker] = useState<{ brand: number | null; session: number }>({ brand: null, session: 0 })
  // How many names are being created; saving waits for them.
  const [creating, setCreating] = useState(0)
  const options = itemFormOptions(items, lists)
  const unlocked = details && !viewing
  // A phone's details: the Detalhes mockup in place of the fields as text.
  const screen = phone && viewing && item !== undefined
  const { classes, ids } = itemFormDialog({ phone: phone && !viewing })

  // Tell the owner what the form holds as it changes.
  useEffect(() => {
    onFormChange?.(form, viewing, photos)
  }, [form, viewing, photos, onFormChange])

  // Opened on a brand, the details show its section first, once the window is open.
  useEffect(() => {
    if (open) {
      scrolledBrand.current?.scrollIntoView({ block: 'start' })
    }
  }, [open])

  // Once Editar unlocks the fields, start on the first one; not on a phone, where the keyboard would cover the form.
  useEffect(() => {
    if (unlocked && !phone) {
      name.current?.focus()
    }
  }, [unlocked, phone])

  /** Takes a field's new value and drops its message. */
  const change = (field: ItemField, value: string) => {
    setForm((typed) => ({ ...typed, [field]: value }))
    setErrors((shown) => ({ ...shown, [field]: undefined }))
  }

  /** Takes a note's new value, the description cut at its limit, and drops its message. */
  const changeNote = (field: NoteField, value: string) => {
    setForm((typed) => ({ ...typed, [field]: field === 'description' ? descriptionInput(value).value : value }))
    setErrors((shown) => ({ ...shown, description: undefined }))
  }

  /** Sets the message of a brand's field, or drops it. */
  const brandError = (index: number, field: keyof ItemBrandFormErrors, message: string | undefined) =>
    setErrors((shown) => {
      const brands = [...(shown.brands ?? [])]
      brands[index] = { ...brands[index], [field]: message }
      return { ...shown, brands }
    })

  /** Takes a field of a brand's new value and drops its message. */
  const changeBrand = (index: number, field: BrandField, value: string) => {
    setForm((typed) => ({ ...typed, brands: typed.brands.map((brand, at) => (at === index ? { ...brand, [field]: value } : brand)) }))
    if (field !== 'color' && field !== 'location') {
      brandError(index, field, undefined)
    }
  }

  /** Takes a brand's code in uppercase and says at once when another item uses it. */
  const changeCode = (index: number, value: string) => {
    changeBrand(index, 'code', value.toUpperCase())
    brandError(index, 'code', codeTakenError(value, items, locale, item?.id))
  }

  /** Takes a brand's whole quantity, leaving out what isn't one; a paste that isn't one is refused, saying so. */
  const changeQuantity = (index: number, value: string) => {
    const read = quantityInput(form.brands[index].quantity, value, locale)
    changeBrand(index, 'quantity', read.value)
    brandError(index, 'quantity', read.message)
  }

  /** Takes the minimum, a whole quantity, as changeQuantity does a brand's. */
  const changeMinimum = (value: string) => {
    const read = quantityInput(form.minQuantity, value, locale)
    change('minQuantity', read.value)
    setErrors((shown) => ({ ...shown, minQuantity: read.message }))
  }

  /** Takes a brand's price through the BRL mask; a paste that isn't a price, or passes the limit, is refused, saying so. */
  const changePrice = (index: number, value: string) => {
    const read = priceMask(form.brands[index].price, value, locale)
    changeBrand(index, 'price', read.value)
    brandError(index, 'price', read.message)
  }

  /** Takes a field of a vehicle's line's new value and drops its line's messages. */
  const changeVehicle = (index: number, field: VehicleField, value: string) => {
    setForm((typed) => ({ ...typed, vehicles: typed.vehicles.map((vehicle, at) => (at === index ? changedVehicle(vehicle, field, value) : vehicle)) }))
    setErrors((shown) => ({ ...shown, vehicles: shown.vehicles?.map((line, at) => (at === index ? {} : line)) }))
  }

  /** Takes a new brand on a vehicle's line, clearing a model the new brand doesn't have. */
  const changeVehicleBrand = (index: number, value: string) => {
    changeVehicle(index, 'vehicleBrand', value)
    const model = form.vehicles[index].vehicleModel
    if (model && !findOption(modelsOfBrand(lists, value), model)) {
      changeVehicle(index, 'vehicleModel', '')
    }
  }

  /** Adds a blank vehicle's line at the end. */
  const addVehicle = () => setForm((typed) => ({ ...typed, vehicles: [...typed.vehicles, EMPTY_VEHICLE_FORM] }))

  /** Takes a vehicle's line out of the form, with its messages. */
  const removeVehicle = (index: number) => {
    setForm((typed) => ({ ...typed, vehicles: typed.vehicles.filter((_, at) => at !== index) }))
    setErrors((shown) => ({ ...shown, vehicles: shown.vehicles?.filter((_, at) => at !== index) }))
  }

  /** Adds a blank brand at the end, with no photos. */
  const addBrand = () => {
    setForm((typed) => ({ ...typed, brands: [...typed.brands, EMPTY_BRAND_FORM] }))
    setPhotos((held) => [...held, []])
  }

  /** Takes a brand out of the form, with its photos and its messages. */
  const removeBrand = (index: number) => {
    setForm((typed) => ({ ...typed, brands: typed.brands.filter((_, at) => at !== index) }))
    setPhotos((held) => held.filter((_, at) => at !== index))
    setErrors((shown) => ({ ...shown, brands: shown.brands?.filter((_, at) => at !== index) }))
  }

  /**
   * Creates a name typed in a combobox in its list, a vehicle model under its line's brand, and fills the field with
   * the name as the list holds it; a toast says it was created, or that it couldn't be, leaving the typed name.
   * @param kind The list.
   * @param fill Fills the field with the name as the list holds it.
   * @param vehicleBrandId The vehicle brand a new vehicle model goes under.
   * @returns What the combobox calls with the typed name.
   */
  const create = (kind: ItemListKind, fill: (name: string) => void, vehicleBrandId?: string) => async (typed: string) => {
    setCreating((count) => count + 1)
    const entry = await onCreateEntry(kind, typed, vehicleBrandId)
    setCreating((count) => count - 1)
    if (!entry) {
      toast.error(ITEM_LIST_TEXTS[locale][kind].createFailed)
      return
    }
    fill(entry.name)
    toast.success(ITEM_LIST_TEXTS[locale][kind].created(entry.name))
  }

  /** Tells whether any brand's photos differ from what the item holds. */
  const photosEdited = () =>
    form.brands.some((brand, index) => {
      const held = item?.brands.find((each) => each.id === brand.id)?.photos ?? []
      return photosChanged(photoParts(photos[index], held, API_BASE), held)
    })

  /**
   * Sends each brand's photos when they changed, finding the saved brand by its code.
   * @param saved The item as the API saved it.
   * @returns The item with its photos saved, or null when some couldn't be.
   */
  const saveBrandPhotos = async (saved: Item): Promise<Item | null> => {
    let current = saved
    for (const [index, typed] of form.brands.entries()) {
      const brand: ItemBrand | undefined = current.brands.find((each) => codeKey(each.code) === codeKey(typed.code))
      const next = brand && (await savePhotos(current, brand, photos[index]))
      if (brand && !next) {
        return null
      }
      current = next ?? current
    }
    return current
  }

  /**
   * Checks the form and sends the item, or shows what keeps it from being saved; an edit that changes nothing isn't
   * sent, and an info toast says so.
   */
  const save = async () => {
    const found = itemFormErrors(form, items, lists, locale, item?.id)
    setErrors(found)
    if (hasFormErrors(found)) {
      return
    }
    if (item && !itemFormChanged(form, item, options.colors) && !photosEdited()) {
      toast.info(ITEM_UNCHANGED_MESSAGE[locale])
      onClose()
      return
    }
    setSaving(true)
    const response = await apiFetch(item ? `/api/items/${item.id}` : '/api/items', {
      method: item ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(itemFormBody(form, options.colors)),
    }).catch(() => null)
    const reason = response && !response.ok ? await refusalReason(response) : null
    if (response && reason === 'codeTaken') {
      setSaving(false)
      const [taken] = (await response.json()).details
      const index = Math.max(
        0,
        form.brands.findIndex((brand) => codeKey(brand.code) === codeKey(taken.code)),
      )
      brandError(index, 'code', codeTakenMessage(taken.itemName, locale))
      return
    }
    if (item && reason === 'itemNotFound') {
      setSaving(false)
      toast.warning(itemGoneMessage(item.name, locale))
      onGone?.(item)
      return
    }
    if (!response?.ok) {
      setSaving(false)
      toast.error(texts.form.saveFailed)
      return
    }
    const saved = itemSchema.parse(await response.json())
    const withPhotos = await saveBrandPhotos(saved)
    setSaving(false)
    if (!withPhotos) {
      toast.warning(texts.form.savedWithoutPhotos(saved.name))
      onSaved(saved)
      return
    }
    toast.success(item ? texts.form.saved(saved.name) : texts.form.created(saved.name))
    onSaved(withPhotos)
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="wide"
        title={viewing ? texts.form.details : item ? (phone ? item.name : texts.form.edit) : texts.form.new}
        closable={!screen}
        back={screen ? texts.form.back : undefined}
        headerAction={screen && item && onDelete ? <RemoveItemButton onClick={() => onDelete(item)} /> : undefined}
        actions={
          screen ? (
            <>
              {onDuplicate && (
                <Button variant="secondary" icon={copyIcon} className={classes.action()} onClick={() => setAsking(true)}>
                  {texts.form.duplicate}
                </Button>
              )}
              <Button icon={pencilIcon} className={classes.action()} data-tour="form-edit" onClick={() => setViewing(false)}>
                {common.edit}
              </Button>
            </>
          ) : phone && !viewing ? (
            <Button className={classes.action()} data-tour="form-save" loading={saving || creating > 0} onClick={save}>
              {item ? texts.form.saveChanges : texts.form.saveItem}
            </Button>
          ) : viewing ? (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                {common.close}
              </Button>
              {onDuplicate && (
                <Button variant="secondary" size="sm" onClick={() => setAsking(true)}>
                  {texts.form.duplicate}
                </Button>
              )}
              <Button size="sm" data-tour="form-edit" onClick={() => setViewing(false)}>
                {common.edit}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                {common.cancel}
              </Button>
              <Button size="sm" data-tour="form-save" loading={saving || creating > 0} onClick={save}>
                {item ? texts.form.saveChanges : common.save}
              </Button>
            </>
          )
        }
      >
        {screen && item ? (
          <ItemDetails item={item} photos={photos} scrollToBrand={scrollToBrand} brandRef={scrolledBrand} />
        ) : viewing && item ? (
          <div className={classes.fields()} data-testid={ids.fields}>
            {/* The notes the item has follow its name and category, the description right under the name. */}
            {Object.entries(itemDetailTexts(item, locale))
              .map(([field, text]) => ({ field, label: ITEM_FIELD_LABELS[locale][field as ItemField], text }))
              .toSpliced(2, 0, ...itemNoteTexts(item, locale))
              .map(({ field, label, text }) => (
                <FieldValue key={field} label={label} value={text} />
              ))}
            <div className={classes.codes()} data-testid={ids.codes}>
              <FieldValue label={VEHICLES_LABEL[locale]} value={vehiclesText(item, locale)} />
            </div>
            <div className={classes.codes()} data-testid={ids.codes}>
              <FieldValue label={ORIGINAL_CODES_LABEL[locale]} value={originalCodesText(item, locale)} />
            </div>
            <div className={classes.brands()} data-testid={ids.brands}>
              {item.brands.map((brand, index) => (
                <div
                  key={brand.id}
                  ref={brand.id === scrollToBrand ? scrolledBrand : undefined}
                  role="group"
                  aria-label={brandNames(index, item.brands.length, locale).section}
                  className={classes.brand()}
                  data-testid={ids.brand}
                >
                  <div className={classes.brandHead()} data-testid={ids.brandHead}>
                    <Heading level={4}>{brandNames(index, item.brands.length, locale).section}</Heading>
                  </div>
                  <div className={classes.photos()} data-testid={ids.photos}>
                    <ImageUpload
                      label={brandNames(index, item.brands.length, locale).photos}
                      photos={photos[index] ?? []}
                      onPhotosChange={() => {}}
                      limit={ITEM_PHOTO_LIMIT}
                      readOnly
                    />
                  </div>
                  {Object.entries(brandDetailTexts(brand, locale)).map(([field, text]) => (
                    <FieldValue key={field} label={BRAND_FIELD_LABELS[locale][field as BrandField]} value={text} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={classes.fields()} data-testid={ids.fields}>
            <TextField
              ref={name}
              data-tour="form-name"
              label={ITEM_FIELD_LABELS[locale].name}
              placeholder={phone ? texts.form.nameExample : undefined}
              value={form.name}
              onValueChange={(value) => change('name', value)}
              onBlur={() => change('name', form.name.trim() ? capitalizeFirst(form.name) : form.name)}
              error={errors.name}
            />
            <Combobox
              label={ITEM_FIELD_LABELS[locale].category}
              value={form.category}
              onValueChange={(value) => change('category', value)}
              options={options.categories}
              onCreate={create('categories', (created) => change('category', created))}
              noun={texts.combos.category.noun}
              toggleLabel={texts.combos.category.toggle}
              emptyLabel={texts.combos.category.empty}
              error={errors.category}
            />
            <TextField
              label={ITEM_NOTE_LABELS[locale].description}
              placeholder={phone ? texts.form.descriptionExample : undefined}
              value={form.description ?? ''}
              onValueChange={(value) => changeNote('description', value)}
              helper={descriptionInput(form.description ?? '').counter}
              error={errors.description}
            />
            <TextField
              label={ITEM_NOTE_LABELS[locale].material}
              placeholder={phone ? texts.form.materialExample : undefined}
              value={form.material ?? ''}
              onValueChange={(value) => changeNote('material', value)}
            />
            {phone ? (
              <VehiclesField
                vehicles={form.vehicles}
                errors={errors.vehicles}
                lists={lists}
                suggest={(vehicle) => vehicleSuggestions(catalog, vehicle)}
                brands={options.vehicleBrands}
                onVehiclesChange={(vehicles) => {
                  setForm((typed) => ({ ...typed, vehicles }))
                  setErrors((shown) => ({ ...shown, vehicles: undefined }))
                }}
                onCreate={create}
              />
            ) : (
            <div role="group" aria-label={VEHICLES_LABEL[locale]} className={classes.vehicles()} data-testid={ids.vehicles}>
              <Text size="sm" tone="muted">
                {texts.form.vehiclesHint}
              </Text>
              {form.vehicles.map((vehicle, index) => {
                const brand = findEntry(lists.vehicleBrands, vehicle.vehicleBrand)
                const shown = errors.vehicles?.[index] ?? {}
                const line = texts.form.vehicle(index + 1)
                const suggested = vehicleSuggestions(catalog, vehicle)
                return (
                  <div key={index} role="group" aria-label={line} className={classes.vehicle()} data-testid={ids.vehicle}>
                    <Combobox
                      label={VEHICLE_FIELD_LABELS[locale].vehicleBrand}
                      value={vehicle.vehicleBrand}
                      onValueChange={(value) => changeVehicleBrand(index, value)}
                      options={options.vehicleBrands}
                      onCreate={create('vehicleBrands', (created) => changeVehicle(index, 'vehicleBrand', created))}
                      noun={texts.combos.vehicleBrand.noun}
                      toggleLabel={texts.combos.vehicleBrand.toggle}
                      emptyLabel={texts.combos.vehicleBrand.empty}
                      error={shown.vehicleBrand}
                    />
                    <Combobox
                      label={VEHICLE_FIELD_LABELS[locale].vehicleModel}
                      value={vehicle.vehicleModel}
                      onValueChange={(value) => changeVehicle(index, 'vehicleModel', value)}
                      options={modelsOfBrand(lists, vehicle.vehicleBrand)}
                      onCreate={create('vehicleModels', (created) => changeVehicle(index, 'vehicleModel', created), brand?.id)}
                      noun={texts.combos.vehicleModel.noun}
                      toggleLabel={texts.combos.vehicleModel.toggle}
                      emptyLabel={texts.combos.vehicleModel.empty}
                      placeholder={brand ? texts.combos.vehicleModel.any : texts.combos.vehicleModel.first}
                      error={shown.vehicleModel}
                      disabled={!brand}
                    />
                    <Combobox
                      label={VEHICLE_FIELD_LABELS[locale].generation}
                      value={vehicle.generation ?? ''}
                      onValueChange={(value) => changeVehicle(index, 'generation', value)}
                      options={suggested.generations}
                      noun={texts.combos.generation.noun}
                      toggleLabel={texts.combos.generation.toggle}
                      emptyLabel={texts.combos.generation.empty}
                      placeholder={vehicle.vehicleModel.trim() ? texts.combos.generation.example : texts.combos.generation.first}
                      error={shown.generation}
                      disabled={!vehicle.vehicleModel.trim()}
                    />
                    <Combobox
                      label={VEHICLE_FIELD_LABELS[locale].version}
                      value={vehicle.version ?? ''}
                      onValueChange={(value) => changeVehicle(index, 'version', value)}
                      options={suggested.versions}
                      noun={texts.combos.version.noun}
                      toggleLabel={texts.combos.version.toggle}
                      emptyLabel={texts.combos.version.empty}
                      placeholder={vehicle.generation?.trim() ? texts.combos.version.example : texts.combos.version.first}
                      error={shown.version}
                      disabled={!vehicle.generation?.trim()}
                    />
                    {form.vehicles.length > 1 && (
                      <div className={classes.removeVehicle()} data-testid={ids.removeVehicle}>
                        <RowAction icon={trashIcon} label={texts.form.removeNamed(line)} tone="danger" onClick={() => removeVehicle(index)} />
                      </div>
                    )}
                  </div>
                )
              })}
              <div className={classes.addVehicle()} data-testid={ids.addVehicle}>
                <Button variant="secondary" size="sm" className={classes.accent()} onClick={addVehicle}>
                  {texts.form.addVehicle}
                </Button>
              </div>
            </div>
            )}
            <div className={classes.choice()} data-testid={ids.choice}>
              <Label>{ITEM_FIELD_LABELS[locale].position}</Label>
              <Segmented
                label={ITEM_FIELD_LABELS[locale].position}
                options={phone ? POSITION_CHOICES[locale] : POSITION_OPTIONS}
                fill={phone}
                value={form.position}
                onValueChange={(value) => change('position', value)}
              />
            </div>
            <div className={classes.choice()} data-testid={ids.choice}>
              <Label>{ITEM_FIELD_LABELS[locale].side}</Label>
              <Segmented
                label={ITEM_FIELD_LABELS[locale].side}
                options={phone ? SIDE_CHOICES[locale] : SIDE_OPTIONS}
                fill={phone}
                value={form.side}
                onValueChange={(value) => change('side', value)}
              />
            </div>
            {phone ? (
              <Stepper
                label={ITEM_FIELD_LABELS[locale].minQuantity}
                value={form.minQuantity}
                onValueChange={changeMinimum}
                max={MAX_QUANTITY}
                error={errors.minQuantity}
                helper={texts.form.minimumHintShort}
              />
            ) : (
              <TextField
                label={ITEM_FIELD_LABELS[locale].minQuantity}
                kind="number"
                value={form.minQuantity}
                onValueChange={changeMinimum}
                error={errors.minQuantity}
                helper={texts.form.minimumHint}
              />
            )}
            <div className={classes.codes()} data-testid={ids.codes}>
              <CodeListField
                label={ORIGINAL_CODES_LABEL[locale]}
                codes={form.originalCodes}
                onCodesChange={(codes) => setForm((typed) => ({ ...typed, originalCodes: codes }))}
                messages={originalCodeMessages(form, items, locale, item?.id)}
                helper={
                  phone
                    ? texts.form.codesHintShort
                    : texts.form.codesHint
                }
              />
            </div>
            <div className={classes.brands()} data-testid={ids.brands}>
              {!phone && (
                <Text size="sm" tone="muted">
                  {texts.form.brandsHint}
                </Text>
              )}
              {form.brands.map((brand, index) => {
                const names = brandNames(index, form.brands.length, locale)
                const shown = errors.brands?.[index] ?? {}
                // The tutorial points at the first brand's code and quantity.
                const tour = (field: string) => (index === 0 ? field : undefined)
                return (
                  <div key={brand.id ?? `new-${index}`} role="group" aria-label={names.section} className={classes.brand()} data-testid={ids.brand}>
                    <div className={classes.brandHead()} data-testid={ids.brandHead}>
                      <Heading level={4}>{names.section}</Heading>
                      {form.brands.length > 1 && (
                        <RowAction icon={trashIcon} label={texts.form.removeNamed(names.section)} tone="danger" onClick={() => removeBrand(index)} />
                      )}
                    </div>
                    <div className={classes.photos()} data-testid={ids.photos} data-tour={index === 0 ? 'form-photos' : undefined}>
                      <ImageUpload
                        label={names.photos}
                        photos={photos[index] ?? []}
                        onPhotosChange={(next) => setPhotos((held) => held.map((each, at) => (at === index ? next : each)))}
                        limit={ITEM_PHOTO_LIMIT}
                      />
                      {(photos[index]?.length ?? 0) < ITEM_PHOTO_LIMIT && (
                        <span className={classes.pickPhotos()} data-testid={ids.pickPhotos}>
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={texts.form.photosFor(PHOTO_PICKER[locale].open, names.section)}
                            onClick={() => setPicker((current) => ({ brand: index, session: current.session + 1 }))}
                          >
                            {PHOTO_PICKER[locale].open}
                          </Button>
                        </span>
                      )}
                    </div>
                    <div className={classes.wide()} data-testid={ids.wide}>
                      <Combobox
                        label={BRAND_FIELD_LABELS[locale].partBrand}
                        value={brand.partBrand}
                        onValueChange={(value) => changeBrand(index, 'partBrand', value)}
                        options={options.partBrands}
                        onCreate={create('partBrands', (created) => changeBrand(index, 'partBrand', created))}
                        noun={texts.combos.partBrand.noun}
                        toggleLabel={texts.combos.partBrand.toggle}
                        emptyLabel={texts.combos.partBrand.empty}
                        error={shown.partBrand}
                      />
                    </div>
                    <div className={classes.wide()} data-testid={ids.wide}>
                      <TextField
                        data-tour={tour('form-code')}
                        label={BRAND_FIELD_LABELS[locale].code}
                        value={brand.code}
                        onValueChange={(value) => changeCode(index, value)}
                        error={shown.code}
                      />
                    </div>
                    <TextField
                      data-tour={tour('form-quantity')}
                      label={BRAND_FIELD_LABELS[locale].quantity}
                      kind="number"
                      value={brand.quantity}
                      onValueChange={(value) => changeQuantity(index, value)}
                      error={shown.quantity}
                    />
                    <TextField
                      label={BRAND_FIELD_LABELS[locale].price}
                      kind="number"
                      value={brand.price}
                      onValueChange={(value) => changePrice(index, value)}
                      placeholder={PRICE_PLACEHOLDER}
                      error={shown.price}
                    />
                    <TextField
                      label={BRAND_FIELD_LABELS[locale].color}
                      value={brand.color}
                      onValueChange={(value) => changeBrand(index, 'color', colorText(value))}
                      onBlur={() => changeBrand(index, 'color', colorInput(brand.color, options.colors))}
                      placeholder={phone ? texts.form.colorPlaceholder : undefined}
                      helper={phone ? undefined : texts.form.colorHint}
                    />
                    <TextField
                      label={BRAND_FIELD_LABELS[locale].location}
                      placeholder={phone ? texts.form.locationExample : undefined}
                      value={brand.location}
                      onValueChange={(value) => changeBrand(index, 'location', value)}
                      onBlur={() => changeBrand(index, 'location', brand.location.trim() ? capitalizeFirst(brand.location) : brand.location)}
                    />
                  </div>
                )
              })}
              <div className={classes.add()} data-testid={ids.add}>
                {phone ? (
                  <Button variant="dashed" icon={plusIcon} onClick={addBrand}>
                    {texts.form.addBrand}
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" className={classes.accent()} onClick={addBrand}>
                    {texts.form.addBrand}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
      <PhotoPickerDialog
        key={picker.session}
        open={open && picker.brand !== null}
        onClose={() => setPicker((current) => ({ ...current, brand: null }))}
        items={items}
        editingId={item?.id}
        room={ITEM_PHOTO_LIMIT - (photos[picker.brand ?? 0]?.length ?? 0)}
        onPick={(picked) => {
          setPhotos((held) => held.map((each, at) => (at === picker.brand ? [...each, ...copiedPhotos(picked, API_BASE)] : each)))
          setPicker((current) => ({ ...current, brand: null }))
        }}
      />
      {item && onDuplicate && (
        <DuplicateItemDialog
          open={open && asking}
          name={item.name}
          onClose={() => setAsking(false)}
          onDuplicate={(withPhotos) => {
            setAsking(false)
            onDuplicate(item, withPhotos)
          }}
        />
      )}
    </>
  )
}
