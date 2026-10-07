import { useState } from 'react';
import { Image, Modal, Pressable, Text as NativeText, View, useWindowDimensions, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { DIALOG_SCREEN_INSET, DIALOG_WIDTHS } from '@apc/shared/dialog';
import { chevronIcon, closeIcon, imageIcon } from '@apc/shared/icons';
import { photoCount, takePhotos } from '@apc/shared/photos';
import { popShadow, scales } from '@apc/shared/theme';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import type { PickedPhoto, UploadPhoto } from './ImageUpload';
import { softHairline } from './Panel';
import { fontFamily, useTheme, withAlpha, type ActiveTheme } from './theme';
import { ToastProvider, useToast } from './Toast';
import { Heading, NumericReadout, Text } from './Typography';

// A large view of an item's photos, the same as the web: one photo at a time, as large as the screen allows
// and never cropped, under the item's name and code. With more than one photo, arrows over the photo move
// through them, wrapping around, and dots under it show which one is on screen and jump to a photo. It closes
// on the ×, on the back button and on a tap outside. "Remover esta foto" asks first, naming the item and
// warning when the photo is the cover; the next photo takes its place. "Trocar esta foto" replaces the one on
// screen and "Adicionar foto" shows while there is room, both through the owner's picker and with the
// ImageUpload rules and messages. The owner may save each change as it happens: when it says the change couldn't be
// saved, the toast says so instead of confirming it. Toasts show inside the viewer, above the rest of the app.

const ACTIONS_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 };
const BODY_STYLE: ViewStyle = { gap: scales.space.s3, padding: scales.space.s4 };
// The dots under the photo are small round marks.
const DOT_SIZE = scales.space.s2 + scales.space.s1 / 2;
const DOTS_STYLE: ViewStyle = { flexDirection: 'row', justifyContent: 'center', gap: scales.space.s2 };
const EMPTY_STYLE: ViewStyle = { alignItems: 'center', gap: scales.space.s2, padding: scales.space.s5 };
// The chevron points right; turned around, it points to the previous photo.
const FLIP_STYLE: ViewStyle = { transform: [{ rotate: '180deg' }] };
// The frame is 4:3 and never taller than this share of the screen.
const FRAME_MAX_SHARE = 0.62;
const HEAD_STYLE: ViewStyle = { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: scales.space.s3 };
const NAME_STYLE: ViewStyle = { flexShrink: 1, gap: scales.space.s1 / 2 };
// The arrows are 40px and sit a little in from the frame's sides.
const NAV_INSET = scales.space.s2 + scales.space.s1 / 2;
const NAV_SIZE = scales.space.s6 + scales.space.s2;
const OUTSIDE_STYLE: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
const PHOTO_STYLE: ImageStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };

type ImageViewerProps = {
  open: boolean;
  /** Called on the ×, on the back button and on a tap outside; the owner closes the viewer by setting `open` to false. */
  onClose: () => void;
  /** Item name, shown above the photo and named in the remove confirmation. */
  name: string;
  /** Item code, shown under the name. */
  code: string;
  photos: readonly UploadPhoto[];
  /** Takes the changed photos; resolving to false says they couldn't be saved. */
  onPhotosChange: (photos: UploadPhoto[]) => void | Promise<boolean>;
  /** Most photos the item holds, e.g. ITEM_PHOTO_LIMIT. */
  limit: number;
  /** Opens the phone's photo picker and resolves with the photos chosen, none when the user cancels. */
  onPick: () => Promise<PickedPhoto[]>;
};

/**
 * Styles the backdrop: the canvas at the backdrop opacity, centering the window.
 * @param theme Active theme.
 * @returns Style for the backdrop View.
 */
function backdropStyle(theme: ActiveTheme): ViewStyle {
  return {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(theme.colors.canvas, scales.backdrop.opacity),
  };
}

/**
 * Styles a dot under the photo: the accent with the glow for the photo on screen, the hairline for the others.
 * @param theme Active theme.
 * @param on Whether its photo is on screen.
 * @returns Style for the dot Pressable.
 */
function dotStyle(theme: ActiveTheme, on: boolean): ViewStyle {
  return {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: scales.radiusPill,
    backgroundColor: on ? theme.colors.accent : theme.colors.hairline,
  };
}

