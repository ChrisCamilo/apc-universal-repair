/**
 * @format
 */

import React from 'react';
import { Keyboard, ScrollView, StyleSheet, TextInput, View, type HostInstance, type KeyboardEventName } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Combobox } from '../src/Combobox';
import { FIELD_CLEARANCE, FieldScrollView } from '../src/FieldScrollView';
import { CodeListField } from '../src/inventory/CodeListField';
import { SearchField, TextField } from '../src/TextField';
import { ThemeProvider } from '../src/theme';

// The view's box on a 360×780 screen, and the top of a keyboard 300px tall.
const VIEW = [0, 0, 360, 780] as const;
const KEYBOARD_TOP = 480;
// The view's own padding at the bottom, which the keyboard's cover adds to.
const CONTENT = { padding: 24 };

type Rect = [number, number, number, number];

// Where the focused field's outer view sits on screen, as measureInWindow reports it; each test sets it.
let field: Rect = [0, 0, 0, 0];
// The keyboard's listeners, by event, for the tests to call.
let listeners: Partial<Record<KeyboardEventName, () => void>> = {};
let keyboardUp = true;

/**
 * Renders one field inside a FieldScrollView, in a ThemeProvider, with the view's box measured as VIEW.
 * @param element The field.
 * @returns The rendered tree and the ScrollView's scrollTo.
 */
async function mount(element: React.ReactElement) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <FieldScrollView contentContainerStyle={CONTENT}>{element}</FieldScrollView>
      </ThemeProvider>,
    );
  });
  const scroll = tree!.root.findByType(ScrollView).instance;
  scroll.getNativeScrollRef.mockReturnValue({ measureInWindow: (done: (...rect: Rect) => void) => done(...VIEW) });
  // The mock's methods are shared by every ScrollView, so the calls of earlier tests are dropped.
  scroll.scrollTo.mockClear();
  return { tree: tree!, scrollTo: scroll.scrollTo as jest.Mock };
}

/**
 * Focuses a field's input by its label.
 * @param tree Rendered tree.
 * @param label The field's label.
 */
async function focus(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  await ReactTestRenderer.act(async () => tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label).props.onFocus());
}

/**
 * Scrolls the view, as a finger would, to an offset.
 * @param tree Rendered tree.
 * @param y The new offset.
 */
async function scrollBy(tree: ReactTestRenderer.ReactTestRenderer, y: number) {
  await ReactTestRenderer.act(async () => tree.root.findByType(ScrollView).props.onScroll({ nativeEvent: { contentOffset: { x: 0, y } } }));
}

/**
 * Reads the content's padding at the bottom.
 * @param tree Rendered tree.
 * @returns The padding, in px.
 */
function contentEnd(tree: ReactTestRenderer.ReactTestRenderer) {
  const style = StyleSheet.flatten(tree.root.findByType(ScrollView).props.contentContainerStyle);
  return style.paddingBottom ?? style.padding;
}

beforeEach(() => {
  keyboardUp = true;
  listeners = {};
  jest.spyOn(Keyboard, 'isVisible').mockImplementation(() => keyboardUp);
  jest.spyOn(Keyboard, 'metrics').mockReturnValue({ screenX: 0, screenY: KEYBOARD_TOP, width: 360, height: 300 });
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    listeners[event] = listener as () => void;
    return { remove: () => {} } as ReturnType<typeof Keyboard.addListener>;
  });
  jest.spyOn(View.prototype as unknown as HostInstance, 'measureInWindow').mockImplementation((done) => done(...field));
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Each kind of field, with the label its input goes by.
const FIELDS = [
  { name: 'text field', label: 'Confirmar senha', element: <TextField label="Confirmar senha" kind="newPassword" value="" onValueChange={() => {}} /> },
  { name: 'search', label: 'Buscar', element: <SearchField label="Buscar" value="" onValueChange={() => {}} /> },
  {
    name: 'combobox',
    label: 'Categoria',
    element: (
      <Combobox
        label="Categoria"
        value=""
        onValueChange={() => {}}
        options={['Freios']}
        onCreate={() => {}}
        noun="categoria"
        toggleLabel="Mostrar categorias"
        emptyLabel="Nenhuma"
      />
    ),
  },
  { name: 'code list', label: 'Códigos originais', element: <CodeListField label="Códigos originais" codes={[]} onCodesChange={() => {}} /> },
];

for (const { name, label, element } of FIELDS) {
  // Focuses a field whose bottom sits under the keyboard's top, and checks the view scrolls until the whole field is
  // FIELD_CLEARANCE above the keyboard.
  test(`Mobile: a focused ${name} scrolls clear of the keyboard`, async () => {
    field = [24, 400, 312, 90];
    const { tree, scrollTo } = await mount(element);
    await focus(tree, label);
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 400 + 90 + FIELD_CLEARANCE - KEYBOARD_TOP, animated: true });
  });
}

// Scrolls the view down, then focuses a field above its top, and checks it scrolls back up until the field sits
// FIELD_CLEARANCE below the top; a field already in sight leaves the view where it is.
test('Mobile: a focused field above the view scrolls down into sight, and one in sight stays put', async () => {
  const { tree, scrollTo } = await mount(<TextField label="Nome" value="" onValueChange={() => {}} />);
  await scrollBy(tree, 300);
  field = [24, -60, 312, 80];
  await focus(tree, 'Nome');
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 300 - 60 - FIELD_CLEARANCE, animated: true });

  scrollTo.mockClear();
  field = [24, 100, 312, 80];
  await focus(tree, 'Nome');
  expect(scrollTo).not.toHaveBeenCalled();
});

// Focuses a field taller than the room above the keyboard, and checks the view scrolls only until its top sits
// FIELD_CLEARANCE below the view's top, so its label stays in sight.
test('Mobile: a field taller than the room left shows its top', async () => {
  field = [24, 200, 312, 500];
  const { tree, scrollTo } = await mount(<TextField label="Nome" value="" onValueChange={() => {}} />);
  await focus(tree, 'Nome');
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 200 - FIELD_CLEARANCE, animated: true });
});

// Focuses a field before the keyboard is up, and checks nothing scrolls until it is; then the content grows at the
// bottom by what the keyboard covers of the view, so the last field can rise above it, and goes back once it hides.
test('Mobile: the view waits for the keyboard and grows past it until it hides', async () => {
  keyboardUp = false;
  field = [24, 600, 312, 80];
  const { tree, scrollTo } = await mount(<TextField label="Nome" value="" onValueChange={() => {}} />);
  await focus(tree, 'Nome');
  expect(scrollTo).not.toHaveBeenCalled();
  expect(contentEnd(tree)).toBe(CONTENT.padding);

  keyboardUp = true;
  await ReactTestRenderer.act(async () => listeners.keyboardDidShow?.());
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 600 + 80 + FIELD_CLEARANCE - KEYBOARD_TOP, animated: true });
  expect(contentEnd(tree)).toBe(CONTENT.padding + VIEW[3] - KEYBOARD_TOP);

  keyboardUp = false;
  await ReactTestRenderer.act(async () => listeners.keyboardDidHide?.());
  expect(contentEnd(tree)).toBe(CONTENT.padding);
});
