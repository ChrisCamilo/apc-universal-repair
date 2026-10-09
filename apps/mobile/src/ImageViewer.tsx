import { useState } from 'react';
import { Image, Modal, Pressable, Text as NativeText, View, useWindowDimensions } from 'react-native';
import { chevronIcon, ICON_SIZES, imageIcon } from '@apc/shared/icons';
import { photoCount, takePhotos } from '@apc/shared/photos';
import { scales } from '@apc/shared/theme';
import { Button } from './Button';
import { CloseButton } from './CloseButton';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import type { PickedPhoto, UploadPhoto } from './ImageUpload';
import { FRAME_MAX_SHARE, useStyles, viewerBox } from './ImageViewer.styles';
import { useTheme } from './theme';
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

export function ImageViewer({ open, onClose, ...rest }: ImageViewerProps) {
  const { styles, ids } = useStyles();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ToastProvider>
        <View style={styles.backdrop} testID={ids.backdrop}>
          <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.outside} testID={ids.outside} />
          <ViewerBody onClose={onClose} {...rest} />
        </View>
      </ToastProvider>
    </Modal>
  );
}

function ViewerBody({ onClose, name, code, photos, onPhotosChange, limit, onPick }: Omit<ImageViewerProps, 'open'>) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const screen = useWindowDimensions();
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const count = photos.length;
  // After a removal the index may point past the end; the last photo shows instead.
  const current = Math.min(index, Math.max(0, count - 1));
  const full = count >= limit;

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
    <View accessibilityViewIsModal accessibilityLabel={name} style={[styles.window, viewerBox(screen)]} testID={ids.window}>
      <View style={styles.body} testID={ids.body}>
        <View style={styles.head} testID={ids.head}>
          <View style={styles.name} testID={ids.name}>
            <Heading level={3}>{name}</Heading>
            <NumericReadout tone="muted">{code}</NumericReadout>
          </View>
          <CloseButton onPress={onClose} />
        </View>
        <View style={styles.stage} testID={ids.stage}>
          <View style={[styles.frame, { maxHeight: screen.height * FRAME_MAX_SHARE }]} testID={ids.frame}>
            {count > 0 ? (
              <Image
                source={{ uri: photos[current].url }}
                resizeMode="contain"
                accessibilityLabel={`Foto ${current + 1} de ${count} · ${name}`}
                style={styles.image}
                testID={ids.image}
              />
            ) : (
              <View style={styles.empty} testID={ids.empty}>
                <Icon icon={imageIcon} size={ICON_SIZES.viewer} color={colors.textMuted} />
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
                style={({ pressed }) => [styles.round, side === 'prev' ? styles.roundPrev : styles.roundNext, pressed && styles.roundPressed]}
                testID={ids.round}
              >
                {({ pressed }) => (
                  <View style={side === 'prev' && styles.previous} testID={side === 'prev' ? ids.previous : undefined}>
                    <Icon icon={chevronIcon} size={ICON_SIZES.prominent} color={pressed ? colors.accent : colors.text} />
                  </View>
                )}
              </Pressable>
            ))}
        </View>
        {count > 1 && (
          <View style={styles.dots} testID={ids.dots}>
            {photos.map((photo, i) => (
              <Pressable
                key={photo.url}
                accessibilityRole="button"
                accessibilityLabel={`Foto ${i + 1}`}
                accessibilityState={{ selected: i === current }}
                hitSlop={scales.space.s2}
                onPress={() => setIndex(i)}
                style={[styles.dot, i === current && styles.dotOn]}
                testID={ids.dot}
              />
            ))}
          </View>
        )}
        {problems.length > 0 && (
          <View accessibilityLiveRegion="polite" style={styles.problems} testID={ids.problems}>
            {problems.map((problem) => (
              <NativeText key={problem} style={styles.problem} testID={ids.problem}>
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
        <View style={styles.buttons} testID={ids.buttons}>
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
