/**
 * @format
 */

import React, { useRef, useState } from 'react';
import { Dimensions, Modal, Text, TextInput, View, type HostInstance, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, spotlightDim, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { cardPlacement, spotlightRect, TOUR_ADVANCE_DELAY_MS, TOUR_CHECK_MS, type TourStep } from '@apc/shared/tour';
import { Button } from '../src/Button';
import { Dialog } from '../src/Dialog';
import { themeStorage, ThemeProvider } from '../src/theme';
import { Tour, TourProvider } from '../src/Tour';

// Where each sample view sits on screen, as measureInWindow reports it.
const RECTS: Record<string, [number, number, number, number]> = {
  'sample-new': [24, 100, 120, 40],
  'sample-name': [40, 300, 280, 60],
};
const SAFE_AREA = { frame: { x: 0, y: 0, width: 360, height: 780 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

/**
 * Saves a style and mode, renders the element inside the app's providers and waits for the theme to load.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @param element Element to render.
 * @returns The rendered tree.
 */
async function mount(style: Style, mode: Mode, element: React.ReactElement) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <TourProvider>{element}</TourProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

/**
 * Lets the tour's timers run for a while.
 * @param ms Time to pass, in ms.
 */
async function wait(ms: number) {
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/**
 * Finds the host View with a testID.
 * @param tree Rendered tree, or a part of it.
 * @param testID The testID to look for.
 * @returns Every host View with that testID.
 */
function views(tree: ReactTestRenderer.ReactTestInstance, testID: string): ReactTestRenderer.ReactTestInstance[] {
  return tree.findAll((n) => n.props.testID === testID && typeof n.type === 'string');
}

/**
 * Reads the title of the step on the tour card.
 * @param tree Rendered tree.
 * @returns The card's accessible name, or null with no card.
 */
function cardTitle(tree: ReactTestRenderer.ReactTestRenderer): string | null {
  return views(tree.root, 'tour-card')[0]?.props.accessibilityLabel ?? null;
}

/**
 * Presses the button with a label.
 * @param tree Rendered tree.
 * @param label The button's text.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const button = tree.root.find(
    (n) => typeof n.props.style === 'function' && n.findAll((c) => c.type === Text && c.props.children === label).length > 0,
  );
  await ReactTestRenderer.act(async () => button.props.onPress());
}

/**
 * Flattens a host View's style into one object.
 * @param node Host View.
 * @returns The style.
 */
function styleOf(node: ReactTestRenderer.ReactTestInstance): ViewStyle {
  return Object.assign({}, ...[node.props.style].flat(Infinity));
}

beforeEach(async () => {
  jest.useFakeTimers();
  // Jest's View doesn't lay out; each sample view reports its box in RECTS instead.
  jest
    .spyOn(View.prototype as unknown as HostInstance, 'measureInWindow')
    .mockImplementation(function (this: { props: { testID: string } }, done) {
      done(...(RECTS[this.props.testID] ?? [0, 0, 0, 0]));
    });
  await themeStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Starts the tour in one style and mode and checks the ring is the accent over the black dim, and the card
    // is framed in the accent.
    test(`Mobile: the tour follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Sample />);
      expect(styleOf(views(tree.root, 'tour-spotlight')[0]).borderColor).toBe(colors.accent);
      expect(views(tree.root, 'tour-dim').map((dim) => styleOf(dim).backgroundColor)).toEqual(Array(4).fill(spotlightDim()));
      const card = views(tree.root, 'tour-card')[0].children[0] as ReactTestRenderer.ReactTestInstance;
      expect(styleOf(card).borderColor).toBe(colors.accent);
    });
  }
}

// Starts the tour and checks the ring wraps the measured target with its padding, the card sits where the
// shared placement puts it, and its header names the part and counts the steps.
test('Mobile: the ring wraps the target and the card sits next to it', async () => {
  const tree = await mount('eighties', 'night', <Sample />);
  const [x, y, width, height] = RECTS['sample-new'];
  const ring = styleOf(views(tree.root, 'tour-spotlight')[0]);
  expect({ x: ring.left, y: ring.top, width: ring.width, height: ring.height }).toEqual(spotlightRect({ x, y, width, height }));
  const place = cardPlacement({ x, y, width, height }, 0, Dimensions.get('window'));
  expect(styleOf(views(tree.root, 'tour-card')[0])).toMatchObject({ left: place.x, top: place.y, width: place.width });
  const texts = views(tree.root, 'tour-card')[0].findAllByType(Text).map((t) => t.props.children);
  expect(texts).toEqual(expect.arrayContaining(['Parte 1 de 2 · Criar um item', '1 / 4', 'Abra o cadastro']));
});

// Uses "Fazer por mim" to open the dialog and checks the step moves on by itself after a moment, and the tour
// now draws in the dialog's layer, above the Modal, where its buttons still work.
test('Mobile: steps move on by themselves and the tour draws inside an open dialog', async () => {
  const tree = await mount('gt4', 'night', <Sample />);
  await press(tree, 'Fazer por mim');
  await wait(TOUR_CHECK_MS);
  expect(cardTitle(tree)).toBe('Abra o cadastro');
  await wait(TOUR_ADVANCE_DELAY_MS);
  expect(cardTitle(tree)).toBe('Dê um nome');
  expect(views(tree.root.findByType(Modal), 'tour-card')).toHaveLength(1);
  expect(views(tree.root, 'tour-layer')).toHaveLength(1);

  await press(tree, 'Fazer por mim');
  expect(tree.root.findByType(TextInput).props.value).toBe('Item de teste');
});

// Closes the dialog in the middle of its step and checks the tour goes back to the step that opens it.
test('Mobile: leaving a step goes back to the step it names', async () => {
  const tree = await mount('eighties', 'day', <Sample />);
  await press(tree, 'Novo item');
  await wait(TOUR_CHECK_MS + TOUR_ADVANCE_DELAY_MS);
  expect(cardTitle(tree)).toBe('Dê um nome');
  await press(tree, 'Cancelar');
  await wait(TOUR_CHECK_MS);
  expect(cardTitle(tree)).toBe('Abra o cadastro');
});

// Walks an info-only step with Next and checks the last step has no ring, reads concluded, offers only
// Finish, and that Finish and Skip both close the tour.
test('Mobile: info steps use Next and the last step finishes the tour', async () => {
  const onClose = jest.fn();
  const tree = await mount('eighties', 'night', <Sample from={2} onClose={onClose} />);
  await press(tree, 'Próximo');
  expect(cardTitle(tree)).toBe('Pronto!');
  await wait(TOUR_CHECK_MS);
  expect(views(tree.root, 'tour-spotlight')).toHaveLength(0);
  const texts = views(tree.root, 'tour-card')[0].findAllByType(Text).map((t) => t.props.children);
  expect(texts).toEqual(expect.arrayContaining(['Tutorial concluído', 'Concluir']));
  expect(texts).not.toContain('Pular tutorial');
  await press(tree, 'Concluir');
  expect(onClose).toHaveBeenCalledTimes(1);

  const skipping = await mount('eighties', 'night', <Sample onClose={onClose} />);
  await press(skipping, 'Pular tutorial');
  expect(onClose).toHaveBeenCalledTimes(2);
});

function Sample({ from = 0, onClose = () => {} }: { from?: number; onClose?: () => void }) {
  const [creating, setCreating] = useState(from === 1);
  const [name, setName] = useState('');
  const newRef = useRef<HostInstance>(null);
  const nameRef = useRef<HostInstance>(null);
  const steps: TourStep<HostInstance>[] = [
    {
      id: 'new',
      part: 1,
      title: 'Abra o cadastro',
      text: 'Toque em Novo item.',
      target: () => newRef.current,
      done: () => creating,
      auto: () => setCreating(true),
    },
    {
      id: 'name',
      part: 1,
      title: 'Dê um nome',
      text: 'Escreva o nome do item.',
      target: () => nameRef.current,
      done: () => name !== '',
      auto: () => setName('Item de teste'),
      lost: () => (creating ? null : 'new'),
    },
    { id: 'see', part: 2, title: 'Veja o item', text: 'Este é o item.', target: () => newRef.current },
    { id: 'end', title: 'Pronto!', text: 'Você terminou o tutorial.' },
  ];
  return (
    <>
      <View ref={newRef} testID="sample-new">
        <Button onPress={() => setCreating(true)}>Novo item</Button>
      </View>
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo item"
        actions={
          <Button variant="secondary" size="sm" onPress={() => setCreating(false)}>
            Cancelar
          </Button>
        }
      >
        <View ref={nameRef} testID="sample-name">
          <TextInput value={name} onChangeText={setName} />
        </View>
      </Dialog>
      <Tour open onClose={onClose} steps={steps.slice(from)} parts={['Criar um item', 'Procurar']} />
    </>
  );
}
