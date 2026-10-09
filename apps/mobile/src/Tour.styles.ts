import type { ViewStyle } from 'react-native';
import { popShadow, scales, spotlightDim } from '@apc/shared/theme';
import type { TourRect } from '@apc/shared/tour';
import { createStyles } from './styles/createStyles';
import { glow } from './styles/shared';

// The look of the guided tour, the same as the web: an accent ring around the step's target, glowing where the style
// has a glow, the rest of the screen dimmed around it, and a card in the accent frame with the part and step, the
// title, the text and the buttons. Their places on the screen come from the target, measured as the tour runs.

/** The ring's width, in px: two hairlines, as on the web. */
export const RING_WIDTH = scales.hairline * 2;

/** The tour: the layer it draws in, the dimmed areas, the ring, the card with its panel, header, text and buttons. */
export const useStyles = createStyles(
  'common.tour',
  {
    layer: 'layer',
    dim: 'dim',
    spotlight: 'spotlight',
    card: 'card',
    header: 'card.header',
    text: 'card.text',
    actions: 'card.actions',
    buttons: 'card.actions.buttons',
  },
  (theme) => ({
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scales.space.s2,
      paddingTop: scales.space.s1,
    },
    buttons: { flexDirection: 'row', gap: scales.space.s2, marginLeft: 'auto' },
    card: { position: 'absolute' },
    dim: { position: 'absolute', backgroundColor: spotlightDim() },
    header: { flexDirection: 'row', justifyContent: 'space-between', gap: scales.space.s2 },
    layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
    panel: { gap: scales.space.s2, padding: scales.space.s4, borderColor: theme.colors.accent, boxShadow: popShadow() },
    spotlight: {
      position: 'absolute',
      borderWidth: RING_WIDTH,
      borderColor: theme.colors.accent,
      borderRadius: theme.radiusTile,
      ...glow(theme),
    },
    text: {},
  }),
);

/**
 * Places the four dimmed areas around the target: above, below, left and right of it.
 * @param spot The ring's rectangle on the screen.
 * @param screen The window's width and height.
 * @returns Each area's place and size.
 */
export function dimBoxes(spot: TourRect, screen: { width: number; height: number }): ViewStyle[] {
  const below = spot.y + spot.height;
  return [
    { left: 0, top: 0, width: screen.width, height: Math.max(0, spot.y) },
    { left: 0, top: below, width: screen.width, height: Math.max(0, screen.height - below) },
    { left: 0, top: spot.y, width: Math.max(0, spot.x), height: spot.height },
    { left: spot.x + spot.width, top: spot.y, width: Math.max(0, screen.width - spot.x - spot.width), height: spot.height },
  ];
}
