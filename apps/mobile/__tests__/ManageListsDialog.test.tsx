/**
 * @format
 */

import React, { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import type { Item } from '@apc/shared/items';
import { withEntry, withoutEntry, type ItemLists } from '@apc/shared/lists';
import { itemListsOf } from '@apc/shared/test-lists';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes } from '@apc/shared/theme';
import { ManageListsDialog } from '../src/inventory/ManageListsDialog';
import type { RemoveListEntry, RenameListEntry } from '../src/inventory/useItemLists';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider } from '../src/Toast';

const ITEMS = [
  item({ id: '00000000-0000-4000-8000-0000000000c1', code: 'W 712/95', name: 'Filtro de óleo', category: 'Motor', vehicleModel: 'Gol' }),
  item({ id: '00000000-0000-4000-8000-0000000000c2', code: 'J-1', name: 'Junta', category: 'Motor', vehicleModel: 'Santana' }),
  item({ id: '00000000-0000-4000-8000-0000000000c3', code: 'P-1', name: 'Pastilha', category: 'Freios', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala' }),
];
// The lists: what the items use, plus a category, a vehicle brand and a model no item uses.
const LISTS = itemListsOf([
  ...ITEMS,
  item({ id: '00000000-0000-4000-8000-0000000000c4', code: 'X', name: 'Sem uso', category: 'Turbo', vehicleBrand: 'Renault', vehicleModel: 'Clio' }),
]);
// Trees the test rendered, unmounted after it so the toast's hide timer doesn't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
// A phone's screen with no notch, so the toast has its insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };

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
 * Renders the dialog inside the theme and toast providers, holding the lists as the inventory does.
 * @param props onRename and onRemove, called with each change, which is made unless they answer otherwise; and
 * onChanged and onShowItems.
 * @returns The rendered tree.
 */
async function mount({
  onRename,
  onRemove,
  onChanged = () => {},
  onShowItems = () => {},
}: { onRename?: RenameListEntry; onRemove?: RemoveListEntry; onChanged?: () => void; onShowItems?: () => void } = {}) {
  /** Holds the lists and changes them as the API would. */
  function Owner() {
    const [lists, setLists] = useState<ItemLists>(LISTS);
    const rename: RenameListEntry = async (kind, id, name) => {
      const answer = await onRename?.(kind, id, name);
      if (answer === 'taken' || answer === null) {
        return answer;
      }
      const renamed = { ...lists[kind].find((entry) => entry.id === id)!, name: name.charAt(0).toUpperCase() + name.slice(1) };
      setLists((current) => withEntry(current, kind, renamed));
      return renamed;
    };
    const remove: RemoveListEntry = async (kind, id) => {
      if ((await onRemove?.(kind, id)) === false) {
        return false;
      }
      setLists((current) => withoutEntry(current, kind, id));
      return true;
    };
    return (
      <ManageListsDialog
        open
        lists={lists}
        items={ITEMS}
        onRename={rename}
        onRemove={remove}
        onChanged={onChanged}
        onShowItems={onShowItems}
        onClose={() => {}}
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
 * Presses the pressable with an accessible name or visible text, the last one on screen.
 * @param tree Rendered tree.
 * @param name The accessibility label, or the text inside.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const nodes = tree.root.findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  );
  await ReactTestRenderer.act(async () => nodes[nodes.length - 1].props.onPress());
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
    // Opens the dialog in one style and mode and checks each name's count of items is muted.
    test(`Mobile: Manage lists follows the ${style}/${mode} theme`, async () => {
      await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
      const tree = await mount();
      const count = tree.root.findAll((n) => n.type === Text && n.props.children === '2 itens')[0];
      const flat = Object.assign({}, ...[count.props.style].flat(Infinity).filter(Boolean));
      expect(flat.color).toBe(themes[style][mode].colors.textMuted);
    });
  }
}

// Opens the dialog and checks a section for each list, each name with how many items use it, and the models grouped
// by their vehicle brand.
test('Mobile: Manage lists shows each list with the items using each name', async () => {
  const tree = await mount();
  const shown = texts(tree.root);
  expect(shown).toEqual(expect.arrayContaining(['Categorias', 'Marcas de peça', 'Marcas de veículo', 'Modelos de veículo']));
  const rows = tree.root.findAll((n) => n.props.testID === 'list-entry' && typeof n.type === 'string');
  const row = (name: string) => texts(rows.find((r) => texts(r).includes(name))!);
  expect(row('Motor')).toEqual(['Motor', '2 itens']);
  expect(row('Turbo')).toEqual(['Turbo', 'sem itens']);
  const volkswagen = tree.root.find((n) => n.props.accessibilityLabel === 'Modelos de Volkswagen' && typeof n.type === 'string');
  expect(texts(volkswagen).filter((text) => !text.includes('ite'))).toEqual(['Volkswagen', 'Gol', 'Santana']);
});

// Renames a category in place and checks the rename is sent, the list shows the new name, a toast confirms it and
// the inventory is told to load again; Cancelar leaves a rename.
test('Mobile: a name is renamed in place', async () => {
  const onRename = jest.fn<ReturnType<RenameListEntry>, Parameters<RenameListEntry>>();
  const onChanged = jest.fn();
  const tree = await mount({ onRename, onChanged });
  await press(tree, 'Renomear Turbo');
  const field = () => tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === 'Novo nome de “Turbo”');
  expect(field().props.value).toBe('Turbo');
  await ReactTestRenderer.act(async () => field().props.onChangeText('turbo e escape'));
  await ReactTestRenderer.act(async () => field().props.onSubmitEditing());
  const turbo = LISTS.categories.find((entry) => entry.name === 'Turbo')!;
  expect(onRename).toHaveBeenCalledWith('categories', turbo.id, 'turbo e escape');
  expect(texts(tree.root)).toEqual(expect.arrayContaining(['Turbo e escape', 'Categoria renomeada para “Turbo e escape”.']));
  expect(onChanged).toHaveBeenCalledTimes(1);

  await press(tree, 'Renomear Freios');
  await press(tree, 'Cancelar');
  expect(tree.root.findAll((n) => n.type === TextInput)).toHaveLength(0);
});

// Renames to a blank name and to another category's name, in another case, and checks each is refused under the field
// without sending anything; a name the API says is taken is refused the same way.
test('Mobile: a rename to a blank or taken name is refused', async () => {
  const onRename = jest.fn<ReturnType<RenameListEntry>, Parameters<RenameListEntry>>(async () => 'taken');
  const tree = await mount({ onRename });
  await press(tree, 'Renomear Turbo');
  const field = () => tree.root.find((n) => n.type === TextInput);
  for (const [typed, message] of [
    [' ', 'Informe o nome.'],
    ['freios', 'Já existe uma categoria com esse nome.'],
  ]) {
    await ReactTestRenderer.act(async () => field().props.onChangeText(typed));
    await press(tree, 'Salvar');
    expect(texts(tree.root)).toContain(message);
  }
  expect(onRename).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => field().props.onChangeText('Escapamento'));
  await press(tree, 'Salvar');
  expect(onRename).toHaveBeenCalledTimes(1);
  expect(texts(tree.root)).toContain('Já existe uma categoria com esse nome.');
});

