/**
 * @format
 */

import React from 'react';
import { Share, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { keepLocalCopy, pick } from '@react-native-documents/picker';
import { CSV_COLUMNS, CSV_TEMPLATE } from '@apc/shared/item-csv';
import type { ItemLists } from '@apc/shared/lists';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/shared/screens';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes } from '@apc/shared/theme';
import { ImportItemsDialog } from '../src/inventory/ImportItemsDialog';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider } from '../src/Toast';

// The lists the API keeps: the Motor category, Mann, and Volkswagen with the Gol.
const LISTS: ItemLists = {
  categories: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Motor' }],
  partBrands: [{ id: '00000000-0000-4000-8000-000000000002', name: 'Mann' }],
  vehicleBrands: [{ id: '00000000-0000-4000-8000-000000000003', name: 'Volkswagen' }],
  vehicleModels: [{ id: '00000000-0000-4000-8000-000000000004', name: 'Gol', vehicleBrandId: '00000000-0000-4000-8000-000000000003' }],
};
// A file with a valid row, a row with new names, and a row with errors.
const FILE = [
  CSV_COLUMNS.join(';'),
  'w 712/95;filtro de óleo;MOTOR;mann;volkswagen;gol;8;2;a-2;39,90;;;',
  'ngk-b7;vela;Ignição;NGK;Fiat;Uno;10;3;B-1;34.9;;D;',
  ';sem código;Freios;Cobreq;Ford;;x;;;0;;;',
].join('\n');
// Trees the test rendered, unmounted after it so the toast's hide timer doesn't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
// A phone's screen with no notch, so the toast has its insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };

/**
 * Has the phone's files hand over a file, copied to the cache, whose text the requests read.
 * @param text The file's text.
 */
function answerPick(text: string) {
  (pick as jest.Mock).mockResolvedValueOnce([{ uri: 'content://files/estoque.csv', name: 'estoque.csv' }]);
  (keepLocalCopy as jest.Mock).mockResolvedValueOnce([
    { status: 'success', sourceUri: 'content://files/estoque.csv', localUri: 'file:///cache/estoque.csv' },
  ]);
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(text) });
}

/**
 * Renders the dialog inside the theme and toast providers.
 * @param onImported Called once the items are imported.
 * @returns The rendered tree.
 */
async function mount(onImported = () => {}) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <ToastProvider>
            <ImportItemsDialog open lists={LISTS} onClose={() => {}} onImported={onImported} />
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
 * Lists the texts in a part of the screen.
 * @param node The part, e.g. tree.root for the whole screen.
 * @returns Every Text's string.
 */
function texts(node: ReactTestRenderer.ReactTestInstance): string[] {
  return node.findAll((n) => n.type === Text && typeof n.props.children !== 'object').map((n) => String(n.props.children));
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Picks a file in one style and mode and checks a row with errors has the danger stripe.
    test(`Mobile: the CSV import follows the ${style}/${mode} theme`, async () => {
      await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
      const tree = await mount();
      answerPick(FILE);
      await press(tree, 'Escolher arquivo');
      // The file's third row is the one with errors.
      const invalid = tree.root.findAll((n) => n.props.testID === 'inventory.import-items-dialog.preview.row' && typeof n.type === 'string')[2];
      expect(StyleSheet.flatten(invalid.props.style).borderLeftColor).toBe(themes[style][mode].colors.danger);
    });
  }
}

// Picks a file and checks the preview: the count of rows, the names to create, each row written by the rule with the
// lists' spelling, and the row with errors marked with its reasons.
test('Mobile: a CSV file is previewed before importing', async () => {
  const tree = await mount();
  answerPick(FILE);
  await press(tree, 'Escolher arquivo');
  const shown = texts(tree.root);
  expect(shown).toEqual(
    expect.arrayContaining([
      'estoque.csv · 2 itens prontos para importar · 1 com erro',
      'Categorias: Ignição',
      'Marcas de peça: NGK',
      'Marcas de veículo: Fiat',
      'Modelos de veículo: Uno (Fiat)',
      'Informe o código da peça.',
      'Importar 2 itens',
    ]),
  );
  const first = tree.root.findAll((n) => n.props.testID === 'inventory.import-items-dialog.preview.row' && typeof n.type === 'string')[0];
  expect(texts(first).map((text) => text.replace(/\s/g, ' '))).toEqual([
    'Linha 2',
    'W 712/95',
    'Filtro de óleo',
    'Motor · Mann · Volkswagen Gol · A-2 · R$ 39,90',
  ]);
});

// Imports the file and checks only the valid rows are sent, a toast says how many items were created and updated,
// and the import is handed over.
test('Mobile: the valid rows are imported', async () => {
  const onImported = jest.fn();
  const tree = await mount(onImported);
  answerPick(FILE);
  await press(tree, 'Escolher arquivo');
  (fetch as jest.Mock).mockClear();
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ created: 1, updated: 1 }) });
  await press(tree, 'Importar 2 itens');
  const [url, init] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(/\/items\/import$/);
  expect(JSON.parse(init.body).items.map((item: { code: string }) => item.code)).toEqual(['W 712/95', 'NGK-B7']);
  expect(texts(tree.root)).toContain('Importação concluída: 1 item criado, 1 atualizado.');
  expect(onImported).toHaveBeenCalledTimes(1);
});

// Picks a file without the required columns and checks it says why with nothing to import; a canceled pick changes
// nothing, and a file that can't be opened says so.
test("Mobile: a file that can't be read or opened says why", async () => {
  const tree = await mount();
  answerPick('code,name\nA,B');
  await press(tree, 'Escolher arquivo');
  expect(texts(tree.root)).toContain('estoque.csv: Faltam colunas no arquivo: category, part_brand, vehicle_brand, unit_price. Use o modelo.');
  expect(texts(tree.root)).toContain('Importar 0 itens');

  await press(tree, 'Escolher outro arquivo');
  expect(texts(tree.root)).toContain('Escolher outro arquivo');
  (pick as jest.Mock).mockRejectedValueOnce(new Error('no access'));
  await press(tree, 'Escolher outro arquivo');
  expect(texts(tree.root)).toContain('Não foi possível abrir o arquivo. Tente de novo.');
});

// Shares the template and checks the phone's share sheet gets it.
test('Mobile: the template is shared', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  const tree = await mount();
  await press(tree, 'Compartilhar modelo');
  expect(share).toHaveBeenCalledWith({ title: 'modelo-estoque.csv', message: CSV_TEMPLATE });
  share.mockRestore();
});
