import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@apc/shared/auth'
import { trashIcon } from '@apc/shared/icons'
import { capitalizeFirst, codeKey, findOption, itemSchema, POSITIONS, SIDES, type Item, type ItemBrand } from '@apc/shared/items'
import {
  BRAND_FIELD_LABELS,
  brandDetailTexts,
  codeTakenError,
  codeTakenMessage,
  EMPTY_BRAND_FORM,
  EMPTY_ITEM_FORM,
  EMPTY_VEHICLE_FORM,
  hasFormErrors,
  ITEM_FIELD_LABELS,
  ITEM_UNCHANGED_MESSAGE,
  itemDetailTexts,
  itemFormBody,
  itemFormChanged,
  itemFormErrors,
  itemFormOf,
  itemFormOptions,
  modelsOfBrand,
  ORIGINAL_CODES_LABEL,
  originalCodeMessages,
  originalCodesText,
  PRICE_PLACEHOLDER,
  priceMask,
  quantityInput,
  VEHICLE_FIELD_LABELS,
  VEHICLES_LABEL,
  vehiclesText,
  type BrandField,
  type ItemBrandFormErrors,
  type ItemField,
  type ItemForm,
  type ItemFormErrors,
  type VehicleField,
} from '@apc/shared/item-form'
import { findEntry, ITEM_LIST_TEXTS, type ItemListKind, type ItemLists } from '@apc/shared/lists'
import { heldPhotos, ITEM_PHOTO_LIMIT, photoParts, photosChanged } from '@apc/shared/photos'
import { Button } from '../components/Button.tsx'
import { Combobox } from '../components/Combobox.tsx'
import { RowAction } from '../components/DataTable.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { FieldValue } from '../components/FieldValue.tsx'
import { API_BASE } from '../api.ts'
import { ImageUpload, type UploadPhoto } from '../components/ImageUpload.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { TextField } from '../components/TextField.tsx'
import { useToast } from '../components/toastContext.ts'
import { Heading, Label, Text } from '../components/Typography.tsx'
import { CodeListField } from './CodeListField.tsx'
import { DuplicateItemDialog } from './DuplicateItemDialog.tsx'
import { itemFormDialog } from './ItemFormDialog.styles.ts'
import { savePhotos } from './savePhotos.ts'
import type { CreateListEntry } from './useItemLists.ts'

// The form that creates a new item or edits one, in a dialog whose content scrolls while Cancel and Save stay at the
// bottom: first what the item's brands share (name, category, the vehicles it fits, position, side, the minimum stock
// and the
// vehicle maker's original codes, typed as chips, each shown with its message when a brand of the item or another item
// has it; see CodeListField), then a
// section for each brand that makes the part, with its photos, part brand, code, quantity, unit price, color and
// location. Each vehicle is a line of its brand and model; "Adicionar veículo" adds a blank line and "Adicionar marca"
// a blank brand, and each line's or brand's trash, in red, takes it out while another is left. Category, part brands and
// the vehicles' brands and models are comboboxes of the lists the API keeps, where "+ Criar" adds a new name to its
// list, picks it and says so in a toast; a line's model only lists its brand's models, is created under that brand,
// stays locked until a brand of the list is chosen and clears when the brand changes to one without it. A vehicle
// twice in the item, or Universal with others, is refused on its line. A name not in its list can't be saved: the field points to "+ Criar". A code turns uppercase while
// typing and says at once when another item uses it; the texts start with a capital letter when leaving the field and
// again on save; the quantities take whole numbers only, up to a million, and a pasted fraction or text is refused,
// saying so; and the price always shows in reais, digits filling from the cents, a pasted price read with a dot or a
// comma alike, up to a million (see priceMask). Saving checks the required fields, a part brand or code repeated in
// the item and a code another item uses, then sends the item with its brands to the API, shows a toast and hands the
// saved item over, then sends each brand's photos when they changed: up to 3 a brand, the first the cover, as its
// ImageUpload field holds them. When the item is saved but its photos aren't, a warning toast says so; an edit that
// changes nothing isn't sent, and an info toast says so. Opened on an item's details, the same dialog shows each field
// as text in the form's layout, a section for each brand (scrolled to one when opened on it, as a brand's row in the
// list does), with Fechar and Editar: nothing can be changed or saved
// until Editar unlocks the fields in place, on the first one, and the buttons turn into Cancelar and Salvar
// alterações, which save like the edit form. The details may also offer Duplicar, which asks whether the copy takes the
// photos too (see DuplicateItemDialog) and hands the answer over. The owner may open it with values and photos filled
// in, as a duplicated item's are, and follow what is typed, as
// the Inventory tutorial does, whose tour points at the name and at the first brand's code and quantity; the details
// list the vehicles apart, under Veículos.