// Deletes a vehicle brand no item uses and checks the confirmation says its models go too, Excluir sends the delete,
// the brand and its models leave the dialog and a toast confirms it.
test('Mobile: a name no item uses is deleted after confirming', async () => {
  const onRemove = jest.fn<ReturnType<RemoveListEntry>, Parameters<RemoveListEntry>>(async () => true);
  const tree = await mount({ onRemove });
  await press(tree, 'Excluir Renault');
  expect(texts(tree.root)).toEqual(
    expect.arrayContaining([
      'Excluir “Renault”?',
      '“Renault” e os modelos dela saem da lista de marcas de veículo. Essa ação não pode ser desfeita.',
    ]),
  );
  await press(tree, 'Excluir');
  const renault = LISTS.vehicleBrands.find((entry) => entry.name === 'Renault')!;
  expect(onRemove).toHaveBeenCalledWith('vehicleBrands', renault.id);
  expect(texts(tree.root)).toContain('Marca de veículo “Renault” excluída.');
  expect(texts(tree.root)).not.toContain('Renault');
  expect(texts(tree.root)).not.toContain('Clio');
});

// Asks to delete a model items use and checks nothing can be deleted: the dialog says how many items use it, and Ver
// itens hands over the filters that show them; a vehicle brand of the catalog can't be deleted either.
test('Mobile: a name in use or of the catalog is not deleted', async () => {
  const onRemove = jest.fn<ReturnType<RemoveListEntry>, Parameters<RemoveListEntry>>();
  const onShowItems = jest.fn();
  const tree = await mount({ onRemove, onShowItems });
  await press(tree, 'Excluir Gol');
  expect(texts(tree.root)).toEqual(
    expect.arrayContaining(['Não é possível excluir', '1 item usa “Gol”. Troque o modelo do veículo desses itens antes de excluir.']),
  );
  await press(tree, 'Ver itens');
  expect(onShowItems).toHaveBeenCalledWith(expect.objectContaining({ vehicleModel: ['Volkswagen|Gol'] }));

  await press(tree, 'Excluir Chevrolet');
  expect(texts(tree.root)).toContain('“Chevrolet” também está no catálogo e não pode ser excluída do estoque.');
  expect(texts(tree.root)).not.toContain('Ver itens');
  expect(onRemove).not.toHaveBeenCalled();
});
