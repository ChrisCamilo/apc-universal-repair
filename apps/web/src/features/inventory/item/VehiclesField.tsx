import { useEffect, useId, useRef, useState } from 'react'
import { closeIcon, ICON_SIZES, plusIcon } from '@apc/tokens/icons'
import { findOption } from '@apc/domain/items'
import {
  changedVehicle,
  EMPTY_VEHICLE_FORM,
  ITEM_FORM_MESSAGES,
  modelsOfBrand,
  VEHICLE_FIELD_LABELS,
  VEHICLES_LABEL,
  vehicleFormErrors,
  vehicleOfForm,
  vehicleText,
  type ItemVehicleForm,
  type ItemVehicleFormErrors,
} from '@apc/domain/item-form'
import { findEntry, type ItemListKind, type ItemLists } from '@apc/domain/lists'
import { Button } from '../../../components/Button'
import { Combobox } from '../../../components/Combobox'
import { Icon } from '../../../components/Icon'
import { Label, Text } from '../../../components/Typography'
import { vehiclesField } from './VehiclesField.styles.ts'
import { useLocale } from '../../../app/useLocale.ts'

// The vehicles an item fits in a phone's item form, as in the Novo item mockup: each vehicle a chip with its × (see
// vehicleText), then a dashed "Adicionar veículo" that opens a new vehicle's brand and model, the comboboxes of the
// desktop's lines, then its generation and version side by side, opened one after the other (the generation after the
// model, the version after the generation), which offer what the catalog holds for its model (the generations numbered,
// "G1 - 68/74", the versions of the generation chosen) and take any text, with Cancelar and Adicionar. Adicionar checks the new vehicle against the item's (see
// vehicleFormErrors) and only then makes it a chip; a vehicle with a brand not in the list, one the item already has,
// or a vehicle beside Universal is refused, saying why. The focus goes to the new vehicle's brand when it opens, and
// back to "Adicionar veículo" when it closes. A blank line, as a new item's form starts with, shows no chip: saving
// without a vehicle says so under the button, as it does a chip's message.

type VehiclesFieldProps = {
  /** The form's vehicles; a line without a brand is blank. */
  vehicles: readonly ItemVehicleForm[]
  /** The message of each line's fields, from saving, in the vehicles' order. */
  errors?: readonly ItemVehicleFormErrors[]
  lists: ItemLists
  /** The vehicle brands the brand's combobox offers. */
  brands: readonly string[]
  /** The generations and versions a vehicle's fields offer for its brand and model. */
  suggest: (vehicle: ItemVehicleForm) => { generations: string[]; versions: string[] }
  onVehiclesChange: (vehicles: ItemVehicleForm[]) => void
  /** Makes what a combobox calls with a typed name, which creates it in its list and fills the field with it. */
  onCreate: (kind: ItemListKind, fill: (name: string) => void, vehicleBrandId?: string) => (typed: string) => void
}