const PHOTOS_LABEL = 'Fotos do item'
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
  /** Creates a name in one of the lists. */
  onCreateEntry: CreateListEntry
  onClose: () => void
  /** Called with the item as the API saved it. */
  onSaved: (item: Item) => void
  /** Values the form opens with instead of the item's own, e.g. filled in by the tutorial. */
  initialForm?: ItemForm
  /** Each brand's photos the form opens with instead of the item's own, e.g. a duplicated item's copies. */
  initialPhotos?: UploadPhoto[][]
  /** Offers Duplicar in the details, called with the item and whether the copy takes the photos too. */
  onDuplicate?: (item: Item, withPhotos: boolean) => void
  /** Called with the form as typed and whether it shows the details, on each change, e.g. for the tutorial. */
  onFormChange?: (form: ItemForm, viewing: boolean) => void
}

/**
 * Names a brand's section, and its photos, for the screen and screen readers.
 * @param index The brand's place in the form.
 * @param count How many brands the form has.
 * @returns E.g. "Marca 2", and "Fotos da marca 2"; the photos of an item of one brand are the item's.
 */
function brandNames(index: number, count: number): { section: string; photos: string } {
  return { section: `Marca ${index + 1}`, photos: count === 1 ? PHOTOS_LABEL : `Fotos da marca ${index + 1}` }
}

