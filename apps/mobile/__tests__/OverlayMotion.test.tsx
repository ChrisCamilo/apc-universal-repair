import React from 'react';
import { AccessibilityInfo, Animated, Modal, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens';
import { scales, THEME_STORAGE_KEYS } from '@apc/shared/theme';
import { Combobox } from '../src/Combobox';
import { Dialog } from '../src/Dialog';
import { FilterMenu } from '../src/FilterMenu';
import { ImageViewer } from '../src/ImageViewer';
import { Menu, MenuItem } from '../src/Menu';
import { useOverlayMotion, type OverlayMove } from '../src/motion';
import { Select } from '../src/Select';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider } from '../src/Toast';

// How the dialogs, the photo viewer, the menus, the filter panel and the fields' lists open and close (see motion.ts).
// Animated.timing is stood in for, so a test ends each movement when it says, never on the clock.

/** The trees each test renders, unmounted after it. */
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
/** The options of the combobox and the select under test. */
const OPTIONS = ['Freios', 'Motor', 'Suspensão'];
/** Opens or closes an overlay by pressing its control with this name. */
const pressing = (label: string) => async (tree: ReactTestRenderer.ReactTestRenderer) => press(tree, label);
/** Opens or closes an overlay through its owner's `open`, rendering it again. */
const reopen = (render: Case['render']) => async (tree: ReactTestRenderer.ReactTestRenderer, open: boolean) => {
  await ReactTestRenderer.act(async () => tree.update(wrap(render(open))));
};
/** A 360×780 phone with no notch. */
const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
/** Whether the element with this style id is on screen. */
const there = (id: string) => (tree: ReactTestRenderer.ReactTestRenderer) => tree.root.findAll((node) => node.props.testID === id).length > 0;
/** Whether the overlay's Modal is on screen. */
const visible = (tree: ReactTestRenderer.ReactTestRenderer) => tree.root.findByType(Modal).props.visible as boolean;
/** The overlays that open and close, each with how to drive it and its elements that fade and move. */
const CASES: Case[] = [
  {
    name: 'a dialog',
    render: (open) => (
      <Dialog open={open} onClose={() => {}} title="Excluir item?" size="confirm" actions={null}>
        <Text>Sai do estoque.</Text>
      </Dialog>
    ),
    toggle: reopen((open) => CASES[0].render(open)),
    shown: visible,
    faded: 'common.dialog.backdrop',
    moved: 'common.dialog',
    move: 'scale',
  },
  {
    name: 'the photo viewer',
    render: (open) => (
      <ImageViewer open={open} onClose={() => {}} name="Pastilha" code="FR-1" photos={[]} onPhotosChange={async () => true} limit={5} onPick={async () => []} />
    ),
    toggle: reopen((open) => CASES[1].render(open)),
    shown: visible,
    faded: 'common.image-viewer.backdrop',
    moved: 'common.image-viewer',
    move: 'scale',
  },
  {
    name: 'the filter panel',
    render: (open) => <FilterMenu label="Filtros" title="Filtrar" rows={[]} values={{}} onApply={() => {}} open={open} onOpenChange={() => {}} />,
    toggle: reopen((open) => CASES[2].render(open)),
    shown: visible,
    faded: 'common.filter-menu.panel',
    moved: 'common.filter-menu.panel',
    move: 'translate',
  },
  {
    name: 'a menu',
    render: () => (
      <Menu label="Menu do usuário" trigger={<Text>CC</Text>}>
        <MenuItem onSelect={() => {}}>Sair</MenuItem>
      </Menu>
    ),
    toggle: (tree, open) => (open ? pressing('Menu do usuário')(tree) : pressing('Fechar menu')(tree)),
    shown: visible,
    faded: 'common.menu.popover',
    moved: 'common.menu.popover',
    move: 'translate',
  },
  {
    name: "a combobox's list",
    render: () => (
      <Combobox label="Categoria" value="" onValueChange={() => {}} options={OPTIONS} onCreate={() => {}} noun="categoria" toggleLabel="Mostrar categorias" emptyLabel="Nenhuma categoria" />
    ),
    toggle: pressing('Mostrar categorias'),
    shown: there('common.combobox.list'),
    faded: 'common.combobox.list',
    moved: 'common.combobox.list',
    move: 'translate',
  },
  {
    name: "a select's list",
    render: () => <Select label="Ordenar" options={OPTIONS.map((option) => ({ value: option, label: option }))} value="Freios" onValueChange={() => {}} />,
    toggle: pressing('Ordenar'),
    shown: there('common.select.list'),
    faded: 'common.select.list',
    moved: 'common.select.list',
    move: 'translate',
  },
];

