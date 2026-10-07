import { useState } from 'react'
import { capitalizeFirst, findOption, itemSchema, POSITIONS, SIDES, type Item } from '@apc/shared/items'
import {
  codeTakenMessage,
  EMPTY_ITEM_FORM,
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
// item over.

const POSITION_OPTIONS = POSITIONS.map((value) => ({ value, label: value }))
const SIDE_OPTIONS = SIDES.map((value) => ({ value, label: value }))

type ItemFormDialogProps = {
  open: boolean
  /** The item to edit; a new item when left out. */
  item?: Item
  /** Every item in stock, for the comboboxes' options and the code check. */
  items: Item[]
  onClose: () => void
  /** Called with the item as the API saved it. */
  onSaved: (item: Item) => void
}

export function ItemFormDialog({ open, item, items, onClose, onSaved }: ItemFormDialogProps) {
  const toast = useToast()
  const [form, setForm] = useState<ItemForm>(() => (item ? itemFormOf(item) : EMPTY_ITEM_FORM))
  const [errors, setErrors] = useState<ItemFormErrors>({})
  const [saving, setSaving] = useState(false)
  const options = itemFormOptions(items)
  const models = modelsOfBrand(items, form.vehicleBrand)

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
      title={item ? 'Editar item' : 'Novo item'}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" loading={saving} onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid items-start gap-x-4 gap-y-3 sm:grid-cols-2">
        <TextField
          label="Código da peça"
          value={form.code}
          onValueChange={(value) => change('code', value.toUpperCase())}
          error={errors.code}
        />
        <TextField label="Nome" value={form.name} onValueChange={(value) => change('name', value)} onBlur={capitalize('name')} error={errors.name} />
        <Combobox
          label="Categoria"
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
          label="Marca da peça"
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
          label="Marca do veículo"
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
          label="Modelo do veículo"
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
          label="Quantidade"
          kind="number"
          value={form.quantity}
          onValueChange={(value) => change('quantity', value.replace(/\D/g, ''))}
        />
        <TextField
          label="Quantidade mínima"
          kind="number"
          value={form.minQuantity}
          onValueChange={(value) => change('minQuantity', value.replace(/\D/g, ''))}
          helper="Abaixo disso o item aparece como estoque baixo."
        />
        <div className="grid content-start gap-1.5">
          <Label>Posição</Label>
          <Segmented
            label="Posição"
            options={POSITION_OPTIONS}
            value={form.position}
            onValueChange={(value) => change('position', value)}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <Label>Lado</Label>
          <Segmented label="Lado" options={SIDE_OPTIONS} value={form.side} onValueChange={(value) => change('side', value)} />
        </div>
        <TextField
          label="Cor"
          value={form.color}
          onValueChange={(value) => change('color', value)}
          onBlur={() => change('color', form.color.trim() ? (findOption(options.colors, form.color) ?? capitalizeFirst(form.color)) : '')}
          helper="Deixe vazio se a cor não se aplica."
        />
        <TextField label="Local" value={form.location} onValueChange={(value) => change('location', value)} onBlur={capitalize('location')} />
        <TextField
          label="Valor unitário (R$)"
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
    </Dialog>
  )
}
