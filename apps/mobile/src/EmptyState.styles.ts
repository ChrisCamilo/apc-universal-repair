import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';

// The look of an empty or error state, the same as the web: an icon, a short title, a line that says what to do next
// and an optional action, centered.

/** An empty or error state: the block and the action. */
export const useStyles = createStyles('common.state-message', { box: '', action: 'action' }, () => ({
  action: { marginTop: scales.space.s2 },
  box: { alignItems: 'center', gap: scales.space.s2, paddingHorizontal: scales.space.s4, paddingVertical: scales.space.s6 },
}));