/**
 * Styles the photo frame: 4:3 on the canvas in a soft hairline, never taller than its share of the screen.
 * @param theme Active theme.
 * @param screenHeight Window height.
 * @returns Style for the frame View.
 */
function frameStyle(theme: ActiveTheme, screenHeight: number): ViewStyle {
  return {
    width: '100%',
    aspectRatio: 4 / 3,
    maxHeight: screenHeight * FRAME_MAX_SHARE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: scales.hairline,
    borderColor: softHairline(theme),
    borderRadius: theme.radiusTile,
    backgroundColor: theme.colors.canvas,
  };
}

/**
 * Places an arrow over the middle of the photo, on its side.
 * @param side "prev" on the left, "next" on the right.
 * @returns Absolute style of the arrow.
 */
function navSpot(side: 'prev' | 'next'): ViewStyle {
  return { position: 'absolute', top: '50%', marginTop: -NAV_SIZE / 2, [side === 'prev' ? 'left' : 'right']: NAV_INSET };
}

/**
 * Styles a message about a photo left out: small text in the danger color.
 * @param theme Active theme.
 * @returns Style for the message Text.
 */
function problemStyle(theme: ActiveTheme): TextStyle {
  return { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.danger };
}

/**
 * Styles a round button with a hairline frame: the × in the header and the arrows over the photo.
 * @param theme Active theme.
 * @param size Width and height, in px.
 * @param pressed Whether it is being pressed; the frame and the icon then turn to the accent.
 * @returns Style for the button Pressable.
 */
function roundStyle(theme: ActiveTheme, size: number, pressed: boolean): ViewStyle {
  return {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: scales.hairline,
    borderColor: pressed ? theme.colors.accent : theme.colors.hairline,
    borderRadius: scales.radiusPill,
    backgroundColor: theme.colors.panel,
  };
}

/**
 * Styles the window: the panel in its hairline frame, as wide as the viewer size allows on the screen.
 * @param theme Active theme.
 * @param screen Window width and height.
 * @returns Style for the window View.
 */
function windowStyle(theme: ActiveTheme, screen: { width: number; height: number }): ViewStyle {
  return {
    width: Math.min(DIALOG_WIDTHS.viewer, screen.width - DIALOG_SCREEN_INSET),
    maxHeight: screen.height - DIALOG_SCREEN_INSET,
    borderWidth: scales.hairline,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radiusPanel,
    backgroundColor: theme.colors.panel,
    boxShadow: popShadow(),
  };
}

export function ImageViewer({ open, onClose, ...rest }: ImageViewerProps) {
  const theme = useTheme();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ToastProvider>
        <View style={backdropStyle(theme)}>
          <Pressable accessibilityLabel="Fechar" onPress={onClose} style={OUTSIDE_STYLE} testID="viewer-outside" />
          <ViewerBody onClose={onClose} {...rest} />
        </View>
      </ToastProvider>
    </Modal>
  );
}

