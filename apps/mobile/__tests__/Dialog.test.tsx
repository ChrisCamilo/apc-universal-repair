/**
 * @format
 */

import React, { useState } from 'react';
import { AccessibilityInfo, Modal, ScrollView, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { TOAST_DURATION_MS } from '@apc/shared/dialog';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Button } from '../src/Button';
import { Dialog } from '../src/Dialog';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider, useToast } from '../src/Toast';

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
      expect(styleOf(tree, 'dialog-window')).toMatchObject({ backgroundColor: colors.panel, borderColor: colors.hairline });
      expect(styleOf(tree, 'dialog-backdrop').backgroundColor).toBe(colors.canvas + 'B8');
      const danger = tree.root.find((n) => typeof n.props.style === 'function');
      expect(danger.props.style({ pressed: false })).toMatchObject({ backgroundColor: colors.danger });
      expect(tree.root.findAllByType(Text).find((t) => t.props.children === 'Excluir')!.props.style.color).toBe(colors.onDanger);
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
  const window = styleOf(tree, 'dialog-window');
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
  const outside = tree.root.findAll((n) => n.props.testID === 'dialog-outside' && typeof n.props.onPress === 'function');
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

// Shows a toast and checks it is read out and shown in the text color turned around, then hides on its own.
test('Mobile: toasts are read out and hide on their own', async () => {
  jest.useFakeTimers();
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  try {
    const tree = await mount('gt4', 'day', <Trigger />);
    await ReactTestRenderer.act(async () => tree.root.find((n) => typeof n.props.style === 'function').props.onPress());
    expect(announce).toHaveBeenCalledWith('Item adicionado');
    expect(styleOf(tree, 'toast').backgroundColor).toBe(themes.gt4.day.colors.text);

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(tree.root.findAll((n) => n.props.testID === 'toast')).toHaveLength(0);
  } finally {
    announce.mockRestore();
    jest.useRealTimers();
  }
});

// Shows a toast from inside an open dialog and checks it draws inside the dialog's Modal, above it, and not at the
// root; once the dialog closes, the toast still showing moves to the root.
test('Mobile: a toast shows above an open dialog', async () => {
  const tree = await mount('gt4', 'day', <DialogWithToast />);
  const toasts = () => tree.root.findAll((n) => n.props.testID === 'toast' && typeof n.type === 'string');
  await ReactTestRenderer.act(async () => tree.root.find((n) => typeof n.props.style === 'function').props.onPress());
  const modal = tree.root.findByType(Modal);
  expect(toasts()).toHaveLength(1);
  expect(modal.findAll((n) => n.props.testID === 'toast' && typeof n.type === 'string')).toHaveLength(1);

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

function Trigger() {
  const toast = useToast();
  return <Button onPress={() => toast('Item adicionado')}>Adicionar</Button>;
}
