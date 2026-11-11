import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';

// The look of the sheet that adds or renames a node of the Catalog's tree, the same as the web on a phone: the fields
// inset as the sheet's title, the name on a line of its own and a generation's years sharing the next, over Cancelar
// and the button that saves, which share the sheet's foot in two equal halves.

/** The fields, the line of the years, a year, and the two buttons. */
export const useStyles = createStyles(
  'catalog.node-form',
  { base: '', name: 'name', years: 'years', year: 'year', buttons: 'buttons', button: 'buttons.button' },
  () => ({
    base: { gap: scales.space.s3, paddingHorizontal: scales.space.s5, paddingBottom: scales.space.s3 },
    button: { flex: 1 },
    buttons: { flexDirection: 'row', gap: scales.space.s2 },
    name: {},
    year: { flex: 1 },
    years: { flexDirection: 'row', gap: scales.space.s2 },
  }),
);
