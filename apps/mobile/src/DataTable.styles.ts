import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { softHairline, withAlpha } from './theme';

// The look of the list of rows on a phone, the same as the web table below the card breakpoint: each row is a card
// (thumbnail | main | end and actions) on a soft hairline, the raised fill while pressed; a row that needs attention
// (warn or danger) is tinted with a stripe at its start, a stronger tint while pressed. The "Ordenar" select takes the
// place of the header.

/** The width of a tinted row's stripe, in px (the web's spacing × 0.75). */
export const STRIPE_WIDTH = scales.space.s1 * 0.75;
/** A row thumbnail's width and height, in px (size-11 on the web). */
export const THUMB_SIZE = scales.space.s1 * 11;

/** The list: the block, the sort bar, the list, a row by tint and press, its status, cells and areas. */
export const useStyles = createStyles(
  'common.data-table',
  {
    base: '',
    sortBar: 'sort-bar',
    sortSelect: 'sort-bar.select',
    table: 'table',
    row: 'table.row',
    status: 'table.row.status',
    main: 'table.row.main',
    side: 'table.row.side',
    cell: 'table.row.cell',
  },
  (theme) => {
    const { colors } = theme;
    const tint = (tone: 'warn' | 'danger', pressed: boolean) => ({
      borderLeftWidth: STRIPE_WIDTH,
      borderLeftColor: colors[tone],
      backgroundColor: withAlpha(colors[tone], pressed ? scales.statusTint[`${tone}Hover`] : scales.statusTint[tone]),
    });
    return {
      base: { gap: scales.space.s3 },
      cell: {},
      main: { flex: 1, minWidth: 0 },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s3,
        paddingVertical: scales.space.s2,
        paddingLeft: scales.space.s2,
        paddingRight: scales.space.s1,
        borderBottomWidth: scales.hairline,
        borderBottomColor: softHairline(theme),
        borderLeftWidth: 0,
        backgroundColor: 'transparent',
      },
      rowDanger: tint('danger', false),
      rowDangerPressed: tint('danger', true),
      rowPressed: { backgroundColor: colors.panelRaised },
      rowWarn: tint('warn', false),
      rowWarnPressed: tint('warn', true),
      side: { alignItems: 'flex-end', gap: scales.space.s1 },
      sortBar: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s2 },
      sortSelect: { flex: 1, minWidth: 0 },
      // Read out, but not shown: the row's status, since its tint alone doesn't reach screen readers.
      status: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
      table: {},
    };
  },
);

/** A row's icon action: the panel fill while pressed. */
export const useRowActionStyles = createStyles('common.row-action', { action: '' }, (theme) => ({
  action: {
    width: scales.space.s6,
    height: scales.space.s6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radiusTile,
    backgroundColor: 'transparent',
  },
  actionPressed: { backgroundColor: theme.colors.panel },
}));

/** A row's thumbnail: a small tile with the photo, or a cube when there is none; the accent frame while pressed. */
export const useThumbnailStyles = createStyles('common.table-thumbnail', { thumbnail: '', image: 'image' }, (theme) => ({
  image: { width: THUMB_SIZE, height: THUMB_SIZE },
  thumbnail: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: scales.hairline,
    borderColor: softHairline(theme),
    borderRadius: theme.radiusTile,
    backgroundColor: theme.colors.panelRaised,
  },
  thumbnailPressed: { borderColor: theme.colors.accent },
}));
