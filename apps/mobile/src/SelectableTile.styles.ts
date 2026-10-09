import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { displayLabel, glow } from './styles/shared';
import { softHairline, withAlpha } from './theme';

// The look of the brand tiles, the same as the web: the raised fill in a soft hairline frame, the brand's name in the
// muted display face; the chosen one takes the accent on its frame and text over a tinted fill, glowing where the
// style has a glow, and pressing shows what hover shows on the web. The tiles sit in rows, a short last row filled out.

/** The group of brand tiles, its rows, and each tile with its logo or its name. */
export const useStyles = createStyles(
  'common.selectable-tile-group',
  { group: '', row: 'row', tile: 'row.tile', logo: 'row.tile.logo', name: 'row.tile.name', filler: 'row.filler' },
  (theme) => {
    const { colors } = theme;
    return {
      // Fills the rest of a short last row, so its tiles stay as wide as the others.
      filler: { flex: 1 },
      group: { gap: scales.space.s2 },
      // A logo is as tall as a line of the tile's text, so tiles with and without one line up.
      logo: { width: '100%', height: scales.space.s5 - scales.space.s1 },
      name: { ...displayLabel(theme, 'sm'), color: colors.textMuted },
      nameChecked: { color: colors.accent },
      namePressed: { color: colors.text },
      row: { flexDirection: 'row', gap: scales.space.s2 },
      tile: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scales.space.s3,
        paddingVertical: scales.space.s3,
        borderWidth: scales.hairline,
        borderColor: softHairline(theme),
        borderRadius: theme.radiusTile,
        backgroundColor: colors.panelRaised,
      },
      tileChecked: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft), ...glow(theme) },
      tilePressed: { borderColor: colors.hairline },
    };
  },
);
