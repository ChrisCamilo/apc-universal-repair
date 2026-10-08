import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { TextInput, View, type ViewStyle } from 'react-native';
import { capitalizeFirst, findOption, itemSchema, POSITIONS, SIDES, type Item } from '@apc/shared/items';
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
} from '@apc/shared/item-form';
import { findEntry, ITEM_LIST_TOASTS, type ItemListKind, type ItemLists } from '@apc/shared/lists';
import { heldPhotos, ITEM_PHOTO_LIMIT } from '@apc/shared/photos';
import { scales } from '@apc/shared/theme';
import { API_URL } from '../api';
import { Button } from '../Button';
import { Combobox } from '../Combobox';
import { Dialog } from '../Dialog';
import { FieldValue } from '../FieldValue';
import { ImageUpload, type UploadPhoto } from '../ImageUpload';
import { Segmented } from '../Segmented';
import { TextField } from '../TextField';
import { useToast } from '../Toast';
import { Label } from '../Typography';
import { pickPhotos, savePhotos } from './photos';
import type { CreateListEntry } from './useItemLists';

// The form that creates a new item or edits one, the same as the web, in one column: the content scrolls inside the
// dialog while Cancel and Save stay at the bottom. Category, part brand and the vehicle's brand and model are
// comboboxes of the lists the API keeps, where "+ Criar" adds a new name to its list, picks it and says so in a
// toast; the model only lists the chosen brand's models, is created under that brand, stays locked until a brand of
// the list is chosen and clears when the brand changes to one without it. A name not in its list can't be saved:
// the field points to "+ Criar". The code turns uppercase while typing; the texts start with a capital letter when
// leaving the field and again on save, and the price is shown back in reais. Saving checks the required fields and a
// code another item uses, then sends the item to the API, shows a toast and hands the saved item over, then sends its
// photos when they changed: up to 3, the first the cover, picked from the phone's library. When the item is saved
// but its photos aren't, the toast says so. Opened on an item's details, the same dialog shows each field as text in
// the form's layout, with Fechar and Editar: nothing can be changed or saved until Editar unlocks the fields in
// place, on the first one, and the buttons turn into Cancelar and Salvar alterações, which save like the edit form.

const CHOICE_STYLE: ViewStyle = { gap: scales.space.s2 };
const FIELDS_STYLE: ViewStyle = { gap: scales.space.s3 };
const PHOTOS_LABEL = 'Fotos do item';
const POSITION_OPTIONS = POSITIONS.map((value) => ({ value, label: value }));
const SIDE_OPTIONS = SIDES.map((value) => ({ value, label: value }));

type ItemFormDialogProps = {
  open: boolean;
  /** The item to edit; a new item when left out. */
  item?: Item;
  /** Opens on the item's details, read-only until Editar. */
  details?: boolean;
  /** Every item in stock, for the colors and the code check. */
  items: Item[];
  /** The lists the comboboxes pick from. */
  lists: ItemLists;
  /** Creates a name in one of the lists. */
  onCreateEntry: CreateListEntry;
  onClose: () => void;
  /** Called with the item as the API saved it. */
  onSaved: (item: Item) => void;
};

