import { useState } from 'react';
import { Pressable, Text as NativeText, View } from 'react-native';
import { closeIcon, ICON_SIZES, plusIcon } from '@apc/shared/icons';
import { findOption } from '@apc/shared/items';
import {
  EMPTY_VEHICLE_FORM,
  ITEM_FORM_MESSAGES,
  modelsOfBrand,
  VEHICLE_FIELD_LABELS,
  VEHICLES_LABEL,
  vehicleFormErrors,
  vehicleText,
  type ItemVehicleForm,
  type ItemVehicleFormErrors,
} from '@apc/shared/item-form';
import { findEntry, type ItemListKind, type ItemLists } from '@apc/shared/lists';
import { Button } from '../components/Button';
import { Combobox } from '../components/Combobox';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme';
import { Label, Text } from '../components/Typography';
import { useStyles } from './VehiclesField.styles';

// The vehicles an item fits in the item form, the same as the web on a phone: each vehicle a chip with its × (see
// vehicleText), then a dashed "Adicionar veículo" that opens a new vehicle's brand and model, with Cancelar and
// Adicionar. Adicionar checks the new vehicle against the item's (see vehicleFormErrors) and only then makes it a chip;
// a vehicle with a brand not in the list, one the item already has, or a vehicle beside Universal is refused, saying
// why. A blank line, as a new item's form starts with, shows no chip: saving without a vehicle says so under the
// button, as it does a chip's message.

type VehiclesFieldProps = {
  /** The form's vehicles; a line without a brand is blank. */
  vehicles: readonly ItemVehicleForm[];
  /** The message of each line's fields, from saving, in the vehicles' order. */
  errors?: readonly ItemVehicleFormErrors[];
  lists: ItemLists;
  /** The vehicle brands the brand's combobox offers. */
  brands: readonly string[];
  onVehiclesChange: (vehicles: ItemVehicleForm[]) => void;
  /** Makes what a combobox calls with a typed name, which creates it in its list and fills the field with it. */
  onCreate: (kind: ItemListKind, fill: (name: string) => void, vehicleBrandId?: string) => (typed: string) => void;
};

export function VehiclesField({ vehicles, errors = [], lists, brands, onVehiclesChange, onCreate }: VehiclesFieldProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  // The vehicle being added, open under the chips, and its messages.
  const [draft, setDraft] = useState<ItemVehicleForm | null>(null);
  const [draftErrors, setDraftErrors] = useState<ItemVehicleFormErrors>({});
  const filled = vehicles.filter((vehicle) => vehicle.vehicleBrand.trim());
  const brand = draft && findEntry(lists.vehicleBrands, draft.vehicleBrand);
  const notes = vehicles.flatMap((vehicle, index) =>
    Object.values(errors[index] ?? {})
      .filter(Boolean)
      .map((message) => (vehicle.vehicleBrand.trim() ? `${vehicleText(vehicle)}: ${message}` : message)),
  );

  /** Takes a field of the new vehicle's new value and drops its messages; a new brand clears a model it doesn't have. */
  const change = (field: keyof ItemVehicleForm, value: string) => {
    setDraft((typed) => {
      const next = { ...(typed ?? EMPTY_VEHICLE_FORM), [field]: value };
      return field === 'vehicleBrand' && next.vehicleModel && !findOption(modelsOfBrand(lists, value), next.vehicleModel)
        ? { ...next, vehicleModel: '' }
        : next;
    });
    setDraftErrors({});
  };

  /** Makes the new vehicle a chip, or says why it can't be one. */
  const add = () => {
    if (!draft) {
      return;
    }
    const lines = vehicleFormErrors([...filled, draft], lists);
    const found = lines[lines.length - 1];
    // Universal already among the chips is refused on its own line; the new vehicle says so.
    const universal = lines.slice(0, -1).some((line) => line.vehicleBrand === ITEM_FORM_MESSAGES.universalAlone);
    const shown = Object.keys(found).length > 0 ? found : universal ? { vehicleBrand: ITEM_FORM_MESSAGES.universalAlone } : {};
    setDraftErrors(shown);
    if (Object.keys(shown).length === 0) {
      onVehiclesChange([...filled, draft]);
      setDraft(null);
    }
  };

  /** Takes a chip's vehicle out, leaving a blank line when it was the last. */
  const remove = (index: number) => {
    const kept = vehicles.filter((vehicle, at) => at !== index && vehicle.vehicleBrand.trim());
    onVehiclesChange(kept.length > 0 ? kept : [EMPTY_VEHICLE_FORM]);
  };

  return (
    <View role="group" accessibilityLabel={VEHICLES_LABEL} style={styles.field} testID={ids.field}>
      <Label>{VEHICLES_LABEL}</Label>
      {filled.length > 0 && (
        <View style={styles.chips} testID={ids.chips}>
          {vehicles.map((vehicle, index) =>
            vehicle.vehicleBrand.trim() ? (
              <View key={index} style={styles.chip} testID={ids.chip}>
                <NativeText style={styles.chipText} testID={ids.chipText}>
                  {vehicleText(vehicle)}
                </NativeText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${vehicleText(vehicle)}`}
                  onPress={() => remove(index)}
                  style={styles.remove}
                  testID={ids.remove}
                >
                  {({ pressed }) => <Icon icon={closeIcon} size={ICON_SIZES.body} color={pressed ? colors.text : colors.textMuted} />}
                </Pressable>
              </View>
            ) : null,
          )}
        </View>
      )}
      {draft ? (
        <View role="group" accessibilityLabel="Novo veículo" style={styles.draft} testID={ids.draft}>
          <Combobox
            label={VEHICLE_FIELD_LABELS.vehicleBrand}
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
            label={VEHICLE_FIELD_LABELS.vehicleModel}
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
          <View style={styles.draftActions} testID={ids.draftActions}>
            <Button variant="secondary" size="sm" onPress={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button size="sm" onPress={add}>
              Adicionar
            </Button>
          </View>
        </View>
      ) : (
        <Button variant="dashed" icon={plusIcon} align="stretch" onPress={() => setDraft(EMPTY_VEHICLE_FORM)}>
          Adicionar veículo
        </Button>
      )}
      {notes.map((note) => (
        <NativeText key={note} accessibilityLiveRegion="polite" style={styles.error} testID={ids.error}>
          {note}
        </NativeText>
      ))}
      <Text size="sm" tone="muted">
        Sem modelo, a peça serve em qualquer modelo da marca.
      </Text>
    </View>
  );
}
