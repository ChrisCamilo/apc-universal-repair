/**
 * @format
 */

import React from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NO_SHEET_MESSAGE, type CatalogData, type InventoryLink } from '@apc/domain/catalog';
import { EMPTY_ITEM_FILTERS } from '@apc/domain/item-filters';
import type { Item } from '@apc/domain/items';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/tokens/theme';
import { CatalogTab } from '../src/features/catalog/CatalogTab';
import { PhoneHeaderContext, type PhoneHeader } from '../src/features/dashboard/phoneHeaderContext';
import { InventoryLinkContext } from '../src/features/dashboard/inventoryLinkContext';
import { themeStorage, ThemeProvider } from '../src/app/theme';
import { applyCatalogChange, catalogChangeOf, TEST_CATALOG, TEST_CATALOG_DATA, TEST_ENGINES } from '@apc/domain/test-catalog';
import { testItem, type FlatItem } from '@apc/domain/test-items';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/ui-spec/screens';

const OPALA_41 = TEST_CATALOG.sheets[TEST_ENGINES.opala41];
// A phone's screen with no insets, for the sheets and dialogs.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
// What Android's back button calls.
type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
// Parts in the inventory, for the code search: an engine the catalog has and one it lacks.
const PARTS: Item[] = [
  part({
    id: '00000000-0000-4000-8000-000000000001',
    code: 'FRA-1000',
    name: 'Pastilha de freio dianteira',
    vehicleBrand: 'Chevrolet',
    vehicleModel: 'Opala 4.1',
  }),
  part({
    id: '00000000-0000-4000-8000-000000000002',
    code: 'FRA-10002',
    name: 'Pastilha de freio traseira',
    vehicleBrand: 'Chevrolet',
    vehicleModel: 'Opala 3.8',
  }),
];

/**
 * Saves a style and mode, renders the Catalog under a header inside a ThemeProvider, on a phone's screen, and waits for
 * it to load.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @param open Takes the link the Catalog opens the Inventory on.
 * @returns The rendered tree.
 */
async function mount(style: Style, mode: Mode, open: (link: InventoryLink) => void = () => {}) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <Harness open={open} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

/**
 * Fills in an inventory item with the fields the Catalog doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function part(fields: Required<Pick<FlatItem, 'id' | 'code' | 'name' | 'vehicleBrand' | 'vehicleModel'>>): Item {
  return testItem({
    category: 'Freios',
    partBrand: 'Cobreq',
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 100,
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  });
}

/**
 * Presses the pressable with an accessible name.
 * @param tree Rendered tree.
 * @param name The accessibility label.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const node = tree.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === name)[0];
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Finds the host element with an accessible name and role.
 * @param tree Rendered tree.
 * @param role The accessibility role.
 * @param name The accessibility label.
 * @returns The host element.
 */
function byRole(tree: ReactTestRenderer.ReactTestRenderer, role: string, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (n) => typeof n.type === 'string' && (n.props.accessibilityRole === role || n.props.role === role) && n.props.accessibilityLabel === name,
  );
}

/**
 * Types into a field.
 * @param tree Rendered tree.
 * @param label The field's accessible name.
 * @param text Text to type.
 */
async function fill(tree: ReactTestRenderer.ReactTestRenderer, label: string, text: string) {
  const input = tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
  await ReactTestRenderer.act(async () => input.props.onChangeText(text));
}

/**
 * Tells whether a text is on screen.
 * @param tree Rendered tree.
 * @param text Exact text.
 * @returns True when a Text shows it.
 */
