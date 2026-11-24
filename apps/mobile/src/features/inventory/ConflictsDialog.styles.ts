import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { softHairline } from '../../app/theme';

// The look of the conflicts with the computer: the cards one under the other, each on the raised panel with a soft
// hairline, as the Inventory's copy notice, its two sides one under the other and its two choices in a wrapping row.

/** The conflicts: the list, each card, its sides and its choices. */
export const useStyles = createStyles(
  'inventory.conflicts-dialog',
  { list: 'list', card: 'list.card', sides: 'list.card.sides', side: 'list.card.sides.side', choices: 'list.card.choices' },
  (theme) => ({
    list: { gap: scales.space.s3 },
    card: {
      gap: scales.space.s2,
      padding: scales.space.s3,
      borderRadius: theme.radiusTile,
      borderWidth: 1,
      borderColor: softHairline(theme),
      backgroundColor: theme.colors.panelRaised,
    },
    sides: { gap: scales.space.s2 },
    side: { gap: scales.space.s1 / 2 },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 },
  }),
);
