/**
 * @format
 */

import React, { useState } from 'react';
import { Image, Modal, Text, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { ITEM_PHOTO_LIMIT } from '@apc/shared/photos';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import type { PickedPhoto, UploadPhoto } from '../src/ImageUpload';
import { ImageViewer } from '../src/ImageViewer';
import { themeStorage, ThemeProvider } from '../src/theme';

// Trees the test rendered, unmounted after it so the toast's hide timer doesn't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
const NAME = 'Pastilha de freio dianteira';
const PHOTOS: UploadPhoto[] = ['a', 'b', 'c'].map((name) => ({ url: `file:///saved/${name}.jpg` }));
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
        <ThemeProvider>{element}</ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Finds the pressable with an accessible name or a visible label, inside a part of the tree.
 * @param root Where to look.
 * @param name Accessibility label or text.
 * @returns The Pressable test instance.
 */
function pressable(root: ReactTestRenderer.ReactTestInstance, name: string): ReactTestRenderer.ReactTestInstance {
  return root.find(
    (n) =>
      typeof n.props.onPress === 'function' &&
      (typeof n.props.style === 'function' || typeof n.type !== 'string') &&
      n.props.accessibilityRole === 'button' &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  );
}

/**
 * Presses a pressable found by name.
 * @param root Where to look.
 * @param name Accessibility label or text.
 */
async function press(root: ReactTestRenderer.ReactTestInstance, name: string) {
  const node = pressable(root, name);
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Reads which photo is on screen, by its accessible name.
 * @param tree Rendered tree.
 * @returns E.g. "Foto 2 de 3 · Pastilha de freio dianteira", or null with no photo.
 */
function onScreen(tree: ReactTestRenderer.ReactTestRenderer): string | null {
  return tree.root.findAllByType(Image)[0]?.props.accessibilityLabel ?? null;
}

/**
 * Lists every text shown in a part of the tree.
 * @param root Where to look.
 * @returns The texts, in order.
 */
function texts(root: ReactTestRenderer.ReactTestInstance): string[] {
  return root.findAllByType(Text).map((t) => [t.props.children].flat().join(''));
}

/**
 * Finds the viewer's own Modal, the first one; the remove confirmation opens a second one inside it.
 * @param tree Rendered tree.
 * @returns The viewer Modal.
 */
function viewer(tree: ReactTestRenderer.ReactTestRenderer): ReactTestRenderer.ReactTestInstance {
  return tree.root.findAllByType(Modal)[0];
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the viewer in one style and mode and checks the window is the panel framed in the hairline, and
    // the dot of the photo on screen is the accent while the others are the hairline.
    test(`Mobile: the photo viewer follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Sample initial={PHOTOS} />);
      const window = tree.root.find((n) => n.props.testID === 'viewer-window' && typeof n.type === 'string');
      expect(window.props.style).toMatchObject({ backgroundColor: colors.panel, borderColor: colors.hairline });
      const dot = (name: string): ViewStyle => pressable(tree.root, name).props.style;
      expect(dot('Foto 1').backgroundColor).toBe(colors.accent);
      expect(dot('Foto 2').backgroundColor).toBe(colors.hairline);
    });
  }
}

// Opens the viewer and checks the name and code head it, the photo is never cropped, and the arrows wrap
// around while the dots jump to a photo.
test('Mobile: the viewer shows the item and moves through the photos, wrapping around', async () => {
  const tree = await mount('eighties', 'night', <Sample initial={PHOTOS} />);
  expect(texts(tree.root)).toEqual(expect.arrayContaining([NAME, 'FR-0142']));
  expect(tree.root.findAllByType(Image)[0].props.resizeMode).toBe('contain');
  await press(tree.root, 'Foto anterior');
  expect(onScreen(tree)).toBe(`Foto 3 de 3 · ${NAME}`);
  await press(tree.root, 'Próxima foto');
  expect(onScreen(tree)).toBe(`Foto 1 de 3 · ${NAME}`);
  await press(tree.root, 'Foto 2');
  expect(onScreen(tree)).toBe(`Foto 2 de 3 · ${NAME}`);
  expect(pressable(tree.root, 'Foto 2').props.accessibilityState).toEqual({ selected: true });
});

// Opens a viewer with one photo and one with none, and checks a single photo has no arrows or dots, and the
// empty viewer says so and only offers to add a photo.
test('Mobile: one photo has no arrows, and no photo shows the empty state', async () => {
  const one = await mount('gt4', 'day', <Sample initial={PHOTOS.slice(0, 1)} />);
  expect(() => pressable(one.root, 'Próxima foto')).toThrow();
  expect(() => pressable(one.root, 'Foto 1')).toThrow();

  const none = await mount('gt4', 'day', <Sample initial={[]} />);
  expect(texts(none.root)).toEqual(expect.arrayContaining(['Este item ainda não tem fotos', 'Adicionar foto']));
  expect(texts(none.root)).not.toContain('Remover esta foto');
});

// Closes the viewer with the ×, a tap outside and the back button, and checks each one asks the owner to close.
test('Mobile: the ×, a tap outside and the back button close the viewer', async () => {
  const onClose = jest.fn();
  const tree = await mount('bmw90', 'night', <Sample initial={PHOTOS} onClose={onClose} />);
  await press(tree.root, 'Fechar');
  const outside = tree.root.find((n) => n.props.testID === 'viewer-outside' && typeof n.props.onPress === 'function');
  await ReactTestRenderer.act(async () => outside.props.onPress());
  await ReactTestRenderer.act(async () => viewer(tree).props.onRequestClose());
  expect(onClose).toHaveBeenCalledTimes(3);
});

// Asks to remove the cover and checks the confirmation names the item and warns about the cover; Cancel
// keeps it, Remover takes it out, the next photo takes its place, and the toast shows inside the viewer.
test('Mobile: removing a photo asks first and the next one takes its place', async () => {
  const tree = await mount('fiat90', 'night', <Sample initial={PHOTOS} />);
  await press(tree.root, 'Remover esta foto');
  const confirm = tree.root.findAllByType(Modal)[1];
  expect(confirm.props.visible).toBe(true);
  expect(texts(confirm)).toContain(
    `Esta foto sai de ${NAME} (FR-0142). Essa ação não pode ser desfeita. Ela é a capa; a próxima foto passa a ser a capa na lista.`,
  );
  await press(confirm, 'Cancelar');
  expect(tree.root.findAllByType(Modal)[1].props.visible).toBe(false);
  expect(tree.root.findAllByType(Image)).toHaveLength(1);

  await press(tree.root, 'Remover esta foto');
  await press(tree.root.findAllByType(Modal)[1], 'Remover');
  expect(onScreen(tree)).toBe(`Foto 1 de 2 · ${NAME}`);
  expect(tree.root.findAllByType(Image)[0].props.source.uri).toBe(PHOTOS[1].url);
  const toast = viewer(tree).find((n) => n.props.testID === 'toast' && typeof n.type === 'string');
  expect(texts(toast)).toEqual(['Foto removida']);
});

// Adds a photo, changes the one on screen and tries a GIF, and checks the new photo is shown and counted,
// "Adicionar foto" leaves at the limit, the change replaces the photo in place, and the GIF is refused with
// the ImageUpload message.
test('Mobile: adding and changing photos follow the upload rules', async () => {
  const picks: PickedPhoto[][] = [
    [{ url: 'file:///picked/nova.png', name: 'nova.png', type: 'image/png', size: 10 }],
    [{ url: 'file:///picked/troca.jpg', name: 'troca.jpg', type: 'image/jpeg', size: 10 }],
    [{ url: 'file:///picked/motor.gif', name: 'motor.gif', type: 'image/gif', size: 10 }],
  ];
  const tree = await mount('eighties', 'day', <Sample initial={PHOTOS.slice(0, 2)} picks={picks} />);
  expect(texts(tree.root)).toContain('JPG, PNG ou WebP, até 3 MB · 2 de 3 fotos');
  await press(tree.root, 'Adicionar foto');
  expect(onScreen(tree)).toBe(`Foto 3 de 3 · ${NAME}`);
  expect(texts(tree.root)).toEqual(
    expect.arrayContaining(['Foto adicionada', 'Limite de 3 fotos atingido. Troque ou remova uma para adicionar outra.']),
  );
  expect(texts(tree.root)).not.toContain('Adicionar foto');

  await press(tree.root, 'Foto 1');
  await press(tree.root, 'Trocar esta foto');
  expect(tree.root.findAllByType(Image)[0].props.source.uri).toBe('file:///picked/troca.jpg');
  expect(texts(tree.root)).toContain('Foto trocada');

  await press(tree.root, 'Trocar esta foto');
  expect(texts(tree.root)).toContain('motor.gif: não é JPG, PNG ou WebP');
  expect(tree.root.findAllByType(Image)[0].props.source.uri).toBe('file:///picked/troca.jpg');
});

function Sample({ initial, onClose, picks = [] }: { initial: UploadPhoto[]; onClose?: () => void; picks?: PickedPhoto[][] }) {
  const [photos, setPhotos] = useState(initial);
  const [queue] = useState(() => [...picks]);
  return (
    <ImageViewer
      open
      onClose={onClose ?? (() => {})}
      name={NAME}
      code="FR-0142"
      photos={photos}
      onPhotosChange={setPhotos}
      limit={ITEM_PHOTO_LIMIT}
      onPick={async () => queue.shift() ?? []}
    />
  );
}
