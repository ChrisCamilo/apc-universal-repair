import { useEffect, useRef, useState } from 'react'
import { capitalizeFirst, findOption, itemSchema, POSITIONS, SIDES, type Item } from '@apc/shared/items'
import {
  codeTakenMessage,
  EMPTY_ITEM_FORM,
  ITEM_FIELD_LABELS,
  itemDetailTexts,
  itemFormBody,
  itemFormErrors,
  itemFormOf,
  itemFormOptions,
  modelsOfBrand,
  parsePrice,
  priceInput,
  type ItemForm,
  type ItemFormErrors,
} from '@apc/shared/item-form'
import { Button } from '../components/Button.tsx'
import { Combobox } from '../components/Combobox.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { FieldValue } from '../components/FieldValue.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { TextField } from '../components/TextField.tsx'
import { useToast } from '../components/toastContext.ts'
import { Label } from '../components/Typography.tsx'

// The form that creates a new item or edits one, in a dialog whose content scrolls while Cancel and Save stay at
// the bottom. Category, part brand and the vehicle's brand and model are comboboxes of the values in stock, where a
// new value can be typed; the model only lists the chosen brand's models, stays locked until a brand is chosen and
// clears when the brand changes to one without it. The code turns uppercase while typing; the texts start with a
// capital letter when leaving the field and again on save, and the price is shown back in reais. Saving checks the
// required fields and a code another item uses, then sends the item to the API, shows a toast and hands the saved
// item over. Opened on an item's details, the same dialog shows each field as text in the form's layout, with Fechar
// and Editar: nothing can be changed or saved until Editar unlocks the fields in place, on the first one, and the
// buttons turn into Cancelar and Salvar alterações, which save like the edit form.

const FIELDS_GRID = 'grid items-start gap-x-4 gap-y-3 sm:grid-cols-2'
const POSITION_OPTIONS = POSITIONS.map((value) => ({ value, label: value }))
const SIDE_OPTIONS = SIDES.map((value) => ({ value, label: value }))

type ItemFormDialogProps = {
  open: boolean
  /** The item to edit; a new item when left out. */
  item?: Item
  /** Opens on the item's details, read-only until Editar. */
  details?: boolean
  /** Every item in stock, for the comboboxes' options and the code check. */
  items: Item[]
  onClose: () => void
  /** Called with the item as the API saved it. */
  onSaved: (item: Item) => void
}

