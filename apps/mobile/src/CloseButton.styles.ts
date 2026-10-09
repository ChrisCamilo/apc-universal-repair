import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { roundStyles } from './styles/shared';

// The look of the ×, the same as the web: a round hairline ring around the icon that turns to the accent while pressed.

/** The ×'s width and height, 36px as on the web; its hit area grows past it. */
export const CLOSE_BUTTON_SIZE = scales.space.s6 + scales.space.s1;

/** The round × that closes a window. */
export const useStyles = createStyles('common.close-button', { round: '' }, (theme) => roundStyles(theme, CLOSE_BUTTON_SIZE));
