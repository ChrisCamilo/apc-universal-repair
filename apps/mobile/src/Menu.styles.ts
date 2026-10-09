import { popShadow, scales, sheenGradient } from '@apc/shared/theme';
import { softHairline } from './Panel';
import { createStyles } from './styles/createStyles';
import { displayLabel, menuItemStyles } from './styles/shared';
import { fontFamily, withAlpha } from './theme';

// The look of the dropdown menu, the same as the web: a pill trigger that lights up in the accent while open, its
// chevron turning, and a panel with the sheen under it. Inside it: a header, small section labels, action items, and
// the user badge the user menu's trigger shows. The panel's place comes from the trigger, measured on the screen.

/** The initials' circle, in px (size-7 on the web). */
export const AVATAR_SIZE = scales.space.s1 * 7;
/** The room the panel leaves on a narrow screen, in px (the web's 100vw - spacing × 16). */
export const MENU_INSET = scales.space.s1 * 16;
/** The panel's widest size, in px (the web's spacing × 72.5). */
export const MENU_MAX_WIDTH = scales.space.s1 * 72.5;
/** The gap between the trigger and the panel, in px. */
export const MENU_OFFSET = scales.space.s1;
/** The screen width the username shows from, as on the web (Tailwind's sm breakpoint, max-sm:hidden). */
export const NAME_MIN_WIDTH = 640;

/** A menu: the trigger with its chevron, the backdrop that closes it, and the panel. */
export const useStyles = createStyles(
  'common.menu',
  { trigger: 'trigger', chevron: 'trigger.chevron', backdrop: 'backdrop', popover: 'popover' },
  (theme) => {
    const { colors } = theme;
    return {
      backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      chevron: { transform: [{ rotate: '90deg' }] },
      chevronOpen: { transform: [{ rotate: '-90deg' }] },
      popover: {
        position: 'absolute',
        gap: scales.space.s1 / 2,
        padding: scales.space.s2,
        borderWidth: scales.hairline,
        borderColor: softHairline(theme),
        borderRadius: theme.radiusPanel,
        backgroundColor: colors.panel,
        backgroundImage: sheenGradient(theme.sheen, theme.mode),
        boxShadow: popShadow(),
      },
      trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: scales.space.s2,
        borderWidth: scales.hairline,
        borderColor: softHairline(theme),
        borderRadius: scales.radiusPill,
        backgroundColor: 'transparent',
        paddingVertical: scales.space.s1,
        paddingLeft: scales.space.s1,
        paddingRight: scales.space.s3,
      },
      triggerOpen: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft) },
    };
  },
);

/** A menu's header: its title and subtitle over a soft hairline. */
export const useHeaderStyles = createStyles('common.menu-header', { header: '', title: 'title', menuItemDescription: 'subtitle' }, (theme) => ({
  header: {
    marginBottom: scales.space.s1,
    paddingHorizontal: scales.space.s2,
    paddingTop: scales.space.s2,
    paddingBottom: scales.space.s3,
    borderBottomWidth: scales.hairline,
    borderBottomColor: softHairline(theme),
  },
  menuItemDescription: menuItemStyles(theme).menuItemDescription,
  title: { fontFamily: fontFamily(scales.monoFont, 500), fontSize: scales.fontSize.sm, color: theme.colors.text },
}));

/** An action item: the row, its label and description. */
export const useItemStyles = createStyles(
  'common.menu-item',
  { menuItem: '', text: 'text', menuItemLabel: 'text.label', menuItemDescription: 'text.description' },
  (theme) => ({ ...menuItemStyles(theme), text: { flex: 1 } }),
);

/** A small section label in the muted display face. */
export const useLabelStyles = createStyles('common.menu-label', { label: '' }, (theme) => ({
  label: {
    ...displayLabel(theme, 'xs'),
    marginHorizontal: scales.space.s2,
    marginTop: scales.space.s2,
    marginBottom: scales.space.s1 / 2,
    color: theme.colors.textMuted,
  },
}));

/** The user badge: the initials on the accent, then the username. */
export const useBadgeStyles = createStyles(
  'common.user-badge',
  { avatar: 'initials', initials: 'initials.text', name: 'name' },
  (theme) => ({
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: scales.radiusPill,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: { fontFamily: fontFamily(theme.displayFont, 700), fontSize: scales.fontSize.xs, color: theme.colors.onAccent },
    name: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: theme.colors.text },
  }),
);
