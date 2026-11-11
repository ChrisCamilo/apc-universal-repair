/**
 * @format
 */

import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { codeTakenMessage, duplicateForm, ITEM_FORM_MESSAGES, ITEM_UNCHANGED_MESSAGE, type ItemForm } from '@apc/domain/item-form';
import type { Item, ItemBrand, ItemCreate } from '@apc/domain/items';
import { withEntry, type ItemLists } from '@apc/domain/lists';
import { copiedPhotos, PHOTO_MAX_DIMENSION, PHOTO_QUALITY } from '@apc/domain/photos';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/ui-spec/screens';
import { itemListsOf } from '@apc/domain/test-lists';
import { STYLES, MODES, THEME_STORAGE_KEYS, themes } from '@apc/tokens/theme';
import type { UploadPhoto } from '../src/components/ImageUpload';
import { ItemFormDialog } from '../src/features/inventory/ItemFormDialog';
import type { CreateListEntry } from '../src/features/inventory/useItemLists';
import { themeStorage, ThemeProvider } from '../src/app/theme';
import { ToastProvider } from '../src/components/Toast';
import { testItem, type FlatItem } from '@apc/domain/test-items';

// Trees the test rendered, unmounted after it so the toast's hide timer doesn't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
const FILTER = item({
  id: '00000000-0000-4000-8000-000000000001',
  code: 'W 712/95',
  name: 'Filtro de óleo',
  vehicleBrand: 'Volkswagen',
  vehicleModel: 'Gol',
  color: 'Preto',
});
// A photo the API saved, as items carry it.
const SAVED_PHOTO = { id: '00000000-0000-4000-8000-0000000000aa', url: '/photos/aa.jpg', thumbUrl: '/photos/aa-thumb.webp' };
// A phone's screen with no notch, so the toast has its insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
const ITEMS = [
  FILTER,
  item({ id: '00000000-0000-4000-8000-000000000002', code: 'FRA-1000', name: 'Pastilha de freio', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala' }),
  item({ id: '00000000-0000-4000-8000-000000000003', code: 'J-1', name: 'Junta', vehicleBrand: 'Volkswagen', vehicleModel: 'Santana' }),
];
// The lists the form picks from: what the items use, plus the category and brands of a new spark plug.
const LISTS = itemListsOf([
  ...ITEMS,
  item({ id: '00000000-0000-4000-8000-000000000004', code: 'B7', name: 'Vela', category: 'Ignição', partBrand: 'NGK', vehicleBrand: 'Fiat' }),
]);

/**
 * Answers the next save with the item the API would send back, made of what was sent.
 * @param status The response status.
 * @param body The response body; by default the sent item with an id (see savedOf).
 */
function answerSave(status = 201, body?: unknown) {
  (fetch as jest.Mock).mockImplementationOnce(async (_url: string, init: RequestInit) => {
    const saved = body ?? savedOf(JSON.parse(String(init.body)));
    return { ok: status < 400, status, json: () => Promise.resolve(saved) };
  });
}

/**
 * Adds a vehicle as a chip: presses "Adicionar veículo", types its brand and model, and presses Adicionar.
 * @param tree Rendered tree.
 * @param brand The vehicle's brand.
 * @param model Its model; none for any model.
 */
async function addVehicle(tree: ReactTestRenderer.ReactTestRenderer, brand: string, model = '') {
  await press(tree, 'Adicionar veículo');
  await type(tree, 'Marca do veículo', brand);
  if (model) {
    await type(tree, 'Modelo do veículo', model);
  }
  await press(tree, 'Adicionar');
}

/**
 * Reads the vehicles' chips.
 * @param tree Rendered tree.
 * @returns Each chip's text, e.g. ["Volkswagen Gol"].
 */
function chips(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAll((n) => n.props.testID === 'inventory.vehicles-field.chips.chip.text' && typeof n.type === 'string').map((n) => n.props.children);
}

/**
 * Finds a field's input by its label.
 * @param tree Rendered tree.
 * @param label The field's label.
 * @returns The TextInput.
 */
function field(tree: ReactTestRenderer.ReactTestRenderer, label: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
}

/**
 * Fills in an item with the fields a test doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function item(fields: FlatItem & Required<Pick<FlatItem, 'id' | 'code' | 'name'>>): Item {
  return testItem({
    category: 'Motor',
    partBrand: 'Bosch',
    vehicleBrand: 'Volkswagen',
    vehicleModel: null,
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 3990,
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  });
}

/**
 * Leaves a field, as tapping elsewhere does.
 * @param tree Rendered tree.
 * @param label The field's label.
 */
async function leave(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  await ReactTestRenderer.act(async () => field(tree, label).props.onBlur());
}

/**
 * Renders the form inside the theme and toast providers.
 * @param editing The item to edit; a new item when left out.
 * @param props What else the owner hands the form: onSaved, details, onClose, onCreateEntry, called with each
 * name to create, which is created as asked unless it returns null, the values and photos it opens with, onDuplicate
 * and the brand the details open scrolled to.
 * @returns The rendered tree.
 */
async function mount(
  editing?: Item,
  {
    onSaved = () => {},
    details = false,
    onClose = () => {},
    onCreateEntry,
    initialForm,
    initialPhotos,
    onDuplicate,
    scrollToBrand,
    onDeleted,
  }: {
    onSaved?: (saved: Item) => void;
    details?: boolean;
    onClose?: () => void;
    onCreateEntry?: CreateListEntry;
    initialForm?: ItemForm;
    initialPhotos?: UploadPhoto[][];
    onDuplicate?: (item: Item, withPhotos: boolean) => void;
    scrollToBrand?: string;
    onDeleted?: (item: Item) => void;
  } = {},
) {
  /** Holds the lists as the inventory does, adding each name created unless onCreateEntry says it failed. */
  function Owner() {
    const [lists, setLists] = useState<ItemLists>(LISTS);
    const create: CreateListEntry = async (kind, name, vehicleBrandId) => {
      if ((await onCreateEntry?.(kind, name, vehicleBrandId)) === null) {
        return null;
      }
      const entry = { id: `new-${name}`, name, ...(vehicleBrandId && { vehicleBrandId }) };
      setLists((held) => withEntry(held, kind, entry));
      return entry;
    };
    return (
      <ItemFormDialog
        open
        item={editing}
        details={details}
        scrollToBrand={scrollToBrand}
        items={ITEMS}
        lists={lists}
        onCreateEntry={create}
        onClose={onClose}
        onSaved={onSaved}
        initialForm={initialForm}
        initialPhotos={initialPhotos}
        onDuplicate={onDuplicate}
        onDeleted={onDeleted}
      />
    );
  }

  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <ToastProvider>
            <Owner />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Presses the pressable with an accessible name or visible text.
 * @param tree Rendered tree.
 * @param name The accessibility label, or the text inside.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const node = tree.root.findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  )[0];
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Builds the item the API would send back for a body sent: its id, its brands with ids and no photos.
 * @param sent The body sent.
 * @param photos The first brand's photos, as the API saved them.
 * @returns The saved item.
 */
function savedOf(sent: ItemCreate, photos: ItemBrand['photos'] = []): Item {
  return testItem({
    ...sent,
    id: '00000000-0000-4000-8000-000000000009',
    vehicles: sent.vehicles.map((vehicle) => ({ ...vehicle, vehicleModel: vehicle.vehicleModel || null })),
    brands: sent.brands.map((brand, index) => ({
      color: 'N/A',
      quantity: 0,
      ...brand,
      id: brand.id ?? `00000000-0000-4000-8000-${String(index + 101).padStart(12, '0')}`,
      location: brand.location || null,
      photos: index === 0 ? photos : [],
    })),
  });
}

/**
 * Finds a brand's section of the form by its name.
 * @param tree Rendered tree.
 * @param name E.g. "Marca 2".
 * @returns The section.
 */
function section(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.findAll((n) => n.props.role === 'group' && n.props.accessibilityLabel === name)[0];
}

/**
 * Tells whether a text is on screen.
 * @param tree Rendered tree.
 * @param text Exact text.
 * @returns True when a Text shows it.
 */
function shows(tree: ReactTestRenderer.ReactTestRenderer, text: string): boolean {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props.children === text).length > 0;
}

/**
 * Types into a field.
 * @param tree Rendered tree.
 * @param label The field's label.
 * @param text Text to type.
 */
async function type(tree: ReactTestRenderer.ReactTestRenderer, label: string, text: string) {
  await typeIn(tree.root, label, text);
}

/**
 * Types into a field of a part of the screen, e.g. a brand's section.
 * @param scope Where the field is.
 * @param label The field's label.
 * @param text Text to type.
 */
async function typeIn(scope: ReactTestRenderer.ReactTestInstance, label: string, text: string) {
  const input = scope.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === label)[0];
  await ReactTestRenderer.act(async () => input.props.onChangeText(text));
}

