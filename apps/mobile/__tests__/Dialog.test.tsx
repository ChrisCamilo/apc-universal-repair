/**
 * @format
 */

import React, { useState } from 'react';
import { AccessibilityInfo, Animated, Modal, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Circle, Path } from 'react-native-svg';
import ReactTestRenderer from 'react-test-renderer';
import { TOAST_DURATION_MS } from '@apc/shared/dialog';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { TOAST_FADE_MS, TOAST_KIND_LOOKS, TOAST_KINDS, type ToastKind } from '@apc/shared/toast';
import { Button } from '../src/Button';
import { Dialog } from '../src/Dialog';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider, useToast } from '../src/Toast';
import { TOAST_RISE } from '../src/Toast.styles';

const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

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
          <ToastProvider>{element}</ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

/**
 * Reads the flattened style of the View with a testID.
 * @param tree Rendered tree.
 * @param testID The testID to look for.
 * @returns The View's style as one object.
 */
/**
 * Finds the toasts' pills on screen, the leaving ones first.
 * @param tree Rendered tree.
 * @returns The pills' views.
 */
function pills(tree: ReactTestRenderer.ReactTestRenderer): ReactTestRenderer.ReactTestInstance[] {
  return tree.root.findAll((n) => n.props.testID === 'common.toast.message' && typeof n.type === 'string');
}

/**
 * Reads where a toast's fade stands, from its animated style, which moves without rendering again.
 * @param pill The pill's view, from pills().
 * @returns Its opacity and how far below its place it sits, in px.
 */
function fadeOf(pill: ReactTestRenderer.ReactTestInstance): { opacity: number; rise: number } {
  // The Animated.View above the pill's view holds the style with the animated values.
  let node: ReactTestRenderer.ReactTestInstance | null = pill;
  let animated;
  while (node && !animated) {
    animated = [node.props.style].flat(Infinity).find((style) => style && typeof style.opacity === 'object');
    node = node.parent;
  }
  return { opacity: animated.opacity.__getValue(), rise: animated.transform[0].translateY.__getValue() };
}

