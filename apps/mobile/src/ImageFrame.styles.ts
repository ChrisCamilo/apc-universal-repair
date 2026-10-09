import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { softHairline } from './theme';

// The look of the photo frame, the same as the web: the whole photo, letterboxed on the raised fill in a soft hairline,
// hidden until it loads; a note with a picture when there is no photo. A frame in a panel takes the smaller tile
// radius. Its ratio comes from the holder.

/** The frame's ratio when none is given: width over height. */
export const DEFAULT_RATIO = 16 / 9;

/** The photo frame: the frame, the photo and the missing note. */
export const useStyles = createStyles('common.image-frame', { frame: '', image: 'image', missing: 'missing' }, (theme) => ({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.panelRaised,
    borderWidth: scales.hairline,
    borderColor: softHairline(theme),
    borderRadius: theme.radiusPanel,
  },
  frameNested: { borderRadius: theme.radiusTile },
  image: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0 },
  imageLoaded: { opacity: 1 },
  missing: { alignItems: 'center', gap: scales.space.s2, padding: scales.space.s4 },
}));