/**
 * Reads the value of a field by its label.
 * @param tree Rendered tree.
 * @param label The field's label.
 * @returns The field's text.
 */
function value(tree: ReactTestRenderer.ReactTestRenderer, label: string): string {
  return field(tree, label).props.value;
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

// Saves the blank form and checks every required field says what is missing and nothing is sent; typing in a field
// drops its message.
test('Mobile: the required fields say what is missing and nothing is sent', async () => {
  const tree = await mount();
  (fetch as jest.Mock).mockClear();
  await press(tree, 'Salvar item');
  const required = [
    ITEM_FORM_MESSAGES.code,
    ITEM_FORM_MESSAGES.name,
    ITEM_FORM_MESSAGES.category,
    ITEM_FORM_MESSAGES.partBrand,
    ITEM_FORM_MESSAGES.vehicleBrand,
    ITEM_FORM_MESSAGES.price,
  ];
  for (const message of required) {
    expect(shows(tree, message)).toBe(true);
  }
  expect(fetch).not.toHaveBeenCalled();
  await type(tree, 'Nome', 'Vela');
  expect(shows(tree, ITEM_FORM_MESSAGES.name)).toBe(false);
});

// Types a code another item uses, in lowercase, and checks it turns uppercase and is refused naming that item.
test('Mobile: the code turns uppercase and a code in use names its item', async () => {
  const tree = await mount();
  await type(tree, 'Código da peça', 'fra-1000');
  expect(value(tree, 'Código da peça')).toBe('FRA-1000');
  await press(tree, 'Salvar item');
  expect(shows(tree, codeTakenMessage('Pastilha de freio'))).toBe(true);
});

// Types a code another item uses and checks the field names that item at once, before Save, and drops the message
// once the code changes to a free one; the same code with other separators is named too, as the search finds it.
// An empty code says nothing until Save, and nothing is sent. Editing an item, its own code passes while another
// item's is named.
test('Mobile: a code in use is named while it is typed', async () => {
  const tree = await mount();
  (fetch as jest.Mock).mockClear();
  await type(tree, 'Código da peça', 'fra-1000');
  expect(shows(tree, codeTakenMessage('Pastilha de freio'))).toBe(true);
  await type(tree, 'Código da peça', 'fra-10001');
  expect(shows(tree, codeTakenMessage('Pastilha de freio'))).toBe(false);
  await type(tree, 'Código da peça', 'fra1000');
  expect(shows(tree, codeTakenMessage('Pastilha de freio'))).toBe(true);
  await type(tree, 'Código da peça', '');
  expect(shows(tree, ITEM_FORM_MESSAGES.code)).toBe(false);
  expect(fetch).not.toHaveBeenCalled();

  const editing = await mount(ITEMS[1]);
  await type(editing, 'Código da peça', 'fra-1000');
  expect(shows(editing, codeTakenMessage('Pastilha de freio'))).toBe(false);
  await type(editing, 'Código da peça', 'w 712/95');
  expect(shows(editing, codeTakenMessage('Filtro de óleo'))).toBe(true);
});

// Opens a new vehicle and checks its model is locked until a vehicle brand is chosen, and clears when the brand changes
// to one without the chosen model.
test('Mobile: the vehicle model follows the vehicle brand', async () => {
  const tree = await mount();
  await press(tree, 'Adicionar veículo');
  expect(field(tree, 'Modelo do veículo').props.editable).toBe(false);
  await type(tree, 'Marca do veículo', 'Volkswagen');
  expect(field(tree, 'Modelo do veículo').props.editable).toBe(true);
  await type(tree, 'Modelo do veículo', 'Gol');
  await type(tree, 'Marca do veículo', 'Chevrolet');
  expect(value(tree, 'Modelo do veículo')).toBe('');
});

// Types a new category and presses "+ Criar", and checks the row already shows the name with a capital letter, the
// name is created in the categories, picked in the field and announced; then a new vehicle model is created under
// the chosen brand.
test('Mobile: "+ Criar" creates the name in its list and picks it', async () => {
  const create = jest.fn<ReturnType<CreateListEntry>, Parameters<CreateListEntry>>();
  const tree = await mount(undefined, { onCreateEntry: create });
  await type(tree, 'Categoria', 'motor  diesel');
  await press(tree, '+ Criar categoria “Motor diesel”');
  expect(create).toHaveBeenCalledWith('categories', 'Motor diesel', undefined);
  expect(value(tree, 'Categoria')).toBe('Motor diesel');
  expect(shows(tree, 'Categoria “Motor diesel” criada.')).toBe(true);

  await press(tree, 'Adicionar veículo');
  await type(tree, 'Marca do veículo', 'Volkswagen');
  await type(tree, 'Modelo do veículo', 'xR3');
  await press(tree, '+ Criar modelo “XR3”');
  const volkswagen = LISTS.vehicleBrands.find((brand) => brand.name === 'Volkswagen')!;
  expect(create).toHaveBeenLastCalledWith('vehicleModels', 'XR3', volkswagen.id);
  expect(shows(tree, 'Modelo “XR3” criado.')).toBe(true);
});

// Creates a part brand that can't be created, and checks a toast says so and the field keeps the typed name, which
// saving then refuses, pointing to "+ Criar".
test("Mobile: a name that couldn't be created is reported and not saved", async () => {
  const tree = await mount(undefined, { onCreateEntry: async () => null });
  await type(tree, 'Marca da peça', 'cofap');
  await press(tree, '+ Criar marca “Cofap”');
  expect(shows(tree, 'Não foi possível criar a marca de peça. Tente de novo.')).toBe(true);
  expect(value(tree, 'Marca da peça')).toBe('Cofap');
  (fetch as jest.Mock).mockClear();
  await press(tree, 'Salvar item');
  expect(shows(tree, ITEM_FORM_MESSAGES.partBrandNotListed)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

// Types a category, brands and a model the lists don't hold, without pressing "+ Criar", and checks a new vehicle's
// brand and model are refused on Adicionar, before they join the chips, and saving shows each other field's error
// pointing to it and sends nothing; the model stays locked while its brand isn't one of the list.
test('Mobile: names not in their lists are refused on save', async () => {
  const tree = await mount();
  await type(tree, 'Categoria', 'Suspensão');
  await type(tree, 'Marca da peça', 'Cofap');
  await press(tree, 'Adicionar veículo');
  await type(tree, 'Marca do veículo', 'Renault');
  expect(field(tree, 'Modelo do veículo').props.editable).toBe(false);
  await press(tree, 'Adicionar');
  expect(shows(tree, ITEM_FORM_MESSAGES.vehicleBrandNotListed)).toBe(true);
  await type(tree, 'Marca do veículo', 'Fiat');
  await type(tree, 'Modelo do veículo', 'Uno');
  await press(tree, 'Adicionar');
  expect(shows(tree, ITEM_FORM_MESSAGES.vehicleModelNotListed)).toBe(true);
  expect(chips(tree)).toEqual([]);

  (fetch as jest.Mock).mockClear();
  await press(tree, 'Salvar item');
  expect(shows(tree, ITEM_FORM_MESSAGES.categoryNotListed)).toBe(true);
  expect(shows(tree, ITEM_FORM_MESSAGES.partBrandNotListed)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

// Leaves the name, the color and the price after typing them loosely, and checks each is written back: a capital,
// an existing color in its own spelling, and the price in reais.
test('Mobile: leaving a field writes it back by the rules', async () => {
  const tree = await mount();
  await type(tree, 'Nome', 'vela de ignição');
  await leave(tree, 'Nome');
  await type(tree, 'Cor', 'preto');
  await leave(tree, 'Cor');
  await type(tree, 'Valor unitário (R$)', '1234,5');
  await leave(tree, 'Valor unitário (R$)');
  expect(value(tree, 'Nome')).toBe('Vela de ignição');
  expect(value(tree, 'Cor')).toBe('Preto');
  expect(value(tree, 'Valor unitário (R$)')).toBe('R$ 1.234,50');
});

// Opens a new vehicle with a generation that isn't years and checks Adicionar refuses it on its field; then gives it a
// generation and a version, and checks its chip names both and the item is posted with the years and the version.
test('Mobile: a vehicle takes an optional generation and version, sent as years', async () => {
  const onSaved = jest.fn();
  const tree = await mount(undefined, { onSaved });
  (fetch as jest.Mock).mockClear();
  answerSave();
  await type(tree, 'Código da peça', 'ngk-b7');
  await type(tree, 'Nome', 'vela');
  await type(tree, 'Categoria', 'ignição');
  await type(tree, 'Marca da peça', 'NGK');
  await press(tree, 'Adicionar veículo');
  await type(tree, 'Marca do veículo', 'Volkswagen');
  await type(tree, 'Modelo do veículo', 'Gol');
  await type(tree, 'Geração', '12/08');
  await press(tree, 'Adicionar');
  expect(shows(tree, ITEM_FORM_MESSAGES.generationInvalid)).toBe(true);
  expect(chips(tree)).toEqual([]);
  await type(tree, 'Geração', '08/12');
  await type(tree, 'Versão', '1.0 G5');
  await press(tree, 'Adicionar');
  expect(chips(tree)).toEqual(['Volkswagen Gol 08/12 1.0 G5']);
  await type(tree, 'Valor unitário (R$)', '34,9');
  await press(tree, 'Salvar item');
  const [, init] = (fetch as jest.Mock).mock.calls[0];
  expect(JSON.parse(init.body).vehicles).toEqual([{ vehicleBrand: 'Volkswagen', vehicleModel: 'Gol', firstYear: 2008, lastYear: 2012, version: '1.0 G5' }]);
  expect(onSaved).toHaveBeenCalledTimes(1);
});

// Fills in a new item and saves it, and checks it is posted with the writing rule applied, a toast says it was added
// and the saved item is handed over.
test('Mobile: a new item is posted, announced and handed over', async () => {
  const onSaved = jest.fn();
  const tree = await mount(undefined, { onSaved });
  (fetch as jest.Mock).mockClear();
  answerSave();
  await type(tree, 'Código da peça', 'ngk-b7');
  await type(tree, 'Nome', 'vela');
  await type(tree, 'Categoria', 'ignição');
  await type(tree, 'Marca da peça', 'NGK');
  await addVehicle(tree, 'chevrolet');
  await type(tree, 'Valor unitário (R$)', '34,9');
  await press(tree, 'Salvar item');
  const [url, init] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(/\/items$/);
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toMatchObject({
    name: 'Vela',
    category: 'Ignição',
    vehicles: [{ vehicleBrand: 'Chevrolet', vehicleModel: '' }],
    brands: [expect.objectContaining({ partBrand: 'NGK', code: 'NGK-B7', unitPriceCents: 3490 })],
  });
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(shows(tree, 'Item “Vela” cadastrado.')).toBe(true);
});

// Opens the form on an item and checks it is titled with the item's name and its fields are filled in, its vehicle a
// chip; then changes the quantity and saves, and checks the item is patched by its id and the toast says it was saved.
test('Mobile: an item opens filled in and is patched on save', async () => {
  const tree = await mount(FILTER);
  expect(shows(tree, 'Filtro de óleo')).toBe(true);
  expect(shows(tree, 'Editar item')).toBe(false);
  expect(value(tree, 'Código da peça')).toBe('W 712/95');
  expect(chips(tree)).toEqual(['Volkswagen Gol']);
  expect(value(tree, 'Valor unitário (R$)')).toBe('R$ 39,90');
  (fetch as jest.Mock).mockClear();
  answerSave(200, { ...FILTER, quantity: 7 });
  await type(tree, 'Quantidade', '7');
  await type(tree, 'Quantidade', '7a');
  expect(value(tree, 'Quantidade')).toBe('7');
  await press(tree, 'Salvar alterações');
  const [url, init] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(new RegExp(`/items/${FILTER.id}$`));
  expect(init.method).toBe('PATCH');
  expect(shows(tree, 'Item “Filtro de óleo” salvo.')).toBe(true);
});

// Types digits into the empty price one by one and checks they fill from the cents, a pasted "7.50" reads as R$ 7,50,
// and a paste past a million is refused with its message; then saves and checks 750 cents are sent.
test('Mobile: the price always shows in reais, a dot and a comma alike', async () => {
  const tree = await mount(FILTER);
  (fetch as jest.Mock).mockClear();
  answerSave(200, FILTER);
  await type(tree, 'Valor unitário (R$)', '');
  for (const typed of ['7', 'R$ 0,075', 'R$ 0,750']) {
    await type(tree, 'Valor unitário (R$)', typed);
  }
  expect(value(tree, 'Valor unitário (R$)')).toBe('R$ 7,50');
  await type(tree, 'Valor unitário (R$)', '');
  await type(tree, 'Valor unitário (R$)', '7.50');
  expect(value(tree, 'Valor unitário (R$)')).toBe('R$ 7,50');
  await type(tree, 'Valor unitário (R$)', '2.000.000');
  expect(value(tree, 'Valor unitário (R$)')).toBe('R$ 7,50');
  expect(shows(tree, ITEM_FORM_MESSAGES.priceTooHigh)).toBe(true);
  await press(tree, 'Salvar alterações');
  const [, init] = (fetch as jest.Mock).mock.calls[0];
  expect(JSON.parse(init.body).brands[0].unitPriceCents).toBe(750);
});

// Pastes a fraction into the quantity and checks it is refused with its message, the field keeping its value, and a
// whole number with a thousands dot is taken without it; then a minimum past a million is refused on save and nothing
// is sent.
test('Mobile: the quantities take whole numbers only, up to a million', async () => {
  const tree = await mount(FILTER);
  (fetch as jest.Mock).mockClear();
  await type(tree, 'Quantidade', '1,5');
  expect(value(tree, 'Quantidade')).toBe('1');
  expect(shows(tree, ITEM_FORM_MESSAGES.quantityInvalid)).toBe(true);
  await type(tree, 'Quantidade', '1.000');
  expect(value(tree, 'Quantidade')).toBe('1000');
  expect(shows(tree, ITEM_FORM_MESSAGES.quantityInvalid)).toBe(false);
  await type(tree, 'Quantidade mínima', '2000000');
  await press(tree, 'Salvar alterações');
  expect(shows(tree, ITEM_FORM_MESSAGES.quantityTooHigh)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

// Opens an item's details and checks they follow the Detalhes mockup: the ← in place of the × and Fechar, the title
// naming the window for screen readers only and the red round Excluir only when offered; "Sem fotos", the category
// over the name, the stock and the minimum, the details in words and a card for the brand with its price in reais.
// Nothing can be typed in, Duplicar and Editar share the bottom, and the ← closes the details.
test('Mobile: the details follow the Detalhes mockup and change nothing', async () => {
  const onClose = jest.fn();
  const tree = await mount({ ...FILTER, quantity: 7, minQuantity: 2 }, { details: true, onClose, onDuplicate: () => {} });
  expect(shows(tree, 'Detalhes do item')).toBe(false);
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Detalhes do item' && n.props.accessibilityViewIsModal)).not.toHaveLength(0);
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Fechar')).toHaveLength(0);
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Excluir item')).toHaveLength(0);
  const texts = tree.root.findAll((n) => typeof n.type === 'string' && n.props.children !== undefined).flatMap((n) => [n.props.children].flat());
  expect(texts).toEqual(
    expect.arrayContaining(['Sem fotos', 'Motor', 'Filtro de óleo', 'Em estoque', 7, 'Mínimo', 2, 'Volkswagen Gol', 'Não se aplica', 'Nenhum', 'Marcas · 1']),
  );
  const card = section(tree, 'Bosch');
  const shown = card.findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string').map((n) => n.props.children.replace(/\s/g, ' '));
  expect(shown).toEqual(expect.arrayContaining(['Bosch', 'W 712/95', 'R$ 39,90', 'Sem local · Preto']));
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  const halves = tree.root.findAll((n) => n.props.testID === 'inventory.item-form-dialog.action' && typeof n.type === 'string');
  expect(halves.map((n) => StyleSheet.flatten(n.props.style).flex)).toEqual([1, 1]);
  (fetch as jest.Mock).mockClear();
  await press(tree, 'Voltar ao estoque');
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
});

// Opens the details with Excluir offered and checks the red round Excluir at the top right asks to confirm over the
// details, deletes the item and hands it over.
test('Mobile: Excluir in the details asks to confirm and deletes the item', async () => {
  const onDeleted = jest.fn();
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'eighties', [THEME_STORAGE_KEYS.mode]: 'night' });
  const tree = await mount(FILTER, { details: true, onDeleted });
  const remove = tree.root.find((n) => n.props.accessibilityLabel === 'Excluir item' && typeof n.type === 'string');
  expect(StyleSheet.flatten(remove.props.style)).toMatchObject({ width: 44, height: 44, backgroundColor: themes.eighties.night.colors.danger });
  await press(tree, 'Excluir item');
  expect(shows(tree, 'Excluir item?')).toBe(true);
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 204 });
  await press(tree, 'Excluir');
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`/items/${FILTER.id}$`)), { method: 'DELETE' });
  expect(onDeleted).toHaveBeenCalledWith(FILTER);
  expect(shows(tree, 'Excluir item?')).toBe(false);
});

// Opens the details, presses Editar and checks the fields unlock filled in, under the × and the item's name, with only
// Salvar alterações at the bottom, then changes the quantity and checks it is patched like an edit.
test('Mobile: Editar unlocks the details and saves like an edit', async () => {
  const onSaved = jest.fn();
  const tree = await mount(FILTER, { onSaved, details: true });
  await press(tree, 'Editar');
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Fechar' && typeof n.props.onPress === 'function')).not.toHaveLength(0);
  expect(value(tree, 'Código da peça')).toBe('W 712/95');
  expect(shows(tree, 'Cancelar')).toBe(false);
  (fetch as jest.Mock).mockClear();
  answerSave(200, { ...FILTER, quantity: 7 });
  await type(tree, 'Quantidade', '7');
  await press(tree, 'Salvar alterações');
  const [url, init] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(new RegExp(`/items/${FILTER.id}$`));
  expect(init.method).toBe('PATCH');
  expect(onSaved).toHaveBeenCalledTimes(1);
});

// Opens the details of an item with Duplicar, and checks it asks what to copy, each choice closes the question and
// hands the item over with whether its photos go too, and Cancelar hands nothing over, leaving the details open.
test('Mobile: Duplicar asks whether the copy takes the photos', async () => {
  const onDuplicate = jest.fn();
  const tree = await mount(FILTER, { details: true, onDuplicate });
  for (const [choice, withPhotos] of [
    ['Copiar dados e fotos', true],
    ['Copiar só os dados', false],
  ] as const) {
    await press(tree, 'Duplicar');
    expect(shows(tree, 'Duplicar item?')).toBe(true);
    await press(tree, choice);
    expect(onDuplicate).toHaveBeenLastCalledWith(FILTER, withPhotos);
    expect(shows(tree, 'Duplicar item?')).toBe(false);
  }
  await press(tree, 'Duplicar');
  await press(tree, 'Cancelar');
  expect(shows(tree, 'Duplicar item?')).toBe(false);
  expect(onDuplicate).toHaveBeenCalledTimes(2);
  expect(shows(tree, 'Em estoque')).toBe(true);
});

// Opens a new item's form as a copy of an item with a photo, and checks it opens filled in without the code and with
// the quantity at 0, showing the photo, and that saving it with a new code posts the item, then sends the photo as a
// copy of the item's.
test("Mobile: a duplicated item opens without codes or stock and saves copies of the item's photos", async () => {
  const withPhoto = { ...FILTER, brands: [{ ...FILTER.brands[0], photos: [SAVED_PHOTO] }] };
  const onSaved = jest.fn();
  const tree = await mount(undefined, {
    onSaved,
    initialForm: duplicateForm(withPhoto),
    initialPhotos: [copiedPhotos(withPhoto.brands[0].photos, 'http://api')],
  });
  expect(shows(tree, 'Novo item')).toBe(true);
  expect([value(tree, 'Nome'), value(tree, 'Código da peça'), value(tree, 'Quantidade')]).toEqual(['Filtro de óleo', '', '0']);
  expect(tree.root.findAllByType(Image).map((image) => image.props.source.uri)).toEqual(['http://api/photos/aa.jpg']);
  (fetch as jest.Mock).mockClear();
  let posted: ItemCreate | undefined;
  (fetch as jest.Mock)
    .mockImplementationOnce(async (_url: string, init: RequestInit) => {
      posted = JSON.parse(String(init.body));
      return { ok: true, status: 201, json: () => Promise.resolve(savedOf(posted!)) };
    })
    .mockImplementationOnce(async () => ({ ok: true, status: 200, json: () => Promise.resolve(savedOf(posted!, [SAVED_PHOTO])) }));
  await type(tree, 'Código da peça', 'w 712/96');
  await press(tree, 'Salvar item');
  expect(posted!.brands.map((brand) => [brand.code, brand.quantity])).toEqual([['W 712/96', 0]]);
  const [, [, photosInit]] = (fetch as jest.Mock).mock.calls;
  expect(photosInit.body.getParts().map((part: { fieldName: string; string: string }) => [part.fieldName, part.string])).toEqual([
    ['copy', SAVED_PHOTO.id],
  ]);
  expect(onSaved).toHaveBeenCalledTimes(1);
});

// Takes a photo with the camera and picks one from the gallery for a new item and saves it, and checks the camera and
// the gallery are asked for photos reduced to the stored size and quality, the camera's kept out of the phone's
// gallery; the item is posted first, then its brand's photos are sent to the brand in order as files from the phone,
// and the item handed over carries the photos the API saved.
test('Mobile: a new item is saved with its photos', async () => {
  const onSaved = jest.fn();
  const tree = await mount(undefined, { onSaved });
  const asset = (name: string) => ({ uri: `file:///fotos/${name}.jpg`, fileName: `${name}.jpg`, type: 'image/jpeg', fileSize: 1024 });
  const reduced = { maxWidth: PHOTO_MAX_DIMENSION, maxHeight: PHOTO_MAX_DIMENSION, quality: PHOTO_QUALITY / 100 };
  (launchCamera as jest.Mock).mockResolvedValueOnce({ assets: [asset('frente')] });
  (launchImageLibrary as jest.Mock).mockResolvedValueOnce({ assets: [asset('lado')] });
  await press(tree, 'Tirar foto');
  expect(launchCamera).toHaveBeenLastCalledWith(expect.objectContaining({ ...reduced, saveToPhotos: false }));
  await press(tree, 'Galeria');
  expect(launchImageLibrary).toHaveBeenLastCalledWith(expect.objectContaining(reduced));
  expect(tree.root.findAllByType(Image).map((image) => image.props.source.uri)).toEqual(['file:///fotos/frente.jpg', 'file:///fotos/lado.jpg']);
  (fetch as jest.Mock).mockClear();
  let posted: ItemCreate | undefined;
  (fetch as jest.Mock)
    .mockImplementationOnce(async (_url: string, init: RequestInit) => {
      posted = JSON.parse(String(init.body));
      return { ok: true, status: 201, json: () => Promise.resolve(savedOf(posted!)) };
    })
    .mockImplementationOnce(async () => ({ ok: true, status: 200, json: () => Promise.resolve(savedOf(posted!, [SAVED_PHOTO])) }));
  await type(tree, 'Código da peça', 'ngk-b7');
  await type(tree, 'Nome', 'vela');
  await type(tree, 'Categoria', 'Ignição');
  await type(tree, 'Marca da peça', 'NGK');
  await addVehicle(tree, 'Fiat');
  await type(tree, 'Valor unitário (R$)', '10');
  await press(tree, 'Salvar item');
  const [[postUrl], [photosUrl, photosInit]] = (fetch as jest.Mock).mock.calls;
  expect(postUrl).toMatch(/\/items$/);
  expect(photosUrl).toMatch(/\/items\/00000000-0000-4000-8000-000000000009\/brands\/00000000-0000-4000-8000-000000000101\/photos$/);
  expect(photosInit.method).toBe('PUT');
  expect(photosInit.body.getParts().map((part: { fieldName: string; name: string }) => [part.fieldName, part.name])).toEqual([
    ['photo', 'frente.jpg'],
    ['photo', 'lado.jpg'],
  ]);
  expect(onSaved.mock.calls[0][0].brands[0].photos).toEqual([SAVED_PHOTO]);
});

// Saves an item to edit without changing anything, and checks nothing is sent, an info toast says there is nothing to
// save and nothing is handed over.
test('Mobile: an unchanged edit is not sent, and an info toast says so', async () => {
  const onSaved = jest.fn();
  const tree = await mount(FILTER, { onSaved });
  (fetch as jest.Mock).mockClear();
  await press(tree, 'Salvar alterações');
  expect(fetch).not.toHaveBeenCalled();
  expect(shows(tree, ITEM_UNCHANGED_MESSAGE)).toBe(true);
  expect(onSaved).not.toHaveBeenCalled();
});

// Edits an item, removes its photo while the API can't save photos, and checks the toast says the item was saved
// without its photos and the item is still handed over.
test('Mobile: photos that fail to save are reported', async () => {
  const withPhoto = { ...FILTER, brands: [{ ...FILTER.brands[0], photos: [SAVED_PHOTO] }] };
  const onSaved = jest.fn();
  const tree = await mount(withPhoto, { onSaved });
  await press(tree, 'Remover foto 1');
  (fetch as jest.Mock).mockClear();
  (fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(withPhoto) })
    .mockResolvedValueOnce({ ok: false, status: 500 });
  await press(tree, 'Salvar alterações');
  expect((fetch as jest.Mock).mock.calls[1][1].method).toBe('PUT');
  expect(shows(tree, 'Item “Filtro de óleo” salvo, mas as fotos não foram salvas. Tente de novo.')).toBe(true);
  expect(onSaved).toHaveBeenCalledWith(withPhoto);
});

// Opens the details of an item with a photo and checks it shows read-only, from the API, with no way to remove it or
// pick more.
test('Mobile: the details show the photos read-only', async () => {
  const tree = await mount({ ...FILTER, brands: [{ ...FILTER.brands[0], photos: [SAVED_PHOTO] }] }, { details: true });
  expect(tree.root.findAllByType(Image).map((image) => image.props.source.uri)).toEqual([expect.stringMatching(/\/photos\/aa\.jpg$/)]);
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Remover foto 1')).toHaveLength(0);
  expect(tree.root.findAll((n) => n.props.testID === 'common.image-upload.drop')).toHaveLength(0);
});

// Adds a second brand to an item, fills it in its own section, and checks it is sent after the first with its own
// code, price and part brand, and that Remover takes a brand out, the form back to one brand without Remover.
test('Mobile: a second brand is added, sent with the item, and removed', async () => {
  const tree = await mount(FILTER);
  expect(tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Remover marca'))).toHaveLength(0);
  await press(tree, 'Adicionar marca');
  const second = section(tree, 'Marca 2');
  await typeIn(second, 'Marca da peça', 'NGK');
  await typeIn(second, 'Código da peça', 'w 712-b');
  await typeIn(second, 'Quantidade', '4');
  await typeIn(second, 'Valor unitário (R$)', '29,90');
  (fetch as jest.Mock).mockClear();
  answerSave(200);
  await press(tree, 'Salvar alterações');
  const [, init] = (fetch as jest.Mock).mock.calls[0];
  expect(JSON.parse(init.body).brands).toEqual([
    expect.objectContaining({ id: FILTER.brands[0].id, code: 'W 712/95' }),
    expect.objectContaining({ partBrand: 'NGK', code: 'W 712-B', quantity: 4, unitPriceCents: 2990 }),
  ]);

  const again = await mount(FILTER);
  await press(again, 'Adicionar marca');
  await press(again, 'Remover marca 1');
  expect(section(again, 'Marca 2')).toBeUndefined();
  expect(value(again, 'Código da peça')).toBe('');
  expect(again.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Remover marca'))).toHaveLength(0);
});

// Gives a second brand the first one's part brand and code, and checks each is refused under its field, on the second
// brand, and nothing is sent.
test('Mobile: a part brand and a code appear once in an item', async () => {
  const tree = await mount(FILTER);
  await press(tree, 'Adicionar marca');
  const second = section(tree, 'Marca 2');
  await typeIn(second, 'Marca da peça', 'bosch');
  await typeIn(second, 'Código da peça', 'W712-95');
  await typeIn(second, 'Valor unitário (R$)', '1000');
  (fetch as jest.Mock).mockClear();
  await press(tree, 'Salvar alterações');
  const inSecond = (message: string) => second.findAll((n) => typeof n.type === 'string' && n.props.children === message).length > 0;
  expect(inSecond(ITEM_FORM_MESSAGES.partBrandRepeated)).toBe(true);
  expect(inSecond(ITEM_FORM_MESSAGES.codeRepeated)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

// Opens the details of an item of two brands and checks "Marcas · 2" and a card for each brand, with its code, price
// and quantity.
test('Mobile: the details show each brand of an item', async () => {
  const both = {
    ...FILTER,
    quantity: 5,
    brands: [
      FILTER.brands[0],
      { ...FILTER.brands[0], id: '00000000-0000-4000-8000-0000000000b2', partBrand: 'Cobreq', code: 'N-1210', quantity: 4, unitPriceCents: 7990 },
    ],
  };
  const tree = await mount(both, { details: true });
  expect(shows(tree, 'Marcas · 2')).toBe(true);
  const second = section(tree, 'Cobreq');
  const shown = second.findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string').map((n) => n.props.children.replace(/\s/g, ' '));
  expect(shown).toEqual(expect.arrayContaining(['Cobreq', 'N-1210', 'R$ 79,90']));
  const quantity = second.find((n) => n.props.testID === 'inventory.item-details.brands.brand.quantity' && typeof n.type === 'string');
  expect([quantity.props.children].flat()[0]).toBe(4);
});

// Opens the details of an item of two brands on its second, as a brand's row in the desktop list does, lays the cards
// out and checks the details scroll once to that brand's card: the details', the cards' and the card's own tops added
// up.
test('Mobile: the details open scrolled to the brand they were opened on', async () => {
  const second = { ...FILTER.brands[0], id: '00000000-0000-4000-8000-0000000000b2', partBrand: 'Cobreq', code: 'N-1210' };
  const tree = await mount({ ...FILTER, brands: [FILTER.brands[0], second] }, { details: true, scrollToBrand: second.id });
  const scrollTo = tree.root.findByType(ScrollView).instance.scrollTo as jest.Mock;
  const layOut = (node: ReactTestRenderer.ReactTestInstance, y: number) =>
    ReactTestRenderer.act(() => node.props.onLayout({ nativeEvent: { layout: { x: 0, y, width: 300, height: 100 } } }));
  await layOut(section(tree, 'Cobreq'), 400);
  await layOut(tree.root.findByProps({ testID: 'inventory.item-details.brands.list' }), 600);
  expect(scrollTo).not.toHaveBeenCalled();
  await layOut(tree.root.findByProps({ testID: 'inventory.item-details' }), 50);
  expect(scrollTo).toHaveBeenCalledWith({ y: 1050, animated: false });
  await layOut(section(tree, 'Cobreq'), 420);
  expect(scrollTo).toHaveBeenCalledTimes(1);
  expect(section(tree, 'Bosch').props.onLayout).toBeUndefined();
});

// Types an item's original codes as chips, one with the return key and two pasted at once, and checks they are sent
// with the item in uppercase, in order.
test('Mobile: original codes are typed as chips and sent with the item', async () => {
  const tree = await mount(FILTER);
  await type(tree, 'Códigos originais', '030 115 561 an');
  await ReactTestRenderer.act(async () => field(tree, 'Códigos originais').props.onSubmitEditing());
  await type(tree, 'Códigos originais', '030-115-561-ap; 06a 115 561');
  (fetch as jest.Mock).mockClear();
  answerSave(200);
  await press(tree, 'Salvar alterações');
  const [, init] = (fetch as jest.Mock).mock.calls[0];
  expect(JSON.parse(init.body).originalCodes).toEqual(['030 115 561 AN', '030-115-561-AP', '06A 115 561']);
});

// Types an original code another item uses and one a brand of the item has, and checks each says so under the field
// at once, and the item isn't sent.
test('Mobile: an original code another item or a brand of the item has is refused, saying so', async () => {
  const tree = await mount(FILTER);
  await type(tree, 'Códigos originais', 'fra 1000,w712/95,');
  expect(shows(tree, `FRA 1000: ${codeTakenMessage('Pastilha de freio')}`)).toBe(true);
  expect(shows(tree, `W712/95: ${ITEM_FORM_MESSAGES.originalCodeInBrand}`)).toBe(true);
  (fetch as jest.Mock).mockClear();
  await press(tree, 'Salvar alterações');
  expect(fetch).not.toHaveBeenCalled();
});

// Opens the details of an item with original codes and checks they show apart, under Códigos originais.
test("Mobile: the details list an item's original codes", async () => {
  const tree = await mount({ ...FILTER, originalCodes: ['030 115 561 AN', '030 115 561 AP'] }, { details: true });
  expect(shows(tree, '030 115 561 AN, 030 115 561 AP')).toBe(true);
});

// Adds a second vehicle to an item as a chip, then one that repeats the first written otherwise, and checks the
// repeated one is refused in the new vehicle before it joins, and Cancelar leaves the chips as they were; saves and
// checks the item is sent with its two vehicles in order; then removes both chips and checks saving says a vehicle is
// missing and sends nothing.
test('Mobile: vehicles are added as chips, refused when repeated, and removed', async () => {
  const tree = await mount(FILTER);
  expect(chips(tree)).toEqual(['Volkswagen Gol']);
  await addVehicle(tree, 'Volkswagen', 'Santana');
  expect(chips(tree)).toEqual(['Volkswagen Gol', 'Volkswagen Santana']);
  await addVehicle(tree, 'VOLKSWAGEN', ' gol ');
  const draft = section(tree, 'Novo veículo');
  expect(draft.findAll((n) => typeof n.type === 'string' && n.props.children === ITEM_FORM_MESSAGES.vehicleRepeated).length).toBeGreaterThan(0);
  await press(tree, 'Cancelar');
  expect(section(tree, 'Novo veículo')).toBeUndefined();
  expect(chips(tree)).toEqual(['Volkswagen Gol', 'Volkswagen Santana']);

  (fetch as jest.Mock).mockClear();
  answerSave(200);
  await press(tree, 'Salvar alterações');
  const [, init] = (fetch as jest.Mock).mock.calls[0];
  expect(JSON.parse(init.body).vehicles).toEqual([
    { vehicleBrand: 'Volkswagen', vehicleModel: 'Gol' },
    { vehicleBrand: 'Volkswagen', vehicleModel: 'Santana' },
  ]);

  const again = await mount(FILTER);
  await press(again, 'Remover Volkswagen Gol');
  expect(chips(again)).toEqual([]);
  (fetch as jest.Mock).mockClear();
  await press(again, 'Salvar alterações');
  expect(shows(again, ITEM_FORM_MESSAGES.vehicleBrand)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

// Opens a new item's form in every style and mode and checks it follows the Novo item mockup: the × and "Novo item" on
// top; Posição and Lado in full words with N/A, sharing the width; the minimum as a 48px − and + around the number,
// which they step; the brand a raised card with Tirar foto and Galeria, its quantity and price side by side and its
// color and location too; "Adicionar veículo" and "Adicionar marca" dashed across the width; and only "Salvar item"
// across the bottom.
test('Mobile: a new item\'s form follows the Novo item mockup', async () => {
  for (const style of STYLES) {
    for (const mode of MODES) {
      await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
      const { colors } = themes[style][mode];
      const tree = await mount();
      expect(shows(tree, 'Novo item')).toBe(true);
      expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Fechar' && typeof n.props.onPress === 'function')).not.toHaveLength(0);
      const radios = (group: string) =>
        tree.root
          .find((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === group && typeof n.type === 'string')
          .findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.type === 'string');
      expect(radios('Posição').map((n) => n.props.accessibilityLabel)).toEqual(['N/A', 'Dianteira', 'Traseira', 'Ambas']);
      expect(radios('Lado').map((n) => n.props.accessibilityLabel)).toEqual(['N/A', 'Esquerdo', 'Direito', 'Ambos']);
      expect(radios('Lado').map((n) => StyleSheet.flatten(n.props.style).flex)).toEqual([1, 1, 1, 1]);

      const steps = tree.root.findAll((n) => n.props.testID === 'common.stepper.row.button' && typeof n.type === 'string');
      expect(steps.map((n) => [n.props.accessibilityLabel, StyleSheet.flatten(n.props.style).width])).toEqual([
        ['Diminuir', 48],
        ['Aumentar', 48],
      ]);
      await press(tree, 'Aumentar');
      await press(tree, 'Aumentar');
      await press(tree, 'Diminuir');
      expect(value(tree, 'Quantidade mínima')).toBe('1');

      const card = section(tree, 'Marca 1');
      expect(StyleSheet.flatten(card.props.style).backgroundColor).toBe(colors.panelRaised);
      expect(card.findAll((n) => n.props.testID === 'common.image-upload.pickers.picker' && typeof n.type === 'string')).toHaveLength(2);
      const pairs = card.findAll((n) => n.props.testID === 'inventory.item-form-dialog.fields.brands.brand.pair' && typeof n.type === 'string');
      expect(pairs.map((pair) => pair.findAll((n) => n.type === TextInput).map((input) => input.props.accessibilityLabel))).toEqual([
        ['Quantidade', 'Valor unitário (R$)'],
        ['Cor', 'Local'],
      ]);
      expect(StyleSheet.flatten(pairs[0].props.style).flexDirection).toBe('row');

      const dashed = tree.root.findAll((n) => n.props.testID === 'common.button' && typeof n.type === 'string' && StyleSheet.flatten(n.props.style).borderStyle === 'dashed');
      expect(dashed).toHaveLength(2);
      expect(shows(tree, 'Cancelar')).toBe(false);
      const save = tree.root.find((n) => n.props.testID === 'inventory.item-form-dialog.action' && typeof n.type === 'string');
      expect(StyleSheet.flatten(save.props.style).flex).toBe(1);
      expect(save.findAll((n) => n.type === Text && n.props.children === 'Salvar item')).not.toHaveLength(0);
    }
  }
});