export function ItemFormDialog({
  open,
  item,
  details = false,
  scrollToBrand,
  items,
  lists,
  onCreateEntry,
  onClose,
  onSaved,
  initialForm,
  initialPhotos,
  onDuplicate,
  onFormChange,
}: ItemFormDialogProps) {
  const toast = useToast()
  const { classes, ids } = itemFormDialog()
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
  // How many names are being created; saving waits for them.
  const [creating, setCreating] = useState(0)
  const options = itemFormOptions(items, lists)
  const unlocked = details && !viewing

  // Tell the owner what the form holds as it changes.
  useEffect(() => {
    onFormChange?.(form, viewing)
  }, [form, viewing, onFormChange])

  // Opened on a brand, the details show its section first, once the window is open.
  useEffect(() => {
    if (open) {
      scrolledBrand.current?.scrollIntoView({ block: 'start' })
    }
  }, [open])

  // Once Editar unlocks the fields, start on the first one.
  useEffect(() => {
    if (unlocked) {
      name.current?.focus()
    }
  }, [unlocked])

  /** Takes a field's new value and drops its message. */
  const change = (field: ItemField, value: string) => {
    setForm((typed) => ({ ...typed, [field]: value }))
    setErrors((shown) => ({ ...shown, [field]: undefined }))
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
    brandError(index, 'code', codeTakenError(value, items, item?.id))
  }

  /** Takes a brand's whole quantity, leaving out what isn't one; a paste that isn't one is refused, saying so. */
  const changeQuantity = (index: number, value: string) => {
    const read = quantityInput(form.brands[index].quantity, value)
    changeBrand(index, 'quantity', read.value)
    brandError(index, 'quantity', read.message)
  }

  /** Takes the minimum, a whole quantity, as changeQuantity does a brand's. */
  const changeMinimum = (value: string) => {
    const read = quantityInput(form.minQuantity, value)
    change('minQuantity', read.value)
    setErrors((shown) => ({ ...shown, minQuantity: read.message }))
  }

  /** Takes a brand's price through the BRL mask; a paste that isn't a price, or passes the limit, is refused, saying so. */
  const changePrice = (index: number, value: string) => {
    const read = priceMask(form.brands[index].price, value)
    changeBrand(index, 'price', read.value)
    brandError(index, 'price', read.message)
  }

  /** Takes a field of a vehicle's line's new value and drops its line's messages. */
  const changeVehicle = (index: number, field: VehicleField, value: string) => {
    setForm((typed) => ({ ...typed, vehicles: typed.vehicles.map((vehicle, at) => (at === index ? { ...vehicle, [field]: value } : vehicle)) }))
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
      toast.error(ITEM_LIST_TEXTS[kind].createFailed)
      return
    }
    fill(entry.name)
    toast.success(ITEM_LIST_TEXTS[kind].created(entry.name))
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
    const found = itemFormErrors(form, items, lists, item?.id)
    setErrors(found)
    if (hasFormErrors(found)) {
      return
    }
    if (item && !itemFormChanged(form, item, options.colors) && !photosEdited()) {
      toast.info(ITEM_UNCHANGED_MESSAGE)
      onClose()
      return
    }
    setSaving(true)
    const response = await apiFetch(item ? `/api/items/${item.id}` : '/api/items', {
      method: item ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(itemFormBody(form, options.colors)),
    }).catch(() => null)
    if (response?.status === 409) {
      setSaving(false)
      const [taken] = (await response.json()).details
      const index = Math.max(
        0,
        form.brands.findIndex((brand) => codeKey(brand.code) === codeKey(taken.code)),
      )
      brandError(index, 'code', codeTakenMessage(taken.itemName))
      return
    }
    if (!response?.ok) {
      setSaving(false)
      toast.error('Não foi possível salvar o item. Tente de novo.')
      return
    }
    const saved = itemSchema.parse(await response.json())
    const withPhotos = await saveBrandPhotos(saved)
    setSaving(false)
    if (!withPhotos) {
      toast.warning(`Item “${saved.name}” salvo, mas as fotos não foram salvas. Tente de novo.`)
      onSaved(saved)
      return
    }
    toast.success(item ? `Item “${saved.name}” salvo.` : `Item “${saved.name}” cadastrado.`)
    onSaved(withPhotos)
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={viewing ? 'Detalhes do item' : item ? 'Editar item' : 'Novo item'}
        closable
        actions={
          viewing ? (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Fechar
              </Button>
              {onDuplicate && (
                <Button variant="secondary" size="sm" onClick={() => setAsking(true)}>
                  Duplicar
                </Button>
              )}
              <Button size="sm" data-tour="form-edit" onClick={() => setViewing(false)}>
                Editar
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button size="sm" data-tour="form-save" loading={saving || creating > 0} onClick={save}>
                {item ? 'Salvar alterações' : 'Salvar'}
              </Button>
            </>
          )
        }
      >
        {viewing && item ? (
          <div className={classes.fields()} data-testid={ids.fields}>
            {Object.entries(itemDetailTexts(item)).map(([field, text]) => (
              <FieldValue key={field} label={ITEM_FIELD_LABELS[field as ItemField]} value={text} />
            ))}
            <div className={classes.codes()} data-testid={ids.codes}>
              <FieldValue label={VEHICLES_LABEL} value={vehiclesText(item)} />
            </div>
            <div className={classes.codes()} data-testid={ids.codes}>
              <FieldValue label={ORIGINAL_CODES_LABEL} value={originalCodesText(item)} />
            </div>
            <div className={classes.brands()} data-testid={ids.brands}>
              {item.brands.map((brand, index) => (
                <div
                  key={brand.id}
                  ref={brand.id === scrollToBrand ? scrolledBrand : undefined}
                  role="group"
                  aria-label={brandNames(index, item.brands.length).section}
                  className={classes.brand()}
                  data-testid={ids.brand}
                >
                  <div className={classes.brandHead()} data-testid={ids.brandHead}>
                    <Heading level={4}>{brandNames(index, item.brands.length).section}</Heading>
                  </div>
                  <div className={classes.photos()} data-testid={ids.photos}>
                    <ImageUpload
                      label={brandNames(index, item.brands.length).photos}
                      photos={photos[index] ?? []}
                      onPhotosChange={() => {}}
                      limit={ITEM_PHOTO_LIMIT}
                      readOnly
                    />
                  </div>
                  {Object.entries(brandDetailTexts(brand)).map(([field, text]) => (
                    <FieldValue key={field} label={BRAND_FIELD_LABELS[field as BrandField]} value={text} />
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
              label={ITEM_FIELD_LABELS.name}
              value={form.name}
              onValueChange={(value) => change('name', value)}
              onBlur={() => change('name', form.name.trim() ? capitalizeFirst(form.name) : form.name)}
              error={errors.name}
            />
            <Combobox
              label={ITEM_FIELD_LABELS.category}
              value={form.category}
              onValueChange={(value) => change('category', value)}
              options={options.categories}
              onCreate={create('categories', (created) => change('category', created))}
              noun="categoria"
              toggleLabel="Mostrar categorias"
              emptyLabel="Nenhuma categoria cadastrada"
              error={errors.category}
            />
            <div role="group" aria-label={VEHICLES_LABEL} className={classes.vehicles()} data-testid={ids.vehicles}>
              <Text size="sm" tone="muted">
                Os veículos em que a peça serve. Deixe o modelo vazio se serve em qualquer modelo da marca.
              </Text>
              {form.vehicles.map((vehicle, index) => {
                const brand = findEntry(lists.vehicleBrands, vehicle.vehicleBrand)
                const shown = errors.vehicles?.[index] ?? {}
                const line = `Veículo ${index + 1}`
                return (
                  <div key={index} role="group" aria-label={line} className={classes.vehicle()} data-testid={ids.vehicle}>
                    <Combobox
                      label={VEHICLE_FIELD_LABELS.vehicleBrand}
                      value={vehicle.vehicleBrand}
                      onValueChange={(value) => changeVehicleBrand(index, value)}
                      options={options.vehicleBrands}
                      onCreate={create('vehicleBrands', (created) => changeVehicle(index, 'vehicleBrand', created))}
                      noun="marca"
                      toggleLabel="Mostrar marcas de veículo"
                      emptyLabel="Nenhuma marca cadastrada"
                      error={shown.vehicleBrand}
                    />
                    <Combobox
                      label={VEHICLE_FIELD_LABELS.vehicleModel}
                      value={vehicle.vehicleModel}
                      onValueChange={(value) => changeVehicle(index, 'vehicleModel', value)}
                      options={modelsOfBrand(lists, vehicle.vehicleBrand)}
                      onCreate={create('vehicleModels', (created) => changeVehicle(index, 'vehicleModel', created), brand?.id)}
                      noun="modelo"
                      toggleLabel="Mostrar modelos"
                      emptyLabel="Nenhum modelo cadastrado para essa marca"
                      placeholder={brand ? 'Qualquer modelo' : 'Escolha a marca do veículo primeiro'}
                      error={shown.vehicleModel}
                      disabled={!brand}
                    />
                    {form.vehicles.length > 1 && (
                      <div className={classes.removeVehicle()} data-testid={ids.removeVehicle}>
                        <RowAction icon={trashIcon} label={`Remover ${line.toLowerCase()}`} tone="danger" onClick={() => removeVehicle(index)} />
                      </div>
                    )}
                  </div>
                )
              })}
              <div className={classes.addVehicle()} data-testid={ids.addVehicle}>
                <Button variant="secondary" size="sm" onClick={addVehicle}>
                  Adicionar veículo
                </Button>
              </div>
            </div>
            <div className={classes.choice()} data-testid={ids.choice}>
              <Label>{ITEM_FIELD_LABELS.position}</Label>
              <Segmented
                label={ITEM_FIELD_LABELS.position}
                options={POSITION_OPTIONS}
                value={form.position}
                onValueChange={(value) => change('position', value)}
              />
            </div>
            <div className={classes.choice()} data-testid={ids.choice}>
              <Label>{ITEM_FIELD_LABELS.side}</Label>
              <Segmented
                label={ITEM_FIELD_LABELS.side}
                options={SIDE_OPTIONS}
                value={form.side}
                onValueChange={(value) => change('side', value)}
              />
            </div>
            <TextField
              label={ITEM_FIELD_LABELS.minQuantity}
              kind="number"
              value={form.minQuantity}
              onValueChange={changeMinimum}
              error={errors.minQuantity}
              helper="Abaixo disso, somando todas as marcas, o item aparece como estoque baixo."
            />
            <div className={classes.codes()} data-testid={ids.codes}>
              <CodeListField
                label={ORIGINAL_CODES_LABEL}
                codes={form.originalCodes}
                onCodesChange={(codes) => setForm((typed) => ({ ...typed, originalCodes: codes }))}
                messages={originalCodeMessages(form, items, item?.id)}
                helper="Os códigos da montadora, iguais em todas as marcas. Enter, vírgula ou ponto e vírgula separa um do outro."
              />
            </div>
            <div className={classes.brands()} data-testid={ids.brands}>
              <Text size="sm" tone="muted">
                As marcas que fazem esta peça, cada uma com seu código, estoque e valor.
              </Text>
              {form.brands.map((brand, index) => {
                const names = brandNames(index, form.brands.length)
                const shown = errors.brands?.[index] ?? {}
                // The tutorial points at the first brand's code and quantity.
                const tour = (field: string) => (index === 0 ? field : undefined)
                return (
                  <div key={brand.id ?? `new-${index}`} role="group" aria-label={names.section} className={classes.brand()} data-testid={ids.brand}>
                    <div className={classes.brandHead()} data-testid={ids.brandHead}>
                      <Heading level={4}>{names.section}</Heading>
                      {form.brands.length > 1 && (
                        <RowAction icon={trashIcon} label={`Remover ${names.section.toLowerCase()}`} tone="danger" onClick={() => removeBrand(index)} />
                      )}
                    </div>
                    <div className={classes.photos()} data-testid={ids.photos}>
                      <ImageUpload
                        label={names.photos}
                        photos={photos[index] ?? []}
                        onPhotosChange={(next) => setPhotos((held) => held.map((each, at) => (at === index ? next : each)))}
                        limit={ITEM_PHOTO_LIMIT}
                      />
                    </div>
                    <Combobox
                      label={BRAND_FIELD_LABELS.partBrand}
                      value={brand.partBrand}
                      onValueChange={(value) => changeBrand(index, 'partBrand', value)}
                      options={options.partBrands}
                      onCreate={create('partBrands', (created) => changeBrand(index, 'partBrand', created))}
                      noun="marca"
                      toggleLabel="Mostrar marcas de peça"
                      emptyLabel="Nenhuma marca cadastrada"
                      error={shown.partBrand}
                    />
                    <TextField
                      data-tour={tour('form-code')}
                      label={BRAND_FIELD_LABELS.code}
                      value={brand.code}
                      onValueChange={(value) => changeCode(index, value)}
                      error={shown.code}
                    />
                    <TextField
                      data-tour={tour('form-quantity')}
                      label={BRAND_FIELD_LABELS.quantity}
                      kind="number"
                      value={brand.quantity}
                      onValueChange={(value) => changeQuantity(index, value)}
                      error={shown.quantity}
                    />
                    <TextField
                      label={BRAND_FIELD_LABELS.price}
                      kind="number"
                      value={brand.price}
                      onValueChange={(value) => changePrice(index, value)}
                      placeholder={PRICE_PLACEHOLDER}
                      error={shown.price}
                    />
                    <TextField
                      label={BRAND_FIELD_LABELS.color}
                      value={brand.color}
                      onValueChange={(value) => changeBrand(index, 'color', value)}
                      onBlur={() =>
                        changeBrand(index, 'color', brand.color.trim() ? (findOption(options.colors, brand.color) ?? capitalizeFirst(brand.color)) : '')
                      }
                      helper="Deixe vazio se a cor não se aplica."
                    />
                    <TextField
                      label={BRAND_FIELD_LABELS.location}
                      value={brand.location}
                      onValueChange={(value) => changeBrand(index, 'location', value)}
                      onBlur={() => changeBrand(index, 'location', brand.location.trim() ? capitalizeFirst(brand.location) : brand.location)}
                    />
                  </div>
                )
              })}
              <div className={classes.add()} data-testid={ids.add}>
                <Button variant="secondary" size="sm" onClick={addBrand}>
                  Adicionar marca
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
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