/** A movement Animated.timing was asked for: its settings and how to end it. */
type Started = { config: Animated.TimingAnimationConfig; end: () => void };

/** An overlay under test: how to open and close it, whether it is on screen, and its elements that fade and move. */
type Case = {
  name: string;
  render: (open: boolean) => React.ReactElement;
  /** Opens or closes it, by its own controls or by its owner's `open`. */
  toggle: (tree: ReactTestRenderer.ReactTestRenderer, open: boolean) => Promise<void>;
  /** Whether it is on screen: its Modal's `visible`, or its list being there. */
  shown: (tree: ReactTestRenderer.ReactTestRenderer) => boolean;
  /** The style ids of the element that fades and of the one that moves: a dialog fades its backdrop and moves its window. */
  faded: string;
  moved: string;
  move: OverlayMove;
};

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
  jest.restoreAllMocks();
});

/**
 * Turns the phone's motion on, which the test setup turns off, and stands in for Animated.timing.
 * @returns The overlay movements asked for since, the ones that ease; a test ends each with `end`.
 */
function motionOn(): Started[] {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  return standInTiming();
}

/**
 * Renders an element inside the app's providers and waits for the theme to load.
 * @param element The element.
 * @returns The rendered tree.
 */
async function mount(element: React.ReactElement) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'eighties', [THEME_STORAGE_KEYS.mode]: 'night' });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(wrap(element));
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Presses the control with an accessible name.
 * @param tree The rendered tree.
 * @param label The control's accessible name.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const control = tree.root.find((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
  await ReactTestRenderer.act(async () => control.props.onPress());
}

/**
 * Stands in for Animated.timing: each movement waits for the test to end it, which sets its value to its end and calls
 * its callback, as the real one does when it finishes.
 * @returns The movements asked for that ease, the overlays' (a toast's fade doesn't).
 */
function standInTiming(): Started[] {
  const started: Started[] = [];
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
    const animation = {
      start: (done?: (result: { finished: boolean }) => void) => {
        const end = () => {
          (value as Animated.Value).setValue(config.toValue as number);
          done?.({ finished: true });
        };
        if (config.easing) {
          started.push({ config, end });
        }
      },
      stop: () => {},
      reset: () => {},
    };
    return animation as unknown as Animated.CompositeAnimation;
  });
  return started;
}

/**
 * Reads an element's flattened style by its style id.
 * @param tree The rendered tree.
 * @param id The element's style id.
 * @returns Its style, with the animated values as they stand.
 */
function styleOf(tree: ReactTestRenderer.ReactTestRenderer, id: string) {
  const node = tree.root.findAll((found) => found.props.testID === id && typeof found.type === 'string')[0];
  return StyleSheet.flatten(node.props.style);
}

/**
 * Wraps an element in the app's providers.
 * @param element The element.
 * @returns The element inside them.
 */
