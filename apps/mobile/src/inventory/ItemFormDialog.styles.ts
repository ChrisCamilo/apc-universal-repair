import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { softHairline } from '../theme';

// The look of the item form, the same as the web on a phone: the item's fields in one column, and the position and
// side choices each with its label over it; then the brands, each a framed section with its heading (and its Remover)
// over its photos and its fields, and "Adicionar marca" after them. The details use the same layout, with the values
// as text.

/** The item form: its fields, the labeled choices, and the brands' sections. */
export const useStyles = createStyles(
  'inventory.item-form-dialog',
  {
    fields: 'fields',
    choice: 'fields.choice',
    brands: 'fields.brands',
    brand: 'fields.brands.brand',
    brandHead: 'fields.brands.brand.head',
    add: 'fields.brands.add',
  },
  (theme) => ({
    add: { flexDirection: 'row' },
    brand: {
      gap: scales.space.s3,
      padding: scales.space.s3,
      borderWidth: scales.hairline,
      borderColor: softHairline(theme),
      borderRadius: theme.radiusTile,
    },
    brandHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scales.space.s2 },
    brands: { gap: scales.space.s3 },
    choice: { gap: scales.space.s2 },
    fields: { gap: scales.space.s3 },
  }),
);