function ViewerBody({ onClose, name, code, photos, onPhotosChange, limit, onPick }: Omit<ImageViewerProps, 'open'>) {
  const theme = useTheme();
  const screen = useWindowDimensions();
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const count = photos.length;
  // After a removal the index may point past the end; the last photo shows instead.
  const current = Math.min(index, Math.max(0, count - 1));
  const full = count >= limit;
  const { colors } = theme;

  /** Moves to the previous or the next photo, wrapping around the ends. */
  const step = (delta: number) => setIndex((current + delta + count) % count);

  /** Hands the changed photos over, then confirms the change or says it couldn't be saved. */
  const change = async (next: UploadPhoto[], done: string) => {
    const saved = await onPhotosChange(next);
    toast(saved === false ? 'Não foi possível salvar as fotos. Tente de novo.' : done);
  };

  /** Opens the picker and adds the photo chosen, or puts it in place of the one on screen. */
  const choose = async (replace: boolean) => {
    const [file] = await onPick();
    if (!file) {
      return;
    }
    const { accepted, problems: leftOut } = replace ? takePhotos([file], 0, 1) : takePhotos([file], count, limit);
    setProblems(leftOut);
    if (accepted.length === 0) {
      return;
    }
    const photo = { url: file.url, file };
    if (replace) {
      await change(
        photos.map((p, i) => (i === current ? photo : p)),
        'Foto trocada',
      );
    } else {
      setIndex(count);
      await change([...photos, photo], 'Foto adicionada');
    }
  };

  /** Removes the photo on screen after the confirmation; the next one takes its place. */
  const remove = async () => {
    setConfirming(false);
    setProblems([]);
    await change(
      photos.filter((_, i) => i !== current),
      'Foto removida',
    );
  };

  return (
    <View accessibilityViewIsModal accessibilityLabel={name} style={windowStyle(theme, screen)} testID="viewer-window">
      <View style={BODY_STYLE}>
        <View style={HEAD_STYLE}>
          <View style={NAME_STYLE}>
            <Heading level={3}>{name}</Heading>
            <NumericReadout tone="muted">{code}</NumericReadout>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={scales.space.s1}
            onPress={onClose}
            style={({ pressed }) => roundStyle(theme, scales.space.s6 + scales.space.s1, pressed)}
          >
            {({ pressed }) => <Icon icon={closeIcon} color={pressed ? colors.accent : colors.text} />}
          </Pressable>
        </View>
        <View>
          <View style={frameStyle(theme, screen.height)}>
            {count > 0 ? (
              <Image
                source={{ uri: photos[current].url }}
                resizeMode="contain"
                accessibilityLabel={`Foto ${current + 1} de ${count} · ${name}`}
                style={PHOTO_STYLE}
              />
            ) : (
              <View style={EMPTY_STYLE}>
                <Icon icon={imageIcon} size={56} color={colors.textMuted} />
                <Heading level={4}>Este item ainda não tem fotos</Heading>
                <Text size="sm" tone="muted">
                  {`Adicione até ${photoCount(limit)}. A primeira vira a capa na lista.`}
                </Text>
              </View>
            )}
          </View>
          {count > 1 &&
            (['prev', 'next'] as const).map((side) => (
              <Pressable
                key={side}
                accessibilityRole="button"
                accessibilityLabel={side === 'prev' ? 'Foto anterior' : 'Próxima foto'}
                onPress={() => step(side === 'prev' ? -1 : 1)}
                style={({ pressed }) => [roundStyle(theme, NAV_SIZE, pressed), navSpot(side)]}
              >
                {({ pressed }) => (
                  <View style={side === 'prev' ? FLIP_STYLE : undefined}>
                    <Icon icon={chevronIcon} size={18} color={pressed ? colors.accent : colors.text} />
                  </View>
                )}
              </Pressable>
            ))}
        </View>
        {count > 1 && (
          <View style={DOTS_STYLE}>
            {photos.map((photo, i) => (
              <Pressable
                key={photo.url}
                accessibilityRole="button"
                accessibilityLabel={`Foto ${i + 1}`}
                accessibilityState={{ selected: i === current }}
                hitSlop={scales.space.s2}
                onPress={() => setIndex(i)}
                style={dotStyle(theme, i === current)}
              />
            ))}
          </View>
        )}
        {problems.length > 0 && (
          <View accessibilityLiveRegion="polite">
            {problems.map((problem) => (
              <NativeText key={problem} style={problemStyle(theme)}>
                {problem}
              </NativeText>
            ))}
          </View>
        )}
        <Text size="sm" tone="muted">
          {full
            ? `Limite de ${photoCount(limit)} atingido. Troque ou remova uma para adicionar outra.`
            : `JPG, PNG ou WebP, até 3 MB · ${count} de ${photoCount(limit)}`}
        </Text>
        <View style={ACTIONS_STYLE}>
          {count > 0 && (
            <>
              <Button variant="secondary" size="sm" onPress={() => setConfirming(true)}>
                Remover esta foto
              </Button>
              <Button variant="secondary" size="sm" onPress={() => choose(true)}>
                Trocar esta foto
              </Button>
            </>
          )}
          {!full && (
            <Button size="sm" onPress={() => choose(false)}>
              Adicionar foto
            </Button>
          )}
        </View>
      </View>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Remover esta foto?"
        size="confirm"
        actions={
          <>
            <Button variant="secondary" size="sm" onPress={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onPress={remove}>
              Remover
            </Button>
          </>
        }
      >
        <Text size="sm" tone="muted">
          {`Esta foto sai de ${name} (${code}). Essa ação não pode ser desfeita.` +
            (current === 0 && count > 1 ? ' Ela é a capa; a próxima foto passa a ser a capa na lista.' : '')}
        </Text>
      </Dialog>
    </View>
  );
}