function wrap(element: React.ReactElement) {
  return (
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider>
        <ToastProvider>{element}</ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Opens and closes an overlay that only fades and moves, and checks it eases in the motion token on the native driver,
// from transparent and 4px up to in place, stays on screen while it goes back, taking no touches, and goes once its
// movement has ended.
test('Mobile: an overlay moves in and out in the motion token, and goes once it has gone back', async () => {
  const started = motionOn();
  const tree = await mount(<Probe open={false} move="translate" />);
  const update = (open: boolean) => ReactTestRenderer.act(async () => tree.update(wrap(<Probe open={open} move="translate" />)));
  expect(tree.root.findAll((node) => node.props.testID === 'probe')).toHaveLength(0);

  await update(true);
  const opening = started.at(-1)!;
  expect(opening.config).toEqual(
    expect.objectContaining({ toValue: 1, duration: scales.motion.durationMs, useNativeDriver: true, easing: expect.any(Function) }),
  );
  expect(styleOf(tree, 'probe')).toMatchObject({ opacity: 0, transform: [{ translateY: -scales.motion.enterShift }] });
  await ReactTestRenderer.act(async () => opening.end());
  expect(styleOf(tree, 'probe')).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }], pointerEvents: 'auto' });

  await update(false);
  const closing = started.at(-1)!;
  expect(closing.config).toEqual(expect.objectContaining({ toValue: 0, duration: scales.motion.durationMs }));
  expect(styleOf(tree, 'probe')).toMatchObject({ pointerEvents: 'none' });
  await ReactTestRenderer.act(async () => closing.end());
  expect(tree.root.findAll((node) => node.props.testID === 'probe')).toHaveLength(0);
});

// Opens a growing overlay with reduced motion, as every test starts, and checks it shows whole and in place at once,
// and goes at once when it closes.
test('Mobile: with reduced motion an overlay shows and goes at once', async () => {
  standInTiming();
  const tree = await mount(<Probe open move="scale" />);
  expect(styleOf(tree, 'probe')).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] });
  await ReactTestRenderer.act(async () => tree.update(wrap(<Probe open={false} move="scale" />)));
  expect(tree.root.findAll((node) => node.props.testID === 'probe')).toHaveLength(0);
});

for (const overlay of CASES) {
  // Opens and closes the overlay with motion on, and checks it fades and grows or slides in, stays on screen while it
  // goes back, taking no touches, and leaves once its movement ends; with reduced motion it opens and goes at once.
  test(`Mobile: ${overlay.name} moves in and out, at once with reduced motion`, async () => {
    const started = motionOn();
    const tree = await mount(overlay.render(false));
    expect(overlay.shown(tree)).toBe(false);
    await overlay.toggle(tree, true);
    expect(overlay.shown(tree)).toBe(true);
    expect(styleOf(tree, overlay.faded)).toMatchObject({ opacity: 0 });
    const entry = overlay.move === 'scale' ? { scale: scales.motion.enterScale } : { translateY: -scales.motion.enterShift };
    expect(styleOf(tree, overlay.moved).transform).toEqual([entry]);
    await ReactTestRenderer.act(async () => started.at(-1)!.end());
    expect(styleOf(tree, overlay.faded)).toMatchObject({ opacity: 1 });

    await overlay.toggle(tree, false);
    expect(overlay.shown(tree)).toBe(true);
    expect(styleOf(tree, overlay.faded)).toMatchObject({ pointerEvents: 'none' });
    await ReactTestRenderer.act(async () => started.at(-1)!.end());
    expect(overlay.shown(tree)).toBe(false);

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const reduced = await mount(overlay.render(false));
    await overlay.toggle(reduced, true);
    expect(styleOf(reduced, overlay.faded)).toMatchObject({ opacity: 1 });
    await overlay.toggle(reduced, false);
    expect(overlay.shown(reduced)).toBe(false);
  });
}

/** A probe of the motion: a box that fades and moves as useOverlayMotion says, while it is shown. */
function Probe({ open, move }: { open: boolean; move: OverlayMove }) {
  const motion = useOverlayMotion(open, move);
  return motion.shown ? <Animated.View testID="probe" style={[motion.fade, motion.moved]} /> : null;
}
