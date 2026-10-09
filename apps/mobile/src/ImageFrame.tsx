import { useState } from 'react';
import { Image, View } from 'react-native';
import { ICON_SIZES, imageIcon } from '@apc/shared/icons';
import { Icon } from './Icon';
import { DEFAULT_RATIO, useStyles } from './ImageFrame.styles';
import { useInPanel } from './Panel';
import { Spinner } from './Spinner';
import { useTheme } from './theme';
import { Text } from './Typography';

// The car photo frame, the same as the web. It keeps its aspect ratio whatever the photo's size and never
// stretches the photo: the whole photo shows, letterboxed on the raised fill. While the photo loads the frame
// shows a spinner and is marked busy; with no photo, or one that fails to load, it says so instead.

type ImageFrameProps = {
  /** Photo URL; null or empty shows the missing state. */
  src?: string | null;
  /** The photo URL is still on its way, e.g. while the item loads: shows the loading state. */
  loading?: boolean;
  /** Describes the photo, e.g. "Chevrolet Opala 1980, de frente". */
  alt: string;
  /** Width divided by height; defaults to 16 / 9. */
  ratio?: number;
  /** Shown when there is no photo. */
  emptyLabel?: string;
};
type LoadState = { src: string; state: 'loaded' | 'failed' };

export function ImageFrame({
  src,
  loading = false,
  alt,
  ratio = DEFAULT_RATIO,
  emptyLabel = 'Sem foto',
}: ImageFrameProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const nested = useInPanel();
  // The result belongs to one URL, so a new src starts loading again without an effect.
  const [load, setLoad] = useState<LoadState | null>(null);
  const state = loading ? 'loading' : !src ? 'missing' : load?.src === src ? load.state : 'loading';
  const missing = state === 'missing' || state === 'failed';

  return (
    <View accessibilityState={{ busy: state === 'loading' }} style={[styles.frame, nested && styles.frameNested, { aspectRatio: ratio }]} testID={ids.frame}>
      {src && !loading && state !== 'failed' && (
        <Image
          key={src}
          source={{ uri: src }}
          accessible
          accessibilityLabel={alt}
          resizeMode="contain"
          onLoad={() => setLoad({ src, state: 'loaded' })}
          onError={() => setLoad({ src, state: 'failed' })}
          style={[styles.image, state === 'loaded' && styles.imageLoaded]}
          testID={ids.image}
        />
      )}
      {state === 'loading' && <Spinner />}
      {missing && (
        <View style={styles.missing} testID={ids.missing}>
          <Icon icon={imageIcon} size={ICON_SIZES.frame} color={colors.textMuted} />
          <Text size="sm" tone="muted">
            {emptyLabel}
          </Text>
        </View>
      )}
    </View>
  );
}