function styleOf(tree: ReactTestRenderer.ReactTestRenderer, testID: string) {
  const node = tree.root.findAll((n) => n.props.testID === testID && typeof n.type === 'string')[0];
  return Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens a dialog in one style and mode and checks the panel fill and hairline frame, the backdrop of the
    // canvas at 72%, and the danger button's fill and label.
    test(`Mobile: dialogs follow the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(
        style,
        mode,
        <Dialog open onClose={() => {}} title="Excluir item?" size="confirm" actions={<Button variant="danger">Excluir</Button>}>
          <Text>Não dá para desfazer.</Text>
        </Dialog>,
      );
      expect(styleOf(tree, 'common.dialog')).toMatchObject({ backgroundColor: colors.panel, borderColor: colors.hairline });
      expect(styleOf(tree, 'common.dialog.backdrop').backgroundColor).toBe(colors.canvas + 'B8');
      const danger = tree.root.find((n) => typeof n.props.style === 'function');
      expect(StyleSheet.flatten(danger.props.style({ pressed: false }))).toMatchObject({ backgroundColor: colors.danger });
      expect(StyleSheet.flatten(tree.root.findAllByType(Text).find((t) => t.props.children === 'Excluir')!.props.style).color).toBe(colors.onDanger);
    });
  }
}

// Checks a form dialog fits a 360×780 screen with its content scrolling and the actions outside the scroll,
// and that the back button asks the owner to close it.
test('Mobile: long dialogs scroll inside, keep the actions and close on back', async () => {
  const onClose = jest.fn();
  const tree = await mount(
    'eighties',
    'night',
    <Dialog open onClose={onClose} title="Novo item" actions={<Button>Salvar item</Button>}>
      <Text>Campos</Text>
    </Dialog>,
  );
  const window = styleOf(tree, 'common.dialog');
  expect(window.width).toBeLessThanOrEqual(560);
  expect(window.maxHeight).toBeGreaterThan(0);
  const scroll = tree.root.findByType(ScrollView);
  expect(scroll.findAll((n) => n.props.children === 'Salvar item')).toHaveLength(0);
  expect(scroll.findAll((n) => n.props.children === 'Campos').length).toBeGreaterThan(0);

  await ReactTestRenderer.act(async () => tree.root.findByType(Modal).props.onRequestClose());
  expect(onClose).toHaveBeenCalledTimes(1);
});

// Opens a regular dialog and a dismissible one, and checks only the dismissible one has a tap target on the backdrop,
// named for screen readers, which asks the owner to close it.
test('Mobile: only a dismissible dialog closes on a tap outside', async () => {
  const onClose = jest.fn();
  const tree = await mount(
    'gt4',
    'day',
    <>
      <Dialog open onClose={() => {}} title="Novo item" actions={<Button>Salvar item</Button>}>
        <Text>Campos</Text>
      </Dialog>
      <Dialog open onClose={onClose} title="Esqueceu a senha?" size="confirm" dismissible actions={<Button>Entendi</Button>}>
        <Text>Aviso</Text>
      </Dialog>
    </>,
  );
  const outside = tree.root.findAll((n) => n.props.testID === 'common.dialog.outside' && typeof n.props.onPress === 'function');
  expect(outside).toHaveLength(1);
  expect(outside[0].props.accessibilityLabel).toBe('Fechar');
  await ReactTestRenderer.act(async () => outside[0].props.onPress());
  expect(onClose).toHaveBeenCalledTimes(1);
});

// Opens a closable dialog and a regular one, and checks only the closable one has the × named "Fechar", in a row
// after its title, which asks the owner to close it.
test('Mobile: a closable dialog closes on the × beside its title', async () => {
  const onClose = jest.fn();
  const tree = await mount(
    'gt4',
    'day',
    <>
      <Dialog open onClose={onClose} title="Novo item" closable actions={<Button>Salvar item</Button>}>
        <Text>Campos</Text>
      </Dialog>
      <Dialog open onClose={() => {}} title="Excluir item?" size="confirm" actions={<Button>Excluir</Button>}>
        <Text>Aviso</Text>
      </Dialog>
    </>,
  );
  const close = tree.root.findAll(
    (n) => n.props.accessibilityLabel === 'Fechar' && n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function',
  );
  expect(close).toHaveLength(1);
  const head = close[0].parent!.parent!;
  expect(Object.assign({}, ...[head.props.style].flat()).flexDirection).toBe('row');
  expect(head.findAll((n) => n.type === Text && n.props.children === 'Novo item')).not.toHaveLength(0);
  await ReactTestRenderer.act(async () => close[0].props.onPress());
  expect(onClose).toHaveBeenCalledTimes(1);
});

// Shows a success toast and checks it is read out after what is being read and shown in the success color, then hides
// on its own: once its time is up it fades out, hidden from screen readers, and leaves after the fade.
test('Mobile: toasts are read out and hide on their own', async () => {
  jest.useFakeTimers();
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions');
  try {
    const tree = await mount('gt4', 'day', <Trigger />);
    await ReactTestRenderer.act(async () => tree.root.find((n) => typeof n.props.style === 'function').props.onPress());
    expect(announce).toHaveBeenCalledWith('Item adicionado', { queue: true });
    expect(styleOf(tree, 'common.toast.message').backgroundColor).toBe(themes.gt4.day.colors.success);

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(pills(tree).map((pill) => pill.props.accessibilityElementsHidden)).toEqual([true]);
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(TOAST_FADE_MS);
    });
    expect(pills(tree)).toHaveLength(0);
  } finally {
    announce.mockRestore();
    jest.useRealTimers();
  }
});

// Shows a toast from inside an open dialog and checks it draws inside the dialog's Modal, above it, and not at the
// root; once the dialog closes, the toast still showing moves to the root.
test('Mobile: a toast shows above an open dialog', async () => {
  const tree = await mount('gt4', 'day', <DialogWithToast />);
  const toasts = () => tree.root.findAll((n) => n.props.testID === 'common.toast.message' && typeof n.type === 'string');
  await ReactTestRenderer.act(async () => tree.root.find((n) => typeof n.props.style === 'function').props.onPress());
  const modal = tree.root.findByType(Modal);
  expect(toasts()).toHaveLength(1);
  expect(modal.findAll((n) => n.props.testID === 'common.toast.message' && typeof n.type === 'string')).toHaveLength(1);

  await ReactTestRenderer.act(async () => modal.props.onRequestClose());
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
  expect(toasts()).toHaveLength(1);
});

function DialogWithToast() {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Novo item" actions={null}>
      <Trigger />
    </Dialog>
  );
}

function Trigger({ kind = 'success', message = 'Item adicionado' }: { kind?: ToastKind; message?: string }) {
  const toast = useToast();
  return <Button onPress={() => toast[kind](message)}>{message}</Button>;
}

for (const [style, mode] of [
  ['eighties', 'night'],
  ['gt4', 'day'],
] as [Style, Mode][]) {
  // Shows a toast of each kind in one night and one day theme, and checks its pill takes the kind's status color, its
  // message and icon the color drawn on it, its icon is the kind's, and that errors and warnings are read out at once
  // and successes and infos after what is being read.
  test(`Mobile: each toast kind has its color, icon and announcement in ${style}/${mode}`, async () => {
    const urgent = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const polite = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => {});
    const { colors } = themes[style][mode];
    try {
      const tree = await mount(
        style,
        mode,
        <>
          {TOAST_KINDS.map((kind) => (
            <Trigger key={kind} kind={kind} message={`Aviso de ${kind}`} />
          ))}
        </>,
      );
      for (const kind of TOAST_KINDS) {
        const look = TOAST_KIND_LOOKS[kind];
        const trigger = tree.root.find((n) => typeof n.props.style === 'function' && n.findAll((c) => c.props.children === `Aviso de ${kind}`).length > 0);
        await ReactTestRenderer.act(async () => trigger.props.onPress());
        // The toast showing is the last; the one before it is leaving.
        const pill = pills(tree).at(-1)!;
        const label = pill.find((n) => n.props.testID === 'common.toast.message.text' && typeof n.type === 'string');
        expect(StyleSheet.flatten(pill.props.style).backgroundColor).toBe(colors[look.color]);
        expect(StyleSheet.flatten(label.props.style).color).toBe(colors[look.onColor]);
        const icon = pill.find((n) => n.props.testID === 'common.icon' && typeof n.type !== 'string');
        expect(icon.props.stroke).toBe(colors[look.onColor]);
        const drawn = icon.findAll((n) => n.type === Path || n.type === Circle);
        expect(drawn.map((n) => n.props.d ?? n.props.r)).toEqual(look.icon.map((shape) => (shape.kind === 'path' ? shape.d : shape.kind === 'circle' ? shape.r : null)));
        expect((look.urgent ? urgent : polite).mock.lastCall?.[0]).toBe(`Aviso de ${kind}`);
      }
      expect(urgent.mock.calls.map(([message]) => message)).toEqual(['Aviso de error', 'Aviso de warning']);
    } finally {
      urgent.mockRestore();
      polite.mockRestore();
    }
  });
}

// Shows a toast and then another, and checks the first starts transparent, below its place, and fades in to full
// opacity in the toasts' fade time on the native driver; once replaced it fades out under the second, hidden from
// screen readers, and leaves after the fade.
test('Mobile: a toast fades in, and fades out under the one replacing it', async () => {
  jest.useFakeTimers();
  const timing = jest.spyOn(Animated, 'timing');
  try {
    const tree = await mount(
      'eighties',
      'night',
      <>
        <Trigger message="Item adicionado" />
        <Trigger kind="error" message="Não foi possível excluir o item. Tente de novo." />
      </>,
    );
    const press = (message: string) =>
      ReactTestRenderer.act(async () =>
        tree.root.find((n) => typeof n.props.style === 'function' && n.findAll((c) => c.props.children === message).length > 0).props.onPress(),
      );
    const fades = () => timing.mock.calls.map(([, config]) => config);
    await press('Item adicionado');
    expect(fadeOf(pills(tree)[0])).toEqual({ opacity: 0, rise: TOAST_RISE });
    expect(fades()).toEqual([{ toValue: 1, duration: TOAST_FADE_MS, useNativeDriver: true }]);

    await press('Não foi possível excluir o item. Tente de novo.');
    const [old, next] = pills(tree);
    expect(old.props.accessibilityElementsHidden).toBe(true);
    expect(StyleSheet.flatten(old.props.style)).toMatchObject({ position: 'absolute', bottom: 0 });
    expect(next.props.accessibilityElementsHidden).toBe(false);
    expect(fades().slice(1)).toEqual(
      expect.arrayContaining([
        { toValue: 0, duration: TOAST_FADE_MS, useNativeDriver: true },
        { toValue: 1, duration: TOAST_FADE_MS, useNativeDriver: true },
      ]),
    );
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(TOAST_FADE_MS);
    });
    expect(pills(tree)).toHaveLength(1);
  } finally {
    timing.mockRestore();
    jest.useRealTimers();
  }
});

// Turns on reduced motion and checks a toast shows at full opacity, in its place, without fading in.
test('Mobile: with reduced motion a toast shows at once', async () => {
  const reduce = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  try {
    const tree = await mount('eighties', 'night', <Trigger />);
    await ReactTestRenderer.act(async () => tree.root.find((n) => typeof n.props.style === 'function').props.onPress());
    expect(fadeOf(pills(tree)[0])).toEqual({ opacity: 1, rise: 0 });
  } finally {
    reduce.mockRestore();
  }
});
