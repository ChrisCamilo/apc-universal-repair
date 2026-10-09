import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { softHairline } from './theme';

// The look of a loading placeholder, the same as the web: a soft hairline fill that pulses gently, standing still
// with reduced motion. Lines are pills, blocks take the tile radius and circles are round. Its size comes from the
// holder.

/** A line's height, in px (h-3 on the web). */
export const LINE_HEIGHT = scales.space.s3;

/** A placeholder, by shape. */
export const useStyles = createStyles('common.skeleton', { skeleton: '' }, (theme) => ({
  skeleton: { borderRadius: scales.radiusPill, backgroundColor: softHairline(theme) },
  skeletonBlock: { borderRadius: theme.radiusTile },
  skeletonLine: { height: LINE_HEIGHT },
}));
