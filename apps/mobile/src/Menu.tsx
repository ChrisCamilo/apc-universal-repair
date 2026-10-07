import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import { chevronIcon, type IconShape } from '@apc/shared/icons';
import { popShadow, scales, sheenGradient } from '@apc/shared/theme';
import { Icon } from './Icon';
import { MenuContext, menuItemStyle, menuItemText, useMenu } from './menuContext';
import { softHairline } from './Panel';
import { fontFamily, useTheme, withAlpha, type ActiveTheme } from './theme';

// A dropdown menu, the same as the web, such as the Dashboard's user menu: a trigger and a popover anchored
// under it. Checkbox and radio items (Switch, Segmented) keep the menu open when chosen, and only plain action
// items (MenuItem) close it. A tap outside, the back button or the trigger closes the menu. UserBadge is the user
// menu's trigger content, as on the web: the initials on the accent, then the username, which phones leave out.

/** Side of the initials' circle, as on the web (size-7). */
const AVATAR_SIZE = scales.space.s1 * 7;
const LABEL_STYLE: ViewStyle = { flex: 1 };
/** Room the menu leaves around it, and its widest size, as on the web: min(290px, 100vw - 64px). */
const MENU_INSET = 64;
const MENU_MAX_WIDTH = 290;
/** Gap between the trigger and the menu, as on the web (mt-1). */
const MENU_OFFSET = scales.space.s1;
/** Screen width from which the trigger also shows the username: the web's sm breakpoint. */
const NAME_MIN_WIDTH = 640;

type Anchor = { top: number; right: number };
type MenuItemProps = {
  /** Runs the action; the menu closes afterwards. */
  onSelect: () => void;
  /** Short explanation under the label. */
  description?: string;
  /** Icon at the end of the item. */
  icon?: IconShape[];
  children: string;
};
type MenuProps = {
  /** Accessible name of the trigger and the menu, e.g. "Menu do usuário". */
  label: string;
  /** Content of the trigger, e.g. the avatar and the user name. */
  trigger: ReactNode;
  children: ReactNode;
};

/**
 * Styles the initials' circle: the accent fill, the initials centered.
 * @param theme Active theme.
 * @returns Style for the circle View.
 */