export function VehiclesField({ vehicles, errors = [], lists, brands, suggest, onVehiclesChange, onCreate }: VehiclesFieldProps) {
  const { locale } = useLocale()
  const labelId = useId()
  // The vehicle being added, open under the chips, and its messages.
  const [draft, setDraft] = useState<ItemVehicleForm | null>(null)
  const [draftErrors, setDraftErrors] = useState<ItemVehicleFormErrors>({})
  const draftBox = useRef<HTMLDivElement>(null)
  const addBox = useRef<HTMLDivElement>(null)
  // Whether the new vehicle was open, to move the focus only when it opens or closes.
  const drafting = useRef(false)
  const filled = vehicles.filter((vehicle) => vehicle.vehicleBrand.trim())
  const brand = draft && findEntry(lists.vehicleBrands, draft.vehicleBrand)
  const suggested = draft ? suggest(draft) : { generations: [], versions: [] }
  const notes = vehicles.flatMap((vehicle, index) =>
    Object.values(errors[index] ?? {})
      .filter(Boolean)
      .map((message) => (vehicle.vehicleBrand.trim() ? `${vehicleText(vehicleOfForm(vehicle), locale)}: ${message}` : message)),
  )
  const { classes, ids } = vehiclesField()

  // Start on the new vehicle's brand when it opens, and go back to "Adicionar veículo" when it closes.
  useEffect(() => {
    if (draft && !drafting.current) {
      draftBox.current?.querySelector('input')?.focus()
    } else if (!draft && drafting.current) {
      addBox.current?.querySelector('button')?.focus()
    }
    drafting.current = draft !== null
  }, [draft])

  /**
   * Takes a field of the new vehicle's new value and drops its messages; a new brand clears a model it doesn't have, and
   * an emptied field what waits on it (see changedVehicle).
   */
  const change = (field: keyof ItemVehicleForm, value: string) => {
    setDraft((typed) => {
      const next = changedVehicle(typed ?? EMPTY_VEHICLE_FORM, field, value)
      return field === 'vehicleBrand' && next.vehicleModel && !findOption(modelsOfBrand(lists, value), next.vehicleModel)
        ? changedVehicle(next, 'vehicleModel', '')
        : next
    })
    setDraftErrors({})
  }

  /** Makes the new vehicle a chip, or says why it can't be one. */
  const add = () => {
    if (!draft) {
      return
    }
    const lines = vehicleFormErrors([...filled, draft], lists, locale)
    const found = lines[lines.length - 1]
    // Universal already among the chips is refused on its own line; the new vehicle says so.
    const universal = lines.slice(0, -1).some((line) => line.vehicleBrand === ITEM_FORM_MESSAGES[locale].universalAlone)
    const shown = Object.keys(found).length > 0 ? found : universal ? { vehicleBrand: ITEM_FORM_MESSAGES[locale].universalAlone } : {}
    setDraftErrors(shown)
    if (Object.keys(shown).length === 0) {
      onVehiclesChange([...filled, draft])
      setDraft(null)
    }
  }

  /** Takes a chip's vehicle out, leaving a blank line when it was the last. */
  const remove = (index: number) => {
    const kept = vehicles.filter((vehicle, at) => at !== index && vehicle.vehicleBrand.trim())
    onVehiclesChange(kept.length > 0 ? kept : [EMPTY_VEHICLE_FORM])
  }

  return (
    <div role="group" aria-labelledby={labelId} className={classes.base()} data-testid={ids.base}>
      <Label id={labelId}>{VEHICLES_LABEL[locale]}</Label>
      {filled.length > 0 && (
        <ul className={classes.chips()} data-testid={ids.chips}>
          {vehicles.map((vehicle, index) =>
            vehicle.vehicleBrand.trim() ? (
              <li key={index} className={classes.chip()} data-testid={ids.chip}>
                {vehicleText(vehicleOfForm(vehicle), locale)}
                <button
                  type="button"
                  aria-label={`Remover ${vehicleText(vehicleOfForm(vehicle), locale)}`}
                  className={classes.remove()}
                  data-testid={ids.remove}
                  onClick={() => remove(index)}
                >
                  <Icon icon={closeIcon} size={ICON_SIZES.body} />
                </button>
              </li>
            ) : null,
          )}
        </ul>
      )}
      {draft ? (
        <div ref={draftBox} role="group" aria-label="Novo veículo" className={classes.draft()} data-testid={ids.draft}>
          <Combobox
            label={VEHICLE_FIELD_LABELS[locale].vehicleBrand}
            value={draft.vehicleBrand}
            onValueChange={(value) => change('vehicleBrand', value)}
            options={brands}
            onCreate={onCreate('vehicleBrands', (created) => change('vehicleBrand', created))}
            noun="marca"
            toggleLabel="Mostrar marcas de veículo"
            emptyLabel="Nenhuma marca cadastrada"
            error={draftErrors.vehicleBrand}
          />
          <Combobox
            label={VEHICLE_FIELD_LABELS[locale].vehicleModel}
            value={draft.vehicleModel}
            onValueChange={(value) => change('vehicleModel', value)}
            options={modelsOfBrand(lists, draft.vehicleBrand)}
            onCreate={onCreate('vehicleModels', (created) => change('vehicleModel', created), brand?.id)}
            noun="modelo"
            toggleLabel="Mostrar modelos"
            emptyLabel="Nenhum modelo cadastrado para essa marca"
            placeholder={brand ? 'Qualquer modelo' : 'Escolha a marca do veículo primeiro'}
            error={draftErrors.vehicleModel}
            disabled={!brand}
          />
          <div className={classes.pair()} data-testid={ids.pair}>
            <Combobox
              label={VEHICLE_FIELD_LABELS[locale].generation}
              value={draft.generation ?? ''}
              onValueChange={(value) => change('generation', value)}
              options={suggested.generations}
              noun="geração"
              toggleLabel="Mostrar gerações"
              emptyLabel="Nenhuma geração conhecida para esse modelo"
              placeholder={draft.vehicleModel.trim() ? 'Ex.: 85/90' : 'Escolha o modelo primeiro'}
              error={draftErrors.generation}
              disabled={!draft.vehicleModel.trim()}
            />
            <Combobox
              label={VEHICLE_FIELD_LABELS[locale].version}
              value={draft.version ?? ''}
              onValueChange={(value) => change('version', value)}
              options={suggested.versions}
              noun="versão"
              toggleLabel="Mostrar versões"
              emptyLabel="Nenhuma versão conhecida para esse modelo"
              placeholder={draft.generation?.trim() ? 'Ex.: 1.6 GLX' : 'Escolha a geração primeiro'}
              error={draftErrors.version}
              disabled={!draft.generation?.trim()}
            />
          </div>
          <div className={classes.draftActions()} data-testid={ids.draftActions}>
            <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={add}>
              Adicionar
            </Button>
          </div>
        </div>
      ) : (
        <div ref={addBox} className={classes.add()} data-testid={ids.add}>
          <Button variant="dashed" icon={plusIcon} onClick={() => setDraft(EMPTY_VEHICLE_FORM)}>
            Adicionar veículo
          </Button>
        </div>
      )}
      {notes.map((note) => (
        <p key={note} role="alert" className={classes.error()} data-testid={ids.error}>
          {note}
        </p>
      ))}
      <Text size="sm" tone="muted">
        Sem modelo, a peça serve em qualquer modelo da marca. A geração e a versão são opcionais.
      </Text>
    </div>
  )
}