export function ItemFormDialog({ open, item, details = false, items, lists, onCreateEntry, onClose, onSaved }: ItemFormDialogProps) {
  const toast = useToast();
  const [viewing, setViewing] = useState(details && item !== undefined);
  const code = useRef<ComponentRef<typeof TextInput>>(null);
  const [form, setForm] = useState<ItemForm>(() => (item ? itemFormOf(item) : EMPTY_ITEM_FORM));
  const [photos, setPhotos] = useState<UploadPhoto[]>(() => (item ? heldPhotos(item.photos, API_URL) : []));
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [saving, setSaving] = useState(false);
  // How many names are being created; saving waits for them.
  const [creating, setCreating] = useState(0);
  const options = itemFormOptions(items, lists);
  const models = modelsOfBrand(lists, form.vehicleBrand);
  const vehicleBrand = findEntry(lists.vehicleBrands, form.vehicleBrand);
  const unlocked = details && !viewing;

  // Once Editar unlocks the fields, start on the first one.
  useEffect(() => {
    if (unlocked) {
      code.current?.focus();
    }
  }, [unlocked]);

  /** Takes a field's new value and drops its message. */
  const change = (field: keyof ItemForm, value: string) => {
    setForm((typed) => ({ ...typed, [field]: value }));
    setErrors((shown) => ({ ...shown, [field]: undefined }));
  };

  /** Takes a new vehicle brand, clearing a model the new brand doesn't have. */
  const changeBrand = (value: string) => {
    change('vehicleBrand', value);
    if (form.vehicleModel && !findOption(modelsOfBrand(lists, value), form.vehicleModel)) {
      change('vehicleModel', '');
    }
  };

  /** Starts a text with a capital letter when leaving its field. */
  const capitalize = (field: 'name' | 'location') => () => change(field, form[field].trim() ? capitalizeFirst(form[field]) : form[field]);

  /**
   * Creates a name typed in a combobox in its list, a vehicle model under the chosen brand, and fills the field with
   * the name as the list holds it; a toast says it was created, or that it couldn't be, leaving the typed name.
   */
  const create = (field: 'category' | 'partBrand' | 'vehicleBrand' | 'vehicleModel', kind: ItemListKind) => async (name: string) => {
    setCreating((count) => count + 1);
    const entry = await onCreateEntry(kind, name, kind === 'vehicleModels' ? vehicleBrand?.id : undefined);
    setCreating((count) => count - 1);
    if (!entry) {
      toast(ITEM_LIST_TOASTS[kind].failed);
      return;
    }
    change(field, entry.name);
    toast(ITEM_LIST_TOASTS[kind].created(entry.name));
  };

  /** Checks the form and sends the item, or shows what keeps it from being saved. */
  const save = async () => {
    const found = itemFormErrors(form, items, lists, item?.id);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      return;
    }
    setSaving(true);
    const response = await fetch(item ? `${API_URL}/items/${item.id}` : `${API_URL}/items`, {
      method: item ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(itemFormBody(form, options.colors)),
    }).catch(() => null);
    if (response?.status === 409) {
      setSaving(false);
      const { details: clashes } = await response.json();
      setErrors({ code: codeTakenMessage(clashes[0].itemName) });
      return;
    }
    if (!response?.ok) {
      setSaving(false);
      toast('Não foi possível salvar o item. Tente de novo.');
      return;
    }
    const saved = itemSchema.parse(await response.json());
    const withPhotos = await savePhotos(saved, photos);
    setSaving(false);
    if (!withPhotos) {
      toast(`Item “${saved.name}” salvo, mas as fotos não foram salvas. Tente de novo.`);
      onSaved(saved);
      return;
    }
    toast(item ? `Item “${saved.name}” salvo.` : `Item “${saved.name}” cadastrado.`);
    onSaved(withPhotos);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={viewing ? 'Detalhes do item' : item ? 'Editar item' : 'Novo item'}
      actions={
        viewing ? (
          <>
            <Button variant="secondary" size="sm" onPress={onClose}>
              Fechar
            </Button>
            <Button size="sm" onPress={() => setViewing(false)}>
              Editar
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onPress={onClose}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving || creating > 0} onPress={save}>
              {item ? 'Salvar alterações' : 'Salvar'}
            </Button>
          </>
        )
      }
    >
      {viewing && item ? (
        <View style={FIELDS_STYLE}>
          <ImageUpload
            label={PHOTOS_LABEL}
            photos={photos}
            onPhotosChange={setPhotos}
            limit={ITEM_PHOTO_LIMIT}
            onPick={pickPhotos}
            readOnly
          />
          {Object.entries(itemDetailTexts(item)).map(([field, text]) => (
            <FieldValue key={field} label={ITEM_FIELD_LABELS[field as keyof ItemForm]} value={text} />
          ))}
        </View>
      ) : (
        <View style={FIELDS_STYLE}>
          <ImageUpload label={PHOTOS_LABEL} photos={photos} onPhotosChange={setPhotos} limit={ITEM_PHOTO_LIMIT} onPick={pickPhotos} />
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
            onCreate={create('category', 'categories')}
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
            onCreate={create('partBrand', 'partBrands')}
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
            onCreate={create('vehicleBrand', 'vehicleBrands')}
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
            onCreate={create('vehicleModel', 'vehicleModels')}
            noun="modelo"
            toggleLabel="Mostrar modelos"
            emptyLabel="Nenhum modelo cadastrado para essa marca"
            placeholder={vehicleBrand ? 'Qualquer modelo' : 'Escolha a marca do veículo primeiro'}
            helper="Deixe vazio se serve em qualquer modelo."
            error={errors.vehicleModel}
            disabled={!vehicleBrand}
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
          <View style={CHOICE_STYLE}>
            <Label>{ITEM_FIELD_LABELS.position}</Label>
            <Segmented
              label={ITEM_FIELD_LABELS.position}
              options={POSITION_OPTIONS}
              value={form.position}
              onValueChange={(value) => change('position', value)}
            />
          </View>
          <View style={CHOICE_STYLE}>
            <Label>{ITEM_FIELD_LABELS.side}</Label>
            <Segmented
              label={ITEM_FIELD_LABELS.side}
              options={SIDE_OPTIONS}
              value={form.side}
              onValueChange={(value) => change('side', value)}
            />
          </View>
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
              const cents = parsePrice(form.price);
              if (cents !== null) {
                change('price', priceInput(cents));
              }
            }}
            placeholder="0,00"
            error={errors.price}
          />
        </View>
      )}
    </Dialog>
  );
}
