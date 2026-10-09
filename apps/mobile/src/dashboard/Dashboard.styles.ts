import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { softHairline } from '../theme';

// The look of the Dashboard, the same as the web's app frame: the page on the canvas; the header row with the APC
// mark, the tab bar and the user menu slot, wrapping over a soft hairline that the selected tab's underline sits on;
// and the open tab's content under it. The ids follow the web frame's names.

/** The compact APC mark's width in the header, in px (HEADER_MARK_SIZE on the web). */
export const MARK_SIZE = 32;

/** The Dashboard: the page, the header with the mark, the tab bar and the user menu slot, and the content. */
export const useStyles = createStyles(
  'dashboard.dashboard',
  { page: '', header: 'header', mark: 'header.brand', tabBar: 'header.nav', menu: 'header.end', content: 'main' },
  (theme) => ({
    content: { paddingHorizontal: scales.space.s4, paddingVertical: scales.space.s3 },
    header: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      columnGap: scales.space.s5,
      rowGap: scales.space.s3,
      marginHorizontal: scales.space.s4,
      paddingTop: scales.space.s3,
      borderBottomWidth: scales.hairline,
      borderBottomColor: softHairline(theme),
    },
    mark: { paddingBottom: scales.space.s2 },
    menu: { marginLeft: 'auto', paddingBottom: scales.space.s2 },
    page: { flex: 1, backgroundColor: theme.colors.canvas },
    // The tab bar's scroll box clips, so it reaches 1dp down over the header's hairline, where the selected tab's
    // underline sits.
    tabBar: { flexGrow: 0, marginBottom: -scales.hairline },
    tabBarContent: { paddingBottom: scales.hairline },
  }),
);
