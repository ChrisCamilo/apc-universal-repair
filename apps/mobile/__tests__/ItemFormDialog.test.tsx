/**
 * @format
 */

import React, { useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { codeTakenMessage, ITEM_FORM_MESSAGES } from '@apc/shared/item-form';
import type { Item } from '@apc/shared/items';
import { withEntry, type ItemLists } from '@apc/shared/lists';
import { itemListsOf } from '@apc/shared/test-lists';
import { ItemFormDialog } from '../src/inventory/ItemFormDialog';
import type { CreateListEntry } from '../src/inventory/useItemLists';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider } from '../src/Toast';

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
const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
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
 * @param body The response body; by default the sent item with an id.
 */
function answerSave(status = 201, body?: unknown) {
  (fetch as jest.Mock).mockImplementationOnce(async (_url: string, init: RequestInit) => {
    const sent = JSON.parse(String(init.body));
    const saved = body ?? { ...FILTER, ...sent, id: '00000000-0000-4000-8000-000000000009', vehicleModel: sent.vehicleModel || null, location: sent.location || null };
    return { ok: status < 400, status, json: () => Promise.resolve(saved) };
  });
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
function item(fields: Partial<Item> & Pick<Item, 'id' | 'code' | 'name'>): Item {
  return {
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
  };
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
 * @param props What else the owner hands the form: onSaved, details, onClose and onCreateEntry, called with each
 * name to create, which is created as asked unless it returns null.
 * @returns The rendered tree.
 */
async function mount(
  editing?: Item,
  {
    onSaved = () => {},
    details = false,
    onClose = () => {},
    onCreateEntry,
  }: { onSaved?: (saved: Item) => void; details?: boolean; onClose?: () => void; onCreateEntry?: CreateListEntry } = {},
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
        items={ITEMS}
        lists={lists}
        onCreateEntry={create}
        onClose={onClose}
        onSaved={onSaved}
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
  await ReactTestRenderer.act(async () => field(tree, label).props.onChangeText(text));
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
  await press(tree, 'Salvar');
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
  await press(tree, 'Salvar');
  expect(shows(tree, codeTakenMessage('Pastilha de freio'))).toBe(true);
});

// Checks the vehicle model is locked until a vehicle brand is chosen, and clears when the brand changes to one
// without the chosen model.
test('Mobile: the vehicle model follows the vehicle brand', async () => {
  const tree = await mount();
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
  await press(tree, 'Salvar');
  expect(shows(tree, ITEM_FORM_MESSAGES.partBrandNotListed)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

// Types a category, brands and a model the lists don't hold, without pressing "+ Criar", and checks saving shows each
// field's error pointing to it and sends nothing; the model stays locked while its brand isn't one of the list.
test('Mobile: names not in their lists are refused on save', async () => {
  const tree = await mount();
  await type(tree, 'Categoria', 'Suspensão');
  await type(tree, 'Marca da peça', 'Cofap');
  await type(tree, 'Marca do veículo', 'Renault');
  expect(field(tree, 'Modelo do veículo').props.editable).toBe(false);
  (fetch as jest.Mock).mockClear();
  await press(tree, 'Salvar');
  expect(shows(tree, ITEM_FORM_MESSAGES.categoryNotListed)).toBe(true);
  expect(shows(tree, ITEM_FORM_MESSAGES.partBrandNotListed)).toBe(true);
  expect(shows(tree, ITEM_FORM_MESSAGES.vehicleBrandNotListed)).toBe(true);

  await type(tree, 'Marca do veículo', 'Fiat');
  await type(tree, 'Modelo do veículo', 'Uno');
  await press(tree, 'Salvar');
  expect(shows(tree, ITEM_FORM_MESSAGES.vehicleModelNotListed)).toBe(true);
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
  expect(value(tree, 'Valor unitário (R$)')).toBe('1.234,50');
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
  await type(tree, 'Marca do veículo', 'chevrolet');
  await type(tree, 'Valor unitário (R$)', '34,9');
  await press(tree, 'Salvar');
  const [url, init] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(/\/items$/);
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toMatchObject({ code: 'NGK-B7', name: 'Vela', category: 'Ignição', vehicleBrand: 'Chevrolet', unitPriceCents: 3490 });
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(shows(tree, 'Item “Vela” cadastrado.')).toBe(true);
});

// Opens the form on an item and checks its fields are filled in, then changes the quantity and saves, and checks the
// item is patched by its id and the toast says it was saved.
test('Mobile: an item opens filled in and is patched on save', async () => {
  const tree = await mount(FILTER);
  expect(shows(tree, 'Editar item')).toBe(true);
  expect(value(tree, 'Código da peça')).toBe('W 712/95');
  expect(value(tree, 'Modelo do veículo')).toBe('Gol');
  expect(value(tree, 'Valor unitário (R$)')).toBe('39,90');
  (fetch as jest.Mock).mockClear();
  answerSave(200, { ...FILTER, quantity: 7 });
  await type(tree, 'Quantidade', '7a');
  expect(value(tree, 'Quantidade')).toBe('7');
  await press(tree, 'Salvar alterações');
  const [url, init] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(new RegExp(`/items/${FILTER.id}$`));
  expect(init.method).toBe('PATCH');
  expect(shows(tree, 'Item “Filtro de óleo” salvo.')).toBe(true);
});

// Opens an item's details and checks every field shows as text with its label, what doesn't apply said in words and
// the price in reais, nothing can be typed in, and Fechar closes it.
test('Mobile: the details show the item as text and change nothing', async () => {
  const onClose = jest.fn();
  const tree = await mount(FILTER, { details: true, onClose });
  expect(shows(tree, 'Detalhes do item')).toBe(true);
  const values = tree.root.findAll((n) => n.type === View && typeof n.props.accessibilityLabel === 'string' && n.props.accessible);
  const labels = values.map((n) => n.props.accessibilityLabel.replace(/\s/g, ' '));
  expect(labels).toEqual(
    expect.arrayContaining([
      'Código da peça: W 712/95',
      'Modelo do veículo: Gol',
      'Posição: Não se aplica',
      'Cor: Preto',
      'Local: Não informado',
      'Valor unitário (R$): R$ 39,90',
    ]),
  );
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  (fetch as jest.Mock).mockClear();
  await press(tree, 'Fechar');
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
});

// Opens the details, presses Editar and checks the fields unlock filled in, with Cancelar and Salvar alterações, then
// changes the quantity and checks it is patched like an edit.
test('Mobile: Editar unlocks the details and saves like an edit', async () => {
  const onSaved = jest.fn();
  const tree = await mount(FILTER, { onSaved, details: true });
  await press(tree, 'Editar');
  expect(shows(tree, 'Editar item')).toBe(true);
  expect(value(tree, 'Código da peça')).toBe('W 712/95');
  expect(shows(tree, 'Cancelar')).toBe(true);
  (fetch as jest.Mock).mockClear();
  answerSave(200, { ...FILTER, quantity: 7 });
  await type(tree, 'Quantidade', '7');
  await press(tree, 'Salvar alterações');
  const [url, init] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(new RegExp(`/items/${FILTER.id}$`));
  expect(init.method).toBe('PATCH');
  expect(onSaved).toHaveBeenCalledTimes(1);
});

// Picks two photos for a new item and saves it, and checks the item is posted first, then its photos are sent to it
// in order as files from the phone, and the item handed over carries the photos the API saved.
test('Mobile: a new item is saved with its photos', async () => {
  const onSaved = jest.fn();
  const tree = await mount(undefined, { onSaved });
  (launchImageLibrary as jest.Mock).mockResolvedValueOnce({
    assets: ['frente', 'lado'].map((name) => ({ uri: `file:///fotos/${name}.jpg`, fileName: `${name}.jpg`, type: 'image/jpeg', fileSize: 1024 })),
  });
  const drop = tree.root.find((n) => n.props.testID === 'upload-drop' && typeof n.props.onPress === 'function');
  await ReactTestRenderer.act(async () => drop.props.onPress());
  expect(tree.root.findAllByType(Image).map((image) => image.props.source.uri)).toEqual(['file:///fotos/frente.jpg', 'file:///fotos/lado.jpg']);
  (fetch as jest.Mock).mockClear();
  answerSave();
  (fetch as jest.Mock).mockImplementationOnce(async () => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ...FILTER, id: '00000000-0000-4000-8000-000000000009', photos: [SAVED_PHOTO] }),
  }));
  await type(tree, 'Código da peça', 'ngk-b7');
  await type(tree, 'Nome', 'vela');
  await type(tree, 'Categoria', 'Ignição');
  await type(tree, 'Marca da peça', 'NGK');
  await type(tree, 'Marca do veículo', 'Fiat');
  await type(tree, 'Valor unitário (R$)', '10');
  await press(tree, 'Salvar');
  const [[postUrl], [photosUrl, photosInit]] = (fetch as jest.Mock).mock.calls;
  expect(postUrl).toMatch(/\/items$/);
  expect(photosUrl).toMatch(/\/items\/00000000-0000-4000-8000-000000000009\/photos$/);
  expect(photosInit.method).toBe('PUT');
  expect(photosInit.body.getParts().map((part: { fieldName: string; name: string }) => [part.fieldName, part.name])).toEqual([
    ['photo', 'frente.jpg'],
    ['photo', 'lado.jpg'],
  ]);
  expect(onSaved.mock.calls[0][0].photos).toEqual([SAVED_PHOTO]);
});

// Edits an item, removes its photo while the API can't save photos, and checks the toast says the item was saved
// without its photos and the item is still handed over.
test('Mobile: photos that fail to save are reported', async () => {
  const withPhoto = { ...FILTER, photos: [SAVED_PHOTO] };
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
  const tree = await mount({ ...FILTER, photos: [SAVED_PHOTO] }, { details: true });
  expect(tree.root.findAllByType(Image).map((image) => image.props.source.uri)).toEqual([expect.stringMatching(/\/photos\/aa\.jpg$/)]);
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Remover foto 1')).toHaveLength(0);
  expect(tree.root.findAll((n) => n.props.testID === 'upload-drop')).toHaveLength(0);
});
