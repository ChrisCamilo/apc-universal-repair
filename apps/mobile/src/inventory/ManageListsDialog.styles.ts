import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { softHairline } from '../theme';

// The look of "Gerenciar listas", the same as the web: a section per list, the vehicle models grouped by brand, and
// each name in a row over a soft hairline, with its item count and its pencil and trash at the end; a name being
// renamed turns into its field, with Salvar and Cancelar at the end. The model groups only hold the rows, so they add
// no level to their ids.

/** The lists: their sections, model groups and rows, and the rename row with its buttons. */
export const useStyles = createStyles(
  'inventory.manage-lists-dialog',
  {
    section: 'section',
    group: 'section.group',
    entry: 'section.entry',
    name: 'section.entry.name',
    actions: 'section.entry.actions',
    rename: 'section.rename',
    buttons: 'section.rename.buttons',
  },
  (theme) => ({
    actions: { flexDirection: 'row', gap: scales.space.s1 },
    buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: scales.space.s2 },
    entry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scales.space.s2,
      minHeight: scales.space.s7,
      borderBottomWidth: scales.hairline,
      borderBottomColor: softHairline(theme),
    },
    group: {},
    name: { flex: 1, minWidth: 0 },
    rename: { gap: scales.space.s2, paddingVertical: scales.space.s2 },
    section: { gap: scales.space.s1 },
  }),
);
