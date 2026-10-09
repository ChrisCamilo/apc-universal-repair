/**
 * @format
 */

import React, { useState } from 'react';
import { Image, StyleSheet, Text, type ViewStyle } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { ITEM_PHOTO_LIMIT } from '@apc/shared/photos';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { ImageUpload, type PickedPhoto, type UploadPhoto } from '../src/ImageUpload';
import { themeStorage, ThemeProvider } from '../src/theme';

const MB = 1024 * 1024;
const SAVED: UploadPhoto[] = ['a', 'b', 'c'].map((name) => ({ url: `file:///saved/${name}.jpg` }));

/**
 * Saves a style and mode, renders the element inside a ThemeProvider and waits for it to load them.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @param element Element to render.
 * @returns The rendered tree.
 */
async function mount(style: Style, mode: Mode, element: React.ReactElement) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  return tree!;
}

/**
 * Makes a photo as the picker returns it.
 * @param name File name.
 * @param type MIME type.
 * @param size Size in bytes; defaults to 1 KB.
 * @returns The picked photo.
 */
function picked(name: string, type: string, size = 1024): PickedPhoto {
  return { url: `file:///picked/${name}`, name, type, size };
}

/**
 * Presses the pressable with a testID or an accessible name.
 * @param tree Rendered tree.
 * @param id testID or accessibility label.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, id: string) {
  const node = tree.root.find(
    (n) => typeof n.props.style === 'function' && (n.props.testID === id || n.props.accessibilityLabel === id),
  );
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Lists every text shown.
 * @param tree Rendered tree.
 * @returns The texts, in order.
 */
function texts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map((t) => [t.props.children].flat().join(''));
}

/**
 * Reads the photos shown, by their accessible names.
 * @param tree Rendered tree.
 * @returns E.g. ["Foto 1, capa", "Foto 2"].
 */
function shown(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAllByType(Image).map((image) => image.props.accessibilityLabel);
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the field in one style and mode, picks a GIF, and checks the area to tap is a dashed hairline
    // on the raised fill and the message is in the danger color.
    test(`Mobile: the photo field follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Sample initial={[]} pick={[picked('motor.gif', 'image/gif')]} />);
      const drop = tree.root.find((n) => n.props.testID === 'common.image-upload.drop' && typeof n.props.style === 'function');
      const frame: ViewStyle = StyleSheet.flatten(drop.props.style({ pressed: false }));
      expect(frame).toMatchObject({ borderStyle: 'dashed', borderColor: colors.hairline, backgroundColor: colors.panelRaised });
      await press(tree, 'common.image-upload.drop');
      const message = tree.root.findAll((n) => n.type === Text && n.props.children === 'motor.gif: não é JPG, PNG ou WebP');
      expect(StyleSheet.flatten(message[0].props.style).color).toBe(colors.danger);
    });
  }
}

// Picks several photos at once on an empty field and checks the good ones become thumbnails in order, the
// first marked as the cover, while a GIF and a photo over 3 MB are left out and named with their reasons.
test('Mobile: picking keeps the good photos and names each one left out', async () => {
  const pick = [
    picked('frente.jpg', 'image/jpeg'),
    picked('motor.gif', 'image/gif'),
    picked('lado.png', 'image/png', 4.2 * MB),
    picked('traseira.webp', 'image/webp'),
  ];
  const tree = await mount('eighties', 'night', <Sample initial={[]} pick={pick} />);
  expect(texts(tree)).toContain('Toque para escolher até 3 fotos');
  await press(tree, 'common.image-upload.drop');
  expect(shown(tree)).toEqual(['Foto 1, capa', 'Foto 2']);
  expect(texts(tree)).toEqual(
    expect.arrayContaining([
      'capa',
      'motor.gif: não é JPG, PNG ou WebP',
      'lado.png: tem 4,2 MB, e o limite é 3 MB',
      'Toque para escolher mais 1 foto',
    ]),
  );
});

// Picks two photos with two held and checks one is taken, the one past the limit is named, and the area to
// tap disappears; then removes a photo and checks the message clears and the area comes back.
test('Mobile: the field fills up to the limit and frees a place on remove', async () => {
  const pick = [picked('frente.jpg', 'image/jpeg'), picked('painel.jpg', 'image/jpeg')];
  const tree = await mount('fiat90', 'day', <Sample initial={SAVED.slice(0, 2)} pick={pick} />);
  await press(tree, 'common.image-upload.drop');
  expect(shown(tree)).toHaveLength(ITEM_PHOTO_LIMIT);
  expect(texts(tree)).toContain('painel.jpg: passou do limite de 3 fotos');
  expect(tree.root.findAll((n) => n.props.testID === 'common.image-upload.drop')).toHaveLength(0);

  await press(tree, 'Remover foto 1');
  expect(shown(tree)).toEqual(['Foto 1, capa', 'Foto 2']);
  expect(texts(tree)).not.toContain('painel.jpg: passou do limite de 3 fotos');
  expect(tree.root.findAll((n) => n.props.testID === 'common.image-upload.drop').length).toBeGreaterThan(0);
});

// Cancels the picker and checks nothing changes.
test('Mobile: canceling the picker leaves the field as it was', async () => {
  const onChange = jest.fn();
  const tree = await mount('gt4', 'night', <Sample initial={SAVED.slice(0, 1)} pick={[]} onChange={onChange} />);
  await press(tree, 'common.image-upload.drop');
  expect(onChange).not.toHaveBeenCalled();
  expect(shown(tree)).toEqual(['Foto 1, capa']);
});

// Shows the field read-only with two photos and with none, and checks the photos show with the cover marked but
// nothing can be removed or added, and an empty field says there are no photos.
test('Mobile: a read-only photo field only shows the photos', async () => {
  const pick = jest.fn(async () => []);
  const tree = await mount(
    'eighties',
    'night',
    <>
      <ImageUpload label="Fotos do item" photos={SAVED.slice(0, 2)} onPhotosChange={() => {}} limit={ITEM_PHOTO_LIMIT} onPick={pick} readOnly />
      <ImageUpload label="Fotos vazias" photos={[]} onPhotosChange={() => {}} limit={ITEM_PHOTO_LIMIT} onPick={pick} readOnly />
    </>,
  );
  expect(shown(tree)).toEqual(['Foto 1, capa', 'Foto 2']);
  expect(tree.root.findAll((n) => n.props.accessibilityRole === 'button')).toHaveLength(0);
  expect(texts(tree)).toContain('Sem fotos');
});

function Sample({ initial, pick, onChange }: { initial: UploadPhoto[]; pick: PickedPhoto[]; onChange?: () => void }) {
  const [photos, setPhotos] = useState(initial);
  return (
    <ImageUpload
      label="Fotos do item"
      photos={photos}
      onPhotosChange={(next) => {
        setPhotos(next);
        onChange?.();
      }}
      limit={ITEM_PHOTO_LIMIT}
      onPick={async () => pick}
    />
  );
}
