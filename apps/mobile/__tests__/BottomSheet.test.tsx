import React from 'react';
import { Dimensions, Modal, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { SHEET_HANDLE, SHEET_RADIUS, SHEET_TOP_INSET } from '@apc/shared/dialog';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { BottomSheet } from '../src/BottomSheet';
import { Button } from '../src/Button';
import { themeStorage, ThemeProvider, withAlpha } from '../src/theme';

/** A phone's bottom inset for its home indicator, in px. */
const HOME_INDICATOR = 24;
/** The trees each test renders, unmounted after it. */
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
/** A 360×780 phone with a home indicator at the bottom. */
const SAFE_AREA = {
  frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT },
  insets: { top: 0, left: 0, right: 0, bottom: HOME_INDICATOR },
};

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

/**
 * Saves a style and mode, renders the element inside the app's providers and waits for the theme to load.
 * @param element The element.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @returns The rendered tree.
 */
async function mount(element: React.ReactElement, style: Style = 'eighties', mode: Mode = 'night') {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>{element}</ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Reads an element's flattened style by its style id.
 * @param tree The rendered tree.
 * @param id The element's style id.
 * @returns Its style.
 */
function styleOf(tree: ReactTestRenderer.ReactTestRenderer, id: string) {
  const node = tree.root.findAll((found) => found.props.testID === id && typeof found.type === 'string')[0];
  return StyleSheet.flatten(node.props.style);
}

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens a sheet in one style and mode and checks it is docked to the bottom across the screen, with the panel
    // fill, rounded top corners and the handle's bar, over the canvas at 72%.
    test(`Mobile: bottom sheets follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode];
      const tree = await mount(<Sheet open />, style, mode);
      expect(styleOf(tree, 'common.bottom-sheet.backdrop')).toMatchObject({
        justifyContent: 'flex-end',
        backgroundColor: withAlpha(theme.colors.canvas, scales.backdrop.opacity),
      });
      expect(styleOf(tree, 'common.bottom-sheet')).toMatchObject({
        width: '100%',
        backgroundColor: theme.colors.panel,
        borderTopLeftRadius: SHEET_RADIUS,
        borderTopRightRadius: SHEET_RADIUS,
      });
      expect(styleOf(tree, 'common.bottom-sheet.handle.bar')).toMatchObject({
        width: SHEET_HANDLE.width,
        height: SHEET_HANDLE.height,
        backgroundColor: theme.colors.hairline,
      });
    });
  }
}

// Opens a sheet and checks it is labelled by its title for screen readers and stops SHEET_TOP_INSET below the top of
// the screen, with the footer padded above the home indicator.
test('Mobile: a bottom sheet is named by its title, stops below the top and keeps clear of the home indicator', async () => {
  const tree = await mount(<Sheet open />);
  const sheet = tree.root.findAll((node) => node.props.testID === 'common.bottom-sheet' && typeof node.type === 'string')[0];
  expect(sheet.props).toMatchObject({ accessibilityViewIsModal: true, accessibilityLabel: 'Mais ações' });
  expect(styleOf(tree, 'common.bottom-sheet').maxHeight).toBe(Dimensions.get('window').height - SHEET_TOP_INSET);
  expect(styleOf(tree, 'common.bottom-sheet.footer').paddingBottom).toBe(scales.space.s4 + HOME_INDICATOR);
});

// Taps the backdrop above the sheet, then presses Android's back button on another, and checks each asks the owner to
// close it.
test('Mobile: a bottom sheet closes on a tap on the backdrop and on the back button', async () => {
  const onTap = jest.fn();
  const tapped = await mount(<Sheet open onClose={onTap} />);
  const outside = tapped.root.find((node) => node.props.testID === 'common.bottom-sheet.outside' && typeof node.props.onPress === 'function');
  await ReactTestRenderer.act(async () => outside.props.onPress());
  expect(onTap).toHaveBeenCalledTimes(1);

  const onBack = jest.fn();
  const back = await mount(<Sheet open onClose={onBack} />);
  await ReactTestRenderer.act(async () => back.root.findByType(Modal).props.onRequestClose());
  expect(onBack).toHaveBeenCalledTimes(1);
});

// Renders a closed sheet and checks nothing is on screen until it opens.
test('Mobile: a closed bottom sheet shows nothing', async () => {
  const tree = await mount(<Sheet open={false} />);
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
  expect(tree.root.findAll((node) => node.props.children === 'Importar CSV')).toHaveLength(0);
});

function Sheet({ open, onClose = () => {} }: { open: boolean; onClose?: () => void }) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Mais ações"
      action={
        <Button variant="ghost" size="sm" onPress={() => {}}>
          Limpar
        </Button>
      }
      footer={<Button onPress={() => {}}>Ver itens</Button>}
    >
      <Text>Importar CSV</Text>
    </BottomSheet>
  );
}
