import { useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type ViewStyle } from 'react-native';
import { imageIcon } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { softHairline, useInPanel } from './Panel';
import { Spinner } from './Spinner';
import { useTheme, type ActiveTheme } from './theme';
import { Text } from './Typography';

// The car photo frame, the same as the web. It keeps its aspect ratio whatever the photo's size and never
// stretches the photo: the whole photo shows, letterboxed on the raised fill. While the photo loads the frame
// shows a spinner and is marked busy; with no photo, or one that fails to load, it says so instead.

const DEFAULT_RATIO = 16 / 9;
const EMPTY_ICON_SIZE = 28;
const EMPTY_STYLE: ViewStyle = { alignItems: 'center', gap: scales.space.s2, padding: scales.space.s4 };
const HIDDEN: ImageStyle = { opacity: 0 };

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
  testID?: string;
};
type LoadState = { src: string; state: 'loaded' | 'failed' };

/**
 * Styles the frame: raised fill, soft border, fixed ratio, the photo clipped to the corners.
 * @param theme Active theme.
 * @param ratio Width divided by height.
 * @param nested Whether the frame sits inside a Panel, which calls for the tile radius.
 * @returns Style for the frame View.
 */
function frameStyle(theme: ActiveTheme, ratio: number, nested: boolean): ViewStyle {
  return {
    aspectRatio: ratio,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.panelRaised,
    borderWidth: scales.hairline,
    borderColor: softHairline(theme),
    borderRadius: nested ? theme.radiusTile : theme.radiusPanel,
  };
}

export function ImageFrame({
  src,
  loading = false,
  alt,
  ratio = DEFAULT_RATIO,
  emptyLabel = 'Sem foto',
  testID,
}: ImageFrameProps) {
  const theme = useTheme();
  const nested = useInPanel();
  // The result belongs to one URL, so a new src starts loading again without an effect.
  const [load, setLoad] = useState<LoadState | null>(null);
  const state = loading ? 'loading' : !src ? 'missing' : load?.src === src ? load.state : 'loading';
  const missing = state === 'missing' || state === 'failed';

  return (
    <View testID={testID} accessibilityState={{ busy: state === 'loading' }} style={frameStyle(theme, ratio, nested)}>
      {src && !loading && state !== 'failed' && (
        <Image
          key={src}
          source={{ uri: src }}
          accessible
          accessibilityLabel={alt}
          resizeMode="contain"
          onLoad={() => setLoad({ src, state: 'loaded' })}
          onError={() => setLoad({ src, state: 'failed' })}
          style={[StyleSheet.absoluteFill, state !== 'loaded' && HIDDEN]}
        />
      )}
      {state === 'loading' && <Spinner testID="image-spinner" />}
      {missing && (
        <View style={EMPTY_STYLE}>
          <Icon icon={imageIcon} size={EMPTY_ICON_SIZE} color={theme.colors.textMuted} />
          <Text size="sm" tone="muted">
            {emptyLabel}
          </Text>
        </View>
      )}
    </View>
  );
}
