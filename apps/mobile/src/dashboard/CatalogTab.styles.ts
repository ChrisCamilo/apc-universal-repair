import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { displayLabel } from '../styles/shared';
import { fontFamily, softHairline } from '../theme';

// The look of the Catalog tab, the same as the web's on a phone (the "Catálogo no celular" mockup): one screen at a
// time, scrolling under the header. A section's heading, such as "Marcas · 4", is small and muted in the display face.
// Each brand is a line across the screen, 72px tall, over a soft hairline: its letters in a raised square in the
// accent, its name over its line of models and sheets, and a chevron. The tree spans the screen too, and grows to its
// full height, since the screen scrolls as a whole. The sheet's readouts sit two to a row, each in a box with its name above it.

/** A brand line's height, in px (min-h-18 on the web). */
export const BRAND_LINE_HEIGHT = scales.space.s8;
/** The size of a brand's name, in px (17px on the web). */
const BRAND_NAME_SIZE = 17;
/** The size of a brand's line of models and of the path to an engine, in px (13px on the web). */
const META_SIZE = 13;

/**
 * The Catalog tab: the screen with its headings, the brand lines with their letters, text and chevron, the path to an
 * engine and the sheet's readouts.
 */
export const useStyles = createStyles(
  'catalog.catalog-tab',
  {
    tab: '',
    heading: 'screen.heading',
    brandList: 'screen.brands',
    brand: 'screen.brands.brand',
    mark: 'screen.brands.brand.mark',
    markText: 'screen.brands.brand.mark.text',
    brandText: 'screen.brands.brand.text',
    brandName: 'screen.brands.brand.text.name',
    brandMeta: 'screen.brands.brand.text.meta',
    chevron: 'screen.brands.brand.chevron',
    path: 'screen.path',
    readouts: 'screen.readouts',
    readout: 'screen.readouts.readout',
    readoutLabel: 'screen.readouts.readout.label',
  },
  (theme) => {
    const { colors } = theme;
    return {
      brand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s3,
        minHeight: BRAND_LINE_HEIGHT,
        paddingLeft: scales.space.s4,
        paddingRight: scales.space.s3,
        borderBottomWidth: scales.hairline,
        borderBottomColor: softHairline(theme),
      },
      brandList: { marginHorizontal: -scales.space.s4 },
      brandMeta: { fontFamily: fontFamily(scales.bodyFont), fontSize: META_SIZE, lineHeight: META_SIZE + 5, color: colors.textMuted },
      brandName: { fontFamily: fontFamily(scales.bodyFont, 600), fontSize: BRAND_NAME_SIZE, lineHeight: BRAND_NAME_SIZE + 5, color: colors.text },
      brandPressed: { backgroundColor: colors.panelRaised },
      brandText: { flex: 1, gap: scales.space.s1 / 2 },
      chevron: {},
      heading: { ...displayLabel(theme, 'sm'), paddingTop: scales.space.s2, color: colors.textMuted },
      mark: {
        width: scales.touch.icon,
        height: scales.touch.icon,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: scales.hairline,
        borderColor: softHairline(theme),
        borderRadius: theme.radiusTile,
        backgroundColor: colors.panelRaised,
      },
      markText: { fontFamily: fontFamily(theme.displayFont, 700), fontSize: scales.fontSize.base, color: colors.accent },
      path: { fontFamily: fontFamily(scales.bodyFont), fontSize: META_SIZE, lineHeight: META_SIZE + 5, color: colors.textMuted },
      readout: {
        flexBasis: '45%',
        flexGrow: 1,
        gap: scales.space.s1 / 2,
        paddingHorizontal: scales.space.s3 + scales.space.s1 / 2,
        paddingVertical: scales.space.s3,
        borderWidth: scales.hairline,
        borderColor: softHairline(theme),
        borderRadius: theme.radiusTile,
        backgroundColor: colors.panel,
      },
      readoutLabel: { ...displayLabel(theme, 'xs'), color: colors.textMuted },
      readouts: { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 },
      // The screen reaches the screen's edges, past the Dashboard's margin, so the brand lines and the tree can too;
      // the rest keeps the margin inside it.
      scroll: { flex: 1, marginHorizontal: -scales.space.s4 },
      tab: { gap: scales.space.s3, paddingHorizontal: scales.space.s4, paddingBottom: scales.space.s4 },
      tree: { marginHorizontal: -scales.space.s4 },
    };
  },
);