function avatarStyle(theme: ActiveTheme): ViewStyle {
  return {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: scales.radiusPill,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

/**
 * Styles the header: room around the user's name and role, with a soft hairline below.
 * @param theme Active theme.
 * @returns Style for the header View.
 */
function headerStyle(theme: ActiveTheme): ViewStyle {
  return {
    marginBottom: scales.space.s1,
    paddingHorizontal: scales.space.s2,
    paddingTop: scales.space.s2,
    paddingBottom: scales.space.s3,
    borderBottomWidth: scales.hairline,
    borderBottomColor: softHairline(theme),
  };
}

/**
 * Styles the initials: the display face, bold, in the accent's contrast color.
 * @param theme Active theme.
 * @returns Style for the initials Text.
 */
function initialsStyle(theme: ActiveTheme): TextStyle {
  return { fontFamily: fontFamily(theme.displayFont, 700), fontSize: scales.fontSize.xs, color: theme.colors.onAccent };
}

/**
 * Places and frames the menu: under the trigger and lined up with its end, as wide as the web's rule, on the
 * panel with the sheen and the floating shadow.
 * @param theme Active theme.
 * @param anchor Where the trigger's bottom-right corner sits on the screen.
 * @param screenWidth Window width.
 * @returns Style for the menu View.
 */
function menuStyle(theme: ActiveTheme, anchor: Anchor, screenWidth: number): ViewStyle {
  return {
    position: 'absolute',
    top: anchor.top,
    right: anchor.right,
    width: Math.min(MENU_MAX_WIDTH, screenWidth - MENU_INSET),
    gap: scales.space.s1 / 2,
    padding: scales.space.s2,
    borderWidth: scales.hairline,
    borderColor: softHairline(theme),
    borderRadius: theme.radiusPanel,
    backgroundColor: theme.colors.panel,
    backgroundImage: sheenGradient(theme.sheen, theme.mode),
    boxShadow: popShadow(),
  };
}

/**
 * Styles a section label: small display face in uppercase, muted.
 * @param theme Active theme.
 * @returns Style for the label Text.
 */
function sectionLabelStyle(theme: ActiveTheme): TextStyle {
  const fontSize = scales.fontSize.xs;
  return {
    marginHorizontal: scales.space.s2,
    marginTop: scales.space.s2,
    marginBottom: scales.space.s1 / 2,
    fontFamily: fontFamily(theme.displayFont, 600),
    fontSize,
    letterSpacing: theme.displayTracking * fontSize,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  };
}

/**
 * Styles the header's title: the user name in the mono face.
 * @param theme Active theme.
 * @returns Style for the title Text.
 */
function titleStyle(theme: ActiveTheme): TextStyle {
  return { fontFamily: fontFamily(scales.monoFont, 500), fontSize: scales.fontSize.sm, color: theme.colors.text };
}

/**
 * Styles the trigger: a pill with a soft frame that lights up in the accent while the menu is open.
 * @param theme Active theme.
 * @param open Whether the menu is open.
 * @returns Style for the trigger Pressable.
 */
function triggerStyle(theme: ActiveTheme, open: boolean): ViewStyle {
  const { colors } = theme;
  return {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: scales.space.s2,
    borderWidth: scales.hairline,
    borderColor: open ? colors.accent : softHairline(theme),
    borderRadius: scales.radiusPill,
    backgroundColor: open ? withAlpha(colors.accent, scales.accentSoft) : 'transparent',
    paddingVertical: scales.space.s1,
    paddingLeft: scales.space.s1,
    paddingRight: scales.space.s3,
  };
}

/**
 * Styles the username on the trigger: small mono text in the text color.
 * @param theme Active theme.
 * @returns Style for the username Text.
 */
function usernameStyle(theme: ActiveTheme): TextStyle {
  return { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: theme.colors.text };
}

export function Menu({ label, trigger, children }: MenuProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ top: scales.space.s8, right: scales.space.s4 });
  const button = useRef<ComponentRef<typeof View>>(null);

  /** Opens the menu under the trigger, measured on the screen. */
  const show = () => {
    button.current?.measureInWindow((x, y, w, h) => setAnchor({ top: y + h + MENU_OFFSET, right: width - x - w }));
    setOpen(true);
  };

  return (
    <>
      <Pressable
        ref={button}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => (open ? setOpen(false) : show())}
        style={triggerStyle(theme, open)}
        testID="menu-trigger"
      >
        {trigger}
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon icon={chevronIcon} size={12} color={theme.colors.textMuted} />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar menu"
          onPress={() => setOpen(false)}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityRole="menu" accessibilityLabel={label} style={menuStyle(theme, anchor, width)}>
          <MenuContext.Provider value={{ close: () => setOpen(false) }}>{children}</MenuContext.Provider>
        </View>
      </Modal>
    </>
  );
}

export function MenuHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();
  return (
    <View style={headerStyle(theme)}>
      <Text style={titleStyle(theme)}>{title}</Text>
      {subtitle && <Text style={menuItemText(theme, 'description')}>{subtitle}</Text>}
    </View>
  );
}

export function MenuItem({ onSelect, description, icon, children }: MenuItemProps) {
  const theme = useTheme();
  const menu = useMenu();
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={children}
      accessibilityHint={description}
      onPress={() => {
        onSelect();
        menu?.close();
      }}
      style={({ pressed }) => menuItemStyle(theme, pressed)}
    >
      <View style={LABEL_STYLE}>
        <Text style={menuItemText(theme, 'label')}>{children}</Text>
        {description && <Text style={menuItemText(theme, 'description')}>{description}</Text>}
      </View>
      {icon && <Icon icon={icon} size={18} color={theme.colors.accent} />}
    </Pressable>
  );
}

export function MenuLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="header" style={sectionLabelStyle(theme)}>
      {children}
    </Text>
  );
}

export function UserBadge({ initials, name }: { initials: string; name: string }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  return (
    <>
      <View style={avatarStyle(theme)} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={initialsStyle(theme)}>{initials}</Text>
      </View>
      {width >= NAME_MIN_WIDTH && <Text style={usernameStyle(theme)}>{name}</Text>}
    </>
  );
}
