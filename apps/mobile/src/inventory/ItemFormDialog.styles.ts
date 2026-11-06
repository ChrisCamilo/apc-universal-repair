import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { softHairline } from '../app/theme';

// The look of the item form, the same as the web on a phone, as in the Novo item mockup: the item's fields in one
// column 16px apart, the position and side choices each with its label over it; then the brands, each a raised card
// with its heading (and its Remover) over its photos and its fields, its quantity and price side by side and its color
// and location too, and "Adicionar marca" after them. The bottom holds Salvar across it, or the details' Duplicar and
// Editar, each taking half (see ItemDetails.styles.ts for the rest).

/** The item form: its fields, the labeled choices, the brands' cards with their pairs of fields, and the bottom. */
export const useStyles = createStyles(
  'inventory.item-form-dialog',
  {
    fields: 'fields',
    choice: 'fields.choice',
    brands: 'fields.brands',
    brand: 'fields.brands.brand',
    brandHead: 'fields.brands.brand.head',
    pair: 'fields.brands.brand.pair',
    half: 'fields.brands.brand.pair.half',
    action: 'action',
  },
  (theme) => ({
    action: { flex: 1 },
    brand: {
      marginTop: scales.space.s2,
      gap: scales.space.s3 + scales.space.s1 / 2,
      paddingHorizontal: scales.space.s3 + scales.space.s1 / 2,
      paddingVertical: scales.space.s4,
      borderWidth: scales.hairline,
      borderColor: softHairline(theme),
      borderRadius: theme.radiusTile,
      backgroundColor: theme.colors.panelRaised,
    },
    brandHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scales.space.s2 },
    brands: { gap: scales.space.s4 },
    choice: { gap: scales.space.s2 },
    fields: { gap: scales.space.s4 },
    half: { flex: 1, minWidth: 0 },
    pair: { flexDirection: 'row', alignItems: 'flex-start', gap: scales.space.s2 + scales.space.s1 / 2 },
  }),
);
