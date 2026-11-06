import { styleIds } from '@apc/shared/style-ids';

// The look of the APC mark, the same as the web: its needle, hub and inner rule take the accent and everything else the
// text colors. react-native-svg draws with props, not styles, so the colors go to the shapes as props from the theme,
// and the drawing itself (coordinates, stroke widths and opacities) stays in the SVG, as an icon's paths do.

/** The badge's "APC" size, in viewBox units. */
export const NAME_SIZE = 48;
/** The badge's "APC" tracking, in viewBox units (0.08em on the web). */
export const NAME_TRACKING = 0.08 * NAME_SIZE;
/** The badge's "UNIVERSAL REPAIR" size, in viewBox units. */
export const TAGLINE_SIZE = 11;
/** The badge's "UNIVERSAL REPAIR" tracking, in viewBox units (0.3em on the web). */
export const TAGLINE_TRACKING = 0.3 * TAGLINE_SIZE;

/** The mark's style ids: the svg, its frames, the "APC" title, the dial with its ticks, the needle, the hub and the subtitle. */
export const ids = styleIds('common.brand-mark', {
  svg: '',
  frame: 'frame',
  rule: 'rule',
  title: 'title',
  dial: 'dial',
  tick: 'dial.tick',
  needle: 'needle',
  hub: 'needle.hub',
  subtitle: 'subtitle',
});