function shows(tree: ReactTestRenderer.ReactTestRenderer, text: string): boolean {
  return tree.root.findAll((n) => n.type === Text && n.props.children === text).length > 0;
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the Catalog in one style and mode and checks the brands' letters take that combination's accent, then
    // opens the Opala's 4.1 engine and checks the "Ver ficha" of the chosen engine and the sheet's readouts take it too.
    test(`Mobile: the Catalog follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode);
      expect(StyleSheet.flatten(textNode(tree, 'CH').props.style).color).toBe(colors.accent);
      await openOpala41(tree);
      expect(StyleSheet.flatten(textNode(tree, OPALA_41.specs[1]).props.style).color).toBe(colors.accent);
      await press(tree, 'Voltar aos modelos');
      expect(StyleSheet.flatten(textNode(tree, 'Ver ficha', 1).props.style).backgroundColor).toBe(colors.accent);
    });
  }
}

// Opens the Catalog with the catalog failing to load and checks it says so with a button to try again, which loads it
// and shows the brand lines.
test('Mobile: the Catalog says when it fails to load and tries again', async () => {
  let failing = true;
  answer(
    () => ({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) }),
    () => (failing ? { ok: false, status: 500, json: () => Promise.resolve({}) } : { ok: true, json: () => Promise.resolve(TEST_CATALOG_DATA) }),
  );
  const tree = await mount('eighties', 'night');
  expect(shows(tree, 'Não foi possível carregar o catálogo')).toBe(true);
  failing = false;
  await ReactTestRenderer.act(async () => pressable(textNode(tree, 'Tentar de novo')).props.onPress());
  expect(shows(tree, 'Marcas · 4')).toBe(true);
});

// Checks the Catalog opens on the brand lines, each with its letters and its models and sheets, with no brand search,
// then presses Chevrolet and checks the header turns to the brand with a ← and the tree's engines say "Ver ficha",
// opens the 4.1 engine and checks its sheet shows under the path to it with each readout named. The ← goes back to
// the models, open on the engine just seen, and Android's back button to the brands, where it no longer stays in the
// tab.
test('Mobile: the Catalog goes from a brand to an engine sheet and back', async () => {
  const backs = backButton();
  const tree = await mount('eighties', 'night');
  const lines = () => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'catalog.catalog-tab.screen.brands.brand');
  expect(lines().map((n) => n.props.accessibilityLabel)).toEqual([
    'Chevrolet, 3 modelos · 2 fichas técnicas',
    'Volkswagen, 3 modelos · 1 ficha técnica',
    'Fiat, 3 modelos · 1 ficha técnica',
    'Ford, 3 modelos · sem ficha técnica ainda',
  ]);
  expect(['CH', 'VW', 'FI', 'FO'].every((mark) => shows(tree, mark))).toBe(true);
  expect(shows(tree, 'Marcas · 4')).toBe(true);
  expect(tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Procure marca')).toHaveLength(0);
  expect(backs.pressed()).toBeNull();

  await openOpala41(tree);
  expect(shows(tree, OPALA_41.title)).toBe(true);
  expect(shows(tree, 'Opala › Terceira geração › Diplomata › 1986')).toBe(true);
  expect(['Ano', 'Motor', 'Cilindros', 'Tração'].every((label) => shows(tree, label))).toBe(true);
  expect(title(tree)).toBe('Chevrolet');

  await press(tree, 'Voltar aos modelos');
  expect(byRole(tree, 'treeitem', '4.1 L 6 cilindros').props.accessibilityState).toMatchObject({ selected: true });
  expect(shows(tree, 'Modelos · 3')).toBe(true);
  expect(textNodes(tree, 'Ver ficha')).toHaveLength(2);
  await ReactTestRenderer.act(async () => expect(backs.pressed()).toBe(true));
  expect(lines()).toHaveLength(4);
  expect(title(tree)).toBe('Catálogo');
  expect(backs.pressed()).toBeNull();
});

// Searches a model only Fiat has and checks the brands narrow to Fiat and its tree to the model, then types part codes
// and checks the parts show as the Inventory's cards under a heading, and a press on one clears the search and opens
// its engine's sheet, or, for a model without a sheet, its brand's models with the model pointed out and the note.
test('Mobile: the Catalog search narrows the brands and opens a part found by code', async () => {
  answer(() => ({ ok: true, json: () => Promise.resolve({ items: PARTS, total: PARTS.length }) }));
  const tree = await mount('fiat90', 'day');
  await fill(tree, 'Procure modelo ou código da peça', 'uno');
  expect(shows(tree, 'Marcas · 1')).toBe(true);
  await press(tree, 'Fiat, 3 modelos · 1 ficha técnica');
  expect(shows(tree, 'Modelos · 1')).toBe(true);
  await press(tree, 'Voltar às marcas');

  await fill(tree, 'Procure modelo ou código da peça', 'fra1000');
  expect(shows(tree, 'Peças do estoque com esse código')).toBe(true);
  const cards = () => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'common.data-table.table.row');
  expect(cards()).toHaveLength(2);
  expect(shows(tree, 'FRA-1000 · Cobreq')).toBe(true);
  expect(shows(tree, 'FRA-10002 · Cobreq')).toBe(true);
  await ReactTestRenderer.act(async () => pressable(cards()[0]).props.onPress());
  expect(shows(tree, OPALA_41.title)).toBe(true);
  await press(tree, 'Voltar aos modelos');
  expect(tree.root.find((n) => n.type === TextInput).props.value).toBe('');

  await fill(tree, 'Procure modelo ou código da peça', 'fra10002');
  await ReactTestRenderer.act(async () => pressable(cards()[0]).props.onPress());
  expect(title(tree)).toBe('Chevrolet');
  expect(byRole(tree, 'treeitem', 'Opala').props.accessibilityValue).toEqual({ text: 'em destaque' });
  expect(shows(tree, 'Chevrolet Opala 3.8')).toBe(true);
  expect(shows(tree, NO_SHEET_MESSAGE)).toBe(true);
});

// Presses the Opala's name and checks its sheet shows its generations with their years and versions, its engines and the
// two parts that fit it as cards, and an engine opens its sheet. ← goes back to the models with the Opala chosen and
// open, its chevron closes it without leaving; the Diplomata's sheet shows under the path to it, and a part opens its
// details in the Inventory, "Ver todas as peças" the Inventory with the Opalas' brand and models filtered.
test("Mobile: a model's and a version's sheets list their parts and open them in the Inventory", async () => {
  answer(() => ({ ok: true, json: () => Promise.resolve({ items: PARTS, total: PARTS.length }) }));
  const open = jest.fn();
  const tree = await mount('bmw90', 'night', open);
  await press(tree, 'Chevrolet, 3 modelos · 2 fichas técnicas');
  await press(tree, 'Opala');
  expect(shows(tree, 'Chevrolet Opala')).toBe(true);
  expect(['68/74', '75/79', '80/92', 'Comodoro, Diplomata, SS'].every((text) => shows(tree, text))).toBe(true);
  expect(shows(tree, 'Peças disponíveis · 2')).toBe(true);
  const cards = () => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'common.data-table.table.row');
  expect(cards()).toHaveLength(2);
  await pressText(tree, 'Diplomata 1986 · 4.1 L 6 cilindros');
  expect(shows(tree, OPALA_41.title)).toBe(true);

  await press(tree, 'Voltar aos modelos');
  await press(tree, 'Opala');
  await press(tree, 'Voltar aos modelos');
  expect(byRole(tree, 'treeitem', 'Opala').props.accessibilityState).toMatchObject({ selected: true, expanded: true });
  await press(tree, 'Fechar Opala');
  expect(byRole(tree, 'treeitem', 'Opala').props.accessibilityState).toMatchObject({ expanded: false });
  expect(title(tree)).toBe('Chevrolet');
  await press(tree, 'Abrir Opala');
  await press(tree, 'Terceira geração 1980–1992');
  await press(tree, 'Diplomata');
  expect(shows(tree, 'Chevrolet Opala Diplomata')).toBe(true);
  expect(shows(tree, 'Opala › Terceira geração')).toBe(true);
  await ReactTestRenderer.act(async () => pressable(cards()[0]).props.onPress());
  expect(open).toHaveBeenLastCalledWith({ itemId: PARTS[0].id });
  await pressText(tree, 'Ver todas as peças');
  expect(open).toHaveBeenLastCalledWith({
    filters: { ...EMPTY_ITEM_FILTERS, vehicleBrand: ['Chevrolet'], vehicleModel: ['Chevrolet|Opala 4.1', 'Chevrolet|Opala 3.8'] },
  });
});

// Presses a model no part fits, with no engine yet, and checks its sheet and its parts say so, with no "Ver todas as
// peças".
test('Mobile: a model with no parts in stock says so', async () => {
  const tree = await mount('eighties', 'day');
  await press(tree, 'Chevrolet, 3 modelos · 2 fichas técnicas');
  await press(tree, 'Monza');
  expect(shows(tree, 'Chevrolet Monza')).toBe(true);
  expect(shows(tree, 'Nenhum motor com ficha ainda')).toBe(true);
  expect(shows(tree, 'Peças disponíveis · 0')).toBe(true);
  expect(shows(tree, 'Nenhuma peça no estoque')).toBe(true);
  expect(shows(tree, 'Ver todas as peças')).toBe(false);
});

// Adds a brand from beside the brands' heading in a bottom sheet, which opens its empty models, a model from beside the
// models' heading, and a generation from the model's "⋯": the sheet says the last year can't come before the first,
// then adds it under the model, open on it.
test('Mobile: the Catalog adds a brand, a model and a generation in sheets', async () => {
  answerChanges();
  const tree = await mount('eighties', 'night');
  await pressText(tree, 'Nova marca');
  await fill(tree, 'Nome', 'renault');
  await pressText(tree, 'Adicionar');
  expect(title(tree)).toBe('Renault');
  expect(shows(tree, 'Nenhum modelo nessa marca')).toBe(true);

  await pressText(tree, 'Novo modelo');
  expect(shows(tree, 'Novo modelo em Renault')).toBe(true);
  await fill(tree, 'Nome', 'Clio');
  await pressText(tree, 'Adicionar');
  expect(byRole(tree, 'treeitem', 'Clio')).toBeTruthy();
  expect(shows(tree, 'Nova geração em Clio')).toBe(true);

  await press(tree, 'Ações de Clio');
  expect(['Nova geração', 'Renomear', 'Excluir…', 'Fechar'].every((label) => shows(tree, label))).toBe(true);
  expect(shows(tree, 'Mover para cima') || shows(tree, 'Mover para baixo')).toBe(false);
  await pressText(tree, 'Nova geração');
  await fill(tree, 'Nome', 'Primeira geração');
  await fill(tree, 'De', '1990');
  await fill(tree, 'Até', '1980');
  await pressText(tree, 'Adicionar');
  expect(shows(tree, 'O último ano não pode vir antes do primeiro.')).toBe(true);
  await fill(tree, 'Até', '1998');
  await pressText(tree, 'Adicionar');
  expect(byRole(tree, 'treeitem', 'Primeira geração 1990–1998')).toBeTruthy();
});

// Deletes Ford from its models screen with Excluir marca: the dialog says what goes with it, and once confirmed the
// screen goes back to the brands, one fewer.
test('Mobile: the Catalog deletes a brand from its models screen', async () => {
  answerChanges();
  const tree = await mount('bmw90', 'night');
  await press(tree, 'Ford, 3 modelos · sem ficha técnica ainda');
  await pressText(tree, 'Excluir marca');
  expect(shows(tree, 'Excluir “Ford”?')).toBe(true);
  expect(showsPart(tree, 'Vão junto 3 modelos')).toBe(true);
  await pressText(tree, 'Excluir');
  expect(shows(tree, 'Marcas · 3')).toBe(true);
  expect(tree.root.findAll((n) => n.props.accessibilityLabel?.startsWith?.('Ford,')).length).toBe(0);
});

// Renames the Opala's first version from its "⋯", which has no "Mover para cima", moves the last one up, adds an engine
// to a year in the full-screen sheet form and opens its sheet, edits that sheet, and deletes the generation after the
// dialog says what goes with it.
test('Mobile: the Catalog renames, moves and deletes branches and adds and edits an engine sheet', async () => {
  answerChanges();
  const tree = await mount('gt4', 'day');
  await press(tree, 'Chevrolet, 3 modelos · 2 fichas técnicas');
  await press(tree, 'Abrir Opala');
  await press(tree, 'Terceira geração 1980–1992');
  await press(tree, 'Ações de Comodoro');
  expect(shows(tree, 'Mover para cima')).toBe(false);
  expect(shows(tree, 'Mover para baixo')).toBe(true);
  await pressText(tree, 'Renomear');
  expect(field(tree, 'Nome').props.value).toBe('Comodoro');
  await fill(tree, 'Nome', 'Comodoro SL');
  await pressText(tree, 'Salvar');
  expect(shows(tree, 'Comodoro SL')).toBe(true);

  await press(tree, 'Ações de SS');
  await pressText(tree, 'Mover para cima');
  const versions = treeLabels(tree).filter((label) => ['Comodoro SL', 'SS', 'Diplomata'].includes(label));
  expect(versions).toEqual(['Comodoro SL', 'SS', 'Diplomata']);

  await press(tree, 'Abrir Diplomata');
  await pressText(tree, 'Novo motor em 1985');
  expect(shows(tree, 'Ficha do motor')).toBe(true);
  await fill(tree, 'Cilindrada (L)', '2,5');
  await fill(tree, 'Cilindros', '4');
  await pressText(tree, 'Traseira');
  await pressText(tree, 'Salvar ficha');
  expect(shows(tree, '1985 · Chevrolet Opala Diplomata 2.5')).toBe(true);
  expect(shows(tree, 'Opala › Terceira geração › Diplomata › 1985')).toBe(true);

  await pressText(tree, 'Editar ficha');
  expect(field(tree, 'Cilindrada (L)').props.value).toBe('2,5');
  await fill(tree, 'Cilindrada (L)', '2.8');
  await pressText(tree, 'Salvar ficha');
  expect(shows(tree, '1985 · Chevrolet Opala Diplomata 2.8')).toBe(true);

  await press(tree, 'Voltar aos modelos');
  await press(tree, 'Ações de Terceira geração');
  await pressText(tree, 'Excluir…');
  expect(shows(tree, 'Excluir “Terceira geração”?')).toBe(true);
  expect(showsPart(tree, 'Vão junto 3 versões, 2 anos, 3 motores com ficha.')).toBe(true);
  await pressText(tree, 'Excluir');
  expect(treeLabels(tree).some((label) => label.startsWith('Terceira geração'))).toBe(false);
});
/**
 * Answers the API's requests: the catalog with the test catalog, unless a test gives its own reply, and the inventory
 * with a test's own.
 * @param items The inventory's reply.
 * @param catalog The catalog's reply.
 */
function answer(items: () => object, catalog: () => object = () => ({ ok: true, json: () => Promise.resolve(TEST_CATALOG_DATA) })) {
  (fetch as jest.Mock).mockImplementation((url: string) => Promise.resolve(url.endsWith('/catalog') ? catalog() : items()));
}

/**
 * Answers the API's requests as a server would, keeping the changes made to the catalog: the inventory with no parts,
 * the catalog with the test catalog at first, and each change made on it under the API's rules, answering the whole
 * catalog, or 404 or 409.
 */
function answerChanges() {
  let catalog: CatalogData = JSON.parse(JSON.stringify(TEST_CATALOG_DATA));
  let made = 0;
  (fetch as jest.Mock).mockImplementation((url: string, init?: RequestInit) => {
    const at = url.indexOf('/catalog');
    if (at < 0) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items: [], total: 0 }) });
    }
    made += 1;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const id = `00000000-0000-4000-8000-${String(made).padStart(12, '0')}`;
    const change = catalogChangeOf(init?.method ?? 'GET', url.slice(at + '/catalog'.length), body, id);
    if (change) {
      const result = applyCatalogChange(catalog, change.change);
      if (result === 'missing' || result === 'taken') {
        return Promise.resolve({ ok: false, status: result === 'missing' ? 404 : 409, json: () => Promise.resolve({}) });
      }
      catalog = result;
    }
    const answered = catalog;
    return Promise.resolve({ ok: true, status: change?.status ?? 200, json: () => Promise.resolve(answered) });
  });
}

/**
 * Finds a text field's input by its label.
 * @param tree Rendered tree.
 * @param label The field's label.
 * @returns The input.
 */
function field(tree: ReactTestRenderer.ReactTestRenderer, label: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
}

/**
 * Presses the pressable that shows a text, such as a button's label or an action's name.
 * @param tree Rendered tree.
 * @param text Exact text.
 */
async function pressText(tree: ReactTestRenderer.ReactTestRenderer, text: string) {
  await ReactTestRenderer.act(async () => pressable(textNode(tree, text)).props.onPress());
}

/**
 * Tells whether a text shows part of what it says, for a Text put together from several pieces.
 * @param tree Rendered tree.
 * @param piece The piece looked for.
 * @returns True when a Text says it.
 */
function showsPart(tree: ReactTestRenderer.ReactTestRenderer, piece: string): boolean {
  return tree.root.findAll((n) => n.type === Text && ([] as unknown[]).concat(n.props.children).join('').includes(piece)).length > 0;
}

/**
 * Reads the names of the tree's rows on show, in order.
 * @param tree Rendered tree.
 * @returns Each row's accessible name.
 */
function treeLabels(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props.role === 'treeitem').map((n) => n.props.accessibilityLabel);
}

/**
 * Stands in for Android's back button: keeps the listener the Catalog adds, while it is added.
 * @returns Presses the button, giving what the listener answered, or null when none listens.
 */
function backButton() {
  let listener: BackListener | null = null;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    listener = handler;
    return {
      remove: () => {
        if (listener === handler) {
          listener = null;
        }
      },
    };
  });
  return { pressed: () => (listener ? listener({} as Parameters<BackListener>[0]) : null) };
}

/**
 * Opens Chevrolet, the Opala's tree down to its 1986 engines, the model and the version by their chevrons, and the
 * 4.1's sheet.
 * @param tree Rendered tree.
 */
async function openOpala41(tree: ReactTestRenderer.ReactTestRenderer) {
  await press(tree, 'Chevrolet, 3 modelos · 2 fichas técnicas');
  for (const name of ['Abrir Opala', 'Terceira geração 1980–1992', 'Abrir Diplomata', '1986', '4.1 L 6 cilindros']) {
    await press(tree, name);
  }
}

/**
 * Finds the Pressable that holds a host element.
 * @param node A host element.
 * @returns The closest Pressable above it, or the node itself when it is pressable.
 */
function pressable(node: ReactTestRenderer.ReactTestInstance): ReactTestRenderer.ReactTestInstance {
  let current: ReactTestRenderer.ReactTestInstance | null = node;
  while (current && typeof current.props.onPress !== 'function') {
    current = current.parent;
  }
  return current!;
}

/**
 * Finds the Texts showing a text.
 * @param tree Rendered tree.
 * @param text Exact text.
 * @returns The Text elements.
 */
function textNodes(tree: ReactTestRenderer.ReactTestRenderer, text: string): ReactTestRenderer.ReactTestInstance[] {
  return tree.root.findAll((n) => n.type === Text && n.props.children === text);
}

/**
 * Finds a Text showing a text.
 * @param tree Rendered tree.
 * @param text Exact text.
 * @param index Which of the Texts showing it, in order.
 * @returns The Text element.
 */
function textNode(tree: ReactTestRenderer.ReactTestRenderer, text: string, index = 0): ReactTestRenderer.ReactTestInstance {
  return textNodes(tree, text)[index];
}

/**
 * Reads the header's title.
 * @param tree Rendered tree.
 * @returns The title the harness shows.
 */
function title(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root.find((n) => n.type === Text && n.props.accessibilityRole === 'header' && n.props.testID === 'harness.title').props.children;
}

/**
 * The Catalog under the Dashboard's header: the tab's name, or a deeper screen's title with its ←; and the Dashboard's
 * links to the Inventory.
 */
function Harness({ open }: { open: (link: InventoryLink) => void }) {
  const [header, setHeader] = React.useState<PhoneHeader | null>(null);
  return (
    <PhoneHeaderContext.Provider value={setHeader}>
      <InventoryLinkContext.Provider value={{ link: null, open, taken: () => {} }}>
        {header && <Pressable accessibilityLabel={header.back.label} onPress={header.back.onPress} />}
        <Text accessibilityRole="header" testID="harness.title">
          {header?.title ?? 'Catálogo'}
        </Text>
        <CatalogTab />
      </InventoryLinkContext.Provider>
    </PhoneHeaderContext.Provider>
  );
}