export function ItemFormDialog({ open, item, details = false, items, onClose, onSaved }: ItemFormDialogProps) {
  const toast = useToast()
  const [viewing, setViewing] = useState(details && item !== undefined)
  const code = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ItemForm>(() => (item ? itemFormOf(item) : EMPTY_ITEM_FORM))
  const [errors, setErrors] = useState<ItemFormErrors>({})
  const [saving, setSaving] = useState(false)
  const options = itemFormOptions(items)
  const models = modelsOfBrand(items, form.vehicleBrand)
  const unlocked = details && !viewing

  // Once Editar unlocks the fields, start on the first one.
  useEffect(() => {
    if (unlocked) {
      code.current?.focus()
    }
  }, [unlocked])

  /** Takes a field's new value and drops its message. */
  const change = (field: keyof ItemForm, value: string) => {
    setForm((typed) => ({ ...typed, [field]: value }))
    setErrors((shown) => ({ ...shown, [field]: undefined }))
  }

  /** Takes a new vehicle brand, clearing a model the new brand doesn't have. */
  const changeBrand = (value: string) => {
    change('vehicleBrand', value)
    if (form.vehicleModel && !findOption(modelsOfBrand(items, value), form.vehicleModel)) {
      change('vehicleModel', '')
    }
  }

  /** Starts a text with a capital letter when leaving its field. */
  const capitalize = (field: 'name' | 'location') => () => change(field, form[field].trim() ? capitalizeFirst(form[field]) : form[field])

  /** Checks the form and sends the item, or shows what keeps it from being saved. */
  const save = async () => {
    const found = itemFormErrors(form, items, item?.id)
    setErrors(found)
    if (Object.values(found).some(Boolean)) {
      return
    }
    setSaving(true)
    const response = await fetch(item ? `/api/items/${item.id}` : '/api/items', {
      method: item ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(itemFormBody(form, options.colors)),
    }).catch(() => null)
    setSaving(false)
    if (response?.status === 409) {
      const { details } = await response.json()
      setErrors({ code: codeTakenMessage(details[0].itemName) })
      return
    }
    if (!response?.ok) {
      toast('Não foi possível salvar o item. Tente de novo.')
      return
    }
    const saved = itemSchema.parse(await response.json())
    toast(item ? `Item “${saved.name}” salvo.` : `Item “${saved.name}” cadastrado.`)
    onSaved(saved)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={viewing ? 'Detalhes do item' : item ? 'Editar item' : 'Novo item'}
      actions={
        viewing ? (
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <Button size="sm" onClick={() => setViewing(false)}>
              Editar
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={save}>
              {item ? 'Salvar alterações' : 'Salvar'}
            </Button>
          </>
        )
      }
    >
      {viewing && item ? (
        <div className={FIELDS_GRID}>
          {Object.entries(itemDetailTexts(item)).map(([field, text]) => (
            <FieldValue key={field} label={ITEM_FIELD_LABELS[field as keyof ItemForm]} value={text} />
          ))}
        </div>
      ) : (
        <div className={FIELDS_GRID}>
          <TextField
            ref={code}
            label={ITEM_FIELD_LABELS.code}
            value={form.code}
            onValueChange={(value) => change('code', value.toUpperCase())}
            error={errors.code}
          />
          <TextField
            label={ITEM_FIELD_LABELS.name}
            value={form.name}
            onValueChange={(value) => change('name', value)}
            onBlur={capitalize('name')}
            error={errors.name}
          />
          <Combobox
            label={ITEM_FIELD_LABELS.category}
            value={form.category}
            onValueChange={(value) => change('category', value)}
            options={options.categories}
            onCreate={(value) => change('category', value)}
            noun="categoria"
            toggleLabel="Mostrar categorias"
            emptyLabel="Nenhuma categoria cadastrada"
            error={errors.category}
          />
          <Combobox
            label={ITEM_FIELD_LABELS.partBrand}
            value={form.partBrand}
            onValueChange={(value) => change('partBrand', value)}
            options={options.partBrands}
            onCreate={(value) => change('partBrand', value)}
            noun="marca"
            toggleLabel="Mostrar marcas de peça"
            emptyLabel="Nenhuma marca cadastrada"
            error={errors.partBrand}
          />
          <Combobox
            label={ITEM_FIELD_LABELS.vehicleBrand}
            value={form.vehicleBrand}
            onValueChange={changeBrand}
            options={options.vehicleBrands}
            onCreate={changeBrand}
            noun="marca"
            toggleLabel="Mostrar marcas de veículo"
            emptyLabel="Nenhuma marca cadastrada"
            error={errors.vehicleBrand}
          />
          <Combobox
            label={ITEM_FIELD_LABELS.vehicleModel}
            value={form.vehicleModel}
            onValueChange={(value) => change('vehicleModel', value)}
            options={models}
            onCreate={(value) => change('vehicleModel', value)}
            noun="modelo"
            toggleLabel="Mostrar modelos"
            emptyLabel="Nenhum modelo cadastrado para essa marca"
            placeholder={form.vehicleBrand.trim() ? 'Qualquer modelo' : 'Escolha a marca do veículo primeiro'}
            helper="Deixe vazio se serve em qualquer modelo."
            disabled={!form.vehicleBrand.trim()}
          />
          <TextField
            label={ITEM_FIELD_LABELS.quantity}
            kind="number"
            value={form.quantity}
            onValueChange={(value) => change('quantity', value.replace(/\D/g, ''))}
          />
          <TextField
            label={ITEM_FIELD_LABELS.minQuantity}
            kind="number"
            value={form.minQuantity}
            onValueChange={(value) => change('minQuantity', value.replace(/\D/g, ''))}
            helper="Abaixo disso o item aparece como estoque baixo."
          />
          <div className="grid content-start gap-1.5">
            <Label>{ITEM_FIELD_LABELS.position}</Label>
            <Segmented
              label={ITEM_FIELD_LABELS.position}
              options={POSITION_OPTIONS}
              value={form.position}
              onValueChange={(value) => change('position', value)}
            />
          </div>
          <div className="grid content-start gap-1.5">
            <Label>{ITEM_FIELD_LABELS.side}</Label>
            <Segmented
              label={ITEM_FIELD_LABELS.side}
              options={SIDE_OPTIONS}
              value={form.side}
              onValueChange={(value) => change('side', value)}
            />
          </div>
          <TextField
            label={ITEM_FIELD_LABELS.color}
            value={form.color}
            onValueChange={(value) => change('color', value)}
            onBlur={() => change('color', form.color.trim() ? (findOption(options.colors, form.color) ?? capitalizeFirst(form.color)) : '')}
            helper="Deixe vazio se a cor não se aplica."
          />
          <TextField
            label={ITEM_FIELD_LABELS.location}
            value={form.location}
            onValueChange={(value) => change('location', value)}
            onBlur={capitalize('location')}
          />
          <TextField
            label={ITEM_FIELD_LABELS.price}
            kind="decimal"
            value={form.price}
            onValueChange={(value) => change('price', value)}
            onBlur={() => {
              const cents = parsePrice(form.price)
              if (cents !== null) {
                change('price', priceInput(cents))
              }
            }}
            placeholder="0,00"
            error={errors.price}
          />
        </div>
      )}
    </Dialog>
  )
}
